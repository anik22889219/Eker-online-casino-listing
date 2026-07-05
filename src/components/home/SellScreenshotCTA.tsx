import React, { useState, useRef, useEffect } from "react";
import { db } from "../../firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { UploadCloud, CheckCircle2, AlertTriangle, ShieldCheck, X, DollarSign, Sparkles, Coins, Eye } from "lucide-react";
import { useCasinos } from "../../hooks/useCasinos";

// @ts-ignore
import defaultDemoScreenshot from "../../assets/images/demo_screenshot_1783151508532.jpg";

export const SellScreenshotCTA: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [casinoName, setCasinoName] = useState("");

  // Demo screenshot modal state
  const [demoScreenshot, setDemoScreenshot] = useState<string>("");
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Load demo screenshot url from settings
  useEffect(() => {
    const fetchDemoScreenshot = async () => {
      try {
        const docRef = doc(db, 'settings', 'system_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().demoScreenshotUrl) {
          setDemoScreenshot(docSnap.data().demoScreenshotUrl);
        } else {
          setDemoScreenshot(defaultDemoScreenshot);
        }
      } catch (err) {
        console.error("Error fetching system config in CTA:", err);
        setDemoScreenshot(defaultDemoScreenshot);
      }
    };
    if (isOpen) {
      fetchDemoScreenshot();
    }
  }, [isOpen]);

  // Casino suggestions state
  const { casinos } = useCasinos();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const filteredSuggestions = casinoName.trim() === ""
    ? casinos.map(c => c.casinoName)
    : casinos
        .filter(c => c.casinoName.toLowerCase().includes(casinoName.toLowerCase()))
        .map(c => c.casinoName);

  const uniqueSuggestions = Array.from(new Set(filteredSuggestions)).sort();

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [casinoName]);
  const [amount, setAmount] = useState("");

  // Price money calculation
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
      message: `প্রতি ১০০ টাকার জন্য ১০ টাকা হারে আপনার প্রাইজ মানি` 
    };
  };

  const calculatedInfo = getCalculatedPriceMoney();
  const [message, setMessage] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  
  // Action state
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpenModal = () => {
      setIsOpen(true);
      setSuccess(false);
      setError(null);
    };
    window.addEventListener("open-screenshot-modal", handleOpenModal);
    return () => {
      window.removeEventListener("open-screenshot-modal", handleOpenModal);
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadToCloudinary(file, "user-submissions", file.name);
      setScreenshotUrl(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "File upload failed. Try another format.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !casinoName || !amount || !screenshotUrl) {
      setError("Please fill out all required fields and upload a screenshot.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, "sellRequests"), {
        name,
        email,
        casinoName,
        screenshot: screenshotUrl,
        amount: Number(amount),
        message: message || "No extra message provided.",
        status: "pending",
        affiliateLink: "", // Backwards compatibility field
        createdAt: new Date().toISOString(),
      });

      setSuccess(true);
      // Reset form fields
      setName("");
      setEmail("");
      setCasinoName("");
      setAmount("");
      setMessage("");
      setScreenshotUrl("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* 1. Marketing CTA Banner (Digital Marketer Conversion Optimized) */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-indigo-800/40 relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-44 w-44 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
        <div className="space-y-3 max-w-2xl relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            <DollarSign className="h-3.5 w-3.5" />
            Cash Out Your Win Slip
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
            Have a Winning Screenshot? <span className="text-indigo-400">We buy them from you!</span>
          </h2>
          <p className="text-slate-350 text-xs sm:text-sm font-medium leading-relaxed">
            Sell your high-roller or lucky-win screenshots to help other players identify high-payout opportunities. Get paid instantly when our validation desk approves your win records.
          </p>
        </div>

        <button
          id="trigger-sell-modal-btn"
          onClick={() => {
            setIsOpen(true);
            setSuccess(false);
            setError(null);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-lg shrink-0 self-start md:self-center cursor-pointer flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          <span>Sell Winning Screenshot</span>
        </button>
      </div>

      {/* 2. Interactive Lead-Gen Submission Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-xl w-full p-6 sm:p-8 relative shadow-2xl space-y-6 my-8">
            <button
              id="close-sell-modal-btn"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {success ? (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h3 className="font-sans font-black text-xl text-slate-900">Win Submission Sent Successfully!</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Our verification desk is reviewing your screenshot. Once validated, our specialists will contact you at your email to coordinate payment.
                </p>
                <button
                  id="sell-success-done-btn"
                  onClick={() => setIsOpen(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-sans font-black text-lg sm:text-xl text-slate-900">Submit Your Win Screenshot</h3>
                  <p className="text-xs text-slate-500 font-medium">Claim direct rewards for your high payout win records.</p>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-800 font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="sell-name" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Name</label>
                    <input
                      id="sell-name"
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="sell-email" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                    <input
                      id="sell-email"
                      type="email"
                      required
                      placeholder="e.g. john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 relative">
                    <label htmlFor="sell-casino-name" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Casino Brand</label>
                    <input
                      id="sell-casino-name"
                      type="text"
                      required
                      placeholder="e.g. Spin Palace Casino"
                      value={casinoName}
                      onChange={(e) => {
                        setCasinoName(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => {
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
                            setCasinoName(uniqueSuggestions[highlightedIndex]);
                            setShowSuggestions(false);
                            setHighlightedIndex(-1);
                          }
                        } else if (e.key === "Escape") {
                          setShowSuggestions(false);
                          setHighlightedIndex(-1);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                      autoComplete="off"
                    />
                    {showSuggestions && uniqueSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 scrollbar-thin scrollbar-thumb-slate-200">
                        {uniqueSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion}
                            type="button"
                            onMouseDown={() => {
                              setCasinoName(suggestion);
                              setShowSuggestions(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors duration-150 flex items-center gap-2 cursor-pointer ${
                              index === highlightedIndex ? "bg-indigo-600 text-white" : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${index === highlightedIndex ? "bg-white" : "bg-indigo-500"}`} />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="sell-amount" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Winning Prize Amount (৳)</label>
                    <input
                      id="sell-amount"
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 1500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                    {amount && (
                      <div className="mt-2 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between text-[11px] font-semibold text-indigo-900">
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-emerald-500 animate-pulse" />
                          <span>প্রাইজ মানি (Estimated Reward):</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black text-emerald-600">৳{calculatedInfo.price} Tk</span>
                          <span className="text-[9px] text-slate-500 font-normal mt-0.5">{calculatedInfo.message}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="sell-message" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Brief Message (Optional)</label>
                  <textarea
                    id="sell-message"
                    rows={2}
                    placeholder="Describe how you hit the win! E.g. slots, bonus buy..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                {/* Drag and Drop File Upload Area */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label id="upload-label" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Attachment (Win Screenshot)</label>
                    <button
                      type="button"
                      onClick={() => setIsDemoModalOpen(true)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Demo (ডেমো স্ক্রিনশট)
                    </button>
                  </div>
                  
                  <div
                    id="drag-and-drop-container"
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                      dragActive ? "border-indigo-500 bg-indigo-50/25" : "border-slate-200 hover:bg-slate-50"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      id="screenshot-file-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleChange}
                      className="hidden"
                    />

                    {uploading ? (
                      <div className="space-y-2 py-2">
                        <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <span className="text-xs font-semibold text-slate-500 block">Uploading & optimizing screenshot...</span>
                      </div>
                    ) : screenshotUrl ? (
                      <div className="space-y-2 py-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                        <span className="text-xs font-bold text-emerald-800 block">Screenshot ready for validation</span>
                        <img
                          src={screenshotUrl}
                          alt="Uploaded preview"
                          className="h-16 w-auto object-cover rounded-md mx-auto border"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <UploadCloud className="h-8 w-8 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">Drag & drop your screenshot here, or click to browse</p>
                        <p className="text-[10px] text-slate-400 font-medium">JPEG, PNG up to 10MB (automatically optimized)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shield Note */}
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 mt-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Secure payout validation & SSL encrypted data flow</span>
                </div>

                {/* Action buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    id="cancel-sell-btn"
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2.5 border border-slate-250 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-sell-btn"
                    type="submit"
                    disabled={submitting || uploading || !screenshotUrl}
                    className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Submit Deal Bid</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Demo Screenshot Modal */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={() => setIsDemoModalOpen(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
          />
          
          {/* Modal Body */}
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl relative z-10 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-xs font-black text-slate-800 tracking-wider">Demo Screenshot</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto max-h-[80vh] space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-semibold text-indigo-900 space-y-1">
                <p className="text-indigo-700 font-bold">💡 সঠিক নিয়মে স্ক্রিনশট দিন:</p>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  আপনার সিলেক্ট করা সময় এবং আপলোড করা স্ক্রিনশটের সময় অবশ্যই একই হতে হবে (যেমন লাল চিহ্নিত অংশে দেখানো হয়েছে)।
                </p>
              </div>

              <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 aspect-[9/16] max-h-[50vh] flex items-center justify-center">
                <img
                  src={demoScreenshot || defaultDemoScreenshot}
                  alt="Demo Screenshot Details"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-150 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                ঠিক আছে, বুঝেছি
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SellScreenshotCTA;
