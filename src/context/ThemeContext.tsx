import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, setDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { ThemeConfig, ThemeSection, MostWinningGameItem } from "../types/firestore";

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  id: "theme",
  globalSettings: {
    logoText: "Eker Listings",
    logoUrl: "/tk10_logo.jpg",
    faviconText: "🪙",
    faviconUrl: "",
    fontFamily: "Inter",
    primaryColor: "#4f46e5", // Indigo 600
    secondaryColor: "#0891b2", // Cyan 600
    backgroundColor: "#f8fafc", // Slate 50
    textColor: "#0f172a", // Slate 900
    cardBackgroundColor: "#ffffff",
    layoutType: "boxed",
    cardBorderRadius: "1rem",
    sectionSpacing: "3rem"
  },
  sections: [
    {
      id: "hero",
      type: "hero",
      title: "Best Verified Casino Offers & Welcome Bonuses",
      subtitle: "Explore verified online casino reviews, exclusive deposit-match offers, cashback codes, and validated jackpot screenshots on Eker.",
      actionText: "Claim Free Bonus",
      actionUrl: "/#casinos",
      backgroundGradientStart: "#0f172a",
      backgroundGradientEnd: "#1e1b4b",
      enabled: true
    },
    {
      id: "most_winning_games",
      type: "most_winning_games",
      title: "Most Winning Games",
      subtitle: "আমাদের প্ল্যাটফর্মের সবচেয়ে বেশি জয়ী গেমগুলোর তালিকা",
      enabled: true
    },
    {
      id: "featured_operators",
      type: "featured_operators",
      title: "Featured Operators",
      subtitle: "Top premium operators vetted by Eker",
      enabled: true
    },
    {
      id: "latest_listings",
      type: "latest_listings",
      title: "Newly Added Listings",
      subtitle: "Fresh verified casinos added recently",
      enabled: true
    },
    {
      id: "top_rated",
      type: "top_rated",
      title: "Top Rated Rewards",
      subtitle: "Highest-rated rewards and bonuses",
      enabled: true
    },
    {
      id: "sell_cta",
      type: "sell_cta",
      title: "Sell Your Winning Screenshot",
      subtitle: "Upload screenshot proof of your casino jackpot win and get rewarded cash instantly.",
      actionText: "Sell Your Jackpot Screenshot",
      enabled: true
    },
    {
      id: "faq",
      type: "faq",
      title: "Frequently Asked Questions",
      subtitle: "Everything you need to know about Eker",
      enabled: true
    }
  ],
  menuItems: [
    { id: "home", label: "Home", url: "/", openInNewTab: false },
    { id: "casinos", label: "Casinos", url: "/#casinos", openInNewTab: false },
    { id: "blog", label: "Blog", url: "/blog", openInNewTab: false },
    { id: "contact", label: "Contact Us", url: "/contact", openInNewTab: false }
  ],
  categoriesList: [
    "Exclusive",
    "No Deposit",
    "Free Spins",
    "Crypto Welcome",
    "Cashback Offers",
    "VIP Rewards"
  ],
  singleCasinoSettings: {
    sidebarLocation: "right",
    showRelatedJackpots: true,
    showVerifiedBadge: true,
    reviewBtnText: "Write a Review",
    disclaimerText: "দয়া করে সতর্কতার সাথে দায়িত্বপূর্ণভাবে খেলুন। আমাদের সাইটের অফারগুলো ১৮ বছরের বেশি বয়সীদের জন্য প্রযোজ্য।"
  },
  blogPageSettings: {
    bannerTitle: "Our Latest Blogs & Updates",
    bannerSubtitle: "ক্যাসিনো ভেরিফিকেশন এবং লেটেস্ট টিপস নিয়ে আমাদের অভিজ্ঞ রাইটারদের মতামত পড়ুন।",
    postsPerPage: 6,
    columns: 3,
    enableFilters: true
  },
  singleBlogSettings: {
    showAuthorBox: true,
    showShareButtons: true,
    showReadTime: true,
    showRelatedPosts: true,
    enableComments: true
  },
  contactPageSettings: {
    title: "Get in Touch with Eker",
    description: "আমাদের যেকোনো অফার বা ক্যাসিনো ভেরিফিকেশন নিয়ে আপনার প্রশ্ন থাকলে সরাসরি ইমেইল করুন।",
    email: "support@ekerverified.com",
    phone: "+880 1700-000000",
    address: "ঢাকা, বাংলাদেশ",
    mapIframeUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3651.839446452584!2d90.41324331538356!3d23.75306639459313!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755b85ef5b8ddc1%3A0x6b4db3b83ef25890!2sDhaka%2C%20Bangladesh!5e0!3m2!1sen!2sus!4v1625624792671!5m2!1sen!2sus"
  },
  mostWinningGames: [],
  updatedAt: new Date().toISOString()
};

interface ThemeContextType {
  theme: ThemeConfig;
  loading: boolean;
  saveTheme: (newTheme: ThemeConfig) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [loading, setLoading] = useState(true);

  // Sync theme with Firestore settings/theme as well as real games collections in real-time
  useEffect(() => {
    let themeData: Partial<ThemeConfig> = {};
    let gamesCollectionItems: MostWinningGameItem[] = [];
    let mwgCollectionItems: MostWinningGameItem[] = [];

    const updateThemeState = () => {
      let currentSections = themeData.sections || DEFAULT_THEME_CONFIG.sections;
      if (Array.isArray(currentSections) && !currentSections.some((s) => s.type === "most_winning_games")) {
        const heroIdx = currentSections.findIndex((s) => s.type === "hero");
        const newMWG: ThemeSection = {
          id: "most_winning_games",
          type: "most_winning_games",
          title: "Most Winning Games",
          subtitle: "আমাদের প্ল্যাটফর্মের সবচেয়ে বেশি জয়ী গেমগুলোর তালিকা",
          enabled: true
        };
        if (heroIdx !== -1) {
          currentSections = [
            ...currentSections.slice(0, heroIdx + 1),
            newMWG,
            ...currentSections.slice(heroIdx + 1)
          ];
        } else {
          currentSections = [newMWG, ...currentSections];
        }
      }

      // Combine games from theme doc, games collection, and most_winning_games collection
      const themeGames = themeData.mostWinningGames || [];
      const combinedGamesMap = new Map<string, MostWinningGameItem>();

      // Helper to merge game items keeping non-empty values
      const mergeGame = (existing: MostWinningGameItem | undefined, newGame: MostWinningGameItem): MostWinningGameItem => {
        if (!existing) return newGame;
        return {
          id: newGame.id || existing.id,
          name: newGame.name || existing.name,
          brandName: newGame.brandName || existing.brandName || "",
          logoUrl: newGame.logoUrl || existing.logoUrl || "",
          winRate: newGame.winRate || existing.winRate || "",
          multiplier: newGame.multiplier || existing.multiplier || "",
          playUrl: newGame.playUrl || existing.playUrl || "/#casinos",
        };
      };

      // Add games from settings/theme document
      themeGames.forEach((g) => {
        if (g && (g.id || g.name)) {
          const key = (g.name || g.id).trim().toLowerCase();
          combinedGamesMap.set(key, mergeGame(combinedGamesMap.get(key), g));
        }
      });

      // Add games from "games" collection
      gamesCollectionItems.forEach((g) => {
        if (g && (g.id || g.name)) {
          const key = (g.name || g.id).trim().toLowerCase();
          combinedGamesMap.set(key, mergeGame(combinedGamesMap.get(key), g));
        }
      });

      // Add games from "most_winning_games" collection
      mwgCollectionItems.forEach((g) => {
        if (g && (g.id || g.name)) {
          const key = (g.name || g.id).trim().toLowerCase();
          combinedGamesMap.set(key, mergeGame(combinedGamesMap.get(key), g));
        }
      });

      const seenIds = new Set<string>();
      const finalGamesList: MostWinningGameItem[] = [];

      Array.from(combinedGamesMap.values()).forEach((g, idx) => {
        let gameId = g.id || `game_${idx}_${Date.now()}`;
        if (seenIds.has(gameId)) {
          gameId = `${gameId}_${idx}`;
        }
        seenIds.add(gameId);
        finalGamesList.push({ ...g, id: gameId });
      });

      const mergedTheme: ThemeConfig = {
        ...DEFAULT_THEME_CONFIG,
        ...themeData,
        globalSettings: {
          ...DEFAULT_THEME_CONFIG.globalSettings,
          ...(themeData.globalSettings || {})
        },
        sections: currentSections,
        menuItems: themeData.menuItems || DEFAULT_THEME_CONFIG.menuItems,
        categoriesList: themeData.categoriesList || DEFAULT_THEME_CONFIG.categoriesList,
        singleCasinoSettings: {
          ...DEFAULT_THEME_CONFIG.singleCasinoSettings!,
          ...(themeData.singleCasinoSettings || {})
        },
        blogPageSettings: {
          ...DEFAULT_THEME_CONFIG.blogPageSettings!,
          ...(themeData.blogPageSettings || {})
        },
        singleBlogSettings: {
          ...DEFAULT_THEME_CONFIG.singleBlogSettings!,
          ...(themeData.singleBlogSettings || {})
        },
        contactPageSettings: {
          ...DEFAULT_THEME_CONFIG.contactPageSettings!,
          ...(themeData.contactPageSettings || {})
        },
        mostWinningGames: finalGamesList
      };

      setTheme(mergedTheme);
      setLoading(false);
    };

    // 1. Listen to settings/theme document
    const unsubTheme = onSnapshot(doc(db, "settings", "theme"), (snapshot) => {
      if (snapshot.exists()) {
        themeData = snapshot.data() as ThemeConfig;
      } else {
        themeData = {};
      }
      updateThemeState();
    }, (error) => {
      console.warn("Error listening to theme setting:", error);
      updateThemeState();
    });

    // 2. Listen to games collection in Firestore
    const unsubGames = onSnapshot(collection(db, "games"), (snapshot) => {
      const items: MostWinningGameItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          name: d.name || d.title || d.gameName || "",
          brandName: d.brandName || d.brand || d.provider || "",
          logoUrl: d.logoUrl || d.logo || d.imageUrl || d.image || "",
          winRate: d.winRate || d.rtp || d.win_rate || "",
          multiplier: d.multiplier || d.maxMultiplier || "",
          playUrl: d.playUrl || d.url || d.link || "/#casinos"
        });
      });
      gamesCollectionItems = items;
      updateThemeState();
    }, (error) => {
      console.warn("Games collection listen error:", error);
    });

    // 3. Listen to most_winning_games collection in Firestore
    const unsubMWG = onSnapshot(collection(db, "most_winning_games"), (snapshot) => {
      const items: MostWinningGameItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          name: d.name || d.title || d.gameName || "",
          brandName: d.brandName || d.brand || d.provider || "",
          logoUrl: d.logoUrl || d.logo || d.imageUrl || d.image || "",
          winRate: d.winRate || d.rtp || d.win_rate || "",
          multiplier: d.multiplier || d.maxMultiplier || "",
          playUrl: d.playUrl || d.url || d.link || "/#casinos"
        });
      });
      mwgCollectionItems = items;
      updateThemeState();
    }, (error) => {
      console.warn("Most_winning_games collection listen error:", error);
    });

    return () => {
      unsubTheme();
      unsubGames();
      unsubMWG();
    };
  }, []);

  // Update dynamic CSS styles, Favicon, and global custom font imports whenever theme changes
  useEffect(() => {
    const settings = theme.globalSettings;
    
    // 1. Manage google font dynamically
    const fontId = "dynamic-font-link";
    let fontLink = document.getElementById(fontId) as HTMLLinkElement;
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.id = fontId;
      fontLink.rel = "stylesheet";
      document.head.appendChild(fontLink);
    }
    const fontNameEncoded = encodeURIComponent(settings.fontFamily);
    fontLink.href = `https://fonts.googleapis.com/css2?family=${fontNameEncoded}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap`;

    // 2. Manage Favicon dynamically
    const faviconId = "dynamic-favicon-link";
    let favLink = document.getElementById(faviconId) as HTMLLinkElement;
    if (!favLink) {
      favLink = document.createElement("link");
      favLink.id = faviconId;
      favLink.rel = "shortcut icon";
      document.head.appendChild(favLink);
    }
    
    if (settings.faviconUrl) {
      favLink.href = settings.faviconUrl;
    } else if (settings.faviconText) {
      // Create SVG favicon using the dynamic text/emoji
      const emoji = settings.faviconText.trim();
      favLink.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>${emoji}</text></svg>`;
    } else {
      favLink.href = "/favicon.ico";
    }

    // Remove fallback default favicon links in index.html to prevent cache overlaps
    const fallbackFavicon = document.querySelector("link[href='/favicon.ico']") as HTMLLinkElement;
    if (fallbackFavicon && fallbackFavicon.id !== faviconId) {
      fallbackFavicon.remove();
    }

    // 3. Inject CSS Variable Style Block
    const styleId = "dynamic-theme-style";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
      :root {
        --color-brand-primary: ${settings.primaryColor} !important;
        --color-brand-secondary: ${settings.secondaryColor} !important;
        --color-slate-50: ${settings.backgroundColor} !important;
        --color-slate-900: ${settings.textColor} !important;
        --color-white: ${settings.cardBackgroundColor} !important;
        --font-sans: "${settings.fontFamily}", ui-sans-serif, system-ui, sans-serif !important;
        --font-display: "${settings.fontFamily}", "Inter", sans-serif !important;
        --border-radius-card: ${settings.cardBorderRadius} !important;
        --section-spacing: ${settings.sectionSpacing} !important;
      }

      body {
        background-color: var(--color-slate-50) !important;
        color: var(--color-slate-900) !important;
        font-family: var(--font-sans) !important;
      }

      /* Dynamic border-radii for various cards in the directory */
      .rounded-2xl {
        border-radius: var(--border-radius-card) !important;
      }
      .rounded-3xl {
        border-radius: calc(var(--border-radius-card) * 1.5) !important;
      }
      .rounded-xl {
        border-radius: calc(var(--border-radius-card) * 0.75) !important;
      }

      /* Dynamically handle section spacing */
      .space-y-12 {
        margin-top: var(--section-spacing) !important;
        margin-bottom: var(--section-spacing) !important;
      }
    `;
  }, [theme]);

  // Method to save theme configuration to Firestore
  const saveTheme = async (newTheme: ThemeConfig) => {
    try {
      const themeDocRef = doc(db, "settings", "theme");
      await setDoc(themeDocRef, {
        ...newTheme,
        updatedAt: new Date().toISOString()
      });
      setTheme(newTheme);
    } catch (error) {
      console.error("Failed to save theme configuration to Firestore:", error);
      throw error;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, loading, saveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
