import React from "react";
import { Search, SlidersHorizontal, CheckCircle, Flame, Star, Percent } from "lucide-react";

interface HomeHeroProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  selectedCountry: string;
  setSelectedCountry: (val: string) => void;
  selectedBonusType: string;
  setSelectedBonusType: (val: string) => void;
  featuredOnly: boolean;
  setFeaturedOnly: (val: boolean) => void;
  categories: string[];
  countries: string[];
  bonusTypes: string[];
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedCountry,
  setSelectedCountry,
  selectedBonusType,
  setSelectedBonusType,
  featuredOnly,
  setFeaturedOnly,
  categories,
  countries,
  bonusTypes,
}) => {
  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden mb-10 border border-slate-800">
      {/* Background ambient accents */}
      <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 bottom-0 -mb-20 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center gap-4 mb-4 relative z-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
          <CheckCircle className="h-3.5 w-3.5" />
          100% Verified Casinos
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 px-3 py-1 text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
          <Flame className="h-3.5 w-3.5" />
          Exclusive Bonuses Added Today
        </span>
      </div>

      {/* Headline & Description */}
      <div className="max-w-3xl space-y-4 mb-8 relative z-10">
        <h1 className="font-sans font-black text-3xl sm:text-5xl tracking-tight leading-none text-white">
          Compare & Claim the Best <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">Verified Casino Deals</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-base leading-relaxed font-medium">
          Get transparent, expert reviews, exclusive cashback offers, high-payout reload programs, and direct signup promotions. No gimmicks, just premium vetted operators.
        </p>
      </div>

      {/* Interactive Search & Filter Engine Container */}
      <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl relative z-10 space-y-4">
        {/* Row 1: Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
          <input
            id="hero-search"
            type="text"
            placeholder="Search by casino name, gaming category (e.g. Slots, Live), or country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 text-sm font-medium transition-all"
            aria-label="Search casinos"
          />
        </div>

        {/* Row 2: Secondary Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Country Filter */}
          <div className="space-y-1">
            <label htmlFor="country-select" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Country</label>
            <select
              id="country-select"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">🌐 All Countries / Universal</option>
              {countries.map((c) => (
                <option key={c} value={c}>📍 {c}</option>
              ))}
            </select>
          </div>

          {/* Bonus Type Filter */}
          <div className="space-y-1">
            <label htmlFor="bonus-type-select" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Promo Bonus Type</label>
            <select
              id="bonus-type-select"
              value={selectedBonusType}
              onChange={(e) => setSelectedBonusType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">🎁 All Bonus Types</option>
              {bonusTypes.map((bt) => (
                <option key={bt} value={bt}>✨ {bt}</option>
              ))}
            </select>
          </div>

          {/* Featured Toggle */}
          <div className="flex items-end pb-1.5">
            <label 
              id="featured-checkbox-label"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-xs font-bold text-slate-300 cursor-pointer w-full transition"
            >
              <input
                id="featured-checkbox"
                type="checkbox"
                checked={featuredOnly}
                onChange={(e) => setFeaturedOnly(e.target.checked)}
                className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500/20 h-4 w-4 bg-slate-950"
              />
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                Featured Operators Only
              </span>
            </label>
          </div>
        </div>

        {/* Row 3: Horizontal scrollable Category Tags */}
        <div className="pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-800">
            <button
              id="cat-pill-all"
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-white text-slate-950 shadow-md"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850"
              }`}
            >
              ⚡ All Categories
            </button>
            {categories.map((cat) => (
              <button
                id={`cat-pill-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-indigo-500 text-white shadow-md"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850"
                }`}
              >
                🎰 {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeHero;
