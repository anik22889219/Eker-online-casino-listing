import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, ExternalLink, QrCode, Gift, Calendar, Share2, Award, ArrowUpRight } from "lucide-react";
import { AffiliateLink } from "../types";

interface DealModalProps {
  deal: AffiliateLink | null;
  onClose: () => void;
  onGoToLink: (deal: AffiliateLink) => void;
}

export default function DealModal({ deal, onClose, onGoToLink }: DealModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (!deal) return null;

  // Custom visual URL we show to users
  const referralTrackingUrl = deal.originalUrl;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralTrackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (deal.discountCode) {
      navigator.clipboard.writeText(deal.discountCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const formattedDate = new Date(deal.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          id="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        />

        {/* Modal body */}
        <motion.div
          id="deal-modal-container"
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl"
        >
          {/* Header Cover Banner */}
          <div className="bg-linear-to-r from-emerald-500 to-teal-600 px-6 pt-8 pb-16 text-white relative">
            <button
              id="close-modal-button"
              onClick={onClose}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/20 text-white transition-colors hover:bg-slate-950/35"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-md text-white">
                {deal.category || "General"}
              </span>
            </div>
            <h3 className="font-display text-2xl font-bold tracking-tight pr-8">
              {deal.title}
            </h3>
          </div>

          {/* Dialog Contents */}
          <div className="px-6 pb-6 -mt-10 relative">
            {/* Main Details Card */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-lg space-y-4">
              <p className="text-slate-600 text-sm leading-relaxed">
                {deal.description || "Get connected to this verified referral offer details and perks."}
              </p>

              {/* Benefits badge row */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-100/50 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
                    <Gift className="h-4 w-4 text-emerald-600" />
                    <span>Your Reward</span>
                  </div>
                  <p className="font-sans font-medium text-emerald-950 text-xs mt-1">
                    {deal.rewardText || "Automatic registration discount"}
                  </p>
                </div>

                <div className="rounded-xl bg-indigo-50/70 border border-indigo-100/50 p-3 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-800 font-semibold text-xs">
                    <Award className="h-4 w-4 text-indigo-600" />
                    <span>Referrer Bonus</span>
                  </div>
                  <p className="font-sans font-medium text-indigo-950 text-xs mt-1">
                    {deal.ownerRewardText || "Supports Creator"}
                  </p>
                </div>
              </div>

              {/* Promo code block */}
              {deal.discountCode && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Promo Coupon Code
                    </div>
                    <div className="font-mono font-bold text-slate-800 tracking-wider text-base">
                      {deal.discountCode}
                    </div>
                  </div>
                  <button
                    id="copy-code-button"
                    onClick={handleCopyCode}
                    className="flex h-10 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Copy trackable URL block */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  id="copy-link-button"
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4.5 w-4.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied Link!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4.5 w-4.5" />
                      <span>Copy Tracking Link</span>
                    </>
                  )}
                </button>

                <button
                  id="toggle-qr-button"
                  onClick={() => setShowQR(!showQR)}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all ${
                    showQR
                      ? "bg-slate-900 border-slate-950 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                  title="Generate QR code"
                >
                  <QrCode className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* QR Card Expansion panel */}
            <AnimatePresence>
              {showQR && (
                <motion.div
                  id="qr-code-drawer"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center flex flex-col items-center">
                    <p className="text-[11px] font-medium text-slate-500 mb-3">
                      Scan with mobile to visit on your phone
                    </p>
                    <div className="rounded-xl bg-white p-3 shadow-xs border border-slate-100">
                      <QRCodeSVG
                        value={referralTrackingUrl}
                        size={120}
                        fgColor="#047857"
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA action button */}
            <div className="grid grid-cols-1 gap-4 pt-6">
              <button
                id="claim-deal-button"
                onClick={() => onGoToLink(deal)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white py-4 font-sans font-semibold hover:bg-slate-850 active:scale-98 transition-all shadow-md group"
              >
                <span>Navigate to Deal</span>
                <ArrowUpRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              <div className="text-center text-[10px] text-slate-400 font-sans flex items-center justify-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>Verified: Added {formattedDate} | Total support interactions: {deal.clicks}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
