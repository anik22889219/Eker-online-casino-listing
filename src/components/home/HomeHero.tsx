import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle, 
  Coins, 
  Upload, 
  X, 
  Loader2, 
  Calendar, 
  Smartphone, 
  Check, 
  Lock,
  Eye
} from "lucide-react";
import { db, auth } from "../../firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { useCasinos } from "../../hooks/useCasinos";

// @ts-ignore
import tigerMascot from "../../assets/images/tiger_mascot_1783120916732.jpg";
// @ts-ignore
import defaultDemoScreenshot from "../../assets/images/demo_screenshot_1783151508532.jpg";
// @ts-ignore
import defaultDemoBalance from "../../assets/images/demo_balance_1783152014334.jpg";

interface HomeHeroProps {}

export const HomeHero: React.FC<HomeHeroProps> = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);

  // Demo screenshot modals state
  const [demoScreenshot, setDemoScreenshot] = useState<string>("");
  const [demoBalance, setDemoBalance] = useState<string>("");
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isDemoBalanceModalOpen, setIsDemoBalanceModalOpen] = useState(false);

  // Load demo configs from settings
  useEffect(() => {
    const fetchDemoScreenshots = async () => {
      try {
        const docRef = doc(db, 'settings', 'system_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDemoScreenshot(data.demoScreenshotUrl || defaultDemoScreenshot);
          setDemoBalance(data.demoBalanceUrl || defaultDemoBalance);
        } else {
          setDemoScreenshot(defaultDemoScreenshot);
          setDemoBalance(defaultDemoBalance);
        }
      } catch (err) {
        console.error("Error fetching system config:", err);
        setDemoScreenshot(defaultDemoScreenshot);
        setDemoBalance(defaultDemoBalance);
      }
    };
    fetchDemoScreenshots();
  }, []);

  // Casino suggestions state
  const { casinos } = useCasinos();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Form States
  const [appName, setAppName] = useState("");
  const [bikashNumber, setBikashNumber] = useState("");

  const filteredSuggestions = appName.trim() === ""
    ? casinos.map(c => c.casinoName)
    : casinos
        .filter(c => c.casinoName.toLowerCase().includes(appName.toLowerCase()))
        .map(c => c.casinoName);

  const uniqueSuggestions = Array.from(new Set(filteredSuggestions)).sort();

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [appName]);
  const [jackpotAmount, setJackpotAmount] = useState("");
  const [dateTime, setDateTime] = useState("");

  // Price money calculation
  const getCalculatedPriceMoney = () => {
    const amt = parseFloat(jackpotAmount);
    if (isNaN(amt) || amt < 100) {
      return { price: 0, message: "৳১০০ এর নিচে কোন প্রাইজ মানি নেই" };
    }
    if (amt >= 2000) {
      return { price: 200, message: "৳২০০০ বা তার বেশি হলে সর্বোচ্চ ৳২০০ প্রাইজ মানি" };
    }
    const price = Math.floor(amt / 100) * 10;
    return { 
      price: Math.min(price, 200), 
      message: `প্রতি ১০০ টাকার জন্য ১০ টাকা হারে আপনার প্রাইজ মানি` 
    };
  };

  const calculatedInfo = getCalculatedPriceMoney();
  
  // Image Upload States
  const [jackpotFile, setJackpotFile] = useState<File | null>(null);
  const [balanceFile, setBalanceFile] = useState<File | null>(null);
  const [jackpotPreview, setJackpotPreview] = useState<string | null>(null);
  const [balancePreview, setBalancePreview] = useState<string | null>(null);
  
  const [uploadingJackpot, setUploadingJackpot] = useState(false);
  const [uploadingBalance, setUploadingBalance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen to Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google sign-in failed:", err);
      setError("Google Login was canceled or failed.");
    }
  };

  const handleJackpotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJackpotFile(file);
    setJackpotPreview(URL.createObjectURL(file));
  };

  const handleBalanceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBalanceFile(file);
    setBalancePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please log in with Google before submitting.");
      return;
    }

    if (!appName || !bikashNumber || !jackpotAmount || !dateTime) {
      setError("Please fill out all required text fields.");
      return;
    }

    if (!jackpotFile || !balanceFile) {
      setError("Please upload both jackpot and balance screenshots.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Upload Jackpot Screenshot
      setUploadingJackpot(true);
      const jackpotUrl = await uploadToCloudinary(jackpotFile, "user-submissions", jackpotFile.name);
      setUploadingJackpot(false);

      // 2. Upload Balance Screenshot
      setUploadingBalance(true);
      const balanceUrl = await uploadToCloudinary(balanceFile, "user-submissions", balanceFile.name);
      setUploadingBalance(false);

      // 3. Save to Firestore collection 'sellRequests'
      await addDoc(collection(db, "sellRequests"), {
        name: user.displayName || user.email || "User",
        email: user.email || "",
        casinoName: appName,
        affiliateLink: "https://bKash.payment", // Default filler for schema enforcer rules
        screenshot: jackpotUrl, // Map main screenshot to jackpotUrl
        balanceScreenshot: balanceUrl,
        bikashNumber: bikashNumber,
        dateTime: dateTime,
        userId: user.uid,
        amount: Number(jackpotAmount),
        message: `Jackpot submission for ${appName}. Payment BKash: ${bikashNumber}. Time: ${dateTime}.`,
        status: "pending",
        createdAt: new Date().toISOString()
      });

      setSubmitSuccess(true);
      // Reset form
      setAppName("");
      setBikashNumber("");
      setJackpotAmount("");
      setDateTime("");
      setJackpotFile(null);
      setBalanceFile(null);
      setJackpotPreview(null);
      setBalancePreview(null);
    } catch (err: any) {
      console.error("Submission failed:", err);
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadingJackpot(false);
      setUploadingBalance(false);
    }
  };

  return (
    <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-10 border border-slate-800/85">
      {/* Background ambient accents */}
      <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute left-1/3 bottom-0 -mb-20 h-80 w-80 rounded-full bg-emerald-600/5 blur-3xl pointer-events-none" />

      {/* Main Grid: Left content, Right tiger image */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 text-[10px] sm:text-[11px] font-extrabold text-amber-400 uppercase tracking-wider shadow-xs">
              <Coins className="h-3.5 w-3.5" />
              Instant bKash Cashout
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-[10px] sm:text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider shadow-xs">
              <CheckCircle className="h-3.5 w-3.5" />
              100% Secure & Verified
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-black text-3xl sm:text-5xl tracking-tight leading-tight text-white">
            আপনার জ্যাকপট স্ক্রিনশট <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-rose-450 font-black">বিক্রি করুন!</span> 🎰
          </h1>

          <p className="text-slate-350 text-xs sm:text-sm leading-relaxed font-semibold max-w-2xl mx-auto lg:mx-0">
            আমরা আপনার ক্যাসিনো বা স্লট গেমের বড় জ্যাকপট এবং ব্যালেন্স স্ক্রিনশট উপযুক্ত মূল্যে কিনে নিচ্ছি। নিচে আমাদের রিওয়ার্ড টিয়ার দেখে নিন এবং সরাসরি বিকাশ পেমেন্ট পেতে এখনই বিক্রি করুন!
          </p>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto lg:mx-0">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-4.5 rounded-2xl text-left space-y-2 hover:border-amber-500/30 transition-all duration-300">
              <span className="text-[9px] uppercase font-black tracking-widest text-amber-400 block font-mono">Tier 1 Rewards</span>
              <h4 className="font-extrabold text-sm text-slate-100">১০০ থেকে ৫০০ টাকার জ্যাকপট</h4>
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">আপনার স্ক্রিনশটের মূল্য: <strong className="text-white text-xs sm:text-sm font-black">১০ টাকা থেকে ৫০ টাকা</strong></p>
            </div>
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-4.5 rounded-2xl text-left space-y-2 hover:border-emerald-500/30 transition-all duration-300">
              <span className="text-[9px] uppercase font-black tracking-widest text-emerald-400 block font-mono">Tier 2 Rewards</span>
              <h4 className="font-extrabold text-sm text-slate-100">৬০০ থেকে ১০০০+ টাকার জ্যাকপট</h4>
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">আপনার স্ক্রিনশটের মূল্য: <strong className="text-white text-xs sm:text-sm font-black">৬০ টাকা থেকে সর্বোচ্চ ২০০ টাকা</strong></p>
            </div>
          </div>

          {/* Sell Now Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                setSubmitSuccess(false);
                setError(null);
                setIsModalOpen(true);
              }}
              className="px-8 py-4 bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-orange-500/10 hover:shadow-orange-500/20 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2.5 mx-auto lg:mx-0 cursor-pointer"
            >
              <Coins className="w-5 h-5" />
              <span>সরাসরি বিক্রি করুন (Sell Now)</span>
            </button>
          </div>
        </div>

        {/* Right column: Image */}
        <div className="lg:col-span-5 flex justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-rose-500 rounded-3xl blur-md opacity-30 animate-pulse" />
            <img
              src={tigerMascot}
              alt="Eker Tiger Mascot holding Jackpot Coins"
              className="w-full max-w-[280px] sm:max-w-sm rounded-3xl border-2 border-slate-800 shadow-2xl object-cover relative"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
      </div>

      {/* Sell Screenshot Popup Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-xl w-full shadow-2xl text-white flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                    জ্যাকপট স্ক্রিনশট বিক্রি করুন (Sell Jackpot Screenshot)
                  </span>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-full border border-slate-800 hover:bg-slate-850 text-slate-400 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                
                {/* 1. If not logged in: Show Google Login Block */}
                {!user ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-slate-950 border border-slate-800 text-amber-400 flex items-center justify-center mx-auto shadow-md">
                      <Lock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-white">Google Login Required</h4>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-normal font-semibold">
                        স্ক্রিনশট জমা দেওয়ার আগে আপনাকে অবশ্যই গুগল একাউন্ট দিয়ে লগইন করতে হবে।
                      </p>
                    </div>

                    {error && (
                      <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl max-w-sm mx-auto">
                        {error}
                      </p>
                    )}

                    <button
                      onClick={handleGoogleSignIn}
                      className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
                    >
                      {/* Google Logo */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.84 14.93 1 12 1 7.37 1 3.39 3.67 1.41 7.56l3.77 2.92c.9-2.7 3.4-4.44 6.82-4.44z"
                        />
                        <path
                          fill="#4285F4"
                          d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.44c-.28 1.48-1.11 2.73-2.36 3.58l3.65 2.83c2.14-1.97 3.36-4.88 3.36-8.5z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.18 14.52a7.18 7.18 0 0 1 0-4.52L1.41 7.08a11.97 11.97 0 0 0 0 9.84l3.77-2.92z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.65-2.83c-1.01.68-2.31 1.08-4.31 1.08-3.42 0-5.92-1.74-6.82-4.44L1.41 16.8c1.98 3.89 5.96 6.56 10.59 6.56z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </div>
                ) : submitSuccess ? (
                  /* Submit Success Animation State */
                  <div className="py-8 text-center space-y-4">
                    <div className="h-16 w-16 bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-md">
                      <Check className="w-8 h-8" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-black text-base text-white">সফলভাবে সাবমিট করা হয়েছে!</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-normal font-semibold">
                        ধন্যবাদ! আপনার স্ক্রিনশটটি এডমিন প্যানেলে পাঠানো হয়েছে। যাচাইকরণের পর আপনার বিকাশ নম্বরে টাকা পাঠিয়ে দেওয়া হবে। আপনি আপনার প্রোফাইল পেজে এর লাইভ স্ট্যাটাস দেখতে পারবেন।
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        setSubmitSuccess(false);
                      }}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-extrabold text-xs rounded-xl text-white transition cursor-pointer"
                    >
                      Close Portal
                    </button>
                  </div>
                ) : (
                  /* 2. Logged In: Show Submissions Form */
                  <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    {/* User identifier strip */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>Logged in as: <span className="text-indigo-400">{user.email}</span></span>
                      <span className="text-xs text-emerald-400">✓ Auth Active</span>
                    </div>

                    {/* App Name */}
                    <div className="space-y-1 relative">
                      <label htmlFor="modal-app-name" className="text-xs font-bold text-slate-400">App Name / Casino (এপের নাম) *</label>
                      <input
                        id="modal-app-name"
                        type="text"
                        required
                        placeholder="যেমন: Megapari, Melbet, 1xBet..."
                        value={appName}
                        onChange={(e) => {
                          setAppName(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => {
                          // Allow onMouseDown on button to register before suggestions list is hidden
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        onKeyDown={(e) => {
                          if (!showSuggestions || uniqueSuggestions.length === 0) return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setHighlightedIndex((prev) => (prev + 1) % uniqueSuggestions.length);
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setHighlightedIndex((prev) => (prev - 1 + uniqueSuggestions.length) % uniqueSuggestions.length);
                          } else if (e.key === "Enter") {
                            if (highlightedIndex >= 0 && highlightedIndex < uniqueSuggestions.length) {
                              e.preventDefault();
                              setAppName(uniqueSuggestions[highlightedIndex]);
                              setShowSuggestions(false);
                              setHighlightedIndex(-1);
                            }
                          } else if (e.key === "Escape") {
                            setShowSuggestions(false);
                            setHighlightedIndex(-1);
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white"
                        autoComplete="off"
                      />
                      {showSuggestions && uniqueSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl shadow-2xl divide-y divide-slate-900 scrollbar-thin scrollbar-thumb-slate-800">
                          {uniqueSuggestions.map((suggestion, index) => (
                            <button
                              key={suggestion}
                              type="button"
                              onMouseDown={() => {
                                setAppName(suggestion);
                                setShowSuggestions(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-xs text-slate-300 font-semibold transition-colors duration-150 flex items-center gap-2 cursor-pointer ${
                                index === highlightedIndex ? "bg-indigo-600 text-white" : "hover:bg-slate-900"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${index === highlightedIndex ? "bg-white" : "bg-indigo-500"}`} />
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bikash Number */}
                    <div className="space-y-1">
                      <label htmlFor="modal-bikash" className="text-xs font-bold text-slate-400">bKash Personal Number (বিকাশ পার্সোনাল নম্বর) *</label>
                      <input
                        id="modal-bikash"
                        type="text"
                        required
                        placeholder="যেমন: 017XXXXXXXX"
                        value={bikashNumber}
                        onChange={(e) => setBikashNumber(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white"
                      />
                    </div>

                    {/* Jackpot Amount */}
                    <div className="space-y-1">
                      <label htmlFor="modal-jackpot" className="text-xs font-bold text-slate-400">Jackpot Win Amount in Taka (জ্যাকপট উইন এমাউন্ট) *</label>
                      <input
                        id="modal-jackpot"
                        type="number"
                        required
                        placeholder="যেমন: 450"
                        value={jackpotAmount}
                        onChange={(e) => setJackpotAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white"
                      />
                      {jackpotAmount && (
                        <div className="mt-2 p-2.5 bg-indigo-950/40 border border-indigo-900/50 rounded-xl flex items-center justify-between text-[11px] font-semibold text-indigo-300">
                          <div className="flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-emerald-400 animate-pulse" />
                            <span>প্রাইজ মানি (Estimated Reward):</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-emerald-400">৳{calculatedInfo.price} Tk</span>
                            <span className="text-[9px] text-slate-400 font-normal mt-0.5">{calculatedInfo.message}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Date and Time */}
                    <div className="space-y-1">
                      <label htmlFor="modal-datetime" className="text-xs font-bold text-slate-400">Jackpot Hit Date & Time (উইনের তারিখ ও সময়) *</label>
                      <input
                        id="modal-datetime"
                        type="datetime-local"
                        required
                        value={dateTime}
                        onChange={(e) => setDateTime(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white"
                      />
                    </div>

                    {/* Double Image Upload Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Jackpot Screenshot */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-400">Jackpot Screenshot *</label>
                          <button
                            type="button"
                            onClick={() => setIsDemoModalOpen(true)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Demo (ডেমো স্ক্রিনশট)
                          </button>
                        </div>
                        <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-3 text-center bg-slate-950 relative transition">
                          {jackpotPreview ? (
                            <div className="relative group">
                              <img src={jackpotPreview} alt="Jackpot preview" className="h-28 w-full object-cover rounded-lg" />
                              <button
                                type="button"
                                onClick={() => { setJackpotFile(null); setJackpotPreview(null); }}
                                className="absolute top-1 right-1 p-1 bg-red-600 rounded-full hover:bg-red-700 text-white shadow"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center py-4 cursor-pointer">
                              <Upload className="w-6 h-6 text-slate-500 mb-1.5" />
                              <span className="text-[10px] text-indigo-400 font-bold">Upload Jackpot</span>
                              <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">JPEG, PNG up to 5MB</span>
                              <input type="file" required accept="image/*" onChange={handleJackpotFileChange} className="hidden" />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Balance Screenshot */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-400">Balance Screenshot *</label>
                          <button
                            type="button"
                            onClick={() => setIsDemoBalanceModalOpen(true)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Demo (ডেমো স্ক্রিনশট)
                          </button>
                        </div>
                        <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-3 text-center bg-slate-950 relative transition">
                          {balancePreview ? (
                            <div className="relative group">
                              <img src={balancePreview} alt="Balance preview" className="h-28 w-full object-cover rounded-lg" />
                              <button
                                type="button"
                                onClick={() => { setBalanceFile(null); setBalancePreview(null); }}
                                className="absolute top-1 right-1 p-1 bg-red-600 rounded-full hover:bg-red-700 text-white shadow"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center py-4 cursor-pointer">
                              <Upload className="w-6 h-6 text-slate-500 mb-1.5" />
                              <span className="text-[10px] text-indigo-400 font-bold">Upload Balance</span>
                              <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">JPEG, PNG up to 5MB</span>
                              <input type="file" required accept="image/*" onChange={handleBalanceFileChange} className="hidden" />
                            </label>
                          )}
                        </div>
                      </div>

                    </div>

                    {error && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 bg-slate-950/20 -mx-6 -mb-6 p-6">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2.5 border border-slate-800 hover:bg-slate-850 text-slate-400 rounded-xl text-xs font-extrabold transition cursor-pointer"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                        disabled={isSubmitting || uploadingJackpot || uploadingBalance}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>
                              {uploadingJackpot ? "Uploading Jackpot..." : uploadingBalance ? "Uploading Balance..." : "Submitting..."}
                            </span>
                          </>
                        ) : (
                          <>
                            <Coins className="w-3.5 h-3.5" />
                            <span>Submit Screenshot</span>
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Demo Screenshot Modal */}
      <AnimatePresence>
        {isDemoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDemoModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="text-xs font-black text-slate-100 tracking-wider">Demo Screenshot</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(false)}
                  className="p-1 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto max-h-[80vh] space-y-4">
                <div className="p-3 bg-indigo-950/40 border border-indigo-900/50 rounded-xl text-xs font-semibold text-indigo-300 space-y-1">
                  <p className="text-emerald-400 font-bold">💡 সঠিক নিয়মে স্ক্রিনশট দিন:</p>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    আপনার সিলেক্ট করা সময় এবং আপলোড করা স্ক্রিনশটের সময় অবশ্যই একই হতে হবে (যেমন উপরের লাল চিহ্নিত অংশে দেখানো হয়েছে)।
                  </p>
                </div>

                <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-slate-950 aspect-[9/16] max-h-[50vh] flex items-center justify-center">
                  <img
                    src={demoScreenshot || defaultDemoScreenshot}
                    alt="Demo Screenshot Details"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/30 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  ঠিক আছে, বুঝেছি
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Demo Balance Screenshot Modal */}
      <AnimatePresence>
        {isDemoBalanceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDemoBalanceModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-slate-100 tracking-wider">Demo Balance Screenshot</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDemoBalanceModalOpen(false)}
                  className="p-1 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto max-h-[80vh] space-y-4">
                <div className="p-3 bg-indigo-950/40 border border-indigo-900/50 rounded-xl text-xs font-semibold text-indigo-300 space-y-1">
                  <p className="text-emerald-400 font-bold">💡 সঠিক নিয়মে স্ক্রিনশট দিন:</p>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    আপনার সিলেক্ট করা সময় এবং আপলোড করা ব্যালেন্স স্ক্রিনশটের সময় অবশ্যই একই হতে হবে (যেমন উপরের লাল চিহ্নিত অংশে দেখানো হয়েছে)।
                  </p>
                </div>

                <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-slate-950 aspect-[9/16] max-h-[50vh] flex items-center justify-center">
                  <img
                    src={demoBalance || defaultDemoBalance}
                    alt="Demo Balance Screenshot Details"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/30 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDemoBalanceModalOpen(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  ঠিক আছে, বুঝেছি
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomeHero;
