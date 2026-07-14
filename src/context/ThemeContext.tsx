import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ThemeConfig } from "../types/firestore";

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  id: "theme",
  globalSettings: {
    logoText: "Eker Listings",
    logoUrl: "",
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

  // Sync theme with Firestore settings/theme in real-time
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "theme"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ThemeConfig;
        
        // Ensure structure is correct, merge default values if missing keys
        const mergedTheme: ThemeConfig = {
          ...DEFAULT_THEME_CONFIG,
          ...data,
          globalSettings: {
            ...DEFAULT_THEME_CONFIG.globalSettings,
            ...(data.globalSettings || {})
          },
          sections: data.sections || DEFAULT_THEME_CONFIG.sections
        };
        setTheme(mergedTheme);
      } else {
        // Doc does not exist yet, we will use default config
        setTheme(DEFAULT_THEME_CONFIG);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Error listening to theme setting:", error);
      setTheme(DEFAULT_THEME_CONFIG);
      setLoading(false);
    });

    return unsub;
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
