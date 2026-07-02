import React, { useState, useRef, useEffect } from "react";
import { db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { UploadCloud, CheckCircle2, AlertTriangle, ShieldCheck, X, DollarSign, Sparkles } from "lucide-react";

export const SellScreenshotCTA: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [casinoName, setCasinoName] = useState("");
  const [amount, setAmount] = useState("");
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
                  <div className="space-y-1">
                    <label htmlFor="sell-casino-name" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Casino Brand</label>
                    <input
                      id="sell-casino-name"
                      type="text"
                      required
                      placeholder="e.g. Spin Palace Casino"
                      value={casinoName}
                      onChange={(e) => setCasinoName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="sell-amount" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Winning Prize Amount ($)</label>
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
                  <label id="upload-label" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Attachment (Win Screenshot)</label>
                  
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
    </>
  );
};

export default SellScreenshotCTA;
