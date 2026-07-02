import React, { useState, useEffect, useRef, useMemo } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, query, where, addDoc, setDoc, doc } from "firebase/firestore";
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
  Percent
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import SeoHelper from "./SeoHelper";

export const JackpotListing: React.FC = () => {
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

  // Review states
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("Unbelievable Jackpot Win! Verified proof attached.");
  const [comment, setComment] = useState("");

  // Global action states
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth loading states
  const [authLoading, setAuthLoading] = useState(false);

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
    if (!comment.trim()) {
      setError("Please describe your win experience in the comment field.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Submit rating ratingDoc to keep dynamic average ratings responsive
      const ratingDocId = `${currentUser.uid}_${selectedCasino.id}`;
      const ratingRef = doc(db, "ratings", ratingDocId);
      await setDoc(ratingRef, {
        casinoId: selectedCasino.id,
        userId: currentUser.uid,
        rating,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Submit the full review featuring the Cloudinary uploads
      const reviewsColRef = collection(db, "reviews");
      const reviewPayload: any = {
        casinoId: selectedCasino.id,
        userId: currentUser.uid,
        rating,
        title: title || "Lucky Jackpot Win!",
        comment: comment,
        approved: false, // Goes into moderation queue first as required
        createdAt: new Date().toISOString(),
      };

      if (jackpotUrl) reviewPayload.jackpotScreenshot = jackpotUrl;
      if (balanceUrl) reviewPayload.balanceScreenshot = balanceUrl;

      await addDoc(reviewsColRef, reviewPayload);

      setSuccess(true);
      // Reset form
      setJackpotFile(null);
      setJackpotUrl("");
      setBalanceFile(null);
      setBalanceUrl("");
      setComment("");
    } catch (err: any) {
      console.error("Error submitting jackpot listing review:", err);
      setError(err?.message || "Failed to submit jackpot review. Verify your rules parameters.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-650" />
            <span>Create Verified Jackpot Record</span>
          </h1>
          <p className="text-xs font-semibold text-slate-500">
            Publish massive wins and verified balances under specific casino listings.
          </p>
        </div>
      </div>

      {/* Success View */}
      {success ? (
        <div className="bg-white border border-emerald-100 rounded-3xl p-8 text-center space-y-6 shadow-md max-w-xl mx-auto">
          <div className="mx-auto h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-950">Jackpot Submitted!</h3>
            <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed">
              Your win record proof has been sent successfully to our moderation desk. Once approved, it will be published instantly under <span className="font-bold text-indigo-600">"{selectedCasino?.casinoName}"</span> for all players to verify!
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setSuccess(false);
                setSelectedCasino(null);
                setSearchQuery("");
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Add Another Jackpot
            </button>
            <button
              onClick={() => navigate(`/casino/${selectedCasino?.slug}`)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Go to Casino Page
            </button>
          </div>
        </div>
      ) : (
        /* Form View */
        <div className="bg-white rounded-3xl border border-slate-150 p-6 sm:p-8 shadow-sm space-y-8">
          
          {/* Auth Guard Banner if signed out */}
          {!currentUser && (
            <div className="bg-amber-50/75 border border-amber-200/60 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-amber-800 font-black text-sm">
                  <Lock className="h-4 w-4" />
                  <span>Secure Submission Required</span>
                </div>
                <p className="text-xs text-amber-750 font-semibold max-w-lg leading-relaxed">
                  To prevent fraudulent screenshot scraping and maintain high integrity, win submissions require a valid verified user session.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  className="bg-white border border-amber-200 hover:bg-amber-100/50 text-slate-800 text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {authLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Sign in with Google"}
                </button>
                <button
                  onClick={handleAnonymousSignIn}
                  disabled={authLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Quick Guest Access
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Searchable Select Dropdown (Casino selection) */}
            <div className="space-y-1.5" ref={dropdownRef}>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Select Casino Brand *
              </label>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => !loadingCasinos && setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-2xl text-left text-xs font-bold text-slate-800 transition cursor-pointer"
                >
                  {loadingCasinos ? (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading operators...
                    </span>
                  ) : selectedCasino ? (
                    <span className="flex items-center gap-2">
                      {selectedCasino.casinoLogo ? (
                        <img 
                          src={selectedCasino.casinoLogo} 
                          alt="" 
                          className="h-5 w-5 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-5 w-5 bg-indigo-50 text-indigo-700 font-black rounded flex items-center justify-center text-[10px]">
                          {selectedCasino.casinoName.substring(0, 2)}
                        </div>
                      )}
                      <span>{selectedCasino.casinoName}</span>
                    </span>
                  ) : (
                    <span className="text-slate-450">Choose target casino brand...</span>
                  )}
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                      <Search className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search casino name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden"
                      />
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto">
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
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition text-xs font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-50 last:border-0"
                          >
                            {c.casinoLogo ? (
                              <img 
                                src={c.casinoLogo} 
                                alt="" 
                                className="h-5 w-5 object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="h-5 w-5 bg-indigo-50 text-indigo-750 font-black rounded flex items-center justify-center text-[9px]">
                                {c.casinoName.substring(0,2)}
                              </div>
                            )}
                            <span className="flex-1">{c.casinoName}</span>
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
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Jackpot Screenshot *
                </label>
                <div
                  onDragEnter={handleJackpotDrag}
                  onDragOver={handleJackpotDrag}
                  onDragLeave={handleJackpotDrag}
                  onDrop={handleJackpotDrop}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition flex flex-col items-center justify-center min-h-[140px] relative ${
                    jackpotDragActive ? "border-indigo-550 bg-indigo-50/20" : "border-slate-200 hover:border-slate-350"
                  }`}
                >
                  {jackpotUploading ? (
                    <div className="space-y-2 py-4">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                      <span className="text-[10px] font-bold text-slate-400 block">Uploading screenshot...</span>
                    </div>
                  ) : jackpotUrl ? (
                    <div className="space-y-2 py-1">
                      <div className="h-16 w-16 mx-auto rounded-lg overflow-hidden border border-slate-100 relative">
                        <img src={jackpotUrl} alt="Jackpot preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => { setJackpotUrl(""); setJackpotFile(null); }}
                          className="absolute inset-0 bg-slate-900/60 hover:bg-slate-900/80 flex items-center justify-center text-white transition-opacity duration-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Uploaded Proof
                      </span>
                    </div>
                  ) : (
                    <label className="cursor-pointer space-y-2 block w-full py-2">
                      <UploadCloud className="h-7 w-7 mx-auto text-slate-400" />
                      <div className="text-slate-500 text-xs">
                        <span className="text-indigo-600 font-bold hover:underline">Click to upload</span> or drag Jackpot Proof
                      </div>
                      <p className="text-[9px] font-medium text-slate-400">Supports PNG, JPG (Max 5MB)</p>
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
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Balance Screenshot *
                </label>
                <div
                  onDragEnter={handleBalanceDrag}
                  onDragOver={handleBalanceDrag}
                  onDragLeave={handleBalanceDrag}
                  onDrop={handleBalanceDrop}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition flex flex-col items-center justify-center min-h-[140px] relative ${
                    balanceDragActive ? "border-indigo-550 bg-indigo-50/20" : "border-slate-200 hover:border-slate-350"
                  }`}
                >
                  {balanceUploading ? (
                    <div className="space-y-2 py-4">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                      <span className="text-[10px] font-bold text-slate-400 block">Uploading screenshot...</span>
                    </div>
                  ) : balanceUrl ? (
                    <div className="space-y-2 py-1">
                      <div className="h-16 w-16 mx-auto rounded-lg overflow-hidden border border-slate-100 relative">
                        <img src={balanceUrl} alt="Balance preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => { setBalanceUrl(""); setBalanceFile(null); }}
                          className="absolute inset-0 bg-slate-900/60 hover:bg-slate-900/80 flex items-center justify-center text-white transition-opacity duration-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Uploaded Proof
                      </span>
                    </div>
                  ) : (
                    <label className="cursor-pointer space-y-2 block w-full py-2">
                      <UploadCloud className="h-7 w-7 mx-auto text-slate-400" />
                      <div className="text-slate-500 text-xs">
                        <span className="text-indigo-600 font-bold hover:underline">Click to upload</span> or drag Balance Proof
                      </div>
                      <p className="text-[9px] font-medium text-slate-400">Supports PNG, JPG (Max 5MB)</p>
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

            {/* Review Title & Star Rating */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Review Headline *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Headline for your win..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-550 focus:outline-hidden rounded-2xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Operator Star Rating
                </label>
                <div className="flex items-center gap-1 py-2.5">
                  {[...Array(5)].map((_, index) => {
                    const currentRating = index + 1;
                    return (
                      <button
                        type="button"
                        key={index}
                        onClick={() => setRating(currentRating)}
                        className="hover:scale-110 active:scale-95 transition-transform"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            currentRating <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Review description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Win Experience / Detailed Review *
              </label>
              <textarea
                required
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell other players about your mega win! How long did it take to hit? How fast was the payout process, and did customer support assist with limits?..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-550 focus:outline-hidden rounded-2xl text-xs font-semibold text-slate-800 resize-none leading-relaxed"
              />
            </div>

            {/* Error notifications */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-xs font-semibold flex items-start gap-2 animate-shake">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || jackpotUploading || balanceUploading || !currentUser}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
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
    </div>
  );
};
