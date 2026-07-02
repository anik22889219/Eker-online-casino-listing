import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Casino } from "../../types/firestore";
import HomeHero from "./HomeHero";
import CasinoCard from "./CasinoCard";
import WinnerGallery from "./WinnerGallery";
import SellScreenshotCTA from "./SellScreenshotCTA";
import HomeFaq from "./HomeFaq";
import HomeFooter from "./HomeFooter";
import SeoHelper from "../SeoHelper";
import { Sparkles, Flame, Clock, RefreshCw } from "lucide-react";

export const HomeView: React.FC = () => {
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedBonusType, setSelectedBonusType] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);

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

  // 2. Extract unique filter option values dynamically
  const categories = useMemo(() => {
    const set = new Set<string>();
    casinos.forEach(c => { if (c.category) set.add(c.category); });
    return Array.from(set);
  }, [casinos]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    casinos.forEach(c => { if (c.country) set.add(c.country); });
    return Array.from(set);
  }, [casinos]);

  // Available bonus types extracted from welcomeBonus descriptions or standard tags
  const bonusTypes = ["Free Spins", "Deposit Match", "No Deposit", "Cashback", "VIP Reload"];

  // 3. Perform filtering logic on search and selectors
  const filteredCasinos = useMemo(() => {
    return casinos.filter((c) => {
      const nameMatch = c.casinoName?.toLowerCase().includes(searchTerm.toLowerCase());
      const catMatch = c.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const countryMatch = c.country?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = nameMatch || catMatch || countryMatch;

      const matchesCategory = selectedCategory === "all" || c.category === selectedCategory;
      const matchesCountry = selectedCountry === "all" || c.country === selectedCountry;
      
      // Filter by Bonus Type (matches welcomeBonus description)
      const matchesBonusType = selectedBonusType === "all" || 
        c.welcomeBonus?.toLowerCase().includes(selectedBonusType.toLowerCase());

      const matchesFeatured = !featuredOnly || c.featured;

      return matchesSearch && matchesCategory && matchesCountry && matchesBonusType && matchesFeatured;
    });
  }, [casinos, searchTerm, selectedCategory, selectedCountry, selectedBonusType, featuredOnly]);

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
    <div className="space-y-12 animate-fade-in">
      <SeoHelper
        title="Best Verified Casino Offers & Welcome Bonuses"
        description="Explore verified online casino reviews, exclusive deposit-match offers, cashback codes, and validated jackpot screenshots on Eker."
        keywords={["casino reviews", "exclusive bonuses", "trusted casinos", "jackpot screenshots"]}
        schemaJson={schemaJson}
      />

      {/* 1 & 2 & 3. Hero & Search & Category Filter */}
      <HomeHero
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedCountry={selectedCountry}
        setSelectedCountry={setSelectedCountry}
        selectedBonusType={selectedBonusType}
        setSelectedBonusType={setSelectedBonusType}
        featuredOnly={featuredOnly}
        setFeaturedOnly={setFeaturedOnly}
        categories={categories}
        countries={countries}
        bonusTypes={bonusTypes}
      />

      {loading ? (
        <div className="text-center py-24 space-y-4">
          <RefreshCw className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Compiling active directory listings...</p>
        </div>
      ) : (
        <div className="space-y-12">
          
          {/* 4. Featured Casinos Section */}
          {featuredCasinos.length > 0 && (
            <section className="space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Featured Operators</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredCasinos.map((c) => (
                  <CasinoCard key={c.id} casino={c} />
                ))}
              </div>
            </section>
          )}

          {/* 5. Latest Casinos Section */}
          <section className="space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Newly Added Listings</h2>
            </div>
            {latestCasinos.length === 0 ? (
              <div className="text-center py-10 rounded-2xl border border-dashed border-slate-200 bg-white">
                <p className="text-xs text-slate-400 font-bold uppercase">No matching listings found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestCasinos.map((c) => (
                  <CasinoCard key={c.id} casino={c} />
                ))}
              </div>
            )}
          </section>

          {/* 6. Popular Bonuses Section */}
          {popularBonuses.length > 0 && (
            <section className="space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Flame className="h-5 w-5 text-rose-500" />
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Top Rated Rewards</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularBonuses.map((c) => (
                  <CasinoCard key={c.id} casino={c} />
                ))}
              </div>
            </section>
          )}

          {/* 7. Winner Screenshot Gallery */}
          <WinnerGallery casinos={casinos} />

          {/* 8. Sell Your Winning Screenshot CTA */}
          <SellScreenshotCTA />

          {/* 9. FAQ Section */}
          <HomeFaq />

        </div>
      )}

      {/* 10. Footer */}
      <HomeFooter />
    </div>
  );
};

export default HomeView;
