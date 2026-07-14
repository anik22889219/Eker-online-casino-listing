import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Casino } from "../../types/firestore";
import HomeHero from "./HomeHero";
import CasinoCarousel from "./CasinoCarousel";
import SellScreenshotCTA from "./SellScreenshotCTA";
import HomeFaq from "./HomeFaq";

import SeoHelper from "../SeoHelper";
import { Sparkles, Flame, Clock, RefreshCw, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export const HomeView: React.FC = () => {
  const { theme } = useTheme();
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Listen for published casinos in real-time
  useEffect(() => {
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
      setLoading(false);
    }, (err) => {
      console.warn("Error fetching casinos:", err);
      setLoading(false);
    });

    return unsub;
  }, []);

  // Show all active casinos since the search system is removed
  const filteredCasinos = casinos;

  // 4. Categorized listing splits
  const featuredCasinos = useMemo(() => {
    return filteredCasinos.filter((c) => c.featured);
  }, [filteredCasinos]);

  const latestCasinos = useMemo(() => {
    // Sort by createdAt desc
    return [...filteredCasinos].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredCasinos]);

  const popularBonuses = useMemo(() => {
    // Sorted by rating desc
    return [...filteredCasinos].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
  }, [filteredCasinos]);

  // Prepare Dynamic JSON-LD Schema
  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Eker Casino Listings",
    "url": window.location.origin,
    "description": "Premium modern verified affiliate directory for vetted and authorized online casino brands.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${window.location.origin}/?search={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10 animate-fade-in">
      <SeoHelper
        title="Best Verified Casino Offers & Welcome Bonuses"
        description="Explore verified online casino reviews, exclusive deposit-match offers, cashback codes, and validated jackpot screenshots on Eker."
        keywords={["casino reviews", "exclusive bonuses", "trusted casinos", "jackpot screenshots"]}
        schemaJson={schemaJson}
      />

      {loading ? (
        <div className="text-center py-24 space-y-4">
          <RefreshCw className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compiling active directory listings...</p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8 md:space-y-10">
          {theme.sections.map((sec) => {
            if (!sec.enabled) return null;

            switch (sec.type) {
              case "hero":
                return <HomeHero key={sec.id} config={sec} />;

              case "featured_operators":
                return featuredCasinos.length > 0 ? (
                  <section key={sec.id} className="space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        {sec.title}
                      </h2>
                    </div>
                    <CasinoCarousel casinos={featuredCasinos} />
                  </section>
                ) : null;

              case "latest_listings":
                return (
                  <section key={sec.id} className="space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Clock className="h-5 w-5 text-indigo-600" />
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        {sec.title}
                      </h2>
                    </div>
                    {latestCasinos.length === 0 ? (
                      <div className="text-center py-10 rounded-2xl border border-dashed border-slate-200 bg-white">
                        <p className="text-xs text-slate-400 font-bold uppercase">No matching listings found</p>
                      </div>
                    ) : (
                      <CasinoCarousel casinos={latestCasinos} />
                    )}
                  </section>
                );

              case "top_rated":
                return popularBonuses.length > 0 ? (
                  <section key={sec.id} className="space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Flame className="h-5 w-5 text-rose-500" />
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        {sec.title}
                      </h2>
                    </div>
                    <CasinoCarousel casinos={popularBonuses} />
                  </section>
                ) : null;

              case "sell_cta":
                return <SellScreenshotCTA key={sec.id} config={sec} />;

              case "faq":
                return <HomeFaq key={sec.id} config={sec} />;

              case "custom":
                return (
                  <section
                    key={sec.id}
                    className="rounded-3xl p-6 sm:p-10 border transition-all duration-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 text-left"
                    style={{
                      backgroundColor: sec.customBackgroundColor || "#ffffff",
                      color: sec.customTextColor || "#0f172a",
                      borderColor: "rgba(0,0,0,0.05)"
                    }}
                  >
                    <div className="space-y-3 max-w-2xl text-left">
                      <span className="text-[10px] uppercase font-black tracking-widest opacity-60 font-mono">
                        Branded Spot
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                        {sec.title}
                      </h2>
                      {sec.subtitle && (
                        <p className="text-xs font-semibold opacity-90 leading-relaxed">
                          {sec.subtitle}
                        </p>
                      )}
                      {sec.content && (
                        <div className="text-xs opacity-80 leading-relaxed space-y-2 whitespace-pre-wrap">
                          {sec.content}
                        </div>
                      )}
                    </div>
                    {sec.actionText && (
                      <div className="shrink-0 text-left md:text-right">
                        <a href={sec.actionUrl || "/#casinos"}>
                          <button
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer"
                          >
                            {sec.actionText}
                          </button>
                        </a>
                      </div>
                    )}
                  </section>
                );

              default:
                return null;
            }
          })}
        </div>
      )}


    </div>
  );
};

export default HomeView;
