import React from "react";
import { Link } from "react-router-dom";
import { Star, Globe, ArrowUpRight } from "lucide-react";
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
      whileHover={{ y: -6, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-white transition-all duration-500 ${
        featured 
          ? "border-amber-300/80 bg-linear-to-b from-amber-50/20 via-white to-white ring-1 ring-amber-300/20 shadow-[0_4px_20px_rgba(245,158,11,0.03)]" 
          : "border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.015)]"
      }`}
    >
      {/* Banner thumbnail overlay */}
      <div className="relative h-28 sm:h-36 w-full overflow-hidden bg-slate-950">
        {bannerImage ? (
          <img
            src={bannerImage}
            alt={`${casinoName} banner`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950" />
        )}
        
        {/* Banner Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

        {/* Badges Overlay */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 z-10">
          {featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-amber-400 to-amber-500 px-2.5 py-0.5 text-[8px] sm:text-[9px] font-black text-amber-950 shadow-xs uppercase tracking-wider">
              ⭐ Featured
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-2 py-0.5 text-[8px] sm:text-[9px] font-extrabold text-white uppercase tracking-wider">
            {category || "Casino"}
          </span>
        </div>

        {/* Rating Overlay */}
        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-950/70 backdrop-blur-md px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-white border border-white/5">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span>{Number(averageRating || 4.8).toFixed(1)}</span>
        </div>
      </div>

      {/* Card Content body */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between relative">
        
        {/* Floating Casino Logo (Overlapping banner) */}
        <div className="absolute -top-7 sm:-top-9 left-4 sm:left-5 z-20 h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-white p-1 shadow-md border border-slate-100/90 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 group-hover:shadow-lg">
          {casinoLogo ? (
            <img
              src={casinoLogo}
              alt={`${casinoName} logo`}
              className="h-full w-full object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black flex items-center justify-center text-sm rounded-xl">
              {casinoName?.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Casino Name and Details */}
        <div className="pt-6 sm:pt-8 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-extrabold text-slate-900 text-xs sm:text-base leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1">
              {casinoName}
            </h3>
            {country && (
              <span className="inline-flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-slate-400 font-mono shrink-0">
                <Globe className="h-3 w-3 text-slate-400" />
                {country}
              </span>
            )}
          </div>

          {/* High converting welcome bonus display */}
          <div className="bg-slate-50 border border-slate-150/70 rounded-2xl p-2.5 sm:p-3 text-center transition-colors group-hover:bg-indigo-50/10 group-hover:border-indigo-100/50">
            <span className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-widest block leading-none mb-1.5">
              Welcome Reward
            </span>
            <span className="text-[10px] sm:text-xs font-black text-indigo-950 tracking-tight leading-tight block line-clamp-2 min-h-[30px] sm:min-h-[36px] flex items-center justify-center">
              {welcomeBonus || "Exclusive Welcome Promo"}
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col gap-2">
          {/* Claim Bonus Button */}
          <a
            id={`casino-visit-btn-${slug}`}
            href={affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleVisitClick}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-[10px] sm:text-xs font-black text-white shadow-sm shadow-indigo-500/10 hover:shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer text-center"
          >
            <span>Claim Bonus</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          {/* Read review details button */}
          <Link
            id={`casino-review-btn-${slug}`}
            to={`/casino/${slug}`}
            className="w-full inline-flex items-center justify-center py-2 px-4 rounded-xl border border-slate-200 hover:border-indigo-200 bg-white hover:bg-indigo-50/15 text-[9px] sm:text-[11px] font-bold text-slate-600 hover:text-indigo-700 transition duration-300 text-center"
          >
            <span>Detailed Audit</span>
          </Link>
        </div>

      </div>
    </motion.div>
  );
};

export default CasinoCard;
