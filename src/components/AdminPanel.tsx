import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  KeyRound,
  LogOut,
  UserCheck,
  PlusCircle,
  TrendingUp,
  Sliders,
  UserCog,
  ChevronRight,
  Info,
  Sparkles,
  Loader2,
  CheckCircle,
  ShieldCheck,
  Settings as SettingsIcon,
  Users as UsersIcon,
} from "lucide-react";
import { AffiliateLink, UserProfile } from "../types";
import AnalyticsSection from "./AnalyticsSection";
import DealsGrid from "./DealsGrid";

// Import new modular foundation components
import { AdminSidebar } from "./admin/AdminSidebar";
import { AdminHeader } from "./admin/AdminHeader";
import { DashboardStats } from "./admin/DashboardStats";
import { Settings as AdminSettings } from "./admin/Settings";
import { UserManager as AdminUserManager } from "./admin/UserManager";
import { CasinoManager } from "./admin/CasinoManager";
import { SellRequestsManager } from "./admin/SellRequestsManager";
import { BonusManager } from "./admin/BonusManager";
import { ModerationManager } from "./admin/ModerationManager";
import { CasinoAnalytics } from "./admin/CasinoAnalytics";
import { JackpotListing } from "./JackpotListing";

interface AdminPanelProps {
  deals: AffiliateLink[];
  onAddDeal: (dealData: any) => Promise<void>;
  onUpdateDeal: (dealId: string, updatedFields: any) => Promise<void>;
  onDeleteDeal: (dealId: string) => Promise<void>;
  currentUser: User | null;
  userProfile: UserProfile | null;
  onUpdateProfile: (profile: any) => Promise<void>;
  onActiveTabTitleChange?: (title: string) => void;
}

export default function AdminPanel({
  deals,
  onAddDeal,
  onUpdateDeal,
  onDeleteDeal,
  currentUser,
  userProfile,
  onUpdateProfile,
  onActiveTabTitleChange,
}: AdminPanelProps) {
  // Navigation tabs: overview, casinos, sell-requests, links, analytics, profile, settings, users
  const [activeTab, setActiveTab] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "overview";
  });
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);
  const [reviewSubTab, setReviewSubTab] = useState<"moderation" | "submit">("moderation");

  // Sync tab from URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && tabParam !== activeTab) {
        setActiveTab(tabParam);
      }
    };
    window.addEventListener("popstate", handleUrlChange);
    // Also poll search params since React Router might not trigger standard popstate on search changes
    const interval = setInterval(handleUrlChange, 500);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      clearInterval(interval);
    };
  }, [activeTab]);

  // Handle mobile sidebar toggle event from parent header
  useEffect(() => {
    const handleToggle = () => {
      setIsSidebarOpenMobile((prev) => !prev);
    };
    window.addEventListener("toggle-admin-sidebar", handleToggle);
    return () => {
      window.removeEventListener("toggle-admin-sidebar", handleToggle);
    };
  }, []);

  // Update parent header title when tab changes
  useEffect(() => {
    if (onActiveTabTitleChange) {
      onActiveTabTitleChange(getHeaderTitle());
    }
  }, [activeTab, onActiveTabTitleChange]);

  // Real-time directory statistics state
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    aiGenerated: 0,
    pendingReview: 0,
    sellRequests: 0,
    users: 0,
  });

  useEffect(() => {
    const isUserAdmin = currentUser && userProfile && (userProfile.role === "admin" || userProfile.role === "super_admin");
    const isUserModerator = currentUser && userProfile && (userProfile.role === "moderator" || userProfile.role === "admin" || userProfile.role === "super_admin");

    if (!currentUser || !userProfile || !isUserModerator) {
      return;
    }

    // Exclude soft-deleted records from stats
    const unsubCasinos = onSnapshot(collection(db, "casinos"), (snap) => {
      const docs = snap.docs.map((d) => d.data());
      const activeDocs = docs.filter((d: any) => !d.isDeleted);
      setStats((prev) => ({
        ...prev,
        total: activeDocs.length,
        published: activeDocs.filter((d: any) => d.status === "published").length,
        drafts: activeDocs.filter((d: any) => d.status === "draft").length,
        aiGenerated: activeDocs.filter((d: any) => d.aiGenerated || d.status === "ai_generated").length,
        pendingReview: activeDocs.filter((d: any) => d.status === "pending_review").length,
      }));
    }, (err) => {
      console.warn("Stats listener casinos error: ", err);
    });

    let unsubSell = () => {};
    if (isUserModerator) {
      unsubSell = onSnapshot(collection(db, "sellRequests"), (snap) => {
        setStats((prev) => ({ ...prev, sellRequests: snap.size }));
      }, (err) => {
        console.warn("Stats listener sellRequests error: ", err);
      });
    }

    let unsubUsers = () => {};
    if (isUserAdmin) {
      unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
        setStats((prev) => ({ ...prev, users: snap.size }));
      }, (err) => {
        console.warn("Stats listener users error: ", err);
      });
    }

    return () => {
      unsubCasinos();
      unsubSell();
      unsubUsers();
    };
  }, [currentUser, userProfile]);

  // Auth form state
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);

  // Link Form state
  const [editingDeal, setEditingDeal] = useState<AffiliateLink | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    originalUrl: "",
    description: "",
    category: "SaaS",
    customCategory: "",
    discountCode: "",
    rewardText: "",
    ownerRewardText: "",
    slug: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  // Profile Form state
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Synced profile inputs
  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.displayName || "");
      setProfileBio(userProfile.bio || "");
    }
  }, [userProfile]);

  // Auth Operations
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError("");
    setUnauthorizedDomain(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google login failed:", err);
      let msg = err?.message || "Failed to authenticate with Google";
      if (err?.code === "auth/popup-closed-by-user") {
        msg = "The sign-in popup was closed. Please try again.";
      } else if (err?.code === "auth/unauthorized-domain" || String(err).includes("unauthorized-domain")) {
        setUnauthorizedDomain(window.location.hostname);
        msg = "This web domain is not yet authorized in your Firebase authentication console.";
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAnonymousQuickstart = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      setAuthError(err?.message || "Failed to initiate workspace session");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAutofillAdmin = () => {
    setAuthEmail("admin@refdirect.com");
    setAuthPassword("admin123");
    setIsRegistering(true);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError("Please fill in email and password fields");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err: any) {
      let msg = err?.message || "Authentication error";
      if (msg.includes("auth/invalid-credential")) {
        msg = "Invalid email or master password. Try registering instead!";
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  // Link Add/Edit action
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formData.title || !formData.originalUrl) {
      setFormError("Platform Name and Referral Target Link are required");
      return;
    }

    let targetUrl = formData.originalUrl;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    const finalCategory = formData.category === "Custom" ? formData.customCategory.trim() : formData.category;
    if (!finalCategory) {
      setFormError("Please enter or specify a category for this link");
      return;
    }

    setFormLoading(true);
    try {
      const dataPayload = {
        title: formData.title.trim(),
        originalUrl: targetUrl.trim(),
        description: formData.description.trim(),
        category: finalCategory,
        discountCode: formData.discountCode.trim(),
        rewardText: formData.rewardText.trim(),
        ownerRewardText: formData.ownerRewardText.trim(),
        slug: formData.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, ""),
      };

      if (editingDeal) {
        await onUpdateDeal(editingDeal.id, dataPayload);
        setFormSuccess(`Successfully modified tracking deal "${formData.title}"!`);
        setEditingDeal(null);
      } else {
        await onAddDeal(dataPayload);
        setFormSuccess(`Successfully created referral link for "${formData.title}"!`);
      }

      setFormData({
        title: "",
        originalUrl: "",
        description: "",
        category: "SaaS",
        customCategory: "",
        discountCode: "",
        rewardText: "",
        ownerRewardText: "",
        slug: "",
      });
    } catch (err: any) {
      setFormError(err?.message || "Failed to process form. Try checking rule validation.");
    } finally {
      setFormLoading(false);
    }
  };

  // Profile Save
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName) return;
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      await onUpdateProfile({
        displayName: profileName,
        bio: profileBio,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleEditInit = (deal: AffiliateLink) => {
    setEditingDeal(deal);
    const standardCategories = ["SaaS", "Shopping", "Finance", "Tech", "Hosting", "Travel"];
    const isCustom = !standardCategories.includes(deal.category);

    setFormData({
      title: deal.title,
      originalUrl: deal.originalUrl,
      description: deal.description || "",
      category: isCustom ? "Custom" : deal.category,
      customCategory: isCustom ? deal.category : "",
      discountCode: deal.discountCode || "",
      rewardText: deal.rewardText || "",
      ownerRewardText: deal.ownerRewardText || "",
      slug: deal.slug || "",
    });
    document.getElementById("link-form-container")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingDeal(null);
    setFormData({
      title: "",
      originalUrl: "",
      description: "",
      category: "SaaS",
      customCategory: "",
      discountCode: "",
      rewardText: "",
      ownerRewardText: "",
      slug: "",
    });
  };

  // GUEST LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-10 rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-8 -mt-8 h-24 w-24 rounded-full bg-emerald-50/50" />

        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3 shadow-xs">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
            Creator Security Gate
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Build your personal directory page, customize referral commission headers, and view detailed click graphs!
          </p>
        </div>

        {authError && (
          <div className="rounded-2xl bg-red-50/75 border border-red-100 p-4 mb-5 text-xs text-red-800 leading-normal space-y-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">!</span>
              <div>
                <p className="font-bold text-red-950">Sign-in Security Notice</p>
                <p className="mt-0.5 text-slate-600">{authError}</p>
              </div>
            </div>

            {unauthorizedDomain && (
              <div className="pt-2.5 border-t border-red-200/50 space-y-2.5 text-slate-700">
                <p className="font-semibold text-slate-950 text-[11px] uppercase tracking-wider">How to resolve this:</p>
                <ol className="list-decimal list-inside space-y-1.5 pl-0.5 leading-relaxed text-slate-600">
                  <li>Go to your <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline hover:text-emerald-800">Firebase Console</a></li>
                  <li>Go to <strong>Authentication</strong> &rarr; <strong>Settings</strong> tab</li>
                  <li>Scroll to <strong>Authorized domains</strong> list</li>
                  <li>Click <strong>Add domain</strong> and insert this exact address:</li>
                </ol>
                <div className="flex items-center gap-2 bg-white/90 p-2 rounded-lg border border-red-200 font-mono text-[10px] text-indigo-800 select-all font-semibold">
                  <span className="flex-1 truncate">{unauthorizedDomain}</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(unauthorizedDomain)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md text-[9px] uppercase font-bold tracking-wider text-slate-600 cursor-pointer active:scale-95 transition-all"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <button
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={authLoading}
            className="w-full h-12 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 border border-slate-200 shadow-xs transition-all cursor-pointer"
          >
            {authLoading ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <>
                <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <details className="group border border-slate-150 rounded-2xl bg-slate-50/50 p-1 transition-all">
            <summary className="list-none flex items-center justify-between p-3.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer select-none">
              <span>Alternative developer methods</span>
              <span className="transition-transform duration-200 group-open:rotate-180 text-slate-400">
                ▼
              </span>
            </summary>

            <div className="p-3 border-t border-slate-100 space-y-4 bg-white rounded-xl mt-1">
              <button
                id="quickstart-anonymous-btn"
                onClick={handleAnonymousQuickstart}
                disabled={authLoading}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {authLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Instant Sandbox Quickstart</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="rounded-2xl bg-amber-50/60 border border-amber-150 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
                  <span>Admin Credentials Guide</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-normal">
                  Register your admin account on your new custom Firebase database! Click <strong className="font-bold text-amber-800">Auto-fill</strong>, keep <strong className="font-bold text-amber-800">Register Credentials</strong> toggled, then click <strong className="font-bold text-amber-800">Create Owner Space</strong>.
                </p>
                <div className="p-3 rounded-lg bg-white/95 border border-amber-100/50 font-mono text-[10px] text-slate-700 space-y-1 relative shadow-xs">
                  <div><span className="font-semibold text-slate-400">EMAIL:</span> admin@refdirect.com</div>
                  <div><span className="font-semibold text-slate-400">PASSWORD:</span> admin123</div>
                  <button
                    type="button"
                    onClick={handleAutofillAdmin}
                    className="absolute right-2 top-2 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-extrabold rounded-md cursor-pointer transition-all uppercase"
                  >
                    Auto-fill
                  </button>
                </div>
              </div>

              <div className="relative py-2 text-center text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <span className="bg-white px-3 relative z-10">Or custom cloud credentials</span>
                <hr className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-slate-100 z-0" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Owner Email address
                  </label>
                  <input
                    id="email-field"
                    type="email"
                    placeholder="you@domain.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Personal master passcode
                  </label>
                  <input
                    id="password-field"
                    type="password"
                    placeholder="Secret key"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    id="toggle-auth-mode-btn"
                    type="button"
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline"
                  >
                    {isRegistering ? "Back to Login" : "Register Credentials"}
                  </button>
                  <button
                    id="submit-auth-btn"
                    type="submit"
                    disabled={authLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                  >
                    {authLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRegistering ? (
                      "Create Owner Space"
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </details>
        </div>
      </div>
    );
  }

  // Active metrics calculation
  const totalClicks = deals.reduce((sum, item) => sum + (item.clicks || 0), 0);
  const totalConversions = deals.reduce((sum, item) => sum + (item.conversions || 0), 0);
  const activeLinks = deals.filter(item => item.status === 'active' || !item.isArchived).length;

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Command Center Dashboard';
      case 'casinos': return 'Casino Listings Asset Manager';
      case 'bonuses': return 'Promo Campaign & Bonuses Manager';
      case 'review-submission': return 'Review Submission';
      case 'casino-analytics': return 'Casino Conversion Analytics';
      case 'sell-requests': return 'Affiliate Sell Requests';
      case 'links': return 'Affiliate Offers';
      case 'analytics': return 'Performance & Analytics';
      case 'profile': return 'Header & Branding Bio';
      case 'settings': return 'System Settings';
      case 'users': return 'System Users';
      default: return 'Administrator Space';
    }
  };

  // FULL COMPREHENSIVE FOUNDATION LAYOUT (Task 11)
  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar Layout */}
      <AdminSidebar
        currentTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?tab=" + tab;
          window.history.pushState({ path: newUrl }, "", newUrl);
          // Auto reset forms
          handleCancelEdit();
          setIsSidebarOpenMobile(false);
        }}
        onLogout={handleSignOut}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Scrollable Panel Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {/* Quick Statistics (Task 11 Component integration - only on old links/analytics views) */}
          {(activeTab === "links" || activeTab === "analytics") && (
            <DashboardStats
              totalLinks={deals.length}
              activeLinks={activeLinks}
              totalClicks={totalClicks}
              totalConversions={totalConversions}
            />
          )}

          {/* Active Tab Panel routing */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Dynamic Admin Greeting Card */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xs">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="font-display font-black text-2xl tracking-tight">
                      Command Dashboard
                    </h2>
                    <p className="text-xs text-indigo-200 font-medium">
                      Welcome back, <span className="font-bold text-white">{currentUser?.email}</span>. You have <span className="font-bold text-white">{stats.pendingReview} pending reviews</span> and <span className="font-bold text-white">{stats.sellRequests} acquisition bids</span> awaiting processing.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveTab("casinos")}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Manage Listings</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setActiveTab("sell-requests")}
                      className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Incoming Requests</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bento Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Total Listings</span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-slate-800">{stats.total}</span>
                    <span className="text-[10px] text-slate-400">items</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
                  <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase">Published</span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-emerald-700">{stats.published}</span>
                    <span className="text-[10px] text-emerald-500 font-semibold">
                      {stats.total > 0 ? `${Math.round((stats.published / stats.total) * 100)}%` : "0%"}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
                  <span className="text-[10px] font-bold text-amber-600 tracking-wider uppercase">Drafts</span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-amber-700">{stats.drafts}</span>
                    <span className="text-[10px] text-amber-500">pending</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
                  <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">AI Generated</span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-indigo-700">{stats.aiGenerated}</span>
                    <span className="text-[10px] text-indigo-500 font-semibold">Gemini</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
                  <span className="text-[10px] font-bold text-rose-600 tracking-wider uppercase">Pending Review</span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-rose-700">{stats.pendingReview}</span>
                    <span className="text-[10px] text-rose-400">reviews</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
                  <span className="text-[10px] font-bold text-cyan-600 tracking-wider uppercase">Sell Requests</span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-cyan-700">{stats.sellRequests}</span>
                    <span className="text-[10px] text-cyan-500 font-semibold">bids</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Total Users</span>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-slate-700">{stats.users}</span>
                    <span className="text-[10px] text-slate-400">Profiles</span>
                  </div>
                </div>
              </div>

              {/* Feature Modules Quick Link Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div
                  onClick={() => setActiveTab("casinos")}
                  className="bg-white border border-slate-200 rounded-3xl p-6 hover:border-indigo-300 shadow-xs cursor-pointer transition-all duration-200 group flex items-start justify-between"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-indigo-600 tracking-widest uppercase">Affiliate Asset Hub</span>
                    <h4 className="font-display font-black text-slate-900 text-sm">Casino Listing Directory</h4>
                    <p className="text-xs text-slate-500 leading-normal max-w-sm font-semibold">
                      Publish, archive, and edit dynamic web resources. Generate optimized copy using our integrated Gemini AI crawler.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-full bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 transition shrink-0">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab("sell-requests")}
                  className="bg-white border border-slate-200 rounded-3xl p-6 hover:border-emerald-300 shadow-xs cursor-pointer transition-all duration-200 group flex items-start justify-between"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-emerald-600 tracking-widest uppercase">Capital & Acquisitions</span>
                    <h4 className="font-display font-black text-slate-900 text-sm">Review Sell Requests</h4>
                    <p className="text-xs text-slate-500 leading-normal max-w-sm font-semibold">
                      Process acquisition offers submitted by registered partners. Screen proof attachments and coordinate handovers.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-full bg-slate-50 group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600 transition shrink-0">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "casinos" && <CasinoManager />}

          {activeTab === "bonuses" && <BonusManager />}

          {activeTab === "review-submission" && (
            <div className="space-y-6">
              {/* Inner Sub-Tabs Navigation for Review Submission */}
              <div className="flex bg-white/80 p-1.5 rounded-2xl border border-slate-200 max-w-md shadow-xs">
                <button
                  onClick={() => setReviewSubTab("moderation")}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    reviewSubTab === "moderation"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Vetting Desk & Moderation</span>
                </button>
                <button
                  onClick={() => setReviewSubTab("submit")}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    reviewSubTab === "submit"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Submit Jackpot Proof</span>
                </button>
              </div>

              {/* Component Views */}
              {reviewSubTab === "moderation" ? (
                <ModerationManager />
              ) : (
                <JackpotListing isAdmin={true} />
              )}
            </div>
          )}

          {activeTab === "casino-analytics" && <CasinoAnalytics />}

          {activeTab === "sell-requests" && <SellRequestsManager />}

          {/* Active Tab Panel routing */}
          {activeTab === "links" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              {/* Form Create/Edit Link (Left 1/3) */}
              <div
                id="link-form-container"
                className="xl:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  <span>{editingDeal ? `Modify Offer "${editingDeal.title}"` : "Register Affiliate Offer"}</span>
                </h3>

                {formError && (
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-600 leading-normal">
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Program / Product Name *
                    </label>
                    <input
                      id="form-title"
                      type="text"
                      placeholder="e.g. Hostinger, Stake Casino, Shopify"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Original Affiliate Target Link *
                    </label>
                    <input
                      id="form-original-url"
                      type="text"
                      placeholder="e.g. shopify.pxf.io/your_referral_id"
                      value={formData.originalUrl}
                      onChange={(e) => setFormData({ ...formData, originalUrl: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Industry Category
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {["Casino", "SaaS", "Shopping", "Finance", "Tech", "Custom"].map((cat) => (
                        <button
                          id={`form-cat-${cat.toLowerCase()}`}
                          key={cat}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat })}
                          className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                            formData.category === cat
                              ? "bg-indigo-50 border-indigo-500 text-indigo-800"
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {formData.category === "Custom" && (
                      <input
                        id="form-custom-category"
                        type="text"
                        placeholder="Enter Custom Category..."
                        value={formData.customCategory}
                        onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                        className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Promo Coupon Code (Optional)
                    </label>
                    <input
                      id="form-promo-code"
                      type="text"
                      placeholder="e.g. EMERALD10, GETDEAL"
                      value={formData.discountCode}
                      onChange={(e) => setFormData({ ...formData, discountCode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Visitor Incentive (What they save)
                    </label>
                    <input
                      id="form-incentive-text"
                      type="text"
                      placeholder="e.g. 10% Discount, Free Spins, $20 Credit"
                      value={formData.rewardText}
                      onChange={(e) => setFormData({ ...formData, rewardText: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Referral Reward (What you receive)
                    </label>
                    <input
                      id="form-bounty-text"
                      type="text"
                      placeholder="e.g. 15% Commish, $10 Support Bonus"
                      value={formData.ownerRewardText}
                      onChange={(e) => setFormData({ ...formData, ownerRewardText: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Offer summary details
                    </label>
                    <textarea
                      id="form-summary"
                      placeholder="Summarize product terms or highlights..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {editingDeal && (
                      <button
                        id="cancel-edit-btn"
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      id="save-deal-btn"
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {formLoading ? (
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      ) : editingDeal ? (
                        "Apply Changes"
                      ) : (
                        "Publish Offer"
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Active List (Right 2/3) */}
              <div className="xl:col-span-2 space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <h4 className="font-display font-bold text-slate-800 text-sm mb-1">
                    Your Registered Referrals Selection ({deals.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    These links are published across your public profile. Clicking modify on any card pulls its parameters into the registration form.
                  </p>
                </div>

                <DealsGrid
                  deals={deals}
                  onSelectDeal={handleEditInit}
                  isAdminView={true}
                  onEditDeal={handleEditInit}
                  onDeleteDeal={onDeleteDeal}
                />
              </div>
            </div>
          )}

          {activeTab === "analytics" && <AnalyticsSection deals={deals} />}

          {activeTab === "profile" && (
            <div className="max-w-2xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-display font-bold text-slate-800 text-base flex items-center gap-1.5">
                  <UserCog className="h-5 w-5 text-indigo-600" />
                  <span>Configure Header & Branding</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your users see these details clearly at the top when visiting your unique directory link.
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {profileSuccess && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                    <span>Branding header updated successfully!</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Directory Title name *
                  </label>
                  <input
                    id="profile-name-field"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    placeholder="e.g. Anik's Elite Recommendations, Creator Perks Directory"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Intro Bio Tagline
                  </label>
                  <textarea
                    id="profile-bio-field"
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    rows={3}
                    placeholder="Write a clear invitation, e.g. 'Support my content and grab lifetime discounts on top SaaS apps using my direct codes below!'"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30 resize-none"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div className="text-[10px] text-slate-400">
                    Your direct URL parameter:{" "}
                    <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-semibold">
                      ?u={currentUser.uid}
                    </span>
                  </div>
                  <button
                    id="save-profile-btn"
                    type="submit"
                    disabled={profileSaving || !profileName}
                    className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {profileSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save Branding Header"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "settings" && <AdminSettings />}

          {activeTab === "users" && <AdminUserManager />}
        </main>
      </div>
    </div>
  );
}
