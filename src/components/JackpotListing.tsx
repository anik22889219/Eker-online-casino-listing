import React, { useState, useEffect, useRef, useMemo } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, query, where, addDoc, setDoc, doc, deleteDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, signInAnonymously } from "firebase/auth";
import { Casino } from "../types/firestore";
import { uploadToCloudinary } from "../services/cloudinaryService";
import { 
  Coins, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Search, 
  Sparkles, 
  Star, 
  Loader2, 
  Lock, 
  Check, 
  ArrowLeft,
  ChevronDown,
  Percent,
  Calendar,
  Clock,
  Trash2,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import SeoHelper from "./SeoHelper";

// Utility helper to resolve custom premium local logos
const getNormalizedLogo = (casino: any) => {
  if (!casino) return "";
  const logo = casino.casinoLogo;
  const name = (casino.casinoName || "").toLowerCase();
  const link = (casino.affiliateLink || "").toLowerCase();
  if (name.includes("tk10") || link.includes("tk15") || link.includes("tk10")) {
    return "/tk10_logo.jpg";
  }
  if (name.includes("qq777") || link.includes("qq777")) {
    return "/qq777_logo.jpg";
  }
  return logo;
};

interface JackpotListingProps {
  isAdmin?: boolean;
}

export const JackpotListing: React.FC<JackpotListingProps> = ({ isAdmin = false }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Casino list state
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [loadingCasinos, setLoadingCasinos] = useState(true);

  // Form states
  const [selectedCasino, setSelectedCasino] = useState<Casino | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Upload fields
  const [jackpotFile, setJackpotFile] = useState<File | null>(null);
  const [jackpotUrl, setJackpotUrl] = useState("");
  const [jackpotUploading, setJackpotUploading] = useState(false);
  const [jackpotDragActive, setJackpotDragActive] = useState(false);

  const [balanceFile, setBalanceFile] = useState<File | null>(null);
  const [balanceUrl, setBalanceUrl] = useState("");
  const [balanceUploading, setBalanceUploading] = useState(false);
  const [balanceDragActive, setBalanceDragActive] = useState(false);

  // Review states (removed from form, defaulted behind-the-scenes)
  const rating = 5;
  const title = "Verified Jackpot Submission";
  const comment = "Verified screenshot proof submitted.";

  // Win Date & Time state (user editable)
  const [winDateTime, setWinDateTime] = useState(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });

  // User submissions list
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Global action states
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth loading states
  const [authLoading, setAuthLoading] = useState(false);

  // Delete confirmation modal states
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  // Fetch published casinos
  useEffect(() => {
    setLoadingCasinos(true);
    const q = query(collection(db, "casinos"), where("status", "==", "published"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Casino[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data();
        if (!raw.isDeleted) {
          list.push({ id: docSnap.id, ...raw } as Casino);
        }
      });
      setCasinos(list);
      setLoadingCasinos(false);
    }, (err) => {
      console.warn("Error fetching casinos:", err);
      setLoadingCasinos(false);
    });
    return unsub;
  }, []);

  // Fetch reviews for current user in real-time
  useEffect(() => {
    if (!currentUser) {
      setUserReviews([]);
      return;
    }
    setLoadingReviews(true);
    const q = query(collection(db, "reviews"), where("userId", "==", currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUserReviews(list);
      setLoadingReviews(false);
    }, (err) => {
      console.warn("Error fetching user reviews:", err);
      setLoadingReviews(false);
    });
    return unsub;
  }, [currentUser]);

  const confirmDeleteSubmission = (id: string) => {
    setSubmissionToDelete(id);
  };

  const handleExecuteDelete = async () => {
    if (!submissionToDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteDoc(doc(db, "reviews", submissionToDelete));
      setSubmissionToDelete(null);
    } catch (err: any) {
      console.error("Failed to delete review:", err);
      setError("Failed to delete submission: " + (err.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered casinos for the searchable select
  const filteredCasinos = useMemo(() => {
    if (!searchQuery) return casinos;
    return casinos.filter((c) => 
      c.casinoName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [casinos, searchQuery]);

  // Authenticate inline
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google sign-in failed:", err);
      setError(err?.message || "Google Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setAuthLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error("Anonymous session failed:", err);
      setError(err?.message || "Failed to start anonymous session.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Drag-and-drop handlers for Jackpot
  const handleJackpotDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setJackpotDragActive(true);
    } else if (e.type === "dragleave") {
      setJackpotDragActive(false);
    }
  };

  const handleJackpotDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setJackpotDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleJackpotFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleJackpotFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleJackpotFileUpload(e.target.files[0]);
    }
  };

  const handleJackpotFileUpload = async (file: File) => {
    setJackpotFile(file);
    setJackpotUploading(true);
    setError(null);
    try {
      const url = await uploadToCloudinary(file, "jackpots", file.name);
      setJackpotUrl(url);
    } catch (err: any) {
      console.error("Jackpot image upload failed:", err);
      setError("Jackpot image upload failed. " + (err.message || ""));
    } finally {
      setJackpotUploading(false);
    }
  };

  // Drag-and-drop handlers for Balance
  const handleBalanceDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setBalanceDragActive(true);
    } else if (e.type === "dragleave") {
      setBalanceDragActive(false);
    }
  };

  const handleBalanceDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBalanceDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleBalanceFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleBalanceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleBalanceFileUpload(e.target.files[0]);
    }
  };

  const handleBalanceFileUpload = async (file: File) => {
    setBalanceFile(file);
    setBalanceUploading(true);
    setError(null);
    try {
      const url = await uploadToCloudinary(file, "jackpots", file.name);
      setBalanceUrl(url);
    } catch (err: any) {
      console.error("Balance image upload failed:", err);
      setError("Balance image upload failed. " + (err.message || ""));
    } finally {
      setBalanceUploading(false);
    }
  };

  // Submit jackpot listing review
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError("You must be logged in to submit a jackpot review.");
      return;
    }
    if (!selectedCasino) {
      setError("Please select a casino from the dropdown list.");
      return;
    }
    if (!jackpotUrl && !balanceUrl) {
      setError("Please upload at least one screenshot (Jackpot or Balance proof).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const finalCreatedAt = new Date(winDateTime).toISOString();

      // 1. Submit rating ratingDoc to keep dynamic average ratings responsive
      const ratingDocId = `${currentUser.uid}_${selectedCasino.id}`;
      const ratingRef = doc(db, "ratings", ratingDocId);
      try {
        await setDoc(ratingRef, {
          casinoId: selectedCasino.id,
          userId: currentUser.uid,
          rating,
          createdAt: finalCreatedAt,
          updatedAt: finalCreatedAt,
        });
      } catch (ratingErr: any) {
        ratingErr.path = `ratings/${ratingDocId}`;
        ratingErr.operation = OperationType.WRITE;
        throw ratingErr;
      }

      // 2. Submit the full review featuring the Cloudinary uploads
      const reviewsColRef = collection(db, "reviews");
      const reviewPayload: any = {
        casinoId: selectedCasino.id,
        userId: currentUser.uid,
        rating,
        title: title || "Lucky Jackpot Win!",
        comment: comment,
        approved: isAdmin ? true : false, // Auto-approved if submitted from admin panel
        createdAt: finalCreatedAt,
      };

      if (jackpotUrl) reviewPayload.jackpotScreenshot = jackpotUrl;
      if (balanceUrl) reviewPayload.balanceScreenshot = balanceUrl;

      try {
        await addDoc(reviewsColRef, reviewPayload);
      } catch (reviewErr: any) {
        reviewErr.path = "reviews";
        reviewErr.operation = OperationType.CREATE;
        throw reviewErr;
      }

      setSuccess(true);
      // Reset form
      setJackpotFile(null);
      setJackpotUrl("");
      setBalanceFile(null);
      setBalanceUrl("");
    } catch (err: any) {
      console.error("Error submitting jackpot listing review:", err);
      setError(err?.message || "Failed to submit jackpot review. Verify your rules parameters.");
      const path = err?.path || "reviews";
      const operation = err?.operation || OperationType.CREATE;
      handleFirestoreError(err, operation, path);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in px-2 sm:px-0">
      {/* Premium Header Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_45%)]" />
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="h-24 w-24 text-indigo-400 animate-pulse" />
        </div>
        <div className="relative space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-full">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>Automated Proof Desk</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
            Create Verified Jackpot Record
          </h1>
          <p className="text-xs font-semibold text-slate-350 max-w-xl leading-relaxed">
            Submit authenticated screenshots of massive wins and balance states. Our moderation desk verifies and links approved claims directly to verified casino listings.
          </p>
        </div>
      </div>

      {/* Success View */}
      {success ? (
        <div className="bg-white border border-emerald-100 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-md max-w-xl mx-auto transform animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm shadow-emerald-50">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">
              {isAdmin ? "Jackpot Created & Approved!" : "Jackpot Submitted!"}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed max-w-md mx-auto">
              {isAdmin 
                ? `Your win record proof has been added and automatically approved. It is published instantly under "${selectedCasino?.casinoName}"!`
                : `Your win record proof has been sent successfully to our moderation desk. Once approved, it will be published instantly under "${selectedCasino?.casinoName}" for all players to verify!`
              }
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setSuccess(false);
                setSelectedCasino(null);
                setSearchQuery("");
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition cursor-pointer"
            >
              Add Another Jackpot
            </button>
            <button
              onClick={() => navigate(`/casino/${selectedCasino?.slug}`)}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Go to Casino Page
            </button>
          </div>
        </div>
      ) : (
        /* Form View */
        <div className="bg-white rounded-3xl border border-slate-150 p-5 sm:p-8 shadow-sm space-y-8 relative overflow-hidden">
          
          {/* Auth Guard Banner if signed out */}
          {!currentUser && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-amber-800 font-black text-sm">
                  <div className="p-1 bg-amber-100 rounded-lg">
                    <Lock className="h-4 w-4" />
                  </div>
                  <span>Secure Submission Required</span>
                </div>
                <p className="text-xs text-amber-750 font-semibold max-w-lg leading-relaxed">
                  To prevent fraudulent screenshot scraping and maintain high integrity, win submissions require a valid verified user session.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto shrink-0">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  className="bg-white border border-amber-200 hover:bg-amber-100/50 text-slate-800 text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {authLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sign in with Google"}
                </button>
                <button
                  onClick={handleAnonymousSignIn}
                  disabled={authLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-98 flex items-center justify-center cursor-pointer"
                >
                  Quick Guest Access
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Searchable Select Dropdown (Casino selection) */}
            <div className="space-y-2" ref={dropdownRef}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Select Casino Brand *
              </label>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => !loadingCasinos && setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-550 focus:ring-2 focus:ring-indigo-50 rounded-2xl text-left text-xs font-bold text-slate-800 transition cursor-pointer shadow-xs"
                >
                  {loadingCasinos ? (
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-650" />
                      Loading operators...
                    </span>
                  ) : selectedCasino ? (
                    <span className="flex items-center gap-2.5">
                      {getNormalizedLogo(selectedCasino) ? (
                        <img 
                          src={getNormalizedLogo(selectedCasino)} 
                          alt="" 
                          className="h-6 w-6 object-contain rounded bg-white p-0.5 border border-slate-100"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-6 w-6 bg-indigo-50 text-indigo-750 font-black rounded flex items-center justify-center text-[10px] border border-indigo-100">
                          {selectedCasino.casinoName.substring(0, 2)}
                        </div>
                      )}
                      <span className="text-slate-800 font-extrabold">{selectedCasino.casinoName}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-semibold">Choose target casino brand...</span>
                  )}
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                      <Search className="h-4 w-4 text-slate-450 shrink-0 ml-1" />
                      <input
                        type="text"
                        placeholder="Search casino name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full py-1.5 text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden placeholder-slate-400"
                      />
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                      {filteredCasinos.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs italic">
                          No matching casinos found
                        </div>
                      ) : (
                        filteredCasinos.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCasino(c);
                              setIsDropdownOpen(false);
                              setSearchQuery("");
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-indigo-50/45 transition text-xs font-semibold text-slate-700 flex items-center gap-2.5"
                          >
                            {getNormalizedLogo(c) ? (
                              <img 
                                src={getNormalizedLogo(c)} 
                                alt="" 
                                className="h-5 w-5 object-contain rounded bg-slate-100 p-0.5"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="h-5 w-5 bg-indigo-50 text-indigo-750 font-black rounded flex items-center justify-center text-[9px] border border-indigo-100">
                                {c.casinoName.substring(0,2)}
                              </div>
                            )}
                            <span className="flex-1 font-bold text-slate-700">{c.casinoName}</span>
                            {selectedCasino?.id === c.id && <Check className="h-3.5 w-3.5 text-indigo-650" />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2 & 3. Screenshot uploads side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Jackpot Screenshot */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Jackpot Screenshot *
                </label>
                <div
                  onDragEnter={handleJackpotDrag}
                  onDragOver={handleJackpotDrag}
                  onDragLeave={handleJackpotDrag}
                  onDrop={handleJackpotDrop}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition duration-200 flex flex-col items-center justify-center min-h-[150px] relative ${
                    jackpotDragActive ? "border-indigo-500 bg-indigo-50/30" : "border-slate-200 bg-slate-50/50 hover:border-indigo-400/80 hover:bg-slate-50"
                  }`}
                >
                  {jackpotUploading ? (
                    <div className="space-y-2 py-4">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                      <span className="text-[10px] font-bold text-slate-400 block">Uploading screenshot...</span>
                    </div>
                  ) : jackpotUrl ? (
                    <div className="space-y-3 py-1">
                      <div className="h-20 w-20 mx-auto rounded-xl overflow-hidden border border-slate-150 shadow-xs relative group">
                        <img src={jackpotUrl} alt="Jackpot preview" className="h-full w-full object-cover transition duration-150 group-hover:scale-105" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => { setJackpotUrl(""); setJackpotFile(null); }}
                          className="absolute inset-0 bg-slate-900/60 hover:bg-slate-900/80 flex items-center justify-center text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150"
                          title="Remove image"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Uploaded Proof
                      </span>
                    </div>
                  ) : (
                    <label className="cursor-pointer space-y-2.5 block w-full py-4">
                      <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <div className="text-slate-600 text-xs font-semibold">
                        <span className="text-indigo-650 font-black hover:underline">Click to upload</span> or drag Jackpot Proof
                      </div>
                      <p className="text-[9px] font-medium text-slate-400 leading-tight">PNG, JPG, JPEG (Max 5MB)</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleJackpotFileSelect}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Balance Screenshot */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Balance Screenshot *
                </label>
                <div
                  onDragEnter={handleBalanceDrag}
                  onDragOver={handleBalanceDrag}
                  onDragLeave={handleBalanceDrag}
                  onDrop={handleBalanceDrop}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition duration-200 flex flex-col items-center justify-center min-h-[150px] relative ${
                    balanceDragActive ? "border-indigo-500 bg-indigo-50/30" : "border-slate-200 bg-slate-50/50 hover:border-indigo-400/80 hover:bg-slate-50"
                  }`}
                >
                  {balanceUploading ? (
                    <div className="space-y-2 py-4">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                      <span className="text-[10px] font-bold text-slate-400 block">Uploading screenshot...</span>
                    </div>
                  ) : balanceUrl ? (
                    <div className="space-y-3 py-1">
                      <div className="h-20 w-20 mx-auto rounded-xl overflow-hidden border border-slate-150 shadow-xs relative group">
                        <img src={balanceUrl} alt="Balance preview" className="h-full w-full object-cover transition duration-150 group-hover:scale-105" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => { setBalanceUrl(""); setBalanceFile(null); }}
                          className="absolute inset-0 bg-slate-900/60 hover:bg-slate-900/80 flex items-center justify-center text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150"
                          title="Remove image"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Uploaded Proof
                      </span>
                    </div>
                  ) : (
                    <label className="cursor-pointer space-y-2.5 block w-full py-4">
                      <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <div className="text-slate-600 text-xs font-semibold">
                        <span className="text-indigo-650 font-black hover:underline">Click to upload</span> or drag Balance Proof
                      </div>
                      <p className="text-[9px] font-medium text-slate-400 leading-tight">PNG, JPG, JPEG (Max 5MB)</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBalanceFileSelect}
                      />
                    </label>
                  )}
                </div>
              </div>

            </div>

            {/* Win Date & Time */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Win Date & Time *
              </label>
              <div className="relative rounded-2xl shadow-xs border border-slate-200 bg-slate-50 focus-within:border-indigo-550 focus-within:ring-2 focus-within:ring-indigo-50 transition duration-150 flex items-center px-4 py-1">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
                <input
                  type="datetime-local"
                  required
                  value={winDateTime}
                  onChange={(e) => setWinDateTime(e.target.value)}
                  className="w-full py-2.5 bg-transparent focus:outline-hidden text-xs font-bold text-slate-800"
                />
              </div>
              <p className="text-[9px] font-medium text-slate-400 leading-normal">
                Default matches current system date and time. Feel free to retroactively select the exact calendar moment of your win.
              </p>
            </div>

            {/* Error notifications */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-shake">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all active:scale-98 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || jackpotUploading || balanceUploading || !currentUser}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-98 flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Publishing Review...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Submit Jackpot Listing</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ----------------- Submission Data List Section ----------------- */}
      <div className="bg-white rounded-3xl border border-slate-150 p-5 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Coins className="h-4 w-4 text-indigo-650" />
              <span>Your Submitted Jackpot Records</span>
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Track the live verification and vetting status of your uploads.
            </p>
          </div>
          {currentUser && userReviews.length > 0 && (
            <span className="self-start sm:self-center text-[10px] font-black bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-wider">
              {userReviews.length} {userReviews.length === 1 ? "Record" : "Records"}
            </span>
          )}
        </div>

        {!currentUser ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 border border-slate-200/50">
              <Lock className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">Access Restricted</h4>
              <p className="text-[11px] font-semibold text-slate-450 max-w-sm mx-auto leading-relaxed">
                Please authenticate using Guest Access or your Google Profile above to view your personalized live submission records.
              </p>
            </div>
          </div>
        ) : loadingReviews ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2.5">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-650" />
            <span className="text-[10px] font-bold text-slate-400">Loading your win slips...</span>
          </div>
        ) : userReviews.length === 0 ? (
          <div className="text-center py-14 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
            <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">No Submissions Yet</h4>
              <p className="text-[11px] font-semibold text-slate-400 max-w-sm mx-auto leading-relaxed">
                Once you upload a verified screenshot and submit, your history and approval process will populate here instantly.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop and Tablet Table Layout (Hidden on Mobile) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100">
                    <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Operator</th>
                    <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Submitted Date</th>
                    <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Screenshots</th>
                    <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userReviews.map((review) => {
                    const matchedCasino = casinos.find((c) => c.id === review.casinoId);
                    const formattedDate = new Date(review.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                    return (
                      <tr key={review.id} className="hover:bg-slate-50/40 transition">
                        {/* Operator info */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            {getNormalizedLogo(matchedCasino) ? (
                              <img
                                src={getNormalizedLogo(matchedCasino)}
                                alt=""
                                className="h-7 w-7 rounded-lg object-contain bg-slate-50 p-0.5 border border-slate-150"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-750 font-black flex items-center justify-center text-xs border border-indigo-100">
                                {matchedCasino?.casinoName ? matchedCasino.casinoName.substring(0, 2) : "??"}
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-black text-slate-800 block leading-tight">
                                {matchedCasino?.casinoName || "Unknown Operator"}
                              </span>
                              {matchedCasino?.slug && (
                                <Link
                                  to={`/casino/${matchedCasino.slug}`}
                                  className="text-[10px] text-indigo-650 hover:underline inline-flex items-center gap-0.5 font-bold mt-0.5"
                                >
                                  <span>View listing</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Submitted date */}
                        <td className="py-4 px-4">
                          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Screenshots proofs */}
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            {review.jackpotScreenshot && (
                              <a
                                href={review.jackpotScreenshot}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative h-9 w-9 rounded-lg overflow-hidden border border-slate-150 block cursor-pointer bg-slate-50 shadow-xs"
                                title="Click to view jackpot proof"
                              >
                                <img
                                  src={review.jackpotScreenshot}
                                  alt="Jackpot Proof"
                                  className="h-full w-full object-cover group-hover:scale-110 transition duration-150"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center text-white text-[9px] font-black">
                                  JP
                                </div>
                              </a>
                            )}
                            {review.balanceScreenshot && (
                              <a
                                href={review.balanceScreenshot}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative h-9 w-9 rounded-lg overflow-hidden border border-slate-150 block cursor-pointer bg-slate-50 shadow-xs"
                                title="Click to view balance proof"
                              >
                                <img
                                  src={review.balanceScreenshot}
                                  alt="Balance Proof"
                                  className="h-full w-full object-cover group-hover:scale-110 transition duration-150"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center text-white text-[9px] font-black">
                                  Bal
                                </div>
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Verification status */}
                        <td className="py-4 px-4">
                          {review.approved ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full uppercase tracking-wider">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 rounded-full uppercase tracking-wider">
                              <Clock className="h-3 w-3 text-amber-500 animate-pulse" />
                              Vetting
                            </span>
                          )}
                        </td>

                        {/* Deletion action */}
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => confirmDeleteSubmission(review.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95 cursor-pointer"
                            title="Withdraw submission"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile-Friendly Premium Card Grid Layout (Shown on Mobile screens) */}
            <div className="block md:hidden space-y-4">
              {userReviews.map((review) => {
                const matchedCasino = casinos.find((c) => c.id === review.casinoId);
                const formattedDate = new Date(review.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                });

                return (
                  <div 
                    key={review.id} 
                    className="p-5 bg-slate-50/60 border border-slate-150 rounded-2xl space-y-4 hover:border-indigo-150 transition"
                  >
                    {/* Header: Logo, Name & Withdraw option */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        {getNormalizedLogo(matchedCasino) ? (
                          <img
                            src={getNormalizedLogo(matchedCasino)}
                            alt=""
                            className="h-8 w-8 rounded-lg object-contain bg-white p-0.5 border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-750 font-black flex items-center justify-center text-xs border border-indigo-100">
                            {matchedCasino?.casinoName ? matchedCasino.casinoName.substring(0, 2) : "??"}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-black text-slate-800 leading-tight">
                            {matchedCasino?.casinoName || "Unknown Operator"}
                          </h4>
                          {matchedCasino?.slug && (
                            <Link
                              to={`/casino/${matchedCasino.slug}`}
                              className="text-[10px] text-indigo-650 hover:underline inline-flex items-center gap-0.5 font-bold mt-0.5"
                            >
                              <span>View Listing</span>
                              <ExternalLink className="h-2 w-2" />
                            </Link>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => confirmDeleteSubmission(review.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                        title="Withdraw submission"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Metadata fields */}
                    <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-100 text-[11px]">
                      
                      {/* Submitted Date info */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Submitted On</span>
                        <div className="font-semibold text-slate-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate leading-none">{formattedDate}</span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Approval Status</span>
                        <div>
                          {review.approved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full uppercase tracking-wider">
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-100 rounded-full uppercase tracking-wider">
                              <Clock className="h-2.5 w-2.5 text-amber-500 animate-pulse" />
                              Vetting
                            </span>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Image thumbnails for screenshots */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Screenshots Uploaded</span>
                      <div className="flex gap-2">
                        {review.jackpotScreenshot && (
                          <a
                            href={review.jackpotScreenshot}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative h-10 w-10 rounded-lg overflow-hidden border border-slate-200 block cursor-pointer bg-white"
                            title="Jackpot Proof"
                          >
                            <img
                              src={review.jackpotScreenshot}
                              alt="Jackpot Proof"
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center text-white text-[9px] font-black">
                              JP
                            </div>
                          </a>
                        )}
                        {review.balanceScreenshot && (
                          <a
                            href={review.balanceScreenshot}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative h-10 w-10 rounded-lg overflow-hidden border border-slate-200 block cursor-pointer bg-white"
                            title="Balance Proof"
                          >
                            <img
                              src={review.balanceScreenshot}
                              alt="Balance Proof"
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center text-white text-[9px] font-black">
                              BAL
                            </div>
                          </a>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {submissionToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-100 transform transition-all animate-in fade-in zoom-in-95 duration-200 space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Withdraw Submission?
                </h3>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Are you sure you want to permanently delete this jackpot proof record? This action is irreversible and will remove the screenshots from our moderation desk.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSubmissionToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition duration-150 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition duration-150 disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-red-100 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
