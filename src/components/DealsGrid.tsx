import { useState, useMemo } from "react";
import { Search, Tag, Eye, SlidersHorizontal, Award, Sparkles, ExternalLink, ArrowRight, ShieldCheck, Flame, Trash2, Loader2, AlertCircle } from "lucide-react";
import { AffiliateLink } from "../types";
import { motion } from "motion/react";

interface DealsGridProps {
  deals: AffiliateLink[];
  onSelectDeal: (deal: AffiliateLink) => void;
  isAdminView?: boolean;
  onEditDeal?: (deal: AffiliateLink) => void;
  onDeleteDeal?: (dealId: string) => void;
}

export default function DealsGrid({
  deals,
  onSelectDeal,
  isAdminView = false,
  onEditDeal,
  onDeleteDeal,
}: DealsGridProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "clicks" | "alphabetical">("newest");
  const [dealToDelete, setDealToDelete] = useState<AffiliateLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dynamically extract categories
  const categories = useMemo(() => {
    const list = new Set<string>();
    deals.filter(d => !d.isArchived).forEach(d => {
      if (d.category) list.add(d.category);
    });
    return ["All", ...Array.from(list)];
  }, [deals]);

  // Filter & Sort
  const filteredDeals = useMemo(() => {
    let result = deals.filter(deal => {
      if (deal.isArchived && !isAdminView) return false;

      const matchesSearch =
        deal.title.toLowerCase().includes(search.toLowerCase()) ||
        (deal.description && deal.description.toLowerCase().includes(search.toLowerCase())) ||
        (deal.category && deal.category.toLowerCase().includes(search.toLowerCase())) ||
        (deal.discountCode && deal.discountCode.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory = selectedCategory === "All" || deal.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "clicks") {
        return (b.clicks || 0) - (a.clicks || 0);
      }
      if (sortBy === "alphabetical") {
        return a.title.localeCompare(b.title);
      }
      // default: newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [deals, search, selectedCategory, sortBy, isAdminView]);

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />
            <input
              id="search-input"
              type="text"
              placeholder="Search rewards, deals, promo codes, hosting tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white text-sm font-medium transition-all"
            />
          </div>

          {/* Sort Selection */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="h-4.5 w-4.5 text-slate-400" />
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="newest">Added (Newest)</option>
              <option value="clicks">Popularity (Clicks)</option>
              <option value="alphabetical">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Categories Scroller */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => (
            <button
              id={`cat-btn-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Deals */}
      {filteredDeals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Eye className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 font-display font-bold text-slate-800">No active links found</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            Try resetting your filters, searching for something else, or adding new referral programs above!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDeals.map((deal) => {
            const isHighlyPopular = deal.clicks >= 10;
            return (
              <motion.div
                id={`deal-card-${deal.id}`}
                key={deal.id}
                layoutId={`card-container-${deal.id}`}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:shadow-md"
              >
                <div>
                  {/* Top Header Row with Category & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      {deal.category || "General"}
                    </span>
                    
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-400">
                      <span>{deal.clicks || 0} clicks</span>
                      {isHighlyPopular && (
                        <span title="Highly clicked offer">
                          <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4 className="font-display font-bold text-slate-800 text-base leading-tight group-hover:text-emerald-600 transition-colors">
                    {deal.title}
                  </h4>
                  <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                    {deal.description || "Grab the official discounts, cashback programs, and special trial accounts."}
                  </p>

                  {/* Rewards summary snippet */}
                  <div className="mt-4 space-y-2 border-t border-slate-50 pt-3">
                    {deal.rewardText && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-950 font-semibold">{deal.rewardText}</span>
                      </div>
                    )}
                    {deal.discountCode && (
                      <div className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                        Code: <span className="font-bold text-slate-800 tracking-wider">{deal.discountCode}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Card Footer Actions */}
                <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                  {isAdminView ? (
                    <div className="w-full flex items-center justify-between gap-1">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-slate-500" /> Owner Access
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`edit-deal-btn-${deal.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditDeal) onEditDeal(deal);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
                        >
                          Modify
                        </button>
                        <button
                          id={`delete-deal-btn-${deal.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDealToDelete(deal);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-100 cursor-pointer"
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      id={`view-deal-btn-${deal.id}`}
                      onClick={() => onSelectDeal(deal)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-900 border border-slate-100 hover:border-slate-950 hover:text-white transition-all text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <span>Grab Offer & Code</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Custom Archive Confirmation Modal */}
      {dealToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-100 transform transition-all animate-in zoom-in-95 duration-200 space-y-6 text-left">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Archive Referral Link?
                </h3>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Are you sure you want to archive the referral link <span className="font-bold text-slate-800">"{dealToDelete.title}"</span>? This will hide it from the public directory.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDealToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition duration-150 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (onDeleteDeal) {
                    setIsDeleting(true);
                    try {
                      await onDeleteDeal(dealToDelete.id);
                      setDealToDelete(null);
                    } catch (err) {
                      console.error("Failed to archive deal:", err);
                    } finally {
                      setIsDeleting(false);
                    }
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition duration-150 disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-red-100 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirm Archive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
