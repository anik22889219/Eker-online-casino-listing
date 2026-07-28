import React, { useState, useEffect, useMemo } from "react";
import { useTheme, DEFAULT_THEME_CONFIG } from "../../context/ThemeContext";
import { ThemeConfig, ThemeSection, ThemeGlobalSettings, Casino } from "../../types/firestore";
import { db } from "../../firebase";
import { collection, onSnapshot, query, where, doc, setDoc, deleteDoc } from "firebase/firestore";
import {
  Paintbrush,
  Layout,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash,
  Save,
  RefreshCw,
  FileText,
  Check,
  Settings as SettingsIcon,
  Type,
  Palette,
  Info,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Monitor,
  Menu,
  RotateCcw,
  Upload,
  Tablet,
  Smartphone,
  Coins,
  Star,
  CheckCircle,
  Clock,
  Flame,
  ShieldCheck,
  ArrowUpRight,
  Sliders,
  HelpCircle,
  Image,
  Link,
  X,
  ArrowLeft,
  Building2,
  BookOpen,
  Mail,
  Trophy
} from "lucide-react";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { HomeHero } from "../home/HomeHero";
import { CasinoCarousel } from "../home/CasinoCarousel";
import { SellScreenshotCTA } from "../home/SellScreenshotCTA";
import { HomeFaq } from "../home/HomeFaq";
import { MostWinningGamesSection } from "../home/MostWinningGamesSection";

const DEFAULT_POPULAR_GAMES: { name: string; brandName?: string; logoUrl: string }[] = [];

// Predefined gorgeous design theme presets that update all colors simultaneously
const PRESET_COLOR_THEMES = [
  {
    name: "Classic Eker (Indigo/Cyan)",
    primaryColor: "#4f46e5",
    secondaryColor: "#0891b2",
    backgroundColor: "#f8fafc",
    textColor: "#0f172a",
    cardBackgroundColor: "#ffffff"
  },
  {
    name: "Emerald Gold (Vegas Style)",
    primaryColor: "#059669",
    secondaryColor: "#d97706",
    backgroundColor: "#064e3b",
    textColor: "#f0fdf4",
    cardBackgroundColor: "#022c22"
  },
  {
    name: "Midnight High-Roller",
    primaryColor: "#dc2626",
    secondaryColor: "#10b981",
    backgroundColor: "#09090b",
    textColor: "#f4f4f5",
    cardBackgroundColor: "#18181b"
  },
  {
    name: "Golden Sahara (Warm Accent)",
    primaryColor: "#d97706",
    secondaryColor: "#b45309",
    backgroundColor: "#fffbeb",
    textColor: "#78350f",
    cardBackgroundColor: "#ffffff"
  },
  {
    name: "Oceanic Wave",
    primaryColor: "#0284c7",
    secondaryColor: "#0d9488",
    backgroundColor: "#f0f9ff",
    textColor: "#0f172a",
    cardBackgroundColor: "#ffffff"
  }
];

const GOOGLE_FONTS = [
  "Inter",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Outfit",
  "Sora",
  "Playfair Display",
  "JetBrains Mono",
  "Cabin",
  "Cinzel"
];

interface ThemeEditorProps {
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

export const ThemeEditor: React.FC<ThemeEditorProps> = ({ activeSubTab = "theme-editor", onSubTabChange }) => {
  const { theme, loading, saveTheme } = useTheme();

  // Real-time database synchronizers
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);

  // Fetch real casinos from database in real-time
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
    }, (err) => {
      console.warn("ThemeEditor: error fetching casinos:", err);
    });

    return unsub;
  }, []);

  // Fetch real blogs from database in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "blogs"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      setBlogs(list);
    }, (err) => {
      console.warn("ThemeEditor: error fetching blogs:", err);
    });

    return unsub;
  }, []);

  // Local draft state
  const [draftTheme, setDraftTheme] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [editorTab, setEditorTab] = useState<"global" | "sections">("global");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  
  // New sub-tab state handlers
  const [newMenuLabel, setNewMenuLabel] = useState("");
  const [newMenuUrl, setNewMenuUrl] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  // Upload States
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  // Preview Device State
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Visual Page Builder custom states
  const [activeElement, setActiveElement] = useState<string | null>(null);
  const [uploadingImageField, setUploadingImageField] = useState<string | null>(null);
  const [analyzingGameId, setAnalyzingGameId] = useState<string | null>(null);
  const [gameSaving, setGameSaving] = useState(false);
  const [gameSaveSuccess, setGameSaveSuccess] = useState(false);

  // Sync draft whenever parent theme loads
  useEffect(() => {
    if (theme) {
      const parsedTheme = JSON.parse(JSON.stringify(theme)) as ThemeConfig;
      
      // Merge all new default sub-tab configuration fields if missing
      if (!parsedTheme.menuItems) {
        parsedTheme.menuItems = [
          { id: "1", label: "Home", url: "/", openInNewTab: false },
          { id: "2", label: "Casinos", url: "/#casinos", openInNewTab: false },
          { id: "3", label: "Bonuses", url: "/bonuses", openInNewTab: false },
          { id: "4", label: "Blogs", url: "/blogs", openInNewTab: false },
          { id: "5", label: "Contact", url: "/contact", openInNewTab: false }
        ];
      }
      if (!parsedTheme.categoriesList) {
        parsedTheme.categoriesList = ["Exclusive", "Slot", "High Roller", "Crypto", "SaaS", "Tech", "Live Games"];
      }
      if (!parsedTheme.singleCasinoSettings) {
        parsedTheme.singleCasinoSettings = {
          sidebarLocation: "right",
          disclaimerText: "18+ • Gamble Responsibly • Terms & Conditions Apply",
          reviewBtnText: "Write a Review",
          showRelatedJackpots: true,
          showVerifiedBadge: true
        };
      }
      if (!parsedTheme.blogPageSettings) {
        parsedTheme.blogPageSettings = {
          bannerTitle: "Eker Creator Blogs & Strategy Guides",
          bannerSubtitle: "Explore vetted insights, strategies, slot analyses, and news from verified writers.",
          postsPerPage: 6,
          columns: 3,
          enableFilters: true
        };
      }
      if (!parsedTheme.singleBlogSettings) {
        parsedTheme.singleBlogSettings = {
          showAuthorBox: true,
          showReadTime: true,
          showShareButtons: true,
          showRelatedPosts: true,
          enableComments: true
        };
      }
      if (!parsedTheme.contactPageSettings) {
        parsedTheme.contactPageSettings = {
          title: "Get in Touch with Eker Support",
          description: "Our dedicated support team works 24/7 to solve your integration, payout, or validation issues.",
          email: "support@eker.com",
          phone: "+1 (800) 555-0199",
          address: "777 Casino Dr, Las Vegas, NV 89109",
          mapIframeUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3224.234691!2d-115.172814"
        };
      }
      
      if (parsedTheme.sections && Array.isArray(parsedTheme.sections)) {
        if (!parsedTheme.sections.some((s) => s.type === "most_winning_games")) {
          const heroIdx = parsedTheme.sections.findIndex((s) => s.type === "hero");
          const newMWG: ThemeSection = {
            id: "most_winning_games",
            type: "most_winning_games",
            title: "Most Winning Games",
            subtitle: "আমাদের প্ল্যাটফর্মের সবচেয়ে বেশি জয়ী গেমগুলোর তালিকা",
            enabled: true
          };
          if (heroIdx !== -1) {
            parsedTheme.sections.splice(heroIdx + 1, 0, newMWG);
          } else {
            parsedTheme.sections.unshift(newMWG);
          }
        }
      }

      setDraftTheme(parsedTheme);
    }
  }, [theme]);

  // Handle logo and favicon Cloudinary uploading
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "logo") {
      setLogoUploading(true);
    } else {
      setFaviconUploading(true);
    }

    try {
      const uploadedUrl = await uploadToCloudinary(file, "logos", `theme_${type}_${Date.now()}`);
      if (type === "logo") {
        updateGlobalSetting("logoUrl", uploadedUrl);
      } else {
        updateGlobalSetting("faviconUrl", uploadedUrl);
      }
    } catch (err) {
      console.error("Theme asset upload failed:", err);
      alert("ইমেজ আপলোড করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      if (type === "logo") {
        setLogoUploading(false);
      } else {
        setFaviconUploading(false);
      }
    }
  };

  const handleCloudinaryUploadForField = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onUpdate: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fieldName = e.target.name || "";

    try {
      setUploadingImageField(fieldName);
      const uploadedUrl = await uploadToCloudinary(file, "banners", `asset_${Date.now()}`);
      onUpdate(uploadedUrl);

      // Check if it's a game logo, e.g. fieldName is "logoUrl_gameId"
      if (fieldName.startsWith("logoUrl_")) {
        const gameId = fieldName.replace("logoUrl_", "");
        setAnalyzingGameId(gameId);
        
        try {
          // Call backend API to analyze the game logo with Gemini
          const response = await fetch("/api/analyze-game-logo", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ logoUrl: uploadedUrl })
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              let updatedGamesList: any[] = [];
              // Update the game details automatically!
              setDraftTheme((prev) => {
                const detectedName = result.name || "";
                const detectedBrand = result.brandName || detectGameBrandName(detectedName);

                updatedGamesList = (prev.mostWinningGames || []).map((g) => {
                  if (g.id === gameId) {
                    const finalName = detectedName || g.name;
                    const finalBrand = detectedBrand || g.brandName || detectGameBrandName(finalName);
                    return { 
                      ...g, 
                      name: finalName,
                      brandName: finalBrand,
                      winRate: result.winRate || g.winRate,
                      multiplier: result.multiplier || g.multiplier
                    };
                  }
                  return g;
                });

                return {
                  ...prev,
                  mostWinningGames: updatedGamesList
                };
              });

              // Instantly save to database!
              if (updatedGamesList.length > 0) {
                await saveGameToDatabase(updatedGamesList);
              }
            }
          }
        } catch (analError) {
          console.error("Failed to analyze uploaded game logo:", analError);
        } finally {
          setAnalyzingGameId(null);
        }
      }
    } catch (err) {
      console.error("Field image upload failed:", err);
      alert("ইমেজ আপলোড করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setUploadingImageField(null);
    }
  };

  // Methods to update global settings
  const updateGlobalSetting = (key: keyof ThemeGlobalSettings, value: any) => {
    setDraftTheme((prev) => ({
      ...prev,
      globalSettings: {
        ...prev.globalSettings,
        [key]: value
      }
    }));
  };

  // Apply color preset helper
  const applyPresetTheme = (preset: typeof PRESET_COLOR_THEMES[0]) => {
    setDraftTheme((prev) => ({
      ...prev,
      globalSettings: {
        ...prev.globalSettings,
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        backgroundColor: preset.backgroundColor,
        textColor: preset.textColor,
        cardBackgroundColor: preset.cardBackgroundColor
      }
    }));
  };

  // Reset theme to original factory settings
  const handleResetToDefault = () => {
    if (window.confirm("আপনি কি নিশ্চিত যে থিম সেটিংস ফ্যাক্টরি ডিফল্ট-এ রিসেট করতে চান?")) {
      setDraftTheme(JSON.parse(JSON.stringify(DEFAULT_THEME_CONFIG)));
    }
  };

  // Sections management helper methods
  const toggleSectionEnabled = (sectionId: string) => {
    setDraftTheme((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, enabled: !sec.enabled } : sec
      )
    }));
  };

  const updateSectionField = (sectionId: string, field: keyof ThemeSection, value: any) => {
    setDraftTheme((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, [field]: value } : sec
      )
    }));
  };

  // Arrow up/down ordering handler
  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...draftTheme.sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newSections.length) {
      // Swap items
      const temp = newSections[index];
      newSections[index] = newSections[targetIndex];
      newSections[targetIndex] = temp;

      setDraftTheme((prev) => ({
        ...prev,
        sections: newSections
      }));
    }
  };

  // Add new dynamic custom section
  const addNewCustomSection = () => {
    const customId = `custom_${Date.now()}`;
    const newSection: ThemeSection = {
      id: customId,
      type: "custom",
      title: "নতুন কাস্টম সেকশন",
      subtitle: "আপনার ইচ্ছেমতো বিবরণ এখানে লিখুন।",
      enabled: true,
      content: "এখানে আপনি যেকোনো বিবরণ, টেক্সট, বা HTML ফরম্যাট যুক্ত করতে পারেন। ডিরেক্টরি পেইজটিকে আকর্ষণীয় করতে এটি সহায়ক।",
      actionText: "বিস্তারিত দেখুন",
      actionUrl: "/#casinos",
      customBackgroundColor: "#ffffff",
      customTextColor: "#1e293b"
    };

    setDraftTheme((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setActiveSectionId(customId);
  };

  // Delete custom section
  const deleteCustomSection = (sectionId: string) => {
    if (window.confirm("আপনি কি নিশ্চিত যে এই কাস্টম সেকশনটি মুছে ফেলতে চান?")) {
      setDraftTheme((prev) => ({
        ...prev,
        sections: prev.sections.filter((sec) => sec.id !== sectionId)
      }));
      if (activeSectionId === sectionId) {
        setActiveSectionId(null);
      }
    }
  };

  // Helper to auto-detect game provider / brand name
  const detectGameBrandName = (gameName: string): string => {
    if (!gameName) return "";
    const name = gameName.toLowerCase().trim();
    if (name.includes("aviator")) return "Spribe";
    if (name.includes("spaceman") || name.includes("sweet bonanza") || name.includes("gates of olympus") || name.includes("starlight princess") || name.includes("sugar rush") || name.includes("big bass") || name.includes("dog house") || name.includes("wolf gold") || name.includes("fruit party") || name.includes("madame destiny") || name.includes("joker's jewels") || name.includes("zeus") || name.includes("pragmatic")) return "Pragmatic Play";
    if (name.includes("crazy time") || name.includes("monopoly") || name.includes("lightning") || name.includes("funky time") || name.includes("dream catcher") || name.includes("mega ball") || name.includes("bac bo") || name.includes("gonzo's treasure") || name.includes("evolution")) return "Evolution";
    if (name.includes("jetx") || name.includes("balloon") || name.includes("football x") || name.includes("plinko x") || name.includes("smartsoft")) return "SmartSoft Gaming";
    if (name.includes("fortune tiger") || name.includes("fortune ox") || name.includes("fortune rabbit") || name.includes("fortune mouse") || name.includes("fortune dragon") || name.includes("mahjong ways") || name.includes("wild bandito") || name.includes("ganesha") || name.includes("pg soft") || name.includes("pgsoft")) return "PG Soft";
    if (name.includes("plinko") || name.includes("mines") || name.includes("dice") || name.includes("goal") || name.includes("hi-lo") || name.includes("hotline") || name.includes("spribe")) return "Spribe";
    if (name.includes("starburst") || name.includes("gonzo") || name.includes("twin spin") || name.includes("dead or alive") || name.includes("netent")) return "NetEnt";
    if (name.includes("book of dead") || name.includes("reactoonz") || name.includes("tome of madness") || name.includes("moon princess") || name.includes("play'n go") || name.includes("playngo")) return "Play'n GO";
    if (name.includes("money train") || name.includes("hot spin") || name.includes("snake arena") || name.includes("relax")) return "Relax Gaming";
    if (name.includes("san quentin") || name.includes("tombstone") || name.includes("fire in the hole") || name.includes("nolimit")) return "Nolimit City";
    if (name.includes("wanted dead") || name.includes("dork unit") || name.includes("rip city") || name.includes("chaos crew") || name.includes("hacksaw")) return "Hacksaw Gaming";
    if (name.includes("crazy 7") || name.includes("super 7") || name.includes("777") || name.includes("jili")) return "JILI Gaming";
    return "";
  };

  // Auto-save helper for Most Winning Games direct database persistence
  const saveGameToDatabase = async (gamesList: any[]) => {
    setGameSaving(true);
    setGameSaveSuccess(false);
    try {
      const updatedConfig = {
        ...draftTheme,
        mostWinningGames: gamesList
      };
      await saveTheme(updatedConfig);

      // Also persist to individual most_winning_games collection documents for real-time listeners
      for (const game of gamesList) {
        if (game && game.id) {
          await setDoc(doc(db, "most_winning_games", game.id), {
            ...game,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }

      setGameSaveSuccess(true);
      setTimeout(() => setGameSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error auto-saving game to database:", err);
    } finally {
      setGameSaving(false);
    }
  };

  // Dynamic Most Winning Games helpers
  const handleAddGame = async () => {
    const newId = "game_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    const existingNames = (draftTheme.mostWinningGames || []).map((g) => (g.name || "").toLowerCase().trim());
    const unusedTemplate = DEFAULT_POPULAR_GAMES.find((p) => !existingNames.includes(p.name.toLowerCase().trim())) || DEFAULT_POPULAR_GAMES[0];

    const newGame = {
      id: newId,
      name: unusedTemplate ? unusedTemplate.name : "New Game",
      brandName: unusedTemplate ? unusedTemplate.brandName : "Provider",
      logoUrl: unusedTemplate ? unusedTemplate.logoUrl : "",
      winRate: "98.5%",
      multiplier: "x5000",
      playUrl: "/#casinos"
    };
    const updatedGames = [...(draftTheme.mostWinningGames || []), newGame];
    setDraftTheme((prev) => ({
      ...prev,
      mostWinningGames: updatedGames
    }));
    setActiveElement("game_form_" + newId);
    setActiveSectionId(null);

    // Instant direct save to database
    await saveGameToDatabase(updatedGames);
  };

  const handleDeleteGame = async (id: string) => {
    const updatedGames = (draftTheme.mostWinningGames || []).filter((g) => g.id !== id);
    setDraftTheme((prev) => ({
      ...prev,
      mostWinningGames: updatedGames
    }));
    if (activeElement === "game_form_" + id) {
      setActiveElement(null);
    }

    // Instant direct save to database
    await saveGameToDatabase(updatedGames);

    try {
      await deleteDoc(doc(db, "most_winning_games", id));
    } catch (e) {
      // Doc might not exist in collection
    }
  };

  const handleUpdateGameField = (id: string, field: string, value: any) => {
    setDraftTheme((prev) => ({
      ...prev,
      mostWinningGames: (prev.mostWinningGames || []).map((g) => {
        if (g.id === id) {
          const updated = { ...g, [field]: value };
          if (field === "name") {
            const detectedBrand = detectGameBrandName(value);
            if (detectedBrand) {
              updated.brandName = detectedBrand;
            }
          }
          return updated;
        }
        return g;
      })
    }));
  };

  const handleMoveGame = async (index: number, direction: "up" | "down") => {
    const games = [...(draftTheme.mostWinningGames || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= games.length) return;
    
    // Swap
    const temp = games[index];
    games[index] = games[targetIndex];
    games[targetIndex] = temp;
    
    setDraftTheme((prev) => ({
      ...prev,
      mostWinningGames: games
    }));

    // Instant direct save to database
    await saveGameToDatabase(games);
  };

  // Sub-tab helpers
  const handleAddMenuItem = () => {
    if (!newMenuLabel.trim() || !newMenuUrl.trim()) return;
    const newItem = {
      id: Date.now().toString(),
      label: newMenuLabel.trim(),
      url: newMenuUrl.trim(),
      openInNewTab: false
    };
    setDraftTheme((prev) => ({
      ...prev,
      menuItems: [...(prev.menuItems || []), newItem]
    }));
    setNewMenuLabel("");
    setNewMenuUrl("");
  };

  const handleRemoveMenuItem = (id: string) => {
    setDraftTheme((prev) => ({
      ...prev,
      menuItems: (prev.menuItems || []).filter((item) => item.id !== id)
    }));
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const cat = newCategoryName.trim();
    if ((draftTheme.categoriesList || []).includes(cat)) {
      alert("এই ক্যাটাগরি অলরেডি রয়েছে!");
      return;
    }
    setDraftTheme((prev) => ({
      ...prev,
      categoriesList: [...(prev.categoriesList || []), cat]
    }));
    setNewCategoryName("");
  };

  const handleRemoveCategory = (catToRemove: string) => {
    setDraftTheme((prev) => ({
      ...prev,
      categoriesList: (prev.categoriesList || []).filter((cat) => cat !== catToRemove)
    }));
  };

  const updateNestedField = (subSection: string, field: string, value: any) => {
    setDraftTheme((prev: any) => ({
      ...prev,
      [subSection]: {
        ...prev[subSection],
        [field]: value
      }
    }));
  };

  // Save to Firestore
  const handleSaveTheme = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await saveTheme(draftTheme);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("থিম কনফিগারেশন সংরক্ষণ করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          থিম এডিটর লোড করা হচ্ছে...
        </p>
      </div>
    );
  }

  // INTERCEPT: If activeSubTab is the root 'theme-editor', show the Creator Portal Hub Launcher Menu!
  if (activeSubTab === "theme-editor") {
    const hubMenus = [
      {
        id: "theme-editor-global",
        label: "Global setting",
        description: "ওয়েবসাইটের থিম কালার, ফন্ট ফ্যামিলি, লোগো এবং ফেভিকন কাস্টমাইজ করুন।",
        icon: SettingsIcon,
        color: "text-indigo-600 bg-indigo-50 border-indigo-100"
      },
      {
        id: "theme-editor-menu",
        label: "Menu items",
        description: "নেভিগেশন হেডার এবং ফুটারে প্রদর্শিত মেনু আইটেমগুলি পরিচালনা করুন।",
        icon: Menu,
        color: "text-emerald-600 bg-emerald-50 border-emerald-100"
      },
      {
        id: "theme-editor-category",
        label: "Category manager",
        description: "ক্যাসিনো এবং গেম ক্যাটাগরিগুলি যুক্ত বা পরিবর্তন করুন।",
        icon: Sliders,
        color: "text-amber-600 bg-amber-50 border-amber-100"
      },
      {
        id: "theme-editor-home",
        label: "Home page editor",
        description: "হোমপেজের ব্যানার, কারোসেল এবং অন্যান্য সমস্ত সেকশন এডিট করুন।",
        icon: Layout,
        color: "text-rose-600 bg-rose-50 border-rose-100"
      },
      {
        id: "theme-editor-casino",
        label: "Single casino page editor",
        description: "ক্যাসিনো রিভিউ এবং সিঙ্গেল ক্যাসিনো পেজটির লেআউট কাস্টমাইজ করুন।",
        icon: Building2,
        color: "text-cyan-600 bg-cyan-50 border-cyan-100"
      },
      {
        id: "theme-editor-blog",
        label: "Blog page editor",
        description: "প্রধান ব্লগ পেজের ব্যানার টাইটেল, সাবটাইটেল এবং লেআউট এডিট করুন।",
        icon: FileText,
        color: "text-blue-600 bg-blue-50 border-blue-100"
      },
      {
        id: "theme-editor-single-blog",
        label: "Single Blog page editor",
        description: "সিঙ্গেল ব্লগ পোস্ট পেজের রিড-টাইম, কমেন্ট এবং রিলেটেড পোস্ট সেটিংস।",
        icon: BookOpen,
        color: "text-violet-600 bg-violet-50 border-violet-100"
      },
      {
        id: "theme-editor-contact",
        label: "Contact page editor",
        description: "যোগাযোগ পেজের কন্টাক্ট ইনফো, ফর্ম এবং লোকেশন ম্যাপ এডিট করুন।",
        icon: Mail,
        color: "text-purple-600 bg-purple-50 border-purple-100"
      },
      {
        id: "theme-editor-most-winning",
        label: "Most Winning Games",
        description: "সবচেয়ে বেশি জয়ী ক্যাসিনো গেমের তালিকা, লোগো এবং আরটিপি সেটিংস ডায়নামিকভাবে আপলোড করুন।",
        icon: Trophy,
        color: "text-amber-550 bg-amber-50 border-amber-100"
      }
    ];

    return (
      <div className="space-y-6 animate-fade-in text-left">
        {/* Banner with modern styling */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xs">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold text-amber-500 tracking-widest uppercase font-mono">Creator Portal Hub</span>
              <h2 className="font-display font-black text-2xl tracking-tight flex items-center gap-2 text-white">
                <Paintbrush className="w-6 h-6 text-indigo-450" />
                <span>Theme Design Hub (থিম ও ডিজাইন পোর্টাল)</span>
              </h2>
              <p className="text-xs text-indigo-200 max-w-2xl font-semibold leading-relaxed">
                আপনার অ্যাফিলিয়েট মার্কেটিং ওয়েবসাইটের সমস্ত পেজ এবং গ্লোবাল সেটিংস এখান থেকে সরাসরি কাস্টমাইজ করুন। প্রতিটি সেকশনে রয়েছে অ্যাডভান্সড ডায়নামিক সেটিংস।
              </p>
            </div>
          </div>
        </div>

        {/* 8 Grid Menu Items */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {hubMenus.map((menu) => {
            const MenuIcon = menu.icon;
            return (
              <div
                key={menu.id}
                onClick={() => onSubTabChange?.(menu.id)}
                className="bg-white border border-slate-200 rounded-3xl p-4 md:p-5 hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center text-center gap-3 h-[120px] md:h-[140px]"
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${menu.color}`}>
                  <MenuIcon className="w-5 h-5" />
                </div>
                <h4 className="font-display font-black text-slate-900 text-xs md:text-[13px] tracking-tight group-hover:text-indigo-600 transition-colors leading-tight">
                  {menu.label}
                </h4>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const settings = draftTheme.globalSettings;

  const getSubTabInfo = () => {
    switch (activeSubTab) {
      case "theme-editor-global":
        return {
          title: "Global Settings (গ্লোবাল ডিজাইন সেটিংস)",
          desc: "ওয়েবসাইটের ব্র্যান্ড লোগো, ফেভিকন, রঙ এবং টাইপোগ্রাফি ফন্ট কাস্টমাইজ করুন।"
        };
      case "theme-editor-menu":
        return {
          title: "Header & Footer Menu Items (মেনু ম্যানেজার)",
          desc: "ওয়েবসাইটের নেভিগেশন হেডার এবং ফুটারে প্রদর্শিত লিঙ্ক বা মেনু আইটেমগুলি এডিট করুন।"
        };
      case "theme-editor-category":
        return {
          title: "Category manager (ক্যাটাগরি ম্যানেজার)",
          desc: "ক্যাসিনো ভেরিফিকেশন এবং ফিল্টারিংয়ের জন্য কাস্টম ক্যাটাগরিগুলি যুক্ত বা ডিলিট করুন।"
        };
      case "theme-editor-home":
        return {
          title: "Home page sections editor (হোমপেজ লেআউট)",
          desc: "হোমপেজের ব্যানার, ক্যাসিনো কারোসেল, স্লাইডার এবং FAQ সেকশনের বিষয়বস্তু সাজান।"
        };
      case "theme-editor-casino":
        return {
          title: "Single casino page editor (ক্যাসিনো পেজ লেআউট)",
          desc: "সিঙ্গেল ক্যাসিনো পেজটির সাইডবার লেআউট, ডিসক্লেইমার এবং রিভিউ বাটন সেটিংস কাস্টমাইজ করুন।"
        };
      case "theme-editor-blog":
        return {
          title: "Blog list page editor (ব্লগ পেজ এডিটর)",
          desc: "প্রধান ব্লগ ইনডেক্স পেজটির ব্যানার শিরোনাম, সংক্ষিপ্ত বিবরণ, সার্চ বার এবং গ্রিড সেটিংস।"
        };
      case "theme-editor-single-blog":
        return {
          title: "Single Blog post editor (সিঙ্গেল ব্লগ সেটিংস)",
          desc: "সিঙ্গেল ব্লগ পোস্ট পেজের রিড-টাইম, শেয়ারিং বাটন এবং কমেন্ট বক্স দৃশ্যমানতা এডিট করুন।"
        };
      case "theme-editor-contact":
        return {
          title: "Contact page editor (যোগাযোগ পেজ এডিটর)",
          desc: "যোগাযোগ পেজের কন্টাক্ট ইনফো কার্ড, সাপোর্ট ফোন ও ইমেইল এবং গুগল ম্যাপ লোকেশন লিংক।"
        };
      case "theme-editor-most-winning":
        return {
          title: "Most Winning Games Manager (সবচেয়ে বেশি জয়ী ক্যাসিনো গেমের তালিকা)",
          desc: "গেমগুলোর নাম, লোগো, আরটিপি (Win Rate), ম্যাক্স মাল্টিপ্লায়ার এবং খেলার লিংক ডায়নামিকভাবে তৈরি ও আপলোড করুন।"
        };
      default:
        return {
          title: "Theme & Visual Editor",
          desc: "আপনার পাবলিক পেজগুলির সেকশন, ফন্ট, কালার এবং ডিজাইন কাস্টমাইজ করুন।"
        };
    }
  };

  // ==========================================
  // STATIC MOCK DATA FOR LIVE PREVIEWS
  // ==========================================
  const MOCK_CASINOS: any[] = [];
  const MOCK_BLOGS: any[] = [];

  // ==========================================
  // RENDER DYNAMIC PREVIEW CANVAS
  // ==========================================
  const renderVisualPreview = () => {
    const globalColors = draftTheme.globalSettings;

    // Resolve active casinos and memoized/calculated listings matching HomeView logic with high accuracy
    const activeCasinos = casinos.length > 0 ? casinos : (MOCK_CASINOS as unknown as Casino[]);

    const previewFeaturedCasinos = activeCasinos.filter((c) => c.featured);

    const previewLatestCasinos = [...activeCasinos].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const previewPopularBonuses = [...activeCasinos].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));

    const filterBySecCategory = (list: Casino[], category: string | undefined) => {
      if (!category || category === "All") return list;
      const catLower = category.toLowerCase();
      return list.filter((c) => {
        const matchesCategory = c.category && c.category.toLowerCase().includes(catLower);
        const matchesBonusType = c.welcomeBonus && c.welcomeBonus.toLowerCase().includes(catLower);
        return matchesCategory || matchesBonusType;
      });
    };

    // Helper to check if a section is active
    const isSelected = (id: string) => activeSectionId === id || activeElement === id;

    // Hover ring styles
    const hoverStyles = (id: string) => `
      relative group/section cursor-pointer transition-all duration-300
      ${isSelected(id) ? "ring-4 ring-indigo-600 ring-offset-2 scale-[0.99] z-20" : "hover:ring-2 hover:ring-indigo-400 hover:ring-offset-1"}
    `;

    // Dynamic Edit Tag Overlay
    const renderEditOverlay = (label: string) => (
      <div className="absolute top-2 right-2 z-40 bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-md opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center gap-1">
        <Sparkles className="w-2.5 h-2.5" />
        <span>{label}</span>
      </div>
    );

    // Mock Header
    const previewHeader = (
      <div 
        className={`px-6 py-4 border-b border-slate-150 flex items-center justify-between ${hoverStyles("header")}`}
        onClick={(e) => { e.stopPropagation(); setActiveElement("header"); }}
      >
        {renderEditOverlay("Edit Menu & Header")}
        <div className="flex items-center gap-2">
          {globalColors.logoUrl ? (
            <img src={globalColors.logoUrl} alt="Logo" className="h-6 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <span className="font-extrabold text-sm tracking-tight text-slate-900 flex items-center gap-1">
              <Coins className="w-5 h-5 text-indigo-600" />
              <span>{globalColors.logoText || "Eker Listings"}</span>
            </span>
          )}
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs font-bold text-slate-600">
          {(draftTheme.menuItems || []).map((item) => (
            <span key={item.id} className="hover:text-indigo-600 transition">{item.label}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-extrabold shadow-sm">
            Claim Offer
          </span>
        </div>
      </div>
    );

    // Mock Footer
    const previewFooter = (
      <div 
        className={`px-6 py-8 border-t border-slate-100 bg-slate-950 text-white space-y-4 ${hoverStyles("footer")}`}
        onClick={(e) => { e.stopPropagation(); setActiveElement("footer"); }}
      >
        {renderEditOverlay("Edit Footer Credits")}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <span className="font-extrabold text-sm flex items-center gap-1">
              <Coins className="w-4 h-4 text-indigo-400" />
              <span>{globalColors.logoText || "Eker Listings"}</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Verified Affiliate Marketing & Casino Brokerage Standard</p>
          </div>
          <div className="flex gap-4 text-[10px] font-bold text-slate-450">
            <span>Responsible Gaming</span>
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
          </div>
        </div>
        <div className="text-center pt-4 border-t border-slate-900 text-[9px] text-slate-500 font-semibold">
          &copy; 2026 {globalColors.logoText || "Eker Listings"}. All Rights Reserved. Engineered by Premium Digital Marketer.
        </div>
      </div>
    );

    switch (activeSubTab) {
      case "theme-editor-home":
        return (
          <div className="space-y-0">
            {previewHeader}
            
            {/* Dynamic sections mapping */}
            {draftTheme.sections.map((sec) => {
              if (!sec.enabled) return null;

              switch (sec.type) {
                case "hero":
                  return (
                    <div
                      key={sec.id}
                      className={`relative group/section ${hoverStyles(sec.id)}`}
                      onClick={(e) => { e.stopPropagation(); setActiveSectionId(sec.id); }}
                    >
                      {renderEditOverlay("Edit Hero Section")}
                      <div className="pointer-events-none select-none">
                        <HomeHero config={sec} />
                      </div>
                    </div>
                  );

                case "most_winning_games":
                  return (
                    <div
                      key={sec.id}
                      className={`relative group/section ${hoverStyles(sec.id)}`}
                      onClick={(e) => { e.stopPropagation(); setActiveSectionId(sec.id); }}
                    >
                      {renderEditOverlay("Edit Most Winning Games Section")}
                      <div className="pointer-events-none select-none p-6 bg-white border-b border-slate-100">
                        <MostWinningGamesSection
                          config={sec}
                          games={draftTheme.mostWinningGames || []}
                        />
                      </div>
                    </div>
                  );

                case "featured_operators": {
                  const filtered = filterBySecCategory(previewFeaturedCasinos, sec.carouselCategory);
                  return (
                    <div
                      key={sec.id}
                      className={`py-8 px-6 space-y-5 text-left border-b border-slate-100 relative group/section ${hoverStyles(sec.id)}`}
                      onClick={(e) => { e.stopPropagation(); setActiveSectionId(sec.id); }}
                    >
                      {renderEditOverlay(`Edit Carousel: ${sec.title}`)}
                      <div className="pointer-events-none select-none">
                        <section className="space-y-5">
                          <div className="border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-amber-500" />
                              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                                {sec.title}
                              </h2>
                            </div>
                            {sec.subtitle && (
                              <p className="text-xs text-slate-400 font-semibold mt-1">
                                {sec.subtitle}
                              </p>
                            )}
                          </div>
                          <CasinoCarousel 
                            casinos={filtered} 
                            displayCount={sec.displayCount}
                            slideCount={sec.slideCount}
                            autoSlide={sec.autoSlide}
                            slideSpeed={sec.slideSpeed}
                          />
                        </section>
                      </div>
                    </div>
                  );
                }

                case "latest_listings": {
                  const filtered = filterBySecCategory(previewLatestCasinos, sec.carouselCategory);
                  return (
                    <div
                      key={sec.id}
                      className={`py-8 px-6 space-y-5 text-left border-b border-slate-100 relative group/section ${hoverStyles(sec.id)}`}
                      onClick={(e) => { e.stopPropagation(); setActiveSectionId(sec.id); }}
                    >
                      {renderEditOverlay(`Edit Carousel: ${sec.title}`)}
                      <div className="pointer-events-none select-none">
                        <section className="space-y-5">
                          <div className="border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-5 w-5 text-indigo-600" />
                              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                                {sec.title}
                              </h2>
                            </div>
                            {sec.subtitle && (
                              <p className="text-xs text-slate-400 font-semibold mt-1">
                                {sec.subtitle}
                              </p>
                            )}
                          </div>
                          {filtered.length === 0 ? (
                            <div className="text-center py-10 rounded-2xl border border-dashed border-slate-200 bg-white">
                              <p className="text-xs text-slate-400 font-bold uppercase">No matching listings found</p>
                            </div>
                          ) : (
                            <CasinoCarousel 
                              casinos={filtered} 
                              displayCount={sec.displayCount}
                              slideCount={sec.slideCount}
                              autoSlide={sec.autoSlide}
                              slideSpeed={sec.slideSpeed}
                            />
                          )}
                        </section>
                      </div>
                    </div>
                  );
                }

                case "top_rated": {
                  const filtered = filterBySecCategory(previewPopularBonuses, sec.carouselCategory);
                  return (
                    <div
                      key={sec.id}
                      className={`py-8 px-6 space-y-5 text-left border-b border-slate-100 relative group/section ${hoverStyles(sec.id)}`}
                      onClick={(e) => { e.stopPropagation(); setActiveSectionId(sec.id); }}
                    >
                      {renderEditOverlay(`Edit Carousel: ${sec.title}`)}
                      <div className="pointer-events-none select-none">
                        <section className="space-y-5">
                          <div className="border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <Flame className="h-5 w-5 text-rose-500" />
                              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                                {sec.title}
                              </h2>
                            </div>
                            {sec.subtitle && (
                              <p className="text-xs text-slate-400 font-semibold mt-1">
                                {sec.subtitle}
                              </p>
                            )}
                          </div>
                          <CasinoCarousel 
                            casinos={filtered} 
                            displayCount={sec.displayCount}
                            slideCount={sec.slideCount}
                            autoSlide={sec.autoSlide}
                            slideSpeed={sec.slideSpeed}
                          />
                        </section>
                      </div>
                    </div>
                  );
                }

                case "sell_cta":
                  return (
                    <div
                      key={sec.id}
                      className={`relative group/section ${hoverStyles(sec.id)}`}
                      onClick={(e) => { e.stopPropagation(); setActiveSectionId(sec.id); }}
                    >
                      {renderEditOverlay("Edit Jackpot Rewards")}
                      <div className="pointer-events-none select-none">
                        <SellScreenshotCTA config={sec} />
                      </div>
                    </div>
                  );

                case "faq":
                  return (
                    <div
                      key={sec.id}
                      className={`relative group/section ${hoverStyles(sec.id)}`}
                      onClick={(e) => { e.stopPropagation(); setActiveSectionId(sec.id); }}
                    >
                      {renderEditOverlay("Edit Accordion FAQs")}
                      <div className="pointer-events-none select-none p-6 bg-white border-b border-slate-100">
                        <HomeFaq config={sec} />
                      </div>
                    </div>
                  );

                case "custom":
                  return (
                    <div
                      key={sec.id}
                      className={`relative group/section ${hoverStyles(sec.id)}`}
                      onClick={(e) => { e.stopPropagation(); setActiveSectionId(sec.id); }}
                    >
                      {renderEditOverlay("Edit Custom Block")}
                      <div className="pointer-events-none select-none p-6">
                        <section
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
                              <button
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                              >
                                {sec.actionText}
                              </button>
                            </div>
                          )}
                        </section>
                      </div>
                    </div>
                  );

                default:
                  return null;
              }
            })}

            {previewFooter}
          </div>
        );

      case "theme-editor-most-winning":
        return (
          <div className="space-y-0">
            {previewHeader}
            <div className="p-6 bg-white border-b border-slate-100">
              <MostWinningGamesSection 
                config={{
                  id: "most_winning_games_preview",
                  type: "most_winning_games",
                  title: "Most Winning Games",
                  subtitle: "আমাদের প্ল্যাটফর্মের সবচেয়ে বেশি জয়ী গেমগুলোর তালিকা (Dynamic Live Preview)",
                  enabled: true
                }} 
                games={draftTheme.mostWinningGames || []} 
              />
            </div>
            {previewFooter}
          </div>
        );

      case "theme-editor-casino":
        const casinoConfig = draftTheme.singleCasinoSettings || {
          sidebarLocation: "right",
          showRelatedJackpots: true,
          showVerifiedBadge: true,
          reviewBtnText: "Write a Review",
          disclaimerText: "18+ • Gamble Responsibly • Terms Apply"
        };

        return (
          <div className="space-y-0 text-left">
            {previewHeader}
            <div className="p-6 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Main Content Area */}
                <div className={`space-y-4 md:col-span-8 ${casinoConfig.sidebarLocation === "left" ? "md:order-last" : ""} ${casinoConfig.sidebarLocation === "none" ? "md:col-span-12" : ""}`}>
                  
                  {/* Casino Audit Card */}
                  <div 
                    className={`p-4 bg-white border border-slate-200 rounded-2xl space-y-3.5 shadow-2xs ${hoverStyles("reviewBtn")}`}
                    onClick={(e) => { e.stopPropagation(); setActiveElement("reviewBtn"); }}
                  >
                    {renderEditOverlay("Edit Review & Submit Options")}
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-extrabold text-slate-900">Eker Verified Partner Audit</h2>
                      <span className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg shadow-sm">
                        {casinoConfig.reviewBtnText}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      Eker reviews are performed by independent regulatory inspectors verifying certified slots RNG seed engines and fast withdrawals.
                    </p>
                  </div>
                </div>

                {/* Sidebar Column */}
                {casinoConfig.sidebarLocation !== "none" && (
                  <div className="md:col-span-4 space-y-4">
                    
                    {/* Badge Widget */}
                    {casinoConfig.showVerifiedBadge && (
                      <div 
                        className={`p-4 bg-indigo-50 border border-indigo-150 rounded-2xl flex items-center gap-3 ${hoverStyles("verifiedBadge")}`}
                        onClick={(e) => { e.stopPropagation(); setActiveElement("verifiedBadge"); }}
                      >
                        {renderEditOverlay("Edit Badge Visibility")}
                        <ShieldCheck className="w-8 h-8 text-indigo-600 shrink-0 animate-pulse" />
                        <div>
                          <span className="text-[10.5px] font-black text-indigo-950 block">Triple-Vetted Security Verified</span>
                          <span className="text-[8px] text-indigo-700 font-bold font-mono">SECURE DEAL SIGNATURE</span>
                        </div>
                      </div>
                    )}

                    {/* Jackpots Campaign Widget */}
                    {casinoConfig.showRelatedJackpots && (
                      <div 
                        className={`p-4 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs ${hoverStyles("relatedCampaigns")}`}
                        onClick={(e) => { e.stopPropagation(); setActiveElement("relatedCampaigns"); }}
                      >
                        {renderEditOverlay("Edit Related Campaigns")}
                        <h4 className="text-[9.5px] font-black uppercase text-indigo-600 tracking-wider">Related Campaigns</h4>
                        <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                          <span className="text-[9.5px] font-extrabold text-slate-800">50% Weekend Reload Match</span>
                          <span className="text-[8px] text-slate-450 block font-mono">CODE: WEEKEND50</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Disclaimer at Bottom */}
              <div 
                className={`mt-6 p-4 border border-slate-200 rounded-2xl text-[9.5px] text-slate-500 leading-relaxed font-semibold bg-white ${hoverStyles("disclaimer")}`}
                onClick={(e) => { e.stopPropagation(); setActiveElement("disclaimer"); }}
              >
                {renderEditOverlay("Edit Gamble Disclaimer")}
                <span className="text-rose-500 font-extrabold block mb-1">🔞 RESPONSIBLE GAMING COMPLIANCE:</span>
                {casinoConfig.disclaimerText}
              </div>
            </div>
            {previewFooter}
          </div>
        );

      case "theme-editor-blog":
        const blogConfig = draftTheme.blogPageSettings || {
          bannerTitle: "Latest Editorial Blogs",
          bannerSubtitle: "Explore vetted insights",
          columns: 3,
          postsPerPage: 6,
          enableFilters: true
        };

        const activeBlogs = blogs && blogs.length > 0 ? blogs : MOCK_BLOGS;

        return (
          <div className="space-y-0 text-left">
            {previewHeader}
            
            {/* Banner block */}
            <div 
              className={`p-8 text-center bg-slate-900 text-white space-y-2 ${hoverStyles("blogBanner")}`}
              onClick={(e) => { e.stopPropagation(); setActiveElement("blogBanner"); }}
            >
              {renderEditOverlay("Edit Blog Banner")}
              <h1 className="text-lg sm:text-xl font-black">{blogConfig.bannerTitle}</h1>
              <p className="text-[10px] text-slate-400 font-semibold max-w-sm mx-auto leading-normal">{blogConfig.bannerSubtitle}</p>
            </div>

            <div className="p-6 bg-slate-50/50 space-y-5">
              {/* Category Filter panel */}
              {blogConfig.enableFilters && (
                <div 
                  className={`p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-[10px] font-extrabold text-slate-500 ${hoverStyles("blogFilters")}`}
                  onClick={(e) => { e.stopPropagation(); setActiveElement("blogFilters"); }}
                >
                  {renderEditOverlay("Edit Search Options")}
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg">All Categories</span>
                    <span className="px-3 py-1 hover:text-slate-900">Brokerage</span>
                    <span className="px-3 py-1 hover:text-slate-900">RNG Audits</span>
                  </div>
                  <span className="text-indigo-600">Search Blogs &rarr;</span>
                </div>
              )}

              {/* Grid Layout of blogs */}
              <div 
                className={`grid grid-cols-1 ${blogConfig.columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4 ${hoverStyles("blogGrid")}`}
                onClick={(e) => { e.stopPropagation(); setActiveElement("blogGrid"); }}
              >
                {renderEditOverlay("Edit Post Grid Limits")}
                {activeBlogs.map((post) => (
                  <div key={post.id} className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-all duration-200">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-50 text-indigo-700 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md">
                          {post.category}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold font-mono">{post.readTime || "5 min read"}</span>
                      </div>
                      <h3 className="font-black text-slate-950 text-xs sm:text-sm hover:text-indigo-600 transition-colors leading-snug line-clamp-1">
                        {post.title}
                      </h3>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold line-clamp-2">
                        {post.excerpt}
                      </p>
                      
                      {post.bannerImage && (
                        <div className="h-24 w-full rounded-xl overflow-hidden border border-slate-100 mb-2">
                          <img 
                            src={post.bannerImage} 
                            alt={post.title} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[9px] text-slate-450 font-bold font-mono">
                      <span>By {post.author || "Eker Editorial"}</span>
                      <span className="text-indigo-600 flex items-center gap-0.5">
                        Read &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {previewFooter}
          </div>
        );

      case "theme-editor-single-blog":
        const singleBlogConfig = draftTheme.singleBlogSettings || {
          showAuthorBox: true,
          showReadTime: true,
          showShareButtons: true,
          showRelatedPosts: true,
          enableComments: true
        };

        return (
          <div className="space-y-0 text-left">
            {previewHeader}
            <div className="p-6 bg-slate-50/50 max-w-2xl mx-auto space-y-5">
              
              {/* Metadata block */}
              <div 
                className={`p-4 bg-white border border-slate-200 rounded-2xl space-y-2 ${hoverStyles("blogMeta")}`}
                onClick={(e) => { e.stopPropagation(); setActiveElement("blogMeta"); }}
              >
                {renderEditOverlay("Edit Article Metadata")}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-semibold">Published: July 20, 2026</span>
                  {singleBlogConfig.showReadTime && (
                    <span className="text-indigo-600 font-mono font-black">⏱️ 5 min read time</span>
                  )}
                </div>
                <h1 className="text-base font-black text-slate-900">Triple Vetting: Inside our Certified RNG Campaign Audits</h1>
                <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                  Online gaming requires extreme transparency. In this guide, our verification desk details how we audit wager screenshots...
                </p>
              </div>

              {/* Share box */}
              {singleBlogConfig.showShareButtons && (
                <div 
                  className={`p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-[9px] font-extrabold ${hoverStyles("blogShare")}`}
                  onClick={(e) => { e.stopPropagation(); setActiveElement("blogShare"); }}
                >
                  {renderEditOverlay("Edit Sharing visibility")}
                  <span className="text-slate-500 uppercase tracking-wider">Share Article:</span>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg cursor-pointer">Facebook</span>
                    <span className="px-2.5 py-1 bg-sky-500 text-white rounded-lg cursor-pointer">Twitter</span>
                  </div>
                </div>
              )}

              {/* Author box */}
              {singleBlogConfig.showAuthorBox && (
                <div 
                  className={`p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3.5 shadow-2xs ${hoverStyles("blogAuthor")}`}
                  onClick={(e) => { e.stopPropagation(); setActiveElement("blogAuthor"); }}
                >
                  {renderEditOverlay("Edit Author details")}
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-xs">
                    EM
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-slate-900 block">Eker Marketer</span>
                    <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">Professional Lead Generator & Digital Affiliate</span>
                  </div>
                </div>
              )}

              {/* Related posts */}
              {singleBlogConfig.showRelatedPosts && (
                <div 
                  className={`p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-1.5 ${hoverStyles("blogRelated")}`}
                  onClick={(e) => { e.stopPropagation(); setActiveElement("blogRelated"); }}
                >
                  {renderEditOverlay("Edit Related Posts")}
                  <span className="text-[8.5px] font-black text-indigo-600 uppercase tracking-wider block">Related Articles</span>
                  <div className="text-[10.5px] font-bold text-slate-700 hover:text-indigo-600 cursor-pointer">
                    • Slot Machine RTP Mechanics: How to audit true win chance
                  </div>
                </div>
              )}

              {/* Comments */}
              {singleBlogConfig.enableComments && (
                <div 
                  className={`p-4 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs ${hoverStyles("blogComments")}`}
                  onClick={(e) => { e.stopPropagation(); setActiveElement("blogComments"); }}
                >
                  {renderEditOverlay("Edit Feedback forms")}
                  <span className="text-[9.5px] font-black text-slate-450 uppercase tracking-widest block">Submit Public Comment</span>
                  <div className="h-10 border border-slate-250 bg-slate-50/50 rounded-xl flex items-center justify-between px-3">
                    <span className="text-[10px] text-slate-400 font-semibold">Enter your message...</span>
                    <span className="text-[10px] text-indigo-600 font-black">Submit</span>
                  </div>
                </div>
              )}
            </div>
            {previewFooter}
          </div>
        );

      case "theme-editor-contact":
        const contactConfig = draftTheme.contactPageSettings || {
          title: "Get in Touch with Eker",
          description: "Direct email support team",
          email: "support@eker.com",
          phone: "+880 1700-000000",
          address: "Dhaka, Bangladesh",
          mapIframeUrl: ""
        };

        return (
          <div className="space-y-0 text-left">
            {previewHeader}
            
            {/* Header banner */}
            <div 
              className={`p-8 text-center bg-slate-900 text-white space-y-2 ${hoverStyles("contactHeader")}`}
              onClick={(e) => { e.stopPropagation(); setActiveElement("contactHeader"); }}
            >
              {renderEditOverlay("Edit Banner Info")}
              <h1 className="text-lg sm:text-xl font-black">{contactConfig.title}</h1>
              <p className="text-[10px] text-slate-400 font-semibold max-w-sm mx-auto leading-normal">{contactConfig.description}</p>
            </div>

            <div className="p-6 bg-slate-50/50 space-y-5">
              {/* Support cards */}
              <div 
                className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${hoverStyles("contactInfo")}`}
                onClick={(e) => { e.stopPropagation(); setActiveElement("contactInfo"); }}
              >
                {renderEditOverlay("Edit Support contacts")}
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[8px] font-black text-indigo-600 uppercase flex items-center gap-1">
                    <Mail className="w-3 h-3 text-indigo-500" />
                    <span>Support Email</span>
                  </span>
                  <span className="text-[10.5px] font-black text-slate-800 block font-mono">{contactConfig.email}</span>
                </div>
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[8px] font-black text-indigo-600 uppercase flex items-center gap-1">
                    <Info className="w-3 h-3 text-indigo-500" />
                    <span>Support Phone</span>
                  </span>
                  <span className="text-[10.5px] font-black text-slate-800 block font-mono">{contactConfig.phone}</span>
                </div>
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-1 col-span-1 sm:col-span-2">
                  <span className="text-[8px] font-black text-slate-450 uppercase">Registered Office Address</span>
                  <span className="text-[10.5px] font-black text-slate-800 block">{contactConfig.address}</span>
                </div>
              </div>

              {/* Map block */}
              <div 
                className={`p-4 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs ${hoverStyles("contactMap")}`}
                onClick={(e) => { e.stopPropagation(); setActiveElement("contactMap"); }}
              >
                {renderEditOverlay("Edit Maps Integration")}
                <span className="text-[9.5px] font-black text-slate-450 uppercase tracking-wider block">Interactive Google Maps Portal</span>
                <div className="h-32 bg-slate-100 rounded-xl flex items-center justify-center text-[10px] font-mono text-indigo-600 font-bold p-3 text-center border border-slate-200">
                  🗺️ Maps Frame: {contactConfig.mapIframeUrl ? contactConfig.mapIframeUrl.substring(0, 50) + "..." : "No Map URL Provided"}
                </div>
              </div>
            </div>

            {previewFooter}
          </div>
        );

      default:
        return (
          <div className="p-10 text-center text-slate-450 text-xs font-semibold">
            Select a sub-tab to preview.
          </div>
        );
    }
  };

  // ==========================================
  // RENDER DYNAMIC SIDEBAR OUTLINE / NAVIGATOR
  // ==========================================
  const renderSidebarOutline = () => {
    switch (activeSubTab) {
      case "theme-editor-home":
        return (
          <div className="space-y-5 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-black text-slate-950 text-[13px] tracking-tight uppercase flex items-center gap-1.5">
                <Layout className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span>Page Outliner (সেকশন সমূহ)</span>
              </h3>
              <button
                type="button"
                onClick={addNewCustomSection}
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>নতুন সেকশন</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              যেকোনো সেকশনে ক্লিক করুন এবং পপআপে সেটিংস পরিবর্তন করুন:
            </p>

            <div className="space-y-2.5">
              {draftTheme.sections.map((sec, index) => {
                const isEditingThis = activeSectionId === sec.id;
                const isCustom = sec.type === "custom";

                return (
                  <div
                    key={sec.id}
                    className={`border rounded-2xl p-3 transition-all bg-slate-50/50 ${
                      isEditingThis
                        ? "border-indigo-500 ring-2 ring-indigo-50 bg-white"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {/* Toggle visibility */}
                        <button
                          type="button"
                          onClick={() => toggleSectionEnabled(sec.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            sec.enabled
                              ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                              : "text-slate-400 bg-slate-100 hover:bg-slate-250"
                          }`}
                          title={sec.enabled ? "Hide Section" : "Show Section"}
                        >
                          {sec.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        <div className="text-left">
                          <span className="text-[11px] font-black text-slate-800 leading-none flex items-center gap-1.5">
                            {sec.title || "Untitled Section"}
                            {isCustom && (
                              <span className="text-[7.5px] uppercase font-black tracking-widest text-emerald-750 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                                কাস্টম
                              </span>
                            )}
                          </span>
                          <span className="text-[8px] text-slate-400 font-bold mt-1 block uppercase">
                            Type: {sec.type}
                          </span>
                        </div>
                      </div>

                      {/* Controls (Arrows and Edit click) */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveSection(index, "up")}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === draftTheme.sections.length - 1}
                          onClick={() => moveSection(index, "down")}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveSectionId(sec.id);
                            setActiveElement(null);
                          }}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            isEditingThis
                              ? "bg-slate-900 text-white"
                              : "hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                          }`}
                          title="সম্পাদনা করুন"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => deleteCustomSection(sec.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded ml-0.5 cursor-pointer"
                            title="Delete Section"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "theme-editor-casino":
        return (
          <div className="space-y-5 animate-fade-in text-left">
            <h3 className="font-display font-black text-slate-950 text-[13px] tracking-tight uppercase border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-cyan-500" />
              <span>Casino Page Navigator</span>
            </h3>

            {/* Page layout config */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block">Global Layout</span>
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Sidebar Position</label>
                <select
                  value={draftTheme.singleCasinoSettings?.sidebarLocation || "right"}
                  onChange={(e) => updateNestedField("singleCasinoSettings", "sidebarLocation", e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-bold focus:outline-hidden"
                >
                  <option value="right">Right Sidebar</option>
                  <option value="left">Left Sidebar</option>
                  <option value="none">No Sidebar</option>
                </select>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              যেকোনো এলিমেন্টে ক্লিক করে পপআপে অপশন পরিবর্তন করুন:
            </p>

            <div className="space-y-2">
              {/* Element 1: Review Button */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "reviewBtn" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("reviewBtn");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Review Submission Options</span>
                  <span className="text-[8px] font-bold text-slate-400 font-mono uppercase block mt-0.5">Label: {draftTheme.singleCasinoSettings?.reviewBtnText || "Write a Review"}</span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Element 2: Verified Badge */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "verifiedBadge" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("verifiedBadge");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Triple-Vetted Verified Badge</span>
                  <span className="text-[8px] font-bold text-slate-400 font-mono uppercase block mt-0.5">
                    {draftTheme.singleCasinoSettings?.showVerifiedBadge ?? true ? "🟢 Visible" : "🔴 Hidden"}
                  </span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Element 3: Related Campaigns */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "relatedCampaigns" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("relatedCampaigns");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Related Campaigns Widget</span>
                  <span className="text-[8px] font-bold text-slate-400 font-mono uppercase block mt-0.5">
                    {draftTheme.singleCasinoSettings?.showRelatedJackpots ?? true ? "🟢 Visible" : "🔴 Hidden"}
                  </span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Element 4: Disclaimer */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "disclaimer" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("disclaimer");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Responsible Disclaimer</span>
                  <span className="text-[8px] font-bold text-slate-400 font-mono uppercase block mt-0.5">Compliance Text</span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        );

      case "theme-editor-blog":
        return (
          <div className="space-y-5 animate-fade-in text-left">
            <h3 className="font-display font-black text-slate-950 text-[13px] tracking-tight uppercase border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Blog Page Navigator</span>
            </h3>

            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              যেকোনো এলিমেন্টে ক্লিক করে পপআপে অপশন পরিবর্তন করুন:
            </p>

            <div className="space-y-2">
              {/* Element 1: Blog Banner */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "blogBanner" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("blogBanner");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Header Banner Text</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5 max-w-[180px] truncate">Title: {draftTheme.blogPageSettings?.bannerTitle || "Latest Editorial Blogs"}</span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Element 2: Filters */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "blogFilters" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("blogFilters");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Category Search Filters</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5">
                    {draftTheme.blogPageSettings?.enableFilters ?? true ? "🟢 Enabled" : "🔴 Disabled"}
                  </span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Element 3: Post Grid */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "blogGrid" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("blogGrid");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Posts Grid Limits & Layout</span>
                  <span className="text-[8px] font-bold text-slate-400 font-mono uppercase block mt-0.5">
                    {draftTheme.blogPageSettings?.columns || 3} Columns • Max {draftTheme.blogPageSettings?.postsPerPage || 6} Posts
                  </span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        );

      case "theme-editor-single-blog":
        return (
          <div className="space-y-5 animate-fade-in text-left">
            <h3 className="font-display font-black text-slate-950 text-[13px] tracking-tight uppercase border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-violet-500" />
              <span>Article Post Navigator</span>
            </h3>

            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              যেকোনো এলিমেন্টে ক্লিক করে পপআপে অপশন পরিবর্তন করুন:
            </p>

            <div className="space-y-2">
              {/* Element 1: Read Time Badge */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "blogMeta" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("blogMeta");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Read-Time Indicator Badge</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5">
                    {draftTheme.singleBlogSettings?.showReadTime ?? true ? "🟢 Visible" : "🔴 Hidden"}
                  </span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Element 2: Social Share */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "blogShare" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("blogShare");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Social Share Buttons</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5">
                    {draftTheme.singleBlogSettings?.showShareButtons ?? true ? "🟢 Enabled" : "🔴 Disabled"}
                  </span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Element 3: Author Box */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "blogAuthor" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("blogAuthor");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Author Details Card</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5">
                    {draftTheme.singleBlogSettings?.showAuthorBox ?? true ? "🟢 Visible" : "🔴 Hidden"}
                  </span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Element 4: Related Links */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "blogRelated" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("blogRelated");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Related Recommended Links</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5">
                    {draftTheme.singleBlogSettings?.showRelatedPosts ?? true ? "🟢 Visible" : "🔴 Hidden"}
                  </span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Element 5: Feedback Comments */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "blogComments" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("blogComments");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Public Feedback Comments Form</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5">
                    {draftTheme.singleBlogSettings?.enableComments ?? true ? "🟢 Enabled" : "🔴 Disabled"}
                  </span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        );

      case "theme-editor-contact":
        return (
          <div className="space-y-5 animate-fade-in text-left">
            <h3 className="font-display font-black text-slate-950 text-[13px] tracking-tight uppercase border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-500" />
              <span>Contact Page Navigator</span>
            </h3>

            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              যেকোনো ব্লকে ক্লিক করে পপআপে অপশন পরিবর্তন করুন:
            </p>

            <div className="space-y-2">
              {/* Block 1: Contact Header */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "contactHeader" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("contactHeader");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Banner Title & Subtitle</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5 max-w-[180px] truncate">
                    Title: {draftTheme.contactPageSettings?.title || "Get in Touch"}
                  </span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Block 2: Contact Info */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "contactInfo" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("contactInfo");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Support Contacts Details</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5 max-w-[180px] truncate">
                    Email: {draftTheme.contactPageSettings?.email || "support@eker.com"}
                  </span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Block 3: Google Maps */}
              <div 
                className={`flex items-center justify-between p-3 border rounded-xl bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition ${activeElement === "contactMap" ? "border-indigo-500 ring-2 ring-indigo-50 bg-white" : "border-slate-200"}`}
                onClick={() => {
                  setActiveElement("contactMap");
                  setActiveSectionId(null);
                }}
              >
                <div className="text-left">
                  <span className="text-[11px] font-black text-slate-800 block">Interactive Google Maps</span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5 max-w-[180px] truncate">
                    {draftTheme.contactPageSettings?.mapIframeUrl ? "🟢 Google Maps URL Loaded" : "🔴 No Map URL Provided"}
                  </span>
                </div>
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        );

      case "theme-editor-most-winning":
        return (
          <div className="space-y-5 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-black text-slate-950 text-[13px] tracking-tight uppercase flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Games list (গেমের তালিকা)</span>
              </h3>
              <button
                type="button"
                onClick={handleAddGame}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন গেম যোগ করুন</span>
              </button>
            </div>

            {/* Direct Auto-Save Notice Badge */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-[10.5px] font-bold leading-tight">
                ⚡ <span className="font-black">স্বয়ংক্রিয় ডাটাবেস সেভ সিস্টেম চালু:</span> নতুন গেম যোগ, এডিট বা ডিলিট করলে তথ্য সরাসরি ডাটাবেসে অটো-সেভ হয়ে যায়। আলাদাভাবে থিম সেভ (Save) বাটনে ক্লিক করার কোনো প্রয়োজন নেই।
              </p>
            </div>

            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              গেমের তথ্য এডিট করতে যেকোনো গেমের কার্ডে ক্লিক করুন, এবং নিচের ফর্ম থেকে তথ্য পরিবর্তন করে সেভ করুন।
            </p>

            <div className="space-y-2.5">
              {(draftTheme.mostWinningGames || []).length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">কোনো গেম যোগ করা হয়নি</p>
                </div>
              ) : (
                (draftTheme.mostWinningGames || []).map((game, index) => {
                  const isEditingThis = activeElement === "game_form_" + game.id;
                  return (
                    <div
                      key={`${game.id || 'game'}_${index}`}
                      className={`border rounded-2xl p-3 transition-all bg-slate-50/50 flex flex-col gap-2.5 ${
                        isEditingThis
                          ? "border-amber-500 ring-2 ring-amber-50 bg-white"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div 
                          className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                          onClick={() => {
                            setActiveElement("game_form_" + game.id);
                            setActiveSectionId(null);
                          }}
                        >
                          <img 
                            src={game.logoUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=100&auto=format&fit=crop"} 
                            alt={game.name}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-left min-w-0">
                            <span className="text-[11px] font-black text-slate-800 block truncate">
                              {game.name || "Untitled Game"}
                            </span>
                            <span className="text-[8.5px] font-bold text-slate-400 block mt-0.5">
                              RTP: <span className="text-emerald-600 font-extrabold">{game.winRate || "0%"}</span> • Mult: <span className="text-indigo-600 font-extrabold">{game.multiplier || "N/A"}</span>
                            </span>
                          </div>
                        </div>

                        {/* Order controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveGame(index, "up")}
                            disabled={index === 0}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-30 transition hover:bg-slate-100 shrink-0 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveGame(index, "down")}
                            disabled={index === (draftTheme.mostWinningGames || []).length - 1}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-30 transition hover:bg-slate-100 shrink-0 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGame(game.id);
                            }}
                            className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition shrink-0 cursor-pointer"
                            title="Delete Game"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ==========================================
  // RENDER DYNAMIC SETTINGS DRAWER
  // ==========================================
  const renderSettingsDrawer = () => {
    // Shared Layout & Typography options card uploader helper
    const renderStylingOptions = (sectionId: string, isHomeSection = true) => (
      <details className="group/details border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/50">
        <summary className="p-3 text-[10.5px] font-black text-slate-500 hover:text-slate-850 cursor-pointer flex items-center justify-between select-none bg-slate-50 border-b border-slate-150">
          <span className="flex items-center gap-1.5 uppercase tracking-wide">
            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
            <span>📐 Layout, Typography & Styling</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-open/details:rotate-90" />
        </summary>
        <div className="p-3.5 space-y-3.5 text-xs text-left">
          {/* Spacing alignment */}
          <div>
            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Section Alignment (অ্যালাইনমেন্ট)
            </label>
            <div className="grid grid-cols-3 gap-1">
              {["left", "center", "right"].map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => {
                    if (isHomeSection) updateSectionField(sectionId, "tier1Range", align);
                  }}
                  className="py-1 border border-slate-200 rounded text-[9.5px] font-extrabold uppercase hover:bg-indigo-50"
                >
                  {align}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility Controls */}
          <div className="space-y-2">
            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">
              Responsive Visibility (মোবাইল / ডেক্সটপ প্রদর্শন)
            </span>
            <div className="flex flex-col gap-1.5 text-[9.5px] font-semibold text-slate-650">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500" />
                <span>Show on Desktop screens</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500" />
                <span>Show on Tablet screens</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500" />
                <span>Show on Mobile screens</span>
              </label>
            </div>
          </div>
        </div>
      </details>
    );

    // Dynamic Image cloud selector helper
    const renderImageInputWithUploader = (label: string, fieldName: string, value: string, onUpdate: (val: string) => void) => (
      <div className="space-y-2">
        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
          {label}
        </label>
        <div className="relative group rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/30 p-3.5 transition-all flex flex-col items-center justify-center min-h-[90px]">
          {uploadingImageField === fieldName ? (
            <div className="flex items-center gap-2 py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span className="text-[10px] font-extrabold text-indigo-600">Uploading to Cloudinary...</span>
            </div>
          ) : value ? (
            <div className="w-full text-center space-y-2">
              <div className="h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                <img src={value} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <label className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-extrabold cursor-pointer hover:bg-indigo-100 transition">
                  Replace Image
                  <input
                    type="file"
                    name={fieldName}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCloudinaryUploadForField(e, onUpdate)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onUpdate("")}
                  className="px-2 py-1 bg-rose-50 text-rose-600 rounded-md text-[9px] font-extrabold hover:bg-rose-100 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center cursor-pointer py-1.5 w-full">
              <Upload className="w-4 h-4 text-indigo-600 mb-1" />
              <span className="text-[10px] font-extrabold text-indigo-600">Cloudinary Upload</span>
              <input
                type="file"
                name={fieldName}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCloudinaryUploadForField(e, onUpdate)}
              />
            </label>
          )}
        </div>
        
        {/* Manual Input url */}
        <details className="group/manual">
          <summary className="text-[8.5px] font-black text-slate-450 hover:text-slate-600 list-none flex items-center gap-0.5 cursor-pointer select-none">
            <span className="transition-transform group-open/manual:rotate-90 text-[6px]">▶</span>
            <span>Manual Link URL</span>
          </summary>
          <input
            type="text"
            value={value}
            onChange={(e) => onUpdate(e.target.value)}
            placeholder="https://example.com/image.png"
            className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-[10px] font-mono focus:outline-hidden"
          />
        </details>
      </div>
    );

    switch (activeSubTab) {
      case "theme-editor-home":
        if (activeSectionId === null) return null;
        const activeSec = draftTheme.sections.find((s) => s.id === activeSectionId);
        if (!activeSec) return null;

        return (
          <div className="space-y-5 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-black text-slate-950 text-[13px] tracking-tight uppercase">
                  ✏️ Section Settings
                </h3>
                <span className="text-[9.5px] text-slate-450 font-bold block uppercase mt-0.5">
                  Type: {activeSec.type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSectionEnabled(activeSec.id)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${activeSec.enabled ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-400"}`}
                title={activeSec.enabled ? "Disable visibility" : "Enable visibility"}
              >
                {activeSec.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Input fields */}
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                  শিরোনাম (Section Title)
                </label>
                <input
                  type="text"
                  value={activeSec.title || ""}
                  onChange={(e) => updateSectionField(activeSec.id, "title", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-800"
                />
              </div>

              {/* Subtitle */}
              {activeSec.type !== "featured_operators" && activeSec.type !== "latest_listings" && activeSec.type !== "top_rated" && (
                <div className="space-y-1">
                  <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                    উপশিরোনাম (Section Subtitle)
                  </label>
                  <textarea
                    value={activeSec.subtitle || ""}
                    onChange={(e) => updateSectionField(activeSec.id, "subtitle", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 text-slate-800 resize-none"
                  />
                </div>
              )}

              {/* Dynamic types settings */}
              {activeSec.type === "hero" && (
                <div className="space-y-4 pt-2.5 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Button Text</label>
                      <input
                        type="text"
                        value={activeSec.actionText || ""}
                        onChange={(e) => updateSectionField(activeSec.id, "actionText", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-semibold focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Button Link</label>
                      <input
                        type="text"
                        value={activeSec.actionUrl || ""}
                        onChange={(e) => updateSectionField(activeSec.id, "actionUrl", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[11px] font-semibold focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Gradient Colors */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Grad Start</label>
                      <input
                        type="color"
                        value={activeSec.backgroundGradientStart || "#0f172a"}
                        onChange={(e) => updateSectionField(activeSec.id, "backgroundGradientStart", e.target.value)}
                        className="h-9 w-full rounded border cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Grad End</label>
                      <input
                        type="color"
                        value={activeSec.backgroundGradientEnd || "#1e1b4b"}
                        onChange={(e) => updateSectionField(activeSec.id, "backgroundGradientEnd", e.target.value)}
                        className="h-9 w-full rounded border cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Most Winning Games configuration inside Home Page Editor */}
              {activeSec.type === "most_winning_games" && (
                <div className="space-y-4 pt-2.5 border-t border-slate-100">
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Most Winning Games Manager</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onSubTabChange?.("theme-editor-most-winning")}
                        className="text-[9.5px] font-extrabold text-amber-800 bg-white hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-250 shadow-2xs transition cursor-pointer flex items-center gap-1"
                      >
                        <span>ফুল ম্যানেজার &rarr;</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-850 font-semibold leading-relaxed">
                      গেমের তালিকা, লোগো, আরটিপি এবং আরটিপি মাল্টিপ্লায়ার লিঙ্ক এডিট বা নতুন গেম যোগ করতে গেম ম্যানেজারে ক্লিক করুন।
                    </p>
                  </div>

                  {/* Quick listing system preview */}
                  <div className="space-y-2">
                    <span className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                      বর্তমানে প্রদর্শিত গেমসমূহ ({(draftTheme.mostWinningGames || []).length} টি)
                    </span>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                      {(draftTheme.mostWinningGames || []).map((game, idx) => (
                        <div key={`${game.id || 'game'}_${idx}`} className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 font-mono">#{idx + 1}</span>
                            <span className="font-extrabold text-slate-800 truncate text-[11px]">{game.name}</span>
                          </div>
                          <span className="text-[9.5px] font-black text-emerald-600 font-mono">{game.winRate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Carousel configuration */}
              {(activeSec.type === "featured_operators" || activeSec.type === "latest_listings" || activeSec.type === "top_rated") && (
                <div className="space-y-4 pt-2.5 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8.5px] font-black text-slate-500 uppercase mb-1">Category Filter</label>
                      <select
                        value={activeSec.carouselCategory || "All"}
                        onChange={(e) => updateSectionField(activeSec.id, "carouselCategory", e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                      >
                        <option value="All">All Categories</option>
                        {(draftTheme.categoriesList || []).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8.5px] font-black text-slate-500 uppercase mb-1">Display count</label>
                      <input
                        type="number"
                        value={activeSec.displayCount || 4}
                        onChange={(e) => updateSectionField(activeSec.id, "displayCount", Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white"
                        min={1}
                        max={12}
                      />
                    </div>
                  </div>

                  {/* CAROUSEL SLIDES ARRAY MANAGEMENT */}
                  <div className="space-y-3 pt-3 border-t border-slate-150 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        🗂️ Carousel Slide Management
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const currentFaqs = activeSec.faqs || [];
                          const updated = [...currentFaqs, { question: "New Slide Card", answer: "$500 Welcome Bonus" }];
                          updateSectionField(activeSec.id, "faqs", updated);
                        }}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-extrabold rounded-lg flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Slide Card</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto">
                      {(activeSec.faqs || []).map((slide, slideIndex) => (
                        <div key={slideIndex} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative group/slide text-[11px] font-medium text-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-mono text-slate-400 font-extrabold">CARD #{slideIndex+1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (activeSec.faqs || []).filter((_, i) => i !== slideIndex);
                                updateSectionField(activeSec.id, "faqs", updated);
                              }}
                              className="text-rose-600 hover:bg-rose-50 p-1 rounded"
                              title="Delete Slide"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={slide.question}
                              onChange={(e) => {
                                const updated = [...(activeSec.faqs || [])];
                                updated[slideIndex] = { ...updated[slideIndex], question: e.target.value };
                                updateSectionField(activeSec.id, "faqs", updated);
                              }}
                              className="px-2 py-1 border border-slate-200 rounded text-[10px] font-bold"
                              placeholder="Casino Title"
                            />
                            <input
                              type="text"
                              value={slide.answer}
                              onChange={(e) => {
                                const updated = [...(activeSec.faqs || [])];
                                updated[slideIndex] = { ...updated[slideIndex], answer: e.target.value };
                                updateSectionField(activeSec.id, "faqs", updated);
                              }}
                              className="px-2 py-1 border border-slate-200 rounded text-[10px]"
                              placeholder="Welcome Bonus"
                            />
                          </div>
                        </div>
                      ))}
                      {(!activeSec.faqs || activeSec.faqs.length === 0) && (
                        <p className="text-[9.5px] text-slate-400 italic">No manual slides added. Carousel currently displays verified dynamic operators.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sell screenshot CTA */}
              {activeSec.type === "sell_cta" && (
                <div className="space-y-4 pt-2.5 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">Tier 1 Win Range</label>
                      <input
                        type="text"
                        value={activeSec.tier1Range || ""}
                        onChange={(e) => updateSectionField(activeSec.id, "tier1Range", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">Tier 1 Reward</label>
                      <input
                        type="text"
                        value={activeSec.tier1Reward || ""}
                        onChange={(e) => updateSectionField(activeSec.id, "tier1Reward", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">Tier 2 Win Range</label>
                      <input
                        type="text"
                        value={activeSec.tier2Range || ""}
                        onChange={(e) => updateSectionField(activeSec.id, "tier2Range", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">Tier 2 Reward</label>
                      <input
                        type="text"
                        value={activeSec.tier2Reward || ""}
                        onChange={(e) => updateSectionField(activeSec.id, "tier2Reward", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* FAQ accordions */}
              {activeSec.type === "faq" && (
                <div className="space-y-3 pt-2.5 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      🛠️ Manage FAQ List
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...(activeSec.faqs || []), { question: "Enter Question?", answer: "Enter Answer." }];
                        updateSectionField(activeSec.id, "faqs", updated);
                      }}
                      className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[9px] font-extrabold rounded-lg flex items-center gap-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add FAQ</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                    {(activeSec.faqs || []).map((faq, index) => (
                      <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative group/faq">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">FAQ #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (activeSec.faqs || []).filter((_, i) => i !== index);
                              updateSectionField(activeSec.id, "faqs", updated);
                            }}
                            className="text-rose-500 hover:bg-rose-50 p-1 rounded"
                            title="Delete FAQ"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => {
                            const updated = [...(activeSec.faqs || [])];
                            updated[index] = { ...updated[index], question: e.target.value };
                            updateSectionField(activeSec.id, "faqs", updated);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:outline-hidden"
                          placeholder="Question?"
                        />
                        <textarea
                          value={faq.answer}
                          onChange={(e) => {
                            const updated = [...(activeSec.faqs || [])];
                            updated[index] = { ...updated[index], answer: e.target.value };
                            updateSectionField(activeSec.id, "faqs", updated);
                          }}
                          rows={2}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs leading-relaxed focus:outline-hidden resize-none font-semibold text-slate-500"
                          placeholder="Answer details..."
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom sections */}
              {activeSec.type === "custom" && (
                <div className="space-y-4 pt-2.5 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                      Custom content details (Markdown/HTML Support)
                    </label>
                    <textarea
                      value={activeSec.content || ""}
                      onChange={(e) => updateSectionField(activeSec.id, "content", e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">BG Color</label>
                      <input
                        type="color"
                        value={activeSec.customBackgroundColor || "#ffffff"}
                        onChange={(e) => updateSectionField(activeSec.id, "customBackgroundColor", e.target.value)}
                        className="h-9 w-full rounded border cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Text Color</label>
                      <input
                        type="color"
                        value={activeSec.customTextColor || "#1e293b"}
                        onChange={(e) => updateSectionField(activeSec.id, "customTextColor", e.target.value)}
                        className="h-9 w-full rounded border cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-150">
                    <button
                      type="button"
                      onClick={() => deleteCustomSection(activeSec.id)}
                      className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200/50"
                    >
                      <Trash className="w-4 h-4" />
                      <span>মুছে ফেলুন (Delete Section)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Render reusable layout & styling card */}
              {renderStylingOptions(activeSec.id)}
            </div>
          </div>
        );

      case "theme-editor-casino":
        return (
          <div className="space-y-5 animate-fade-in text-left">
            <h3 className="font-display font-black text-slate-950 text-[13px] tracking-tight uppercase border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-cyan-500" />
              <span>✏️ Single Casino Page Options</span>
            </h3>

            {/* Active Element Focused settings */}
            <div className="space-y-4">
              {activeElement === "reviewBtn" && (
                <div className="space-y-3.5 animate-in fade-in">
                  <h4 className="text-[10.5px] font-black text-indigo-600 uppercase tracking-wider">Submit Review Button Options</h4>
                  <div>
                    <label className="block text-[8px] font-black text-slate-500 uppercase mb-1.5">
                      Button Label (বাটন টেক্সট)
                    </label>
                    <input
                      type="text"
                      value={draftTheme.singleCasinoSettings?.reviewBtnText || "Write a Review"}
                      onChange={(e) => updateNestedField("singleCasinoSettings", "reviewBtnText", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-850"
                    />
                  </div>
                </div>
              )}

              {activeElement === "disclaimer" && (
                <div className="space-y-3.5 animate-in fade-in">
                  <h4 className="text-[10.5px] font-black text-indigo-600 uppercase tracking-wider">Gaming Disclaimer Text</h4>
                  <div>
                    <label className="block text-[8px] font-black text-slate-500 uppercase mb-1.5">
                      Responsible text compliance (সতর্কীকরণ কন্টেন্ট)
                    </label>
                    <textarea
                      value={draftTheme.singleCasinoSettings?.disclaimerText || ""}
                      onChange={(e) => updateNestedField("singleCasinoSettings", "disclaimerText", e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2.5 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-850 leading-relaxed resize-none"
                    />
                  </div>
                </div>
              )}

              {activeElement === "verifiedBadge" && (
                <div className="space-y-3.5 animate-in fade-in">
                  <h4 className="text-[10.5px] font-black text-indigo-600 uppercase tracking-wider">Badge Visibility Toggles</h4>
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Show verified badge indicator</span>
                    <input
                      type="checkbox"
                      checked={draftTheme.singleCasinoSettings?.showVerifiedBadge ?? true}
                      onChange={(e) => updateNestedField("singleCasinoSettings", "showVerifiedBadge", e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-650"
                    />
                  </div>
                </div>
              )}

              {activeElement === "relatedCampaigns" && (
                <div className="space-y-3.5 animate-in fade-in">
                  <h4 className="text-[10.5px] font-black text-indigo-600 uppercase tracking-wider">Sidebar Campaign Options</h4>
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Display related campaigns in sidebar</span>
                    <input
                      type="checkbox"
                      checked={draftTheme.singleCasinoSettings?.showRelatedJackpots ?? true}
                      onChange={(e) => updateNestedField("singleCasinoSettings", "showRelatedJackpots", e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-650"
                    />
                  </div>
                </div>
              )}

              {/* Layout Sidebar Location options */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <h4 className="text-[10.5px] font-black text-slate-400 uppercase tracking-widest block">Global Page Layout</h4>
                <div>
                  <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Sidebar Position</label>
                  <select
                    value={draftTheme.singleCasinoSettings?.sidebarLocation || "right"}
                    onChange={(e) => updateNestedField("singleCasinoSettings", "sidebarLocation", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold"
                  >
                    <option value="right">Right Sidebar (ডানপাশে)</option>
                    <option value="left">Left Sidebar (বামপাশে)</option>
                    <option value="none">No Sidebar (সম্পূর্ণ চওড়া)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case "theme-editor-single-blog":
        return (
          <div className="space-y-5 animate-fade-in text-left">
            <h3 className="font-display font-black text-slate-950 text-[13px] tracking-tight uppercase border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-violet-500" />
              <span>✏️ Single Blog Post Options</span>
            </h3>

            <div className="space-y-4">
              {/* Toggles based on selected preview area */}
              {activeElement === "blogMeta" && (
                <div className="space-y-3.5 animate-in fade-in">
                  <h4 className="text-[10.5px] font-black text-indigo-600 uppercase tracking-wider">Read Time Badge</h4>
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Show read-time indicator</span>
                    <input
                      type="checkbox"
                      checked={draftTheme.singleBlogSettings?.showReadTime ?? true}
                      onChange={(e) => updateNestedField("singleBlogSettings", "showReadTime", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                  </div>
                </div>
              )}

              {activeElement === "blogShare" && (
                <div className="space-y-3.5 animate-in fade-in">
                  <h4 className="text-[10.5px] font-black text-indigo-600 uppercase tracking-wider">Social Share Panel</h4>
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Enable social share buttons</span>
                    <input
                      type="checkbox"
                      checked={draftTheme.singleBlogSettings?.showShareButtons ?? true}
                      onChange={(e) => updateNestedField("singleBlogSettings", "showShareButtons", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                  </div>
                </div>
              )}

              {activeElement === "blogAuthor" && (
                <div className="space-y-3.5 animate-in fade-in">
                  <h4 className="text-[10.5px] font-black text-indigo-600 uppercase tracking-wider">Author Box Profile Options</h4>
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Display author details box</span>
                    <input
                      type="checkbox"
                      checked={draftTheme.singleBlogSettings?.showAuthorBox ?? true}
                      onChange={(e) => updateNestedField("singleBlogSettings", "showAuthorBox", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                  </div>
                </div>
              )}

              {activeElement === "blogRelated" && (
                <div className="space-y-3.5 animate-in fade-in">
                  <h4 className="text-[10.5px] font-black text-indigo-600 uppercase tracking-wider">Related Articles list</h4>
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Show related recommended links</span>
                    <input
                      type="checkbox"
                      checked={draftTheme.singleBlogSettings?.showRelatedPosts ?? true}
                      onChange={(e) => updateNestedField("singleBlogSettings", "showRelatedPosts", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                  </div>
                </div>
              )}

              {activeElement === "blogComments" && (
                <div className="space-y-3.5 animate-in fade-in">
                  <h4 className="text-[10.5px] font-black text-indigo-600 uppercase tracking-wider">Comment Form System</h4>
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">Enable public feedback comments</span>
                    <input
                      type="checkbox"
                      checked={draftTheme.singleBlogSettings?.enableComments ?? true}
                      onChange={(e) => updateNestedField("singleBlogSettings", "enableComments", e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "theme-editor-contact":
        return (
          <div className="space-y-5 animate-fade-in text-left">
            <h3 className="font-display font-black text-slate-950 text-[13px] tracking-tight uppercase border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-500" />
              <span>✏️ Contact Page Settings</span>
            </h3>

            <div className="space-y-4">
              {activeElement === "contactHeader" && (
                <div className="space-y-3 animate-in fade-in">
                  <h4 className="text-[10.5px] font-black text-indigo-600 uppercase tracking-wider">Banner Header Info</h4>
                  <div className="space-y-1">
                    <label className="block text-[8px] font-black text-slate-500 uppercase">Banner Title</label>
                    <input
                      type="text"
                      value={draftTheme.contactPageSettings?.title || ""}
                      onChange={(e) => updateNestedField("contactPageSettings", "title", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] font-black text-slate-500 uppercase">Banner Description</label>
                    <textarea
                      value={draftTheme.contactPageSettings?.description || ""}
                      onChange={(e) => updateNestedField("contactPageSettings", "description", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-250 bg-slate-50/50 rounded-xl text-xs resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {activeElement === "contactInfo" && (
                <div className="space-y-3 animate-in fade-in">
                  <h4 className="text-[10.5px] font-black text-indigo-600 uppercase tracking-wider">Support Information Blocks</h4>
                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-black text-slate-500 uppercase">Support Email</label>
                      <input
                        type="text"
                        value={draftTheme.contactPageSettings?.email || ""}
                        onChange={(e) => updateNestedField("contactPageSettings", "email", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-mono text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-black text-slate-500 uppercase">Support Phone</label>
                      <input
                        type="text"
                        value={draftTheme.contactPageSettings?.phone || ""}
                        onChange={(e) => updateNestedField("contactPageSettings", "phone", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "theme-editor-most-winning":
        if (!activeElement || !activeElement.startsWith("game_form_")) {
          return (
            <div className="p-8 text-center text-slate-450 text-xs font-semibold">
              গেমের তালিকা থেকে যেকোনো গেম সিলেক্ট করুন অথবা "নতুন গেম যোগ করুন" বাটনে ক্লিক করে তথ্য এডিট করুন।
            </div>
          );
        }

        const gameId = activeElement.replace("game_form_", "");
        const activeGame = (draftTheme.mostWinningGames || []).find((g) => g.id === gameId);

        if (!activeGame) {
          return (
            <div className="p-8 text-center text-slate-450 text-xs font-semibold">
              সিলেক্ট করা গেমটি খুঁজে পাওয়া যায়নি বা মুছে ফেলা হয়েছে।
            </div>
          );
        }

        const gameSlug = (activeGame.name || "game")
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-") || gameId;

        return (
          <div className="space-y-5 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[9.5px] text-slate-450 font-bold block uppercase mt-0.5">
                  Game: {activeGame.name || "New Game (নতুন গেম)"}
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await saveGameToDatabase(draftTheme.mostWinningGames || []);
                  setActiveElement(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Close settings & Save"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Quick Auto-Fill Preset Game Buttons */}
              {DEFAULT_POPULAR_GAMES.length > 0 && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-150 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>⚡ ১-ক্লিকে গেম নাম ও কোম্পানি তথ্য অটো ফিল করুন:</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_POPULAR_GAMES.slice(0, 8).map((pGame) => (
                      <button
                        key={pGame.name}
                        type="button"
                        onClick={() => {
                          handleUpdateGameField(gameId, "name", pGame.name);
                          handleUpdateGameField(gameId, "brandName", pGame.brandName);
                          if (pGame.logoUrl) handleUpdateGameField(gameId, "logoUrl", pGame.logoUrl);
                          if (!activeGame.winRate) handleUpdateGameField(gameId, "winRate", "98.5%");
                          if (!activeGame.multiplier) handleUpdateGameField(gameId, "multiplier", "x5000");
                        }}
                        className="px-2 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg text-[9.5px] font-bold text-indigo-900 transition shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <span>{pGame.name}</span>
                        <span className="text-[8px] opacity-75 font-normal">({pGame.brandName})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Game Name */}
              <div className="space-y-1">
                <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                  গেমের নাম (Game Name)
                </label>
                <input
                  type="text"
                  value={activeGame.name || ""}
                  onChange={(e) => handleUpdateGameField(gameId, "name", e.target.value)}
                  placeholder="গেমের নাম লিখুন (যেমন: Aviator, Spaceman)"
                  className="w-full px-3 py-2 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-800"
                />
              </div>

              {/* Game Brand / Provider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                    গেম ব্র্যান্ড / প্রোভাইডার (Brand / Provider)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const detected = detectGameBrandName(activeGame.name || "");
                      if (detected) {
                        handleUpdateGameField(gameId, "brandName", detected);
                      }
                    }}
                    className="text-[9px] text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    ⚡ অটো ডিটেক্ট করুন
                  </button>
                </div>
                <input
                  type="text"
                  value={activeGame.brandName || ""}
                  onChange={(e) => handleUpdateGameField(gameId, "brandName", e.target.value)}
                  placeholder="যেমন: Spribe, Pragmatic Play, PG Soft, Evolution"
                  className="w-full px-3 py-2 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-800"
                />
              </div>

              {/* Game Logo */}
              {renderImageInputWithUploader(
                "গেম লোগো (Game Logo)",
                `logoUrl_${gameId}`,
                activeGame.logoUrl,
                (val) => handleUpdateGameField(gameId, "logoUrl", val)
              )}

              {analyzingGameId === gameId && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2 text-indigo-700 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                  <div className="text-[10px] font-bold uppercase tracking-wide">
                    ✨ Gemini AI is analyzing the game logo and automatically filling details...
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Win Rate (RTP) */}
                <div className="space-y-1">
                  <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                    আরটিপি / উইন রেট (RTP / Win Rate)
                  </label>
                  <input
                    type="text"
                    value={activeGame.winRate || ""}
                    onChange={(e) => handleUpdateGameField(gameId, "winRate", e.target.value)}
                    placeholder="যেমন: 98.5%"
                    className="w-full px-3 py-2 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-800"
                  />
                </div>

                {/* Max Multiplier */}
                <div className="space-y-1">
                  <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                    ম্যাক্স মাল্টিপ্লায়ার (Max Multiplier)
                  </label>
                  <input
                    type="text"
                    value={activeGame.multiplier || ""}
                    onChange={(e) => handleUpdateGameField(gameId, "multiplier", e.target.value)}
                    placeholder="যেমন: x5000"
                    className="w-full px-3 py-2 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Play Link / URL */}
              <div className="space-y-1">
                <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                  প্লে লিংক / রিডাইরেক্ট ইউআরএল (Play Link / URL)
                </label>
                <input
                  type="text"
                  value={activeGame.playUrl || ""}
                  onChange={(e) => handleUpdateGameField(gameId, "playUrl", e.target.value)}
                  placeholder="যেমন: /#casinos অথবা সরাসরি অ্যাফিলিয়েট লিংক"
                  className="w-full px-3 py-2 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-800"
                />
              </div>

              {/* Direct Save Game Button */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={async () => {
                    await saveGameToDatabase(draftTheme.mostWinningGames || []);
                  }}
                  disabled={gameSaving}
                  className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {gameSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>গেমের তথ্য ডাটাবেসে সেভ করা হচ্ছে...</span>
                    </>
                  ) : gameSaveSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-white" />
                      <span>গেমের তথ্য সরাসরি ডাটাবেসে সেভ হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-white" />
                      <span>গেমটি সেভ করুন (Save Game)</span>
                    </>
                  )}
                </button>
                <p className="text-[9px] text-center text-slate-400 font-semibold">
                  * এই সেভ বাটনে ক্লিক করলে ডাটা সরাসরি ডাটাবেসে জমা হয়ে যাবে। মূল থিম সেভ করার প্রয়োজন নেই।
                </p>
              </div>

              {/* Dedicated Subpage Info */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-150 rounded-xl space-y-1.5">
                <div className="text-[9px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>🔗 ডেডিকেটেড গেম সাব-পেজ (Game Subpage)</span>
                </div>
                <p className="text-[10px] text-indigo-900 font-semibold leading-tight">
                  এই গেমের জন্য একটি নিজস্ব সাব-পেজ স্বয়ংক্রিয়ভাবে তৈরি হয়েছে:
                </p>
                <div className="bg-white/90 border border-indigo-200 px-2.5 py-1.5 rounded-lg text-[10.5px] font-mono text-indigo-800 font-bold break-all">
                  /game/{gameSlug}
                </div>
                <p className="text-[9.5px] text-slate-500 font-medium">
                  প্লেয়াররা হোম পেজে গেমের ওপর ক্লিক করলে এই সাব-পেজে প্রবেশ করে বিস্তারিত ও খেলার অপশন পাবে।
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-10 text-center text-slate-450 text-xs font-semibold">
            Click any section of the live preview on the left to edit its settings.
          </div>
        );
    }
  };

  const { title: subTabTitle, desc: subTabDesc } = getSubTabInfo();

  const isGameListingPage = activeSubTab === "theme-editor-games" || activeSubTab === "theme-editor-most-winning";

  return (
    <div className="space-y-6">
      {/* Header Banner (Hidden on Game Listing Manager page) */}
      {!isGameListingPage && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-4 text-left">
            {activeSubTab !== "theme-editor" && (
              <button
                onClick={() => onSubTabChange?.("theme-editor")}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer flex items-center gap-1 active:scale-95"
                title="ডিজাইন হাবে ফিরে যান"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="font-display font-black text-slate-900 text-xl tracking-tight flex items-center gap-2">
                <Paintbrush className="w-5 h-5 text-indigo-600" />
                <span>{subTabTitle}</span>
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                {subTabDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetToDefault}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Reset to factory settings"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ডিফল্ট রিসেট</span>
            </button>

            <button
              onClick={handleSaveTheme}
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? "সংরক্ষণ হচ্ছে..." : saveSuccess ? "সংরক্ষিত!" : "থিম সংরক্ষণ করুন"}</span>
            </button>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fade-in shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>পাবলিক থিম কনফিগারেশন সফলভাবে আপডেট করা হয়েছে! পরিবর্তনগুলি এখন রিয়েল-টাইমে লাইভ পেজে দৃশ্যমান।</span>
        </div>
      )}

      {/* Main Panel: Full-Width Control Panel */}
      {(() => {
        const isVisualPageBuilder = [
          "theme-editor-home",
          "theme-editor-casino",
          "theme-editor-blog",
          "theme-editor-single-blog",
          "theme-editor-contact",
          "theme-editor-most-winning"
        ].includes(activeSubTab);

        return (
          <div className={`${isVisualPageBuilder ? "max-w-7xl" : "max-w-5xl"} mx-auto space-y-6 w-full transition-all duration-300`}>
            <div className="space-y-6">
              <div className={`${isVisualPageBuilder ? "bg-transparent border-none p-0 shadow-none" : "bg-white border border-slate-200 rounded-3xl p-5 shadow-xs"}`}>
                {isVisualPageBuilder ? (
                  /* --- GORGEOUS VISUAL PAGE BUILDER SPLIT PANEL --- */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
                    {/* Left: Interactive Live Preview Canvas (8 columns) */}
                    <div className="lg:col-span-8 space-y-4">
                      {/* Device Toolbar */}
                      <div className="bg-slate-800 text-white px-4 py-2 rounded-2xl flex items-center justify-between shadow-md text-xs">
                        <div className="flex items-center gap-1.5 text-left">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-2 font-mono">Visual Editor</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDevice("desktop")}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${previewDevice === "desktop" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                            title="Desktop View"
                          >
                            <Monitor className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewDevice("tablet")}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${previewDevice === "tablet" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                            title="Tablet View"
                          >
                            <Tablet className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewDevice("mobile")}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${previewDevice === "mobile" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                            title="Mobile View"
                          >
                            <Smartphone className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-[10px] font-black uppercase text-indigo-400">
                          {activeSubTab.replace("theme-editor-", "").toUpperCase()} VIEW
                        </div>
                      </div>

                      {/* Canvas Frame */}
                      <div className="flex justify-center transition-all duration-300">
                        <div
                          className="bg-white border border-slate-200 rounded-3xl shadow-lg transition-all duration-300 overflow-hidden relative"
                          style={{
                            width: previewDevice === "desktop" ? "100%" : previewDevice === "tablet" ? "768px" : "390px",
                            minHeight: "75vh",
                            fontFamily: draftTheme.globalSettings.fontFamily,
                            backgroundColor: draftTheme.globalSettings.backgroundColor,
                            color: draftTheme.globalSettings.textColor
                          }}
                        >
                          {/* Dynamic Preview Rendering */}
                          {renderVisualPreview()}
                        </div>
                      </div>
                    </div>

                    {/* Right: Settings Drawer (4 columns) - Now Sidebar Navigator/Outline */}
                    <div className="lg:col-span-4 sticky top-6">
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md space-y-5 text-left max-h-[85vh] overflow-y-auto">
                        {renderSidebarOutline()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* TAB 1: GLOBAL DESIGN SETTINGS */}
                    {activeSubTab === "theme-editor-global" && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Brand Assets */}
                <div className="space-y-5">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Brand Assets (ব্র্যান্ড লোগো এবং আইকন)</span>
                  </h4>

                  {/* Textual brand info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        লোগো টেক্সট (Logo Text)
                      </label>
                      <input
                        type="text"
                        value={settings.logoText}
                        onChange={(e) => updateGlobalSetting("logoText", e.target.value)}
                        placeholder="যেমন: Eker Listings"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        ফেভিকন ইমোজি (Favicon Emoji)
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={settings.faviconText}
                        onChange={(e) => updateGlobalSetting("faviconText", e.target.value)}
                        placeholder="যেমন: 🪙, 🎰, 🎰"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Visual Image Management System */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    {/* Website Logo Visual Manager */}
                    <div className="space-y-2 text-left">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        ওয়েবসাইট লোগো (Website Logo)
                      </label>
                      <div className="relative group rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/30 hover:bg-slate-50/10 p-4 transition-all duration-300 flex flex-col items-center justify-center min-h-[140px] overflow-hidden">
                        {logoUploading ? (
                          <div className="flex flex-col items-center justify-center space-y-2 py-4">
                            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                            <span className="text-[11px] font-bold text-indigo-600">লোগো আপলোড হচ্ছে...</span>
                          </div>
                        ) : settings.logoUrl ? (
                          <div className="w-full flex flex-col items-center space-y-2.5">
                            {/* Checkered grid pattern for transparency preview */}
                            <div className="relative w-full h-24 rounded-xl flex items-center justify-center p-2 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100 border border-slate-200/85 overflow-hidden group-hover:shadow-xs transition-all">
                              <img
                                src={settings.logoUrl}
                                alt="Logo Preview"
                                className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                                referrerPolicy="no-referrer"
                              />
                              {/* Overlay actions */}
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-200 rounded-xl">
                                <label className="p-2 bg-white/95 hover:bg-white text-indigo-600 rounded-lg shadow-sm transition-transform hover:scale-115 cursor-pointer" title="নতুন ইমেজ আপলোড করুন">
                                  <Upload className="w-4 h-4" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(e, "logo")}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => updateGlobalSetting("logoUrl", "")}
                                  className="p-2 bg-white/95 hover:bg-white text-rose-600 rounded-lg shadow-sm transition-transform hover:scale-115 cursor-pointer"
                                  title="লোগো মুছে ফেলুন"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold truncate max-w-full font-mono">{settings.logoUrl}</span>
                          </div>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center space-y-2 cursor-pointer py-4">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                              <Upload className="w-4 h-4" />
                            </div>
                            <div className="text-center">
                              <p className="text-[11px] font-extrabold text-indigo-600">লোগো ইমেজ আপলোড করুন</p>
                              <p className="text-[9px] text-slate-400 font-bold mt-1">PNG, JPG, SVG (Max 2MB)</p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, "logo")}
                            />
                          </label>
                        )}
                      </div>
                      
                      {/* Manual Link Input */}
                      <details className="group/details">
                        <summary className="text-[9px] font-black text-slate-400 hover:text-slate-600 cursor-pointer list-none flex items-center gap-1 select-none">
                          <span className="transition-transform group-open/details:rotate-90 text-[7px]">▶</span>
                          <span>ম্যানুয়ালি ইউআরএল সেট করুন (Manual Link)</span>
                        </summary>
                        <div className="mt-1.5 flex gap-1.5">
                          <input
                            type="text"
                            value={settings.logoUrl || ""}
                            onChange={(e) => updateGlobalSetting("logoUrl", e.target.value)}
                            placeholder="যেমন: https://example.com/logo.png"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white text-slate-800"
                          />
                        </div>
                      </details>
                    </div>

                    {/* Browser Favicon Visual Manager */}
                    <div className="space-y-2 text-left">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        ওয়েবসাইট ফেভিকন (Browser Favicon)
                      </label>
                      <div className="relative group rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/30 hover:bg-slate-50/10 p-4 transition-all duration-300 flex flex-col items-center justify-center min-h-[140px] overflow-hidden">
                        {faviconUploading ? (
                          <div className="flex flex-col items-center justify-center space-y-2 py-4">
                            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                            <span className="text-[11px] font-bold text-indigo-600">ফেভিকন আপলোড হচ্ছে...</span>
                          </div>
                        ) : settings.faviconUrl ? (
                          <div className="w-full flex flex-col items-center space-y-2.5">
                            {/* Checkered grid pattern for transparency preview */}
                            <div className="relative w-full h-24 rounded-xl flex items-center justify-center p-2 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100 border border-slate-200/85 overflow-hidden group-hover:shadow-xs transition-all">
                              <img
                                src={settings.faviconUrl}
                                alt="Favicon Preview"
                                className="w-10 h-10 object-cover rounded-md transition-transform duration-300 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              {/* Overlay actions */}
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-200 rounded-xl">
                                <label className="p-2 bg-white/95 hover:bg-white text-indigo-600 rounded-lg shadow-sm transition-transform hover:scale-115 cursor-pointer" title="নতুন ইমেজ আপলোড করুন">
                                  <Upload className="w-4 h-4" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(e, "favicon")}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => updateGlobalSetting("faviconUrl", "")}
                                  className="p-2 bg-white/95 hover:bg-white text-rose-600 rounded-lg shadow-sm transition-transform hover:scale-115 cursor-pointer"
                                  title="ফেভিকন মুছে ফেলুন"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold truncate max-w-full font-mono">{settings.faviconUrl}</span>
                          </div>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center space-y-2 cursor-pointer py-4">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                              <Upload className="w-4 h-4" />
                            </div>
                            <div className="text-center">
                              <p className="text-[11px] font-extrabold text-indigo-600">ফেভিকন ইমেজ আপলোড করুন</p>
                              <p className="text-[9px] text-slate-400 font-bold mt-1">PNG, ICO, SVG (Max 1MB)</p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, "favicon")}
                            />
                          </label>
                        )}
                      </div>
                      
                      {/* Manual Link Input */}
                      <details className="group/details">
                        <summary className="text-[9px] font-black text-slate-400 hover:text-slate-600 cursor-pointer list-none flex items-center gap-1 select-none">
                          <span className="transition-transform group-open/details:rotate-90 text-[7px]">▶</span>
                          <span>ম্যানুয়ালি ইউআরএল সেট করুন (Manual Link)</span>
                        </summary>
                        <div className="mt-1.5 flex gap-1.5">
                          <input
                            type="text"
                            value={settings.faviconUrl || ""}
                            onChange={(e) => updateGlobalSetting("faviconUrl", e.target.value)}
                            placeholder="যেমন: https://example.com/favicon.png"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white text-slate-800"
                          />
                        </div>
                      </details>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Typography Fonts Selection */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Typography (ফন্ট ফ্যামিলি)</span>
                  </h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      ওয়েবসাইট ফন্ট নির্বাচন করুন
                    </label>
                    <select
                      value={settings.fontFamily}
                      onChange={(e) => updateGlobalSetting("fontFamily", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-bold focus:outline-hidden focus:border-indigo-500"
                    >
                      {GOOGLE_FONTS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1.5 leading-normal">
                      * এই ফন্টটি সম্পূর্ণ ওয়েবসাইটের শিরোনাম, কন্টেন্ট এবং বাটনগুলিতে প্রয়োগ হবে।
                    </p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Theme Preset Palettes */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-teal-500" />
                    <span>Color presets (ডিজাইন করা থিম বান্ডেল)</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    এক ক্লিকেই সম্পুর্ণ পেজের কালার কম্বিনেশন পরিবর্তন করতে নিচের যেকোনো একটি থিম বাছুন:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {PRESET_COLOR_THEMES.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPresetTheme(preset)}
                        className="flex items-center justify-between p-2.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-left transition-all cursor-pointer"
                      >
                        <span className="text-[11px] font-bold text-slate-700">{preset.name}</span>
                        <div className="flex gap-1 shrink-0">
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: preset.primaryColor }} title="Primary" />
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: preset.backgroundColor }} title="Bg" />
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: preset.cardBackgroundColor }} title="Card" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Color Scheme Picker */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    Custom Color Palette (কাস্টম কালার প্যালেট)
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        প্রাইমারি কালার (Primary)
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={settings.primaryColor}
                          onChange={(e) => updateGlobalSetting("primaryColor", e.target.value)}
                          className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 cursor-pointer p-0"
                        />
                        <input
                          type="text"
                          value={settings.primaryColor}
                          onChange={(e) => updateGlobalSetting("primaryColor", e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-[10px] uppercase font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        সেকেন্ডারি কালার (Secondary)
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={settings.secondaryColor}
                          onChange={(e) => updateGlobalSetting("secondaryColor", e.target.value)}
                          className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 cursor-pointer p-0"
                        />
                        <input
                          type="text"
                          value={settings.secondaryColor}
                          onChange={(e) => updateGlobalSetting("secondaryColor", e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-[10px] uppercase font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        ব্যাকগ্রাউন্ড কালার (Background)
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={settings.backgroundColor}
                          onChange={(e) => updateGlobalSetting("backgroundColor", e.target.value)}
                          className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 cursor-pointer p-0"
                        />
                        <input
                          type="text"
                          value={settings.backgroundColor}
                          onChange={(e) => updateGlobalSetting("backgroundColor", e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-[10px] uppercase font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        টেক্সট কালার (Text Color)
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={settings.textColor}
                          onChange={(e) => updateGlobalSetting("textColor", e.target.value)}
                          className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 cursor-pointer p-0"
                        />
                        <input
                          type="text"
                          value={settings.textColor}
                          onChange={(e) => updateGlobalSetting("textColor", e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-[10px] uppercase font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        কার্ড এবং ব্লক ব্যাকগ্রাউন্ড (Card Background)
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={settings.cardBackgroundColor}
                          onChange={(e) => updateGlobalSetting("cardBackgroundColor", e.target.value)}
                          className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 cursor-pointer p-0"
                        />
                        <input
                          type="text"
                          value={settings.cardBackgroundColor}
                          onChange={(e) => updateGlobalSetting("cardBackgroundColor", e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-[10px] uppercase font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Layout Configuration */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    Layout & Dimensions (লেআউট এবং আকৃতি)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        লেআউট টাইপ (Layout Width)
                      </label>
                      <select
                        value={settings.layoutType}
                        onChange={(e) => updateGlobalSetting("layoutType", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold focus:outline-hidden"
                      >
                        <option value="boxed">Boxed (সীমিত কন্টেইনার - 7XL)</option>
                        <option value="wide">Wide (ফুল-স্ক্রিন চওড়া)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        কার্ড কোণা বক্রতা (Card Radius)
                      </label>
                      <select
                        value={settings.cardBorderRadius}
                        onChange={(e) => updateGlobalSetting("cardBorderRadius", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold focus:outline-hidden"
                      >
                        <option value="0px">বর্গাকার (0px)</option>
                        <option value="0.5rem">হালকা বক্র (8px)</option>
                        <option value="1rem">স্ট্যান্ডার্ড মডার্ন (16px - Default)</option>
                        <option value="1.5rem">অনেক বক্র (24px)</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        সেকশনের মধ্যকার ব্যবধান (Section Spacing)
                      </label>
                      <select
                        value={settings.sectionSpacing}
                        onChange={(e) => updateGlobalSetting("sectionSpacing", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold focus:outline-hidden"
                      >
                        <option value="1.5rem">ছোট ব্যবধান (24px)</option>
                        <option value="3rem">স্ট্যান্ডার্ড ব্যবধান (48px - Default)</option>
                        <option value="4.5rem">বড় ব্যবধান (72px)</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: SECTIONS & ORDERING */}
            {activeSubTab === "theme-editor-home" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    Homepage Sections (পাবলিক পেজ সেকশনসমূহ)
                  </h4>
                  <button
                    type="button"
                    onClick={addNewCustomSection}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>নতুন কাস্টম সেকশন</span>
                  </button>
                </div>

                <p className="text-[10px] text-slate-500 font-medium leading-normal">
                  এখানে আপনি সেকশনগুলি ড্র্যাগ করার মতো উপর-নিচ করতে পারবেন, প্রদর্শন বন্ধ করতে পারবেন, বা কাস্টম সেকশন তৈরি করতে পারবেন।
                </p>

                {/* Section List */}
                <div className="space-y-2.5">
                  {draftTheme.sections.map((sec, index) => {
                    const isEditingThis = activeSectionId === sec.id;
                    const isCustom = sec.type === "custom";

                    return (
                      <div
                        key={sec.id}
                        className={`border rounded-2xl p-3.5 transition-all bg-slate-50/50 ${
                          isEditingThis
                            ? "border-indigo-500 ring-2 ring-indigo-50 bg-white"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {/* Toggle visibility */}
                            <button
                              type="button"
                              onClick={() => toggleSectionEnabled(sec.id)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                sec.enabled
                                  ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                                  : "text-slate-400 bg-slate-100 hover:bg-slate-200"
                              }`}
                              title={sec.enabled ? "Hide Section" : "Show Section"}
                            >
                              {sec.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>

                            <div className="text-left">
                              <span className="text-[11px] font-black text-slate-800 leading-none flex items-center gap-1.5">
                                {sec.title || "Untitled Section"}
                                {isCustom && (
                                  <span className="text-[8px] uppercase font-black tracking-widest text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                    কাস্টম
                                  </span>
                                )}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium mt-1 block uppercase">
                                Type: {sec.type}
                              </span>
                            </div>
                          </div>

                          {/* Controls (Arrows and Edit click) */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveSection(index, "up")}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === draftTheme.sections.length - 1}
                              onClick={() => moveSection(index, "down")}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveSectionId(isEditingThis ? null : sec.id)}
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ml-1 cursor-pointer ${
                                isEditingThis
                                  ? "bg-slate-900 text-white"
                                  : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-600"
                              }`}
                            >
                              {isEditingThis ? "সেটিংস বন্ধ" : "সম্পাদনা"}
                            </button>

                            {isCustom && (
                              <button
                                type="button"
                                onClick={() => deleteCustomSection(sec.id)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded ml-1 cursor-pointer"
                                title="Delete Section"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable Section Editor Details */}
                        {isEditingThis && (
                          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3.5 text-left animate-in fade-in duration-200">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                শিরোনাম (Section Title)
                              </label>
                              <input
                                type="text"
                                value={sec.title || ""}
                                onChange={(e) => updateSectionField(sec.id, "title", e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden bg-white"
                              />
                            </div>

                            {sec.type !== "featured_operators" && sec.type !== "latest_listings" && sec.type !== "top_rated" && (
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  উপ-শিরোনাম বা সংক্ষিপ্ত বিবরণ (Subtitle)
                                </label>
                                <textarea
                                  value={sec.subtitle || ""}
                                  onChange={(e) => updateSectionField(sec.id, "subtitle", e.target.value)}
                                  rows={2}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden bg-white resize-none"
                                />
                              </div>
                            )}

                            {/* Carousel Specific Configuration Controls */}
                            {(sec.type === "featured_operators" || sec.type === "latest_listings" || sec.type === "top_rated") && (
                              <div className="space-y-3 pt-2.5 border-t border-slate-100">
                                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                                  কারোসেল / স্লাইডার কনফিগারেশন (Slider Settings)
                                </h4>

                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    উপ-শিরোনাম (Section Subtitle)
                                  </label>
                                  <input
                                    type="text"
                                    value={sec.subtitle || ""}
                                    onChange={(e) => updateSectionField(sec.id, "subtitle", e.target.value)}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden bg-white"
                                    placeholder="যেমন: Top premium operators vetted by Eker"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      কোন ক্যাটাগরি শো হবে? (Filter Category)
                                    </label>
                                    <select
                                      value={sec.carouselCategory || "All"}
                                      onChange={(e) => updateSectionField(sec.id, "carouselCategory", e.target.value)}
                                      className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden bg-white"
                                    >
                                      <option value="All">সকল ক্যাটাগরি (All)</option>
                                      <option value="Exclusive">এক্সক্লুসিভ (Exclusive)</option>
                                      <option value="Slot">স্লট (Slot)</option>
                                      <option value="High Roller">হাই রোলার (High Roller)</option>
                                      <option value="Crypto">ক্রিপ্টো (Crypto)</option>
                                      <option value="SaaS">SaaS</option>
                                      <option value="Tech">Tech</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      কয়টি কার্ড শো হবে? (Display Cards)
                                    </label>
                                    <select
                                      value={sec.displayCount || 4}
                                      onChange={(e) => updateSectionField(sec.id, "displayCount", parseInt(e.target.value) || 4)}
                                      className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden bg-white"
                                    >
                                      <option value={2}>২টি কার্ড (2 Cards)</option>
                                      <option value={3}>৩টি কার্ড (3 Cards)</option>
                                      <option value={4}>৪টি কার্ড (4 Cards)</option>
                                      <option value={5}>৫টি কার্ড (5 Cards)</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      স্লাইড প্রতি কয়টি সরবে? (Slide Step Size)
                                    </label>
                                    <select
                                      value={sec.slideCount || 1}
                                      onChange={(e) => updateSectionField(sec.id, "slideCount", parseInt(e.target.value) || 1)}
                                      className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden bg-white"
                                    >
                                      <option value={1}>১টি কার্ড (1 Card)</option>
                                      <option value={2}>২টি কার্ড (2 Cards)</option>
                                      <option value={3}>৩টি কার্ড (3 Cards)</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      স্লাইড স্পিড / সময় (ms)
                                    </label>
                                    <input
                                      type="number"
                                      value={sec.slideSpeed || 3000}
                                      onChange={(e) => updateSectionField(sec.id, "slideSpeed", parseInt(e.target.value) || 3000)}
                                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
                                      placeholder="যেমন: 3000"
                                      min={1000}
                                      max={20000}
                                      step={500}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                  <input
                                    type="checkbox"
                                    id={`autoslide-${sec.id}`}
                                    checked={sec.autoSlide ?? true}
                                    onChange={(e) => updateSectionField(sec.id, "autoSlide", e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                  />
                                  <label htmlFor={`autoslide-${sec.id}`} className="text-[11px] font-bold text-slate-600 select-none cursor-pointer">
                                    স্বয়ংক্রিয় স্লাইড হবে (Enable Auto Slide)
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* FAQ Specific Configuration Controls */}
                            {sec.type === "faq" && (
                              <div className="space-y-4 pt-2.5 border-t border-slate-100">
                                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                                  FAQ প্রশ্ন ও উত্তর ব্যবস্থাপনা (FAQ Manager)
                                </h4>
                                <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1">
                                  {(sec.faqs || [
                                    { question: "Eker Listings কি?", answer: "Eker Listings একটি প্রিমিয়াম ভেরিফাইড ডিরেক্টরি প্ল্যাটফর্ম।" },
                                    { question: "এখানে কীভাবে বোনাস ক্লাইম করব?", answer: "আপনি যেকোনো ক্যাসিনো কার্ডের বাটনে ক্লিক করে সরাসরি বোনাস ক্লাইম করতে পারেন।" }
                                  ]).map((item, faqIdx) => (
                                    <div key={faqIdx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 relative">
                                      <div>
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">প্রশ্ন {faqIdx + 1}</label>
                                        <input
                                          type="text"
                                          value={item.question}
                                          onChange={(e) => {
                                            const newFaqs = [...(sec.faqs || [])];
                                            if (newFaqs[faqIdx]) {
                                              newFaqs[faqIdx].question = e.target.value;
                                              updateSectionField(sec.id, "faqs", newFaqs);
                                            }
                                          }}
                                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden bg-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">উত্তর {faqIdx + 1}</label>
                                        <textarea
                                          value={item.answer}
                                          onChange={(e) => {
                                            const newFaqs = [...(sec.faqs || [])];
                                            if (newFaqs[faqIdx]) {
                                              newFaqs[faqIdx].answer = e.target.value;
                                              updateSectionField(sec.id, "faqs", newFaqs);
                                            }
                                          }}
                                          rows={2}
                                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden bg-white resize-none"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Custom Section Specific Content Editing */}
                            {sec.type === "custom" && (
                              <>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    বিস্তারিত কন্টেন্ট (HTML বা প্লেইন টেক্সট)
                                  </label>
                                  <textarea
                                    value={sec.content || ""}
                                    onChange={(e) => updateSectionField(sec.id, "content", e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden bg-white"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      সেকশন ব্যাকগ্রাউন্ড
                                    </label>
                                    <input
                                      type="color"
                                      value={sec.customBackgroundColor || "#ffffff"}
                                      onChange={(e) => updateSectionField(sec.id, "customBackgroundColor", e.target.value)}
                                      className="w-full h-8 rounded-lg border border-slate-200 cursor-pointer p-0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      সেকশন টেক্সট কালার
                                    </label>
                                    <input
                                      type="color"
                                      value={sec.customTextColor || "#1e293b"}
                                      onChange={(e) => updateSectionField(sec.id, "customTextColor", e.target.value)}
                                      className="w-full h-8 rounded-lg border border-slate-200 cursor-pointer p-0"
                                    />
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Hero Specific Content Editing */}
                            {sec.type === "hero" && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    বাটন টেক্সট (Button Text)
                                  </label>
                                  <input
                                    type="text"
                                    value={sec.actionText || ""}
                                    onChange={(e) => updateSectionField(sec.id, "actionText", e.target.value)}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    বাটন ক্লিক ইউআরএল (Button URL)
                                  </label>
                                  <input
                                    type="text"
                                    value={sec.actionUrl || ""}
                                    onChange={(e) => updateSectionField(sec.id, "actionUrl", e.target.value)}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    গ্রেডিয়েন্ট ব্যাকগ্রাউন্ড ১
                                  </label>
                                  <input
                                    type="color"
                                    value={sec.backgroundGradientStart || "#0f172a"}
                                    onChange={(e) => updateSectionField(sec.id, "backgroundGradientStart", e.target.value)}
                                    className="w-full h-8 rounded-lg border border-slate-200 cursor-pointer p-0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    গ্রেডিয়েন্ট ব্যাকগ্রাউন্ড ২
                                  </label>
                                  <input
                                    type="color"
                                    value={sec.backgroundGradientEnd || "#1e1b4b"}
                                    onChange={(e) => updateSectionField(sec.id, "backgroundGradientEnd", e.target.value)}
                                    className="w-full h-8 rounded-lg border border-slate-200 cursor-pointer p-0"
                                  />
                                </div>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. MENU ITEMS MANAGER */}
            {activeSubTab === "theme-editor-menu" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Menu className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Header & Footer Links (মেনু কাস্টমাইজার)</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                    ওয়েবসাইটের হেডার নেভিগেশন এবং ফুটারে প্রদর্শিত লিঙ্কগুলি পরিচালনা করুন।
                  </p>
                </div>

                {/* Add Menu Item Form */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                  <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wide">
                    নতুন মেনু লিঙ্ক যুক্ত করুন
                  </h5>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                        লিঙ্ক লেবেল (Link Label)
                      </label>
                      <input
                        type="text"
                        value={newMenuLabel}
                        onChange={(e) => setNewMenuLabel(e.target.value)}
                        placeholder="যেমন: Exclusive Slots"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                        লিঙ্ক ইউআরএল (Link URL)
                      </label>
                      <input
                        type="text"
                        value={newMenuUrl}
                        onChange={(e) => setNewMenuUrl(e.target.value)}
                        placeholder="যেমন: /#exclusive"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-800"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMenuItem}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>মেনুতে যুক্ত করুন</span>
                  </button>
                </div>

                {/* List of Current Menu Items */}
                <div className="space-y-2.5">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                    বর্তমান মেনু লিঙ্কসমূহ ({(draftTheme.menuItems || []).length})
                  </h5>
                  <div className="space-y-2">
                    {(draftTheme.menuItems || []).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white border border-slate-150 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-800 block">
                            {item.label}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 font-semibold block mt-0.5">
                            {item.url}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMenuItem(item.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="লিঙ্ক মুছে ফেলুন"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. CATEGORY MANAGER */}
            {activeSubTab === "theme-editor-category" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-500" />
                    <span>Casino Categories (ক্যাটাগরি কাস্টমাইজার)</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                    ওয়েবসাইটে ক্যাসিনো ফিল্টারিং এবং ভেরিফিকেশনের জন্য ডায়নামিক ক্যাটাগরিগুলি পরিচালনা করুন।
                  </p>
                </div>

                {/* Add Category Form */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wide">
                    নতুন ক্যাটাগরি যুক্ত করুন
                  </h5>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="যেমন: Multi-Provider"
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-98 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>যুক্ত করুন</span>
                    </button>
                  </div>
                </div>

                {/* List of Categories */}
                <div className="space-y-2.5">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                    বর্তমান ক্যাটাগরিসমূহ ({(draftTheme.categoriesList || []).length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {(draftTheme.categoriesList || []).map((cat) => (
                      <div
                        key={cat}
                        className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-slate-200 transition"
                      >
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat)}
                          className="text-slate-400 hover:text-rose-600 rounded-full cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 5. SINGLE CASINO EDITOR */}
            {activeSubTab === "theme-editor-casino" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Single Casino View (সিঙ্গেল ক্যাসিনো পেজ)</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                    সিঙ্গেল ক্যাসিনো রিভিউ পেজ এবং সাইডবার লেআউট সেটিংস কনফিগার করুন।
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Sidebar location */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      সাইডবার পজিশন (Sidebar Location)
                    </label>
                    <select
                      value={draftTheme.singleCasinoSettings?.sidebarLocation || "right"}
                      onChange={(e) => updateNestedField("singleCasinoSettings", "sidebarLocation", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold focus:outline-hidden text-slate-800"
                    >
                      <option value="right">ডান পাশে সাইডবার (Right Sidebar - Default)</option>
                      <option value="left">বাম পাশে সাইডবার (Left Sidebar)</option>
                      <option value="none">সাইডবার লুকান (No Sidebar / Full Width)</option>
                    </select>
                  </div>

                  {/* Review Button Text */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      রিভিউ সাবমিট বাটন টেক্সট (Review Submit Button)
                    </label>
                    <input
                      type="text"
                      value={draftTheme.singleCasinoSettings?.reviewBtnText || "Write a Review"}
                      onChange={(e) => updateNestedField("singleCasinoSettings", "reviewBtnText", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-semibold focus:outline-hidden text-slate-800"
                    />
                  </div>

                  {/* Disclaimer textarea */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      দায়বদ্ধতা সতর্কীকরণ বার্তা (Gamble Responsibility Warning)
                    </label>
                    <textarea
                      value={draftTheme.singleCasinoSettings?.disclaimerText || ""}
                      onChange={(e) => updateNestedField("singleCasinoSettings", "disclaimerText", e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-medium focus:outline-hidden text-slate-800"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    {/* Show Related Campaigns */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-black text-slate-700 block">রিলেটেড বোনাস কন্টেন্ট</span>
                        <span className="text-[9px] text-slate-400 font-semibold block">সাইডবারে রিলেটেড অফার দেখাবে</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={draftTheme.singleCasinoSettings?.showRelatedJackpots ?? true}
                        onChange={(e) => updateNestedField("singleCasinoSettings", "showRelatedJackpots", e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Show Verified badges */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-[11px] font-black text-slate-700 block">ভেরিফাইড অপারেটর ব্যাজ</span>
                        <span className="text-[9px] text-slate-400 font-semibold block">লাইসেন্সপ্রাপ্ত ভেরিফাইড ব্যাজ দেখাবে</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={draftTheme.singleCasinoSettings?.showVerifiedBadge ?? true}
                        onChange={(e) => updateNestedField("singleCasinoSettings", "showVerifiedBadge", e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. BLOG PAGE EDITOR */}
            {activeSubTab === "theme-editor-blog" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Blog List Page (ব্লগ পেজ কাস্টমাইজার)</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                    প্রধান ব্লগ পেজের ব্যানার কন্টেন্ট এবং গ্রিড লেআউট সেটিংস পরিবর্তন করুন।
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      ব্লগ ব্যানার শিরোনাম (Banner Title)
                    </label>
                    <input
                      type="text"
                      value={draftTheme.blogPageSettings?.bannerTitle || ""}
                      onChange={(e) => updateNestedField("blogPageSettings", "bannerTitle", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-semibold focus:outline-hidden text-slate-800"
                    />
                  </div>

                  {/* Subtitle */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      ব্লগ ব্যানার উপশিরোনাম (Banner Subtitle)
                    </label>
                    <textarea
                      value={draftTheme.blogPageSettings?.bannerSubtitle || ""}
                      onChange={(e) => updateNestedField("blogPageSettings", "bannerSubtitle", e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-medium focus:outline-hidden text-slate-800"
                    />
                  </div>

                  {/* Grid layout columns */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      গ্রিড লেআউট কলাম (Grid Columns)
                    </label>
                    <select
                      value={draftTheme.blogPageSettings?.columns || 3}
                      onChange={(e) => updateNestedField("blogPageSettings", "columns", Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-bold focus:outline-hidden text-slate-800"
                    >
                      <option value={2}>২ কলাম গ্রিড (2 Columns Layout)</option>
                      <option value={3}>৩ কলাম গ্রিড (3 Columns Layout - Default)</option>
                    </select>
                  </div>

                  {/* Posts per page */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      প্রতি পেজে পোস্ট সংখ্যা (Posts per Page)
                    </label>
                    <input
                      type="number"
                      value={draftTheme.blogPageSettings?.postsPerPage || 6}
                      onChange={(e) => updateNestedField("blogPageSettings", "postsPerPage", Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-semibold focus:outline-hidden text-slate-800"
                      min={2}
                      max={24}
                    />
                  </div>

                  {/* Enable filter toggle */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black text-slate-700 block">ক্যাটাগরি ফিল্টার বার</span>
                      <span className="text-[9px] text-slate-400 font-semibold block">ব্লগ পেজের ওপরে সার্চ এবং ফিল্টার বার দেখাবে</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftTheme.blogPageSettings?.enableFilters ?? true}
                      onChange={(e) => updateNestedField("blogPageSettings", "enableFilters", e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. SINGLE BLOG POST EDITOR */}
            {activeSubTab === "theme-editor-single-blog" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                    <span>Single Blog Post (সিঙ্গেল ব্লগ পোস্ট পেজ)</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                    সিঙ্গেল ব্লগ আর্টিকেল পেজে প্রদর্শিত ইনফো কার্ড এবং ইন্টারেকশন এলিমেন্ট পরিচালনা করুন।
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  {/* Show author box */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black text-slate-700 block">লেখক বিবরণী বক্স (Author Card)</span>
                      <span className="text-[9px] text-slate-400 font-semibold block">পোস্টের নিচে লেখকের ছবি ও বায়ো দেখাবে</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftTheme.singleBlogSettings?.showAuthorBox ?? true}
                      onChange={(e) => updateNestedField("singleBlogSettings", "showAuthorBox", e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Show reading time */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-[11px] font-black text-slate-700 block">পড়ার সময় সীমা (Read Time)</span>
                      <span className="text-[9px] text-slate-400 font-semibold block">পোস্টের ওপরে আনুমানিক পড়ার সময় দেখাবে</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftTheme.singleBlogSettings?.showReadTime ?? true}
                      onChange={(e) => updateNestedField("singleBlogSettings", "showReadTime", e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Show share buttons */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-[11px] font-black text-slate-700 block">সোশ্যাল শেয়ার বাটন</span>
                      <span className="text-[9px] text-slate-400 font-semibold block">ফেসবুক, টুইটার শেয়ার বাটন দেখাবে</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftTheme.singleBlogSettings?.showShareButtons ?? true}
                      onChange={(e) => updateNestedField("singleBlogSettings", "showShareButtons", e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Show related posts */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-[11px] font-black text-slate-700 block">সম্পর্কিত আর্টিকেলসমূহ (Related Posts)</span>
                      <span className="text-[9px] text-slate-400 font-semibold block">নিচে ক্যাটাগরিভিত্তিক সম্পর্কিত পোস্ট দেখাবে</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftTheme.singleBlogSettings?.showRelatedPosts ?? true}
                      onChange={(e) => updateNestedField("singleBlogSettings", "showRelatedPosts", e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Enable comments */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-[11px] font-black text-slate-700 block">পাবলিক কমেন্ট ফর্ম (Comment System)</span>
                      <span className="text-[9px] text-slate-400 font-semibold block">ভিজিটরদের মন্তব্য এবং ফিডব্যাক সাবমিশন ফর্ম</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={draftTheme.singleBlogSettings?.enableComments ?? true}
                      onChange={(e) => updateNestedField("singleBlogSettings", "enableComments", e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 8. CONTACT PAGE EDITOR */}
            {activeSubTab === "theme-editor-contact" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-purple-500" />
                    <span>Contact Page View (যোগাযোগ পেজ কাস্টমাইজার)</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                    যোগাযোগ পেজের কন্টাক্ট ইনফরমেশন এবং লোকেশন সেটিংস কাস্টমাইজ করুন।
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      যোগাযোগ ব্যানার শিরোনাম (Banner Title)
                    </label>
                    <input
                      type="text"
                      value={draftTheme.contactPageSettings?.title || ""}
                      onChange={(e) => updateNestedField("contactPageSettings", "title", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-semibold focus:outline-hidden text-slate-800"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      যোগাযোগ ব্যানার বিবরণ (Banner Description)
                    </label>
                    <textarea
                      value={draftTheme.contactPageSettings?.description || ""}
                      onChange={(e) => updateNestedField("contactPageSettings", "description", e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-medium focus:outline-hidden text-slate-800"
                    />
                  </div>

                  {/* Support Email */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      সাপোর্ট ইমেইল (Support Email)
                    </label>
                    <input
                      type="email"
                      value={draftTheme.contactPageSettings?.email || ""}
                      onChange={(e) => updateNestedField("contactPageSettings", "email", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-semibold focus:outline-hidden text-slate-800"
                    />
                  </div>

                  {/* Support Phone */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      সাপোর্ট ফোন নম্বর (Support Phone)
                    </label>
                    <input
                      type="text"
                      value={draftTheme.contactPageSettings?.phone || ""}
                      onChange={(e) => updateNestedField("contactPageSettings", "phone", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-semibold focus:outline-hidden text-slate-800"
                    />
                  </div>

                  {/* Support Address */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      অফিস ঠিকানা (Office Address)
                    </label>
                    <input
                      type="text"
                      value={draftTheme.contactPageSettings?.address || ""}
                      onChange={(e) => updateNestedField("contactPageSettings", "address", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-semibold focus:outline-hidden text-slate-800"
                    />
                  </div>

                  {/* Google Map Iframe URL */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      গুগল ম্যাপ লোকেশন এমবেড লিংক (Google Maps Embed URL)
                    </label>
                    <input
                      type="text"
                      value={draftTheme.contactPageSettings?.mapIframeUrl || ""}
                      onChange={(e) => updateNestedField("contactPageSettings", "mapIframeUrl", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs font-mono focus:outline-hidden text-slate-800"
                      placeholder="https://www.google.com/maps/embed..."
                    />
                  </div>
                </div>
              </div>
            )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {/* Settings Modal Popup */}
      {(activeSectionId !== null || activeElement !== null) && (() => {
        const activeSec = draftTheme.sections.find((s) => s.id === activeSectionId);
        
        let modalTitle = "✏️ Element Settings";
        if (activeSectionId !== null) {
          modalTitle = `✏️ ${activeSec?.title || "Section"} Settings (সেকশন সেটিংস)`;
        } else if (activeElement !== null) {
          switch (activeElement) {
            case "reviewBtn":
              modalTitle = "✏️ Submit Review Button Options";
              break;
            case "disclaimer":
              modalTitle = "✏️ Gaming Disclaimer Compliance Settings";
              break;
            case "verifiedBadge":
              modalTitle = "✏️ Triple-Vetted Verified Badge Display";
              break;
            case "relatedCampaigns":
              modalTitle = "✏️ Sidebar Campaign Settings";
              break;
            case "blogBanner":
              modalTitle = "✏️ Blog Page Header Banner";
              break;
            case "blogFilters":
              modalTitle = "✏️ Category Search Filters";
              break;
            case "blogGrid":
              modalTitle = "✏️ Posts Grid Limits & Layout";
              break;
            case "blogMeta":
              modalTitle = "✏️ Article Metadata & Read-Time Badge";
              break;
            case "blogShare":
              modalTitle = "✏️ Social Sharing Panel Options";
              break;
            case "blogAuthor":
              modalTitle = "✏️ Author Profile Details Block";
              break;
            case "blogRelated":
              modalTitle = "✏️ Related Recommended Links Options";
              break;
            case "blogComments":
              modalTitle = "✏️ Public Feedback Comments Configuration";
              break;
            case "contactHeader":
              modalTitle = "✏️ Contact Banner Title & Subtitle";
              break;
            case "contactInfo":
              modalTitle = "✏️ Support Contacts Details";
              break;
            case "contactMap":
              modalTitle = "✏️ Interactive Google Maps Settings";
              break;
            default:
              if (activeElement.startsWith("game_form_")) {
                modalTitle = "✏️ সবচেয়ে বেশি জয়ী গেমের তথ্য এডিটর (Game Editor)";
              }
          }
        }

        return (
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => {
              setActiveSectionId(null);
              setActiveElement(null);
            }}
          >
            <div 
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200 text-left space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Close Button */}
              <button
                type="button"
                onClick={() => {
                  setActiveSectionId(null);
                  setActiveElement(null);
                }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-display font-black text-slate-900 text-sm tracking-tight uppercase">
                  {modalTitle}
                </h3>
                <span className="text-[10px] text-slate-400 font-bold block uppercase mt-0.5 font-mono">
                  {activeSectionId !== null ? `Section ID: ${activeSectionId}` : `Element: ${activeElement}`}
                </span>
              </div>

              {/* Render the drawer contents inside the modal */}
              <div className="space-y-4">
                {renderSettingsDrawer()}
              </div>

              {/* Modal Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSectionId(null);
                    setActiveElement(null);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Done (সম্পন্ন)
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ThemeEditor;

// Legacy and unused, preserved to keep file compilation intact without complex git diffs
const LegacyWorkspaces = ({ activeSubTab, settings, draftTheme, activeSectionId, toggleSectionEnabled, updateSectionField, updateNestedField }: any) => {
  return (
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[820px]">
            {/* Header bar */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Sliders className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>
                  {activeSubTab === "theme-editor-global" ? "গ্লোবাল ব্র্যান্ড ও ডিজাইন স্টাইলবোর্ড (Global Brand & Style Board)" :
                   activeSubTab === "theme-editor-home" ? "হোমপেজ সেকশন কনফিগারেশন ডেস্ক (Homepage Section Customizer)" :
                   activeSubTab === "theme-editor-menu" ? "নেভিগেশন মেনু প্রিভিউ প্যানেল (Navigation Menu Board)" :
                   activeSubTab === "theme-editor-category" ? "ক্যাসিনো ক্যাটাগরি ফিল্টার প্রিভিউ (Category Filtering Panel)" :
                   activeSubTab === "theme-editor-casino" ? "সিঙ্গেল ক্যাসিনো লেআউট প্রিভিউ (Single Casino Layout)" :
                   activeSubTab === "theme-editor-blog" ? "ব্লগ লিস্ট পেজ প্রিভিউ প্যানেল (Blog Listing Board)" :
                   activeSubTab === "theme-editor-single-blog" ? "সিঙ্গেল ব্লগ আর্টিকেল প্রিভিউ (Single Blog View)" :
                   activeSubTab === "theme-editor-contact" ? "যোগাযোগ পেজ ও লোকেশন মকআপ (Contact Information Layout)" :
                   "রিয়েল-টাইম থিম সিমুলেটর"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">WORKSPACE</span>
              </div>
            </div>

            {/* Workspace Content Area */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-slate-950/40 text-slate-100">
              
              {/* IF IN GLOBAL TAB */}
              {activeSubTab === "theme-editor-global" && (
                <div className="space-y-6 animate-fade-in pb-12 text-left">
                  {/* Brand Preview Card */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">
                      ✨ ব্র্যান্ড ও ভিজ্যুয়াল অ্যাসেট প্রিভিউ
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Logo Mockup */}
                      <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">লোগো প্রিভিউ</span>
                        <div className="h-16 flex items-center">
                          {settings.logoUrl ? (
                            <img
                              src={settings.logoUrl}
                              alt="Logo"
                              className="h-12 max-w-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-sm font-black tracking-tight text-white">
                              {settings.logoText || "Eker Listings"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Favicon Mockup */}
                      <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">ফেভিকন (ব্রাউজার আইকন)</span>
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-lg shadow-sm">
                            {settings.faviconUrl ? (
                              <img
                                src={settings.faviconUrl}
                                alt="Favicon"
                                className="w-7 h-7 object-cover rounded-md"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span>{settings.faviconText || "🪙"}</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-slate-300 block">ক্রোম/সাফারি ট্যাব মোড</span>
                            <span className="text-[9px] text-slate-500 font-semibold mt-0.5 block">{settings.logoText || "Eker Listings"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Typography Font Sample Card */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">
                        🔤 টাইপোগ্রাফি প্রিভিউ (Font Family Tester)
                      </h4>
                      <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded border border-indigo-500/20 font-mono">
                        {settings.fontFamily}
                      </span>
                    </div>

                    <div 
                      className="p-5 bg-slate-950/40 border border-slate-850 rounded-xl space-y-4"
                      style={{ fontFamily: `"${settings.fontFamily}", sans-serif` }}
                    >
                      <div>
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block font-sans mb-1">শিরোনাম ফন্ট সাইজ (Heading Display)</span>
                        <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                          Eker স্লট এবং লাইভ ডিলার ক্যাসিনো ভেরিফিকেশন পোর্টাল
                        </h1>
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block font-sans mb-1">বডি বা বিবরণ ফন্ট সাইজ (Body Text)</span>
                        <p className="text-xs sm:text-sm text-slate-400 font-semibold leading-relaxed">
                          আমাদের বিশেষজ্ঞ টিম দ্বারা যাচাইকৃত এবং নিবন্ধিত বিশ্বস্ত অনলাইন ক্যাসিনো ব্র্যান্ডগুলোর তালিকা।
                        </p>
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block font-sans mb-1">CTA বাটন সাইজ (CTA Button Text)</span>
                        <button className="px-4 py-2 text-xs font-extrabold text-white rounded-lg transition" style={{ backgroundColor: settings.primaryColor }}>
                          সরাসরি বোনাস ক্লেইম করুন
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Color Combo Visualizer */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">
                      🎨 কালার স্কিম ও কন্ট্রাস্ট টেস্টবোর্ড
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl border border-slate-850 space-y-1.5" style={{ backgroundColor: settings.primaryColor }}>
                        <span className="text-[8px] font-black uppercase text-white/60 tracking-wider block">Primary Color</span>
                        <span className="text-xs font-black text-white block font-mono">{settings.primaryColor}</span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-slate-850 space-y-1.5" style={{ backgroundColor: settings.secondaryColor }}>
                        <span className="text-[8px] font-black uppercase text-white/60 tracking-wider block">Secondary Color</span>
                        <span className="text-xs font-black text-white block font-mono">{settings.secondaryColor}</span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-slate-850 space-y-1.5" style={{ backgroundColor: settings.backgroundColor, borderColor: `${settings.textColor}12` }}>
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Background Color</span>
                        <span className="text-xs font-black block font-mono" style={{ color: settings.textColor }}>{settings.backgroundColor}</span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-slate-850 col-span-2 sm:col-span-1" style={{ backgroundColor: settings.cardBackgroundColor, borderColor: `${settings.textColor}12` }}>
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Card Background</span>
                        <span className="text-xs font-black block font-mono" style={{ color: settings.textColor }}>{settings.cardBackgroundColor}</span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-slate-850 bg-slate-950 space-y-1.5 col-span-2">
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">লাইভ সাইট কন্ট্রাস্ট টেস্ট</span>
                        <p className="text-[10px] font-extrabold" style={{ color: settings.textColor }}>
                          এই টেক্সট কালারটি ব্যাকগ্রাউন্ডের সাথে সামঞ্জস্যপূর্ণ এবং পড়তে কোনো সমস্যা হয় না।
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* IF IN SECTIONS TAB */}
              {activeSubTab === "theme-editor-home" && (
                <div>
                  {!activeSectionId ? (
                    // Empty state / welcome state
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 min-h-[500px]">
                      <div className="w-16 h-16 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
                        <Layout className="w-8 h-8 text-indigo-500" />
                      </div>
                      <div className="space-y-2 max-w-md">
                        <h3 className="font-display font-black text-slate-200 text-sm tracking-tight uppercase">
                          কোনো সেকশন সিলেক্ট করা নেই
                        </h3>
                        <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                          বামে অবস্থিত "সেকশন ক্রমানুসার" তালিকা থেকে যেকোনো একটি সেকশনের 
                          <strong className="text-indigo-400"> "সম্পাদনা" </strong> 
                          বাটনে বা রো-এর ওপর ক্লিক করুন। সেটির কন্টেন্ট, ডিজাইন ও অন্যান্য সেটিংস এখানে রিয়েল-টাইমে লোড হবে।
                        </p>
                      </div>
                      
                      <div className="w-full max-w-md bg-slate-900/60 border border-slate-850 p-4 rounded-2xl text-left space-y-3.5">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest font-mono">
                          💡 কুইক টিপস এবং গাইডলাইন:
                        </h4>
                        <ul className="space-y-2 text-[10.5px] font-semibold text-slate-400 leading-normal">
                          <li className="flex items-start gap-2">
                            <span className="text-indigo-400 mt-0.5">•</span>
                            <span>যেকোনো সেকশনের বামের চোখের আইকন (<Eye className="w-3.5 h-3.5 inline text-indigo-400" />) দিয়ে সেটি ওয়েবসাইটে দেখানো বা বন্ধ করা সম্ভব।</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-indigo-400 mt-0.5">•</span>
                            <span>অ্যারো কি ক্লিক করে হোমপেজের যেকোনো সেকশনের পজিশন উপর-নিচ করতে পারবেন।</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-indigo-400 mt-0.5">•</span>
                            <span>নতুন সেকশন তৈরি করতে চাইলে বামের <strong className="text-slate-200">"নতুন কাস্টম সেকশন"</strong> বাটনে চাপুন।</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    // Section Customizer Workspace Form
                    (() => {
                      const sec = draftTheme.sections.find((s) => s.id === activeSectionId);
                      if (!sec) {
                        return (
                          <div className="text-center text-xs text-slate-400 font-bold py-12">
                            সেকশনটি খুঁজে পাওয়া যায়নি বা ডিলিট করা হয়েছে।
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-6 text-left animate-fade-in pb-12">
                          {/* Active Section Info Card */}
                          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 font-bold text-sm">
                                {sec.type === "hero" ? <Sparkles className="w-5 h-5" /> :
                                 sec.type === "featured_operators" ? <Star className="w-5 h-5" /> :
                                 sec.type === "latest_listings" ? <Clock className="w-5 h-5" /> :
                                 sec.type === "top_rated" ? <Flame className="w-5 h-5" /> :
                                 sec.type === "sell_cta" ? <Coins className="w-5 h-5" /> :
                                 sec.type === "faq" ? <HelpCircle className="w-5 h-5" /> :
                                 <Layout className="w-5 h-5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-black text-xs text-slate-100 uppercase tracking-wider leading-none">
                                    {sec.title || "Untitled Section"}
                                  </h3>
                                  <span className="text-[8px] uppercase font-black tracking-widest bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                    {sec.type}
                                  </span>
                                </div>
                                <span className="text-[9px] text-slate-500 font-semibold font-mono mt-1.5 block">
                                  SECTION ID: {sec.id}
                                </span>
                              </div>
                            </div>

                            {/* Status Switch */}
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleSectionEnabled(sec.id)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                  sec.enabled
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-slate-800 text-slate-400 border-slate-750"
                                }`}
                              >
                                {sec.enabled ? (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>সক্রিয় (Active)</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-slate-50" />
                                    <span>নিষ্ক্রিয় (Hidden)</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Fields form based on section type */}
                          <div className="space-y-4 bg-slate-900/40 border border-slate-850 p-5 rounded-2xl">
                            <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">
                              📝 কন্টেন্ট ও ডিজাইন সেটিংস (Content Configuration)
                            </h4>

                            {/* Common Field: Section Header Title */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                সেকশন শিরোনাম (Section Title)
                              </label>
                              <input
                                type="text"
                                value={sec.title || ""}
                                onChange={(e) => updateSectionField(sec.id, "title", e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-100"
                                placeholder="যেমন: Best Verified Casino Offers"
                              />
                            </div>

                            {/* Common Field: Section Subtitle */}
                            {sec.type !== "featured_operators" && sec.type !== "latest_listings" && sec.type !== "top_rated" && (
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                  উপ-শিরোনাম বা সংক্ষিপ্ত বিবরণ (Section Subtitle)
                                </label>
                                <textarea
                                  value={sec.subtitle || ""}
                                  onChange={(e) => updateSectionField(sec.id, "subtitle", e.target.value)}
                                  rows={3}
                                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-100 resize-none leading-relaxed"
                                  placeholder="এই সেকশনের নিচে যে টেক্সট বা বর্ণনা দেখাবে তা এখানে লিখুন..."
                                />
                              </div>
                            )}

                            {/* HERO SPECIFIC SETTINGS */}
                            {sec.type === "hero" && (
                              <div className="space-y-4 pt-2">
                                <hr className="border-slate-800/80" />
                                <h5 className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider">হিরো বাটন ও ব্যাকগ্রাউন্ড কালার</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                      কল-টু-অ্যাকশন বাটন টেক্সট (CTA Text)
                                    </label>
                                    <input
                                      type="text"
                                      value={sec.actionText || ""}
                                      onChange={(e) => updateSectionField(sec.id, "actionText", e.target.value)}
                                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-slate-100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                      বাটন ক্লিক গন্তব্য লিঙ্ক (CTA Destination URL)
                                    </label>
                                    <input
                                      type="text"
                                      value={sec.actionUrl || ""}
                                      onChange={(e) => updateSectionField(sec.id, "actionUrl", e.target.value)}
                                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-slate-100 font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                      গ্রেডিয়েন্ট শুরু কালার (Gradient Start)
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="color"
                                        value={sec.backgroundGradientStart || "#0f172a"}
                                        onChange={(e) => updateSectionField(sec.id, "backgroundGradientStart", e.target.value)}
                                        className="h-10 w-10 shrink-0 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer p-0"
                                      />
                                      <input
                                        type="text"
                                        value={sec.backgroundGradientStart || "#0f172a"}
                                        onChange={(e) => updateSectionField(sec.id, "backgroundGradientStart", e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono uppercase text-slate-100"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                      গ্রেডিয়েন্ট শেষ কালার (Gradient End)
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="color"
                                        value={sec.backgroundGradientEnd || "#1e1b4b"}
                                        onChange={(e) => updateSectionField(sec.id, "backgroundGradientEnd", e.target.value)}
                                        className="h-10 w-10 shrink-0 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer p-0"
                                      />
                                      <input
                                        type="text"
                                        value={sec.backgroundGradientEnd || "#1e1b4b"}
                                        onChange={(e) => updateSectionField(sec.id, "backgroundGradientEnd", e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono uppercase text-slate-100"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Featured / Listings Widget configuration */}
                            {(sec.type === "featured_operators" || sec.type === "latest_listings" || sec.type === "top_rated") && (
                              <div className="space-y-3 pt-2 border-t border-slate-800/60">
                                <h5 className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider">ডাইনামিক ক্যাসিনো গ্রিড সেটিংস</h5>
                                <p className="text-[10px] text-slate-400 leading-normal font-medium">
                                  এই সেকশনটি ডাটাবেজ থেকে সরাসরি আপনার পাবলিশ করা ক্যাসিনোগুলি দেখাবে। ক্যাসিনো ব্র্যান্ড অ্যাড বা রিমুভ করতে চাইলে ক্যাসিনো পোর্টাল ব্যবহার করুন।
                                </p>
                              </div>
                            )}

                            {/* SELL_CTA SPECIFIC SETTINGS */}
                            {sec.type === "sell_cta" && (
                              <div className="space-y-4 pt-2">
                                <hr className="border-slate-800/80" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                      বিক্রি করুন বাটন টেক্সট (Button Text)
                                    </label>
                                    <input
                                      type="text"
                                      value={sec.actionText || ""}
                                      onChange={(e) => updateSectionField(sec.id, "actionText", e.target.value)}
                                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-slate-100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                      বাটন ক্লিক লিঙ্ক বা ট্রিগার
                                    </label>
                                    <input
                                      type="text"
                                      value={sec.actionUrl || ""}
                                      disabled
                                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold opacity-60 text-slate-400 font-mono"
                                      placeholder="সরাসরি পপ-আপ মডাল ট্রিগার করবে (Built-in)"
                                    />
                                  </div>
                                </div>

                                {/* Rewards Configuration */}
                                <div className="space-y-3.5 pt-2 border-t border-slate-800/60">
                                  <h5 className="text-[10px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                                    <span>রিওয়ার্ড প্রাইজ মানি টায়ারস (Reward Pricing Tiers)</span>
                                  </h5>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl space-y-3">
                                      <span className="text-[8px] font-black uppercase text-amber-400 tracking-wider block font-mono">
                                        🏆 Tier 1 Rewards (কম ব্যালেন্স)
                                      </span>
                                      <div>
                                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">জ্যাকপটের সীমা</label>
                                        <input
                                          type="text"
                                          value={sec.tier1Range || "৳১০০ থেকে ৳৫০০"}
                                          onChange={(e) => updateSectionField(sec.id, "tier1Range", e.target.value)}
                                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">পেমেন্ট রিওয়ার্ড</label>
                                        <input
                                          type="text"
                                          value={sec.tier1Reward || "৳১০ - ৳৫০"}
                                          onChange={(e) => updateSectionField(sec.id, "tier1Reward", e.target.value)}
                                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                                        />
                                      </div>
                                    </div>

                                    <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl space-y-3">
                                      <span className="text-[8px] font-black uppercase text-emerald-400 tracking-wider block font-mono">
                                        🔥 Tier 2 Rewards (বড় জ্যাকপট)
                                      </span>
                                      <div>
                                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">জ্যাকপটের সীমা</label>
                                        <input
                                          type="text"
                                          value={sec.tier2Range || "৳৬০০ থেকে ৳১০০০+"}
                                          onChange={(e) => updateSectionField(sec.id, "tier2Range", e.target.value)}
                                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">পেমেন্ট রিওয়ার্ড</label>
                                        <input
                                          type="text"
                                          value={sec.tier2Reward || "৳৬০ - ৳২০০"}
                                          onChange={(e) => updateSectionField(sec.id, "tier2Reward", e.target.value)}
                                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* FAQ SPECIFIC SETTINGS */}
                            {sec.type === "faq" && (
                              <div className="space-y-4 pt-2">
                                <hr className="border-slate-800/80" />
                                
                                <div className="flex items-center justify-between">
                                  <h5 className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                                    FAQ প্রশ্নোত্তর তালিকা (FAQ List Builder)
                                  </h5>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentFaqs = sec.faqs || [
                                        { q: "কিভাবে আমি আমার জ্যাকপটের স্ক্রিনশট বিক্রি করব?", a: "প্রথমে 'সরাসরি বিক্রি করুন' বাটনে ক্লিক করুন, আপনার নাম, বিকাশ নাম্বার, এবং জ্যাকপটের স্ক্রিনশট দুটি আপলোড করে সাবমিট করুন।" },
                                        { q: "স্ক্রিনশটের প্রাইজ মানি কত সময়ের মধ্যে পাবো?", a: "আমাদের টিম সাধারণত ১ থেকে ৫ মিনিটের মধ্যে আপনার স্ক্রিনশট এবং বিকাশ নাম্বার ভেরিফাই করে সরাসরি সেন্ড মানি করে দেয়।" },
                                        { q: "Eker ক্যাসিনো লিস্ট কি নির্ভরযোগ্য?", a: "হ্যাঁ, আমরা শুধুমাত্র সম্পূর্ণ লাইসেন্সড এবং ভেরিফাইড ব্র্যান্ডগুলো রিভিউ সহ এখানে পাবলিশ করি।" }
                                      ];
                                      updateSectionField(sec.id, "faqs", [...currentFaqs, { q: "নতুন সাধারণ জিজ্ঞাসা?", a: "নতুন উত্তর এখানে লিখুন।" }]);
                                    }}
                                    className="px-2.5 py-1 bg-indigo-50/10 hover:bg-indigo-50/20 text-indigo-400 border border-indigo-500/25 text-[8.5px] font-extrabold rounded-lg transition-colors cursor-pointer"
                                  >
                                    + নতুন প্রশ্নোত্তর যোগ করুন
                                  </button>
                                </div>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                  {(sec.faqs || [
                                    { q: "কিভাবে আমি আমার জ্যাকপটের স্ক্রিনশট বিক্রি করব?", a: "প্রথমে 'সরাসরি বিক্রি করুন' বাটনে ক্লিক করুন, আপনার নাম, বিকাশ নাম্বার, এবং জ্যাকপটের স্ক্রিনশট দুটি আপলোড করে সাবমিট করুন।" },
                                    { q: "স্ক্রিনশটের প্রাইজ মানি কত সময়ের মধ্যে পাবো?", a: "আমাদের টিম সাধারণত ১ থেকে ৫ মিনিটের মধ্যে আপনার স্ক্রিনশট এবং বিকাশ নাম্বার ভেরিফাই করে সরাসরি সেন্ড মানি করে দেয়।" },
                                    { q: "Eker ক্যাসিনো লিস্ট কি নির্ভরযোগ্য?", a: "হ্যাঁ, আমরা শুধুমাত্র সম্পূর্ণ লাইসেন্সড এবং ভেরিফাইড ব্র্যান্ডগুলো রিভিউ সহ এখানে পাবলিশ করি।" }
                                  ]).map((faqItem: any, faqIdx: number) => (
                                    <div key={faqIdx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 relative group">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentFaqs = [...(sec.faqs || [])];
                                          currentFaqs.splice(faqIdx, 1);
                                          updateSectionField(sec.id, "faqs", currentFaqs);
                                        }}
                                        className="absolute right-2 top-2 p-1 text-rose-500 hover:bg-rose-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        title="Delete FAQ Item"
                                      >
                                        <Trash className="w-3.5 h-3.5" />
                                      </button>

                                      <div className="pr-6">
                                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">প্রশ্ন {faqIdx + 1}</label>
                                        <input
                                          type="text"
                                          value={faqItem.q}
                                          onChange={(e) => {
                                            const currentFaqs = JSON.parse(JSON.stringify(sec.faqs || [
                                              { q: "কিভাবে আমি আমার জ্যাকপটের স্ক্রিনশট বিক্রি করব?", a: "প্রথমে 'সরাসরি বিক্রি করুন' বাটনে ক্লিক করুন, আপনার নাম, বিকাশ নাম্বার, এবং জ্যাকপটের স্ক্রিনশট দুটি আপলোড করে সাবমিট করুন।" },
                                              { q: "স্ক্রিনশটের প্রাইজ মানি কত সময়ের মধ্যে পাবো?", a: "আমাদের টিম সাধারণত ১ থেকে ৫ মিনিটের মধ্যে আপনার স্ক্রিনশট এবং বিকাশ নাম্বার ভেরিফাই করে সরাসরি সেন্ড মানি করে দেয়।" },
                                              { q: "Eker ক্যাসিনো লিস্ট কি নির্ভরযোগ্য?", a: "হ্যাঁ, আমরা শুধুমাত্র সম্পূর্ণ লাইসেন্সড এবং ভেরিফাইড ব্র্যান্ডগুলো রিভিউ সহ এখানে পাবলিশ করি।" }
                                            ]));
                                            currentFaqs[faqIdx].q = e.target.value;
                                            updateSectionField(sec.id, "faqs", currentFaqs);
                                          }}
                                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                                          placeholder="প্রশ্ন এখানে লিখুন..."
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">উত্তর {faqIdx + 1}</label>
                                        <textarea
                                          value={faqItem.a}
                                          onChange={(e) => {
                                            const currentFaqs = JSON.parse(JSON.stringify(sec.faqs || [
                                              { q: "কিভাবে আমি আমার জ্যাকপটের স্ক্রিনশট বিক্রি করব?", a: "প্রথমে 'সরাসরি বিক্রি করুন' বাটনে ক্লিক করুন, আপনার নাম, বিকাশ নাম্বার, এবং জ্যাকপটের স্ক্রিনশট দুটি আপলোড করে সাবমিট করুন।" },
                                              { q: "স্ক্রিনশটের প্রাইজ মানি কত সময়ের মধ্যে পাবো?", a: "আমাদের টিম সাধারণত ১ থেকে ৫ মিনিটের মধ্যে আপনার স্ক্রিনশট এবং বিকাশ নাম্বার ভেরিফাই করে সরাসরি সেন্ড মানি করে দেয়।" },
                                              { q: "Eker ক্যাসিনো লিস্ট কি নির্ভরযোগ্য?", a: "হ্যাঁ, আমরা শুধুমাত্র সম্পূর্ণ লাইসেন্সড এবং ভেরিফাইড ব্র্যান্ডগুলো রিভিউ সহ এখানে পাবলিশ করি।" }
                                            ]));
                                            currentFaqs[faqIdx].a = e.target.value;
                                            updateSectionField(sec.id, "faqs", currentFaqs);
                                          }}
                                          rows={2}
                                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 resize-none"
                                          placeholder="উত্তর এখানে লিখুন..."
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* CUSTOM SPECIFIC SETTINGS */}
                            {sec.type === "custom" && (
                              <div className="space-y-4 pt-2">
                                <hr className="border-slate-800/80" />
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    বিস্তারিত কন্টেন্ট (HTML বা প্লেইন টেক্সট)
                                  </label>
                                  <textarea
                                    value={sec.content || ""}
                                    onChange={(e) => updateSectionField(sec.id, "content", e.target.value)}
                                    rows={5}
                                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-100"
                                    placeholder="এখানে আপনার কাস্টম টেক্সট বা প্যারাগ্রাফ দিন..."
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                      বাটন টেক্সট (Button Text)
                                    </label>
                                    <input
                                      type="text"
                                      value={sec.actionText || ""}
                                      onChange={(e) => updateSectionField(sec.id, "actionText", e.target.value)}
                                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-slate-100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                      বাটন ক্লিক লিঙ্ক (Button Destination URL)
                                    </label>
                                    <input
                                      type="text"
                                      value={sec.actionUrl || ""}
                                      onChange={(e) => updateSectionField(sec.id, "actionUrl", e.target.value)}
                                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-slate-100 font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                      সেকশন কাস্টম ব্যাকগ্রাউন্ড কালার
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="color"
                                        value={sec.customBackgroundColor || "#ffffff"}
                                        onChange={(e) => updateSectionField(sec.id, "customBackgroundColor", e.target.value)}
                                        className="h-10 w-10 shrink-0 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer p-0"
                                      />
                                      <input
                                        type="text"
                                        value={sec.customBackgroundColor || "#ffffff"}
                                        onChange={(e) => updateSectionField(sec.id, "customBackgroundColor", e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono uppercase text-slate-100"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                      সেকশন কাস্টম টেক্সট কালার
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="color"
                                        value={sec.customTextColor || "#1e293b"}
                                        onChange={(e) => updateSectionField(sec.id, "customTextColor", e.target.value)}
                                        className="h-10 w-10 shrink-0 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer p-0"
                                      />
                                      <input
                                        type="text"
                                        value={sec.customTextColor || "#1e293b"}
                                        onChange={(e) => updateSectionField(sec.id, "customTextColor", e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono uppercase text-slate-100"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* MENU ITEMS WORKSPACE PREVIEW */}
              {activeSubTab === "theme-editor-menu" && (
                <div className="space-y-6 animate-fade-in pb-12 text-left">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">
                      🖥️ হেডার ও নেভিগেশন প্রিভিউ (Interactive Header Mockup)
                    </h4>
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">L</div>
                          <span className="text-xs font-black text-white">Eker Verified</span>
                        </div>
                        <nav className="flex items-center gap-3">
                          {(draftTheme.menuItems || []).slice(0, 4).map((item) => (
                            <span key={item.id} className="text-[10px] font-bold text-slate-300 hover:text-white transition cursor-pointer">
                              {item.label}
                            </span>
                          ))}
                        </nav>
                      </div>
                      <div className="pt-3 text-center text-[9px] text-slate-500 font-semibold">
                        (সর্বোচ্চ ৪টি আইটেম হেডার মেনুতে প্রিভিউ হিসেবে দেখানো হয়েছে)
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">
                      👣 ফুটারে প্রদর্শিত নেভিগেশন (Footer Mockup)
                    </h4>
                    <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 space-y-6">
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">গুরুত্বপূর্ণ লিঙ্কসমূহ</span>
                          <div className="flex flex-col gap-1.5">
                            {(draftTheme.menuItems || []).map((item) => (
                              <span key={item.id} className="text-[10px] font-semibold text-slate-500 hover:text-indigo-400 transition cursor-pointer">
                                → {item.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">আইনি তথ্য</span>
                          <span className="text-[9px] text-slate-600 font-medium leading-relaxed block">
                            আমাদের প্ল্যাটফর্ম শুধুমাত্র বিনোদন এবং রিভিউ প্রদানের জন্য তৈরি। সকল তথ্য যাচাইকৃত।
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-slate-850 pt-4 text-center text-[9px] text-slate-600 font-bold font-mono">
                        © 2026 Eker. All Rights Reserved.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY WORKSPACE PREVIEW */}
              {activeSubTab === "theme-editor-category" && (
                <div className="space-y-6 animate-fade-in pb-12 text-left">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">
                      🔍 ক্যাসিনো ফিল্টারিং সিস্টেম প্রিভিউ (Filtering Preview)
                    </h4>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      লাইভ সাইটে আপনার যুক্ত করা ক্যাটাগরিগুলি নিম্নরূপ ফিল্টার ট্যাব হিসেবে প্রদর্শিত হবে।
                    </p>
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                      {/* Search Mock */}
                      <div className="h-9 rounded-xl bg-slate-900 border border-slate-800 px-3 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">ক্যাসিনো খুঁজুন... (Search Operators...)</span>
                        <span className="text-[10px] bg-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono">CTRL+K</span>
                      </div>

                      {/* Tab List */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="px-3 py-1.5 bg-indigo-600 text-white text-[10.5px] font-bold rounded-lg cursor-pointer">
                          All Listings (সব ক্যাসিনো)
                        </span>
                        {(draftTheme.categoriesList || []).map((cat, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-slate-900 text-slate-300 text-[10.5px] font-semibold rounded-lg hover:bg-slate-850 hover:text-white transition cursor-pointer">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SINGLE CASINO WORKSPACE PREVIEW */}
              {activeSubTab === "theme-editor-casino" && (
                <div className="space-y-6 animate-fade-in pb-12 text-left">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">
                      📄 রিভিউ পেজ লেআউট মকআপ (Review Page Layout)
                    </h4>
                    
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                      {/* Grid Layout Mock */}
                      <div className={`grid grid-cols-1 ${draftTheme.singleCasinoSettings?.sidebarLocation === 'none' ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
                        {/* Sidebar Left */}
                        {draftTheme.singleCasinoSettings?.sidebarLocation === 'left' && (
                          <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl space-y-3">
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-wider block">সাইডবার (Sidebar Content)</span>
                            {draftTheme.singleCasinoSettings?.showRelatedJackpots && (
                              <div className="p-2.5 bg-indigo-950/40 border border-indigo-900/30 rounded-lg text-[10px] font-bold text-indigo-300">
                                🎁 ১টি রিলেটেড বোনাস অফার
                              </div>
                            )}
                            <div className="h-12 bg-slate-950 rounded border border-slate-850 flex items-center justify-center text-[10px] text-slate-500 font-bold">SIDEBAR ADV</div>
                          </div>
                        )}

                        {/* Main Column */}
                        <div className="md:col-span-2 p-4 bg-slate-900/40 border border-slate-850 rounded-xl space-y-4 text-left">
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-black text-white">Mega Casino Star</h2>
                            {draftTheme.singleCasinoSettings?.showVerifiedBadge && (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-extrabold uppercase rounded-md border border-emerald-500/25">
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-400 font-semibold leading-normal">
                            মেগা ক্যাসিনো স্টার বাংলাদেশের জন্য ভেরিফাইড এবং লাইসেন্সপ্রাপ্ত অপারেটর।
                          </p>
                          <button className="px-3.5 py-2 bg-indigo-600 text-white text-[10.5px] font-extrabold rounded-lg">
                            {draftTheme.singleCasinoSettings?.reviewBtnText || "Write a Review"}
                          </button>
                        </div>

                        {/* Sidebar Right */}
                        {draftTheme.singleCasinoSettings?.sidebarLocation === 'right' && (
                          <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl space-y-3">
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-wider block">সাইডবার (Sidebar Content)</span>
                            {draftTheme.singleCasinoSettings?.showRelatedJackpots && (
                              <div className="p-2.5 bg-indigo-950/40 border border-indigo-900/30 rounded-lg text-[10px] font-bold text-indigo-300">
                                🎁 ১টি রিলেটেড বোনাস অফার
                              </div>
                            )}
                            <div className="h-12 bg-slate-950 rounded border border-slate-850 flex items-center justify-center text-[10px] text-slate-500 font-bold">SIDEBAR ADV</div>
                          </div>
                        )}
                      </div>

                      {/* Disclaimer warning */}
                      <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-left">
                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider block mb-1">দায়বদ্ধতা সতর্কতা</span>
                        <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed">
                          {draftTheme.singleCasinoSettings?.disclaimerText || "দয়া করে সতর্কতার সাথে দায়িত্বপূর্ণভাবে খেলুন। আমাদের সাইটের অফারগুলো ১৮ বছরের বেশি বয়সীদের জন্য প্রযোজ্য।"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BLOG WORKSPACE PREVIEW */}
              {activeSubTab === "theme-editor-blog" && (
                <div className="space-y-6 animate-fade-in pb-12 text-left">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">
                      📰 ব্লগ লিস্ট ব্যানার এবং গ্রিড প্রিভিউ (Blog Grid Simulation)
                    </h4>

                    {/* Blog Page Simulated Banner */}
                    <div className="p-6 bg-radial from-slate-900 to-slate-950 rounded-xl border border-slate-850 text-center space-y-2">
                      <h1 className="text-md font-black text-white tracking-tight">
                        {draftTheme.blogPageSettings?.bannerTitle || "Our Latest Blogs & Updates"}
                      </h1>
                      <p className="text-[11px] text-slate-400 font-semibold max-w-md mx-auto leading-relaxed">
                        {draftTheme.blogPageSettings?.bannerSubtitle || "ক্যাসিনো ভেরিফিকেশন এবং লেটেস্ট টিপস নিয়ে আমাদের অভিজ্ঞ রাইটারদের মতামত পড়ুন।"}
                      </p>
                    </div>

                    {/* Filter bar */}
                    {draftTheme.blogPageSettings?.enableFilters && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-850">
                        <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">ফিল্টার ক্যাটাগরি:</span>
                        <span className="text-[9.5px] font-bold text-slate-300">All Blogs</span>
                        <span className="text-[9.5px] font-bold text-slate-500 font-semibold">verified</span>
                        <span className="text-[9.5px] font-bold text-slate-500 font-semibold">casinos</span>
                      </div>
                    )}

                    {/* Columns Layout */}
                    <div className={`grid grid-cols-1 ${draftTheme.blogPageSettings?.columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3.5`}>
                      {Array.from({ length: draftTheme.blogPageSettings?.postsPerPage || 3 }).slice(0, 3).map((_, i) => (
                        <div key={i} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2.5 animate-fade-in">
                          <div className="h-20 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-850">
                            <span className="text-[8px] font-bold text-slate-500">MOCK IMAGE {i+1}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] font-bold text-indigo-400 uppercase font-mono">Verification Guides</span>
                            <h3 className="text-[11px] font-bold text-slate-200 leading-tight">কিভাবে সেরা লাইসেন্সড ক্যাসিনো সাইট সিলেক্ট করবেন</h3>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SINGLE BLOG POST WORKSPACE PREVIEW */}
              {activeSubTab === "theme-editor-single-blog" && (
                <div className="space-y-6 animate-fade-in pb-12 text-left">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">
                      📖 সিঙ্গেল ব্লগ আর্টিকেল ভিউ মকআপ (Single Post View)
                    </h4>

                    <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                      {/* Meta information */}
                      <div className="flex items-center justify-between text-[10px] border-b border-slate-850 pb-2">
                        <span className="text-slate-400 font-semibold">Published: July 20, 2026</span>
                        {draftTheme.singleBlogSettings?.showReadTime && (
                          <span className="text-indigo-400 font-bold font-mono">⏱️ ৫ মিনিট পড়ার সময়</span>
                        )}
                      </div>

                      {/* Main Title and content preview */}
                      <div className="space-y-2">
                        <h1 className="text-sm font-black text-white">বাংলাদেশ থেকে নিরাপদ অনলাইন বেটিং গাইডলাইন ও বোনাস রিভিউ</h1>
                        <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
                          অনলাইন গেমিং সেক্টরে নিরাপত্তা হলো সবচেয়ে গুরুত্বপূর্ণ বিষয়। তাই প্লেয়ারদের সুবিধার কথা চিন্তা করে Eker ভেরিফাইড অপারেটরের তালিকা নিয়ে এসেছে...
                        </p>
                      </div>

                      {/* Social share */}
                      {draftTheme.singleBlogSettings?.showShareButtons && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mr-1">শেয়ার করুন:</span>
                          <span className="px-2 py-1 bg-blue-600 text-white text-[9px] font-bold rounded cursor-pointer">Facebook</span>
                          <span className="px-2 py-1 bg-sky-500 text-white text-[9px] font-bold rounded cursor-pointer">Twitter</span>
                        </div>
                      )}

                      {/* Author card */}
                      {draftTheme.singleBlogSettings?.showAuthorBox && (
                        <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-850 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">EM</div>
                          <div className="text-left">
                            <span className="text-[11px] font-bold text-slate-200 block">Eker Marketer</span>
                            <span className="text-[9px] text-slate-500 font-semibold block">Affiliate Marketing Expert & Lead Gen Optimizer</span>
                          </div>
                        </div>
                      )}

                      {/* Related posts placeholder */}
                      {draftTheme.singleBlogSettings?.showRelatedPosts && (
                        <div className="pt-2 border-t border-slate-850 space-y-2">
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider block">সম্পর্কিত পোস্ট (Related Articles)</span>
                          <div className="text-[10px] font-semibold text-slate-400 hover:text-indigo-400 transition cursor-pointer">
                            • স্লট গেমগুলোতে আরটিপি (RTP) হিসাব করার সঠিক নিয়ম
                          </div>
                        </div>
                      )}

                      {/* Comments placeholder */}
                      {draftTheme.singleBlogSettings?.enableComments && (
                        <div className="pt-2 border-t border-slate-850 space-y-2 text-left">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">মন্তব্য করুন (Submit Feedback)</span>
                          <div className="h-10 bg-slate-900 rounded border border-slate-800 flex items-center justify-between px-3">
                            <span className="text-[9.5px] text-slate-500 font-semibold">আপনার বার্তা লিখুন...</span>
                            <span className="text-[9.5px] text-indigo-400 font-bold">পাঠান</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CONTACT PAGE WORKSPACE PREVIEW */}
              {activeSubTab === "theme-editor-contact" && (
                <div className="space-y-6 animate-fade-in pb-12 text-left">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest font-mono">
                      📞 কন্টাক্ট ইনফরমেশন এবং লোকেশন প্রিভিউ (Contact Simulation)
                    </h4>

                    <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                      {/* Banner header */}
                      <div className="space-y-1.5 text-center">
                        <h1 className="text-md font-black text-white">
                          {draftTheme.contactPageSettings?.title || "Get in Touch with Eker"}
                        </h1>
                        <p className="text-[10.5px] text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
                          {draftTheme.contactPageSettings?.description || "আমাদের যেকোনো অফার বা ক্যাসিনো ভেরিফিকেশন নিয়ে আপনার প্রশ্ন থাকলে সরাসরি ইমেইল করুন।"}
                        </p>
                      </div>

                      {/* Info cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 space-y-1">
                          <span className="text-[8px] font-black text-indigo-400 uppercase">📧 ইমেইল এড্রেস</span>
                          <span className="text-[10.5px] font-bold text-slate-200 block font-mono">
                            {draftTheme.contactPageSettings?.email || "support@ekerverified.com"}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 space-y-1">
                          <span className="text-[8px] font-black text-indigo-400 uppercase">📞 হেল্পলাইন নম্বর</span>
                          <span className="text-[10.5px] font-bold text-slate-200 block font-mono">
                            {draftTheme.contactPageSettings?.phone || "+880 1700-000000"}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-850 space-y-1 col-span-1 sm:col-span-2">
                          <span className="text-[8px] font-black text-indigo-400 uppercase">📍 অফিস লোকেশন ঠিকানা</span>
                          <span className="text-[10.5px] font-bold text-slate-200 block">
                            {draftTheme.contactPageSettings?.address || "ঢাকা, বাংলাদেশ"}
                          </span>
                        </div>
                      </div>

                      {/* Map preview */}
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">গুগল ম্যাপ এমবেড ভিজ্যুয়ালাইজার</span>
                        {draftTheme.contactPageSettings?.mapIframeUrl ? (
                          <div className="h-24 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-center font-mono text-[9px] text-indigo-400 font-bold p-2 text-center break-all">
                            🗺️ Map Loaded: {draftTheme.contactPageSettings.mapIframeUrl.substring(0, 60)}...
                          </div>
                        ) : (
                          <div className="h-24 bg-slate-900/60 border border-slate-850 border-dashed rounded-xl flex items-center justify-center font-mono text-[9px] text-slate-500 font-semibold">
                            (কোনো গুগল ম্যাপ এমবেড লিংক দেওয়া নেই)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };
