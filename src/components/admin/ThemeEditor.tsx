import React, { useState, useEffect } from "react";
import { useTheme, DEFAULT_THEME_CONFIG } from "../../context/ThemeContext";
import { ThemeConfig, ThemeSection, ThemeGlobalSettings } from "../../types/firestore";
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
  X
} from "lucide-react";
import { uploadToCloudinary } from "../../services/cloudinaryService";

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

export const ThemeEditor: React.FC = () => {
  const { theme, loading, saveTheme } = useTheme();

  // Local draft state
  const [draftTheme, setDraftTheme] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [editorTab, setEditorTab] = useState<"global" | "sections">("global");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Upload States
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  // Preview Device State
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Sync draft whenever parent theme loads
  useEffect(() => {
    if (theme) {
      setDraftTheme(JSON.parse(JSON.stringify(theme)));
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

  const settings = draftTheme.globalSettings;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-display font-black text-slate-900 text-xl tracking-tight flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-indigo-600" />
            <span>Theme & Visual Editor</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Shopify থিম এডিটরের মতো আপনার পাবলিক পেজগুলির সেকশন, ফন্ট, কালার এবং ডিজাইন ডায়নামিকলি কাস্টমাইজ করুন।
          </p>
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

      {saveSuccess && (
        <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fade-in shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>পাবলিক থিম কনফিগারেশন সফলভাবে আপডেট করা হয়েছে! পরিবর্তনগুলি এখন রিয়েল-টাইমে লাইভ পেজে দৃশ্যমান।</span>
        </div>
      )}

      {/* Main Grid: Control Panel (Left) & Real-Time Simulator Mockup (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT PANEL: Controls (7 columns) */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            {/* Tab Switches */}
            <div className="flex border-b border-slate-100 pb-4 mb-4 gap-2">
              <button
                onClick={() => setEditorTab("global")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  editorTab === "global"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                <span>গ্লোবাল ডিজাইন সেটিংস</span>
              </button>
              <button
                onClick={() => setEditorTab("sections")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  editorTab === "sections"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Layout className="w-4 h-4" />
                <span>সেকশন ক্রমানুসার</span>
              </button>
            </div>

            {/* TAB 1: GLOBAL DESIGN SETTINGS */}
            {editorTab === "global" && (
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
            {editorTab === "sections" && (
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

                            {sec.type !== "featured_operators" && sec.type !== "latest_listings" && sec.type !== "top_rated" && sec.type !== "faq" && (
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

          </div>
        </div>

        {/* RIGHT PANEL: Dynamic Workspaces (7 columns) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[820px]">
            {/* Header bar */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Sliders className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>
                  {editorTab === "global" 
                    ? "গ্লোবাল ব্র্যান্ড ও ডিজাইন স্টাইলবোর্ড (Global Brand & Style Board)" 
                    : "হোমপেজ সেকশন কনফিগারেশন ডেস্ক (Homepage Section Customizer Desk)"}
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
              {editorTab === "global" && (
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
              {editorTab === "sections" && (
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

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ThemeEditor;
