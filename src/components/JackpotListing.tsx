import React, { useState, useEffect, useRef, useMemo } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, query, where, addDoc, setDoc, doc, deleteDoc } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, signInAnonymously } from "firebase/auth";
import { Casino } from "../types/firestore";
import { uploadToCloudinary } from "../services/cloudinaryService";
import { useTheme } from "../context/ThemeContext";
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
  ShieldAlert,
  DollarSign,
  User,
  Mail,
  ShieldCheck,
  Eye
} from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import SeoHelper from "./SeoHelper";

// Default popular games list with guaranteed logos for instant dropdown display
const DEFAULT_POPULAR_GAMES: { name: string; brandName: string; logoUrl: string }[] = [];

// Utility helper to resolve custom premium local logos
const getNormalizedLogo = (casino: any, defaultGlobalLogo?: string) => {
  if (!casino) return defaultGlobalLogo || "";
  const logo = casino.casinoLogo || casino.logoUrl || casino.logo || casino.image || casino.imageUrl;
  if (logo && logo.trim() !== "" && logo !== "/tk10_logo.jpg" && logo !== "/qq777_logo.jpg") {
    return logo;
  }
  const name = (casino.casinoName || "").toLowerCase();
  const link = (casino.affiliateLink || "").toLowerCase();
  if (name.includes("tk10") || link.includes("tk15") || link.includes("tk10")) {
    return "/tk10_logo.jpg";
  }
  if (name.includes("qq777") || link.includes("qq777")) {
    return "/qq777_logo.jpg";
  }
  return logo || defaultGlobalLogo || "";
};

interface JackpotListingProps {
  isAdmin?: boolean;
}

export const JackpotListing: React.FC<JackpotListingProps> = ({ isAdmin = false }) => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Casino list state
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [loadingCasinos, setLoadingCasinos] = useState(true);

  // Form states matching Sell Jackpot Screenshot Form
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCasino, setSelectedCasino] = useState<Casino | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Game suggestions state & Firestore games
  const [gameName, setGameName] = useState("");
  const [showGameSuggestions, setShowGameSuggestions] = useState(false);
  const [highlightedGameIndex, setHighlightedGameIndex] = useState(-1);
  const [firestoreGames, setFirestoreGames] = useState<any[]>([]);

  // Amount, multiplier, rating, review comment
  const [amount, setAmount] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("Verified winning screenshot proof.");

  // Upload fields
  const [jackpotFile, setJackpotFile] = useState<File | null>(null);
  const [jackpotUrl, setJackpotUrl] = useState("");
  const [jackpotUploading, setJackpotUploading] = useState(false);
  const [jackpotDragActive, setJackpotDragActive] = useState(false);

  const [balanceFile, setBalanceFile] = useState<File | null>(null);
  const [balanceUrl, setBalanceUrl] = useState("");
  const [balanceUploading, setBalanceUploading] = useState(false);
  const [balanceDragActive, setBalanceDragActive] = useState(false);

  // Win Date & Time state
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
  const [authLoading, setAuthLoading] = useState(false);

  // Delete confirmation modal states
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-fill user name and email from auth if logged in
  useEffect(() => {
    if (currentUser) {
      if (!userName && currentUser.displayName) setUserName(currentUser.displayName);
      if (!email && currentUser.email) setEmail(currentUser.email);
    }
  }, [currentUser]);

  // URL query params auto-fill effect
  useEffect(() => {
    const paramGame = searchParams.get("game") || searchParams.get("gameName") || searchParams.get("g");
    const paramCasino = searchParams.get("casino") || searchParams.get("company") || searchParams.get("casinoName") || searchParams.get("c");

    if (paramGame && !gameName) {
      setGameName(paramGame);
    }

    if (paramCasino && casinos.length > 0 && !selectedCasino) {
      const matched = casinos.find(
        (c) => c.casinoName.toLowerCase().includes(paramCasino.toLowerCase()) || c.id === paramCasino
      );
      if (matched) {
        setSelectedCasino(matched);
      }
    }
  }, [searchParams, casinos]);

  // Helper to auto-match company (casino) when game is selected
  const autoMatchCompanyForGame = (gName: string) => {
    if (!gName || casinos.length === 0) return;
    const gObj = getGameObj(gName);
    const brand = gObj?.brandName || "";

    if (!selectedCasino) {
      const matched = casinos.find((c) =>
        brand ? c.casinoName.toLowerCase().includes(brand.toLowerCase()) : false
      ) || casinos[0];

      if (matched) {
        setSelectedCasino(matched);
      }
    }
  };

  // Fetch games for autocomplete
  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "games"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.name || d.title || d.gameName) {
          list.push({
            name: d.name || d.title || d.gameName,
            brandName: d.brandName || d.brand || d.provider || "",
            logoUrl: d.logoUrl || d.logo || d.imageUrl || d.image || "",
          });
        }
      });
      setFirestoreGames((prev) => [...prev, ...list]);
    }, () => {});

    const unsub2 = onSnapshot(collection(db, "most_winning_games"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.name || d.title || d.gameName) {
          list.push({
            name: d.name || d.title || d.gameName,
            brandName: d.brandName || d.brand || d.provider || "",
            logoUrl: d.logoUrl || d.logo || d.imageUrl || d.image || "",
          });
        }
      });
      setFirestoreGames((prev) => [...prev, ...list]);
    }, () => {});

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  // Merged game master list
  const masterGamesList = useMemo(() => {
    const map = new Map<string, { name: string; brandName: string; logoUrl: string }>();

    DEFAULT_POPULAR_GAMES.forEach((g) => {
      map.set(g.name.trim().toLowerCase(), g);
    });

    (theme?.mostWinningGames || []).forEach((g) => {
      if (!g || !g.name) return;
      const key = g.name.trim().toLowerCase();
      const existing = map.get(key);
      map.set(key, {
        name: g.name,
        brandName: g.brandName || existing?.brandName || "",
        logoUrl: g.logoUrl || existing?.logoUrl || "",
      });
    });

    firestoreGames.forEach((g) => {
      if (!g || !g.name) return;
      const key = g.name.trim().toLowerCase();
      const existing = map.get(key);
      map.set(key, {
        name: g.name,
        brandName: g.brandName || existing?.brandName || "",
        logoUrl: g.logoUrl || existing?.logoUrl || "",
      });
    });

    return Array.from(map.values());
  }, [theme?.mostWinningGames, firestoreGames]);

  const getGameObj = (gName: string) => {
    if (!gName) return null;
    const key = gName.trim().toLowerCase();
    return masterGamesList.find((g) => g.name.trim().toLowerCase() === key) || null;
  };

  const filteredGameSuggestions = gameName.trim() === ""
    ? masterGamesList.map(g => g.name)
    : masterGamesList
        .filter(
          g =>
            (g.name || "").toLowerCase().includes(gameName.toLowerCase()) ||
            (g.brandName || "").toLowerCase().includes(gameName.toLowerCase())
        )
        .map(g => g.name);

  const uniqueGameSuggestions = Array.from(new Set(filteredGameSuggestions)).sort();

  // Price money calculation (matching Sell Jackpot Screenshot CTA)
  const getCalculatedPriceMoney = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 100) {
      return { price: 0, message: "৳১০০ এর নিচে কোন প্রাইজ মানি নেই" };
    }
    if (amt >= 2000) {
      return { price: 200, message: "৳২০০০ বা তার বেশি হলে সর্বোচ্চ ৳২০০ প্রাইজ মানি" };
    }
    const price = Math.floor(amt / 100) * 10;
    return { 
      price: Math.min(price, 200), 
      message: `প্রতি ১০০ টাকার জন্য ১০ টাকা হারে প্রাইজ মানি` 
    };
  };

  const calculatedInfo = getCalculatedPriceMoney();

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

  // Fetch reviews in real-time
  useEffect(() => {
    setLoadingReviews(true);
    const colRef = collection(db, "reviews");
    const unsub = onSnapshot(colRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUserReviews(list);
      setLoadingReviews(false);
    }, (err) => {
      console.warn("Error fetching reviews:", err);
      setLoadingReviews(false);
    });
    return unsub;
  }, []);

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

  // Filtered casinos
  const filteredCasinos = useMemo(() => {
    if (!searchQuery) return casinos;
    return casinos.filter((c) => 
      c.casinoName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [casinos, searchQuery]);

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

  // Submit review with DIRECT APPROVAL
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCasino) {
      setError("Please select a casino brand from the dropdown list.");
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
      const finalUserName = userName.trim() || currentUser?.displayName || "Verified Winner";
      const finalTitle = gameName ? `${gameName} Jackpot Win` : `${selectedCasino.casinoName} Lucky Win Proof`;

      const reviewPayload: any = {
        casinoId: selectedCasino.id,
        casinoName: selectedCasino.casinoName,
        userId: currentUser?.uid || "admin_direct_sub",
        userName: finalUserName,
        email: email.trim() || currentUser?.email || "",
        gameName: gameName.trim() || "",
        amount: amount ? Number(amount) : 0,
        multiplier: "",
        rating: 5,
        title: finalTitle,
        comment: "Verified winning screenshot proof.",
        approved: true, // DIRECTLY APPROVED ON SUBMISSION!
        createdAt: finalCreatedAt,
      };

      if (jackpotUrl) {
        reviewPayload.jackpotScreenshot = jackpotUrl;
        reviewPayload.screenshotUrl = jackpotUrl;
        reviewPayload.image = jackpotUrl;
      }
      if (balanceUrl) {
        reviewPayload.balanceScreenshot = balanceUrl;
      }

      // Add to reviews collection
      await addDoc(collection(db, "reviews"), reviewPayload);

      // Add to ratings collection for aggregate ratings
      if (currentUser) {
        const ratingDocId = `${currentUser.uid}_${selectedCasino.id}`;
        await setDoc(doc(db, "ratings", ratingDocId), {
          casinoId: selectedCasino.id,
          userId: currentUser.uid,
          rating: Number(rating) || 5,
          createdAt: finalCreatedAt,
          updatedAt: finalCreatedAt,
        }).catch(() => {});
      }

      setSuccess(true);
      // Reset form fields
      setUserName("");
      setEmail("");
      setGameName("");
      setAmount("");
      setMultiplier("");
      setComment("Verified winning screenshot proof.");
      setJackpotFile(null);
      setJackpotUrl("");
      setBalanceFile(null);
      setBalanceUrl("");
    } catch (err: any) {
      console.error("Error submitting review:", err);
      setError(err?.message || "Failed to submit review. Check your network or credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in px-2 sm:px-0">
      <SeoHelper
        title={isAdmin ? "Direct Review Submission Desk | Admin" : "Submit Jackpot Proof"}
        description="Submit verified winning screenshots and review records directly into live listings."
      />

      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-lg border border-slate-800 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_45%)]" />
        <div className="relative space-y-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-full">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Direct Approval Review Submission Form</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
            Submit Approved Jackpot & Review Record
          </h1>
          <p className="text-xs font-semibold text-slate-350 max-w-xl leading-relaxed">
            Fill out the details below just like the Sell Jackpot Screenshot form. Submitting from here directly approves and publishes the review live across all galleries and casino pages!
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
              Review Directly Approved & Published!
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed max-w-md mx-auto">
              The review record and screenshot proof have been added and marked as <span className="text-emerald-600 font-bold">APPROVED</span> automatically. It is now live under "{selectedCasino?.casinoName}"!
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
              Add Another Approved Review
            </button>
            {selectedCasino?.slug && (
              <button
                onClick={() => navigate(`/casino/${selectedCasino.slug}`)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Go to Casino Page
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Form View */
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-xs space-y-6 relative overflow-hidden">
          
          {/* Admin Direct Approval Badge Banner */}
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                ⚡ Direct Live Approval Mode
              </h4>
              <p className="text-[11px] font-semibold text-emerald-750 leading-relaxed">
                Submissions made from this form bypass the pending moderation queue and are published immediately as approved.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Name & Email fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Player / User Name (ইউজারনেম) *
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. WinnerJohn or Admin"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Contact Email / Phone (ইমেইল / মোবাইল)
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. winner@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Quick Auto-Fill Game & Company Chips */}
            {masterGamesList.length > 0 && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-150 rounded-2xl space-y-2 text-left">
                <span className="text-[9.5px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>⚡ ১-ক্লিকে গেম নাম ও কোম্পানি (ক্যাসিনো) অটো ফিল করুন:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {masterGamesList.slice(0, 8).map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setGameName(p.name);
                        autoMatchCompanyForGame(p.name);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-900 transition shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <span>{p.name}</span>
                      {p.brandName && <span className="text-[8px] opacity-75 font-normal">({p.brandName})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Casino Selection & Game Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Casino Searchable Select */}
              <div className="space-y-1.5" ref={dropdownRef}>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Select Casino Brand (ক্যাসিনো সাইট) *
                </label>
                
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => !loadingCasinos && setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-left text-xs font-bold text-slate-800 transition cursor-pointer shadow-xs"
                  >
                    {loadingCasinos ? (
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                        Loading operators...
                      </span>
                    ) : (() => {
                        const currentCasino = selectedCasino || casinos.find((c) => c.casinoName.toLowerCase() === (searchQuery || "").trim().toLowerCase());
                        if (currentCasino) {
                          const logoUrl = getNormalizedLogo(currentCasino, theme?.globalSettings?.logoUrl);
                          return (
                            <span className="flex items-center gap-2.5">
                              {logoUrl ? (
                                <img 
                                  src={logoUrl} 
                                  alt="" 
                                  className="h-5 w-5 object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="h-5 w-5 bg-indigo-50 text-indigo-700 font-black rounded flex items-center justify-center text-[10px] border border-indigo-100 shrink-0">
                                  {currentCasino.casinoName.substring(0, 2)}
                                </div>
                              )}
                              <span className="text-slate-800 font-extrabold">{currentCasino.casinoName}</span>
                            </span>
                          );
                        }
                        return <span className="text-slate-400 font-semibold">Choose casino brand...</span>;
                      })()}
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top animate-in fade-in duration-150">
                      <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                        <Search className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
                        <input
                          type="text"
                          placeholder="Search casino name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full py-1.5 text-xs font-bold text-slate-800 bg-transparent focus:outline-none placeholder-slate-400"
                        />
                      </div>
                      
                      <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
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
                              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50/50 transition text-xs font-semibold text-slate-700 flex items-center gap-2.5 cursor-pointer"
                            >
                              {getNormalizedLogo(c, theme?.globalSettings?.logoUrl) ? (
                                <img 
                                  src={getNormalizedLogo(c, theme?.globalSettings?.logoUrl)} 
                                  alt="" 
                                  className="h-5 w-5 object-contain rounded bg-slate-100 p-0.5"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="h-5 w-5 bg-indigo-50 text-indigo-700 font-black rounded flex items-center justify-center text-[9px] border border-indigo-100">
                                  {c.casinoName.substring(0,2)}
                                </div>
                              )}
                              <span className="flex-1 font-bold text-slate-800">{c.casinoName}</span>
                              {selectedCasino?.id === c.id && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Game Name Autocomplete Dropdown */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Game Name / গেমের নাম ( e.g. Aviator, Sweet Bonanza )
                </label>
                <div className="relative flex items-center">
                  {(() => {
                    const selectedGameObj = getGameObj(gameName);
                    if (selectedGameObj?.logoUrl) {
                      return (
                        <div className="absolute left-2.5 z-10 w-6 h-6 rounded-md bg-slate-900 overflow-hidden border border-slate-200 shrink-0 p-0.5 flex items-center justify-center pointer-events-none">
                          <img src={selectedGameObj.logoUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <input
                    type="text"
                    placeholder="e.g. Aviator, Crazy Time"
                    value={gameName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGameName(val);
                      setShowGameSuggestions(true);
                      autoMatchCompanyForGame(val);
                    }}
                    onFocus={() => setShowGameSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowGameSuggestions(false), 200);
                    }}
                    className={`w-full py-2.5 pr-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition ${
                      getGameObj(gameName)?.logoUrl ? "pl-10" : "px-3.5"
                    }`}
                    autoComplete="off"
                  />
                </div>

                {showGameSuggestions && uniqueGameSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl divide-y divide-slate-100">
                    {uniqueGameSuggestions.map((gSuggestion, idx) => {
                      const gObj = getGameObj(gSuggestion);
                      return (
                        <button
                          key={gSuggestion}
                          type="button"
                          onMouseDown={() => {
                            setGameName(gSuggestion);
                            setShowGameSuggestions(false);
                            autoMatchCompanyForGame(gSuggestion);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-2.5 cursor-pointer ${
                            idx === highlightedGameIndex ? "bg-indigo-600 text-white" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          {gObj?.logoUrl ? (
                            <img src={gObj.logoUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0 border border-slate-200" referrerPolicy="no-referrer" />
                          ) : (
                            <Coins className="w-4 h-4 text-indigo-500 shrink-0" />
                          )}
                          <div className="flex-1 truncate">
                            <span className="font-bold">{gSuggestion}</span>
                            {gObj?.brandName && (
                              <span className="ml-2 text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {gObj.brandName}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Win Amount */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Win Amount / জিত টাকার পরিমাণ (৳)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-black text-slate-400">৳</span>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Calculated Prize Money Preview Info Box */}
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-indigo-50/70 border border-indigo-150 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-indigo-900 font-bold">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{calculatedInfo.message}</span>
                </div>
                <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-black shrink-0">
                  +৳{calculatedInfo.price} Prize
                </div>
              </div>
            )}

            {/* 4. Win Date & Time */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Win Date & Time *
              </label>
              <div className="relative rounded-xl shadow-xs border border-slate-200 bg-slate-50 focus-within:border-indigo-500 focus-within:bg-white transition duration-150 flex items-center px-3.5 py-1">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0 mr-2.5" />
                <input
                  type="datetime-local"
                  required
                  value={winDateTime}
                  onChange={(e) => setWinDateTime(e.target.value)}
                  className="w-full py-2 bg-transparent focus:outline-none text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            {/* 5. Screenshot uploads side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Jackpot Screenshot */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Win / Jackpot Proof Screenshot *
                </label>
                <div
                  onDragEnter={handleJackpotDrag}
                  onDragOver={handleJackpotDrag}
                  onDragLeave={handleJackpotDrag}
                  onDrop={handleJackpotDrop}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition duration-200 flex flex-col items-center justify-center min-h-[140px] relative ${
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
                      <div className="h-20 w-20 mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-xs relative group">
                        <img src={jackpotUrl} alt="Jackpot preview" className="h-full w-full object-cover transition duration-150 group-hover:scale-105" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => { setJackpotUrl(""); setJackpotFile(null); }}
                          className="absolute inset-0 bg-slate-900/60 hover:bg-slate-900/80 flex items-center justify-center text-white transition cursor-pointer"
                          title="Remove image"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Uploaded Win Proof
                      </span>
                    </div>
                  ) : (
                    <label className="cursor-pointer space-y-2 block w-full py-2">
                      <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <div className="text-slate-600 text-xs font-bold">
                        <span className="text-indigo-600 font-black hover:underline">Click to upload</span> or drag Win Proof
                      </div>
                      <p className="text-[9px] font-medium text-slate-400">PNG, JPG, JPEG (Max 5MB)</p>
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Balance Proof Screenshot (Optional)
                </label>
                <div
                  onDragEnter={handleBalanceDrag}
                  onDragOver={handleBalanceDrag}
                  onDragLeave={handleBalanceDrag}
                  onDrop={handleBalanceDrop}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition duration-200 flex flex-col items-center justify-center min-h-[140px] relative ${
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
                      <div className="h-20 w-20 mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-xs relative group">
                        <img src={balanceUrl} alt="Balance preview" className="h-full w-full object-cover transition duration-150 group-hover:scale-105" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => { setBalanceUrl(""); setBalanceFile(null); }}
                          className="absolute inset-0 bg-slate-900/60 hover:bg-slate-900/80 flex items-center justify-center text-white transition cursor-pointer"
                          title="Remove image"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Uploaded Balance Proof
                      </span>
                    </div>
                  ) : (
                    <label className="cursor-pointer space-y-2 block w-full py-2">
                      <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <div className="text-slate-600 text-xs font-bold">
                        <span className="text-indigo-600 font-black hover:underline">Click to upload</span> or drag Balance Proof
                      </div>
                      <p className="text-[9px] font-medium text-slate-400">PNG, JPG, JPEG (Max 5MB)</p>
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
                className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || jackpotUploading || balanceUploading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-98 flex items-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Directly Publishing & Approving...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Publish & Approve Directly</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Submission Data List Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Coins className="h-4 w-4 text-indigo-600" />
              <span>Live Published Review Records ({userReviews.length})</span>
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Manage all reviews and jackpot proof entries live on the site.
            </p>
          </div>
        </div>

        {loadingReviews ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2.5">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <span className="text-[10px] font-bold text-slate-400">Loading reviews...</span>
          </div>
        ) : userReviews.length === 0 ? (
          <div className="text-center py-14 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
            <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">No Submissions Yet</h4>
              <p className="text-[11px] font-semibold text-slate-400 max-w-sm mx-auto leading-relaxed">
                Once you upload a verified screenshot and submit, your record will populate here instantly.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table Layout */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">User / Game</th>
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
                        {/* User & Game info */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-slate-900 block leading-tight">
                              {review.userName || "Anonymous"}
                            </span>
                            <span className="text-[10px] text-indigo-600 font-bold block">
                              {review.gameName ? `${review.gameName} ${review.multiplier ? `(${review.multiplier})` : ""}` : (review.title || "Win Record")}
                            </span>
                          </div>
                        </td>

                        {/* Operator info */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {getNormalizedLogo(matchedCasino, theme?.globalSettings?.logoUrl) ? (
                              <img
                                src={getNormalizedLogo(matchedCasino, theme?.globalSettings?.logoUrl)}
                                alt=""
                                className="h-6 w-6 rounded-lg object-contain bg-slate-50 p-0.5 border border-slate-150"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-700 font-black flex items-center justify-center text-[10px] border border-indigo-100">
                                {matchedCasino?.casinoName ? matchedCasino.casinoName.substring(0, 2) : "??"}
                              </div>
                            )}
                            <span className="text-xs font-bold text-slate-800">
                              {matchedCasino?.casinoName || review.casinoName || "Unknown"}
                            </span>
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
                            {(review.jackpotScreenshot || review.screenshotUrl) && (
                              <a
                                href={review.jackpotScreenshot || review.screenshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative h-9 w-9 rounded-lg overflow-hidden border border-slate-200 block cursor-pointer bg-slate-50 shadow-xs"
                                title="Click to view jackpot proof"
                              >
                                <img
                                  src={review.jackpotScreenshot || review.screenshotUrl}
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
                                className="group relative h-9 w-9 rounded-lg overflow-hidden border border-slate-200 block cursor-pointer bg-slate-50 shadow-xs"
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
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-100 rounded-full uppercase tracking-wider">
                              <Clock className="h-3 w-3 text-amber-500 animate-pulse" />
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Deletion action */}
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => confirmDeleteSubmission(review.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete review"
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

            {/* Mobile Card Grid Layout */}
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
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 leading-tight">
                          {review.userName || "Anonymous"}
                        </h4>
                        <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">
                          {review.gameName ? `${review.gameName} ${review.multiplier ? `(${review.multiplier})` : ""}` : (review.title || "Win Record")}
                        </span>
                      </div>
                      <button
                        onClick={() => confirmDeleteSubmission(review.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Delete review"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-600">{matchedCasino?.casinoName || review.casinoName || "Unknown"}</span>
                      {review.approved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full uppercase">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-100 rounded-full uppercase">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {submissionToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Delete Review Record?
                </h3>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Are you sure you want to permanently delete this review and screenshot record? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSubmissionToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition duration-150 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
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

