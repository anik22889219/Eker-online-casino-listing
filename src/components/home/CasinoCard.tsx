import React from "react";
import { Link } from "react-router-dom";
import { Star, Globe, ShieldCheck, ArrowUpRight, HelpCircle } from "lucide-react";
import { Casino } from "../../types/firestore";
import { trackAffiliateClick } from "../../services/ClickTrackingService";
import { motion } from "motion/react";

interface CasinoCardProps {
  casino: Casino;
}

export const CasinoCard: React.FC<CasinoCardProps> = ({ casino }) => {
  const {
    id,
    slug,
    casinoName,
    casinoLogo,
    bannerImage,
    welcomeBonus,
    category,
    country,
    featured,
    averageRating = 4.8,
    affiliateLink,
  } = casino;

  const handleVisitClick = (e: React.MouseEvent) => {
    // Perform non-blocking affiliate click tracking
    trackAffiliateClick(id, casinoName);
  };

  return (
    <motion.div
      id={`casino-card-${slug}`}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-xs transition-all duration-300 ${
        featured ? "border-amber-200 bg-gradient-to-b from-amber-50/10 to-white ring-1 ring-amber-100/50 shadow-md shadow-amber-500/[0.02]" : "border-slate-100"
      }`}
    >
      {/* Banner thumbnail overlay */}
      <div className="relative h-32 w-full overflow-hidden bg-slate-900">
        {bannerImage ? (
          <img
            src={bannerImage}
            alt={`${casinoName} banner`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-indigo-950 to-slate-900" />
        )}
        
        {/* Badges Overlay */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 z-10">
          {featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[9px] font-bold text-white shadow-xs uppercase tracking-wider">
              ⭐ Featured
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-slate-950/70 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
            {category || "Casino"}
          </span>
        </div>

        {/* Rating Overlay */}
        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-slate-950/75 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span>{Number(averageRating || 4.8).toFixed(1)}</span>
        </div>
      </div>

      {/* Card Content body */}
      <div className="flex-1 p-4 flex flex-col justify-between relative">
        
        {/* Casino Name and Details */}
        <div className="pt-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-sans font-bold text-slate-900 text-base leading-tight group-hover:text-indigo-600 transition-colors">
              {casinoName}
            </h3>
            {country && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 font-mono">
                <Globe className="h-3 w-3 text-slate-400" />
                {country}
              </span>
            )}
          </div>

          {/* High converting welcome bonus display */}
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 text-center mt-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block leading-none mb-1">Welcome Incentive Offer</span>
            <span className="text-sm font-extrabold text-indigo-950 tracking-tight leading-none block">
              {welcomeBonus || "Exclusive Match Deposit Deals"}
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-4 pt-3 border-t border-slate-50 flex flex-col sm:flex-row gap-2">
          {/* Read review details button */}
          <Link
            id={`casino-review-btn-${slug}`}
            to={`/casino/${slug}`}
            className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl border border-slate-250 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
          >
            <span>Read Review</span>
          </Link>

          {/* Visit Casino Direct Button */}
          <a
            id={`casino-visit-btn-${slug}`}
            href={affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleVisitClick}
            className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-650 text-xs font-bold text-white shadow-md shadow-indigo-500/10 transition cursor-pointer"
          >
            <span>Claim Bonus</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

      </div>
    </motion.div>
  );
};

export default CasinoCard;
