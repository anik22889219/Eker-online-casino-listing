import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  KeyRound,
  LogOut,
  UserCheck,
  PlusCircle,
  FileSpreadsheet,
  Globe,
  Loader2,
  CheckCircle,
  TrendingUp,
  Sliders,
  UserCog,
  ChevronRight,
  Info,
  Sparkles,
} from "lucide-react";
import { AffiliateLink, UserProfile } from "../types";
import AnalyticsSection from "./AnalyticsSection";
import DealsGrid from "./DealsGrid";

interface AdminPanelProps {
  deals: AffiliateLink[];
  onAddDeal: (dealData: Omit<AffiliateLink, "id" | "userId" | "clicks" | "createdAt" | "isArchived">) => Promise<void>;
  onUpdateDeal: (dealId: string, updatedFields: Partial<AffiliateLink>) => Promise<void>;
  onDeleteDeal: (dealId: string) => Promise<void>;
  currentUser: User | null;
  userProfile: UserProfile | null;
  onUpdateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

export default function AdminPanel({
  deals,
  onAddDeal,
  onUpdateDeal,
  onDeleteDeal,
  currentUser,
  userProfile,
  onUpdateProfile,
}: AdminPanelProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"links" | "analytics" | "profile">("links");

  // Auth form state
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

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
    // Auto toggle registering since it's most likely a new DB
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

    // Format URL
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

      // Reset form
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

  // Populating editor fields
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
    // Scroll to top of form area
    document.getElementById("link-form-container")?.scrollIntoView({ behavior: "smooth" });
  };

  // Cancel edit mode
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
      <div className="max-w-md mx-auto my-10 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl relative overflow-hidden">
        {/* Visual background badge */}
        <div className="absolute right-0 top-0 -mr-8 -mt-8 h-24 w-24 rounded-full bg-emerald-50/50" />

        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="font-display font-bold text-xl text-slate-800">
            Owner Security Gate
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Build your personal directory page, customize referral commission headers, and view detailed click graphs!
          </p>
        </div>

        {authError && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 mb-4 text-xs text-red-600 leading-normal">
            {authError}
          </div>
        )}

        {/* Dynamic choice buttons */}
        <div className="space-y-4">
          <button
            id="quickstart-anonymous-btn"
            onClick={handleAnonymousQuickstart}
            disabled={authLoading}
            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
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

          {/* Admin Helper Guide Card */}
          <div className="rounded-2xl bg-amber-50/60 border border-amber-150 p-4 space-y-2 mt-2">
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

        <div className="mt-6 pt-4 border-t border-slate-50 flex items-start gap-2 text-[10px] text-slate-400 leading-normal">
          <Info className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
          <span>
            Selecting Quickstart configures a client-side anonymous session with Firebase instantly without exposing key fields publicly.
          </span>
        </div>
      </div>
    );
  }

  // ACTIVE OWNER CONTROL PANEL
  return (
    <div className="space-y-6">
      {/* Top Banner Row */}
      <div className="bg-slate-900 rounded-3xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mb-1 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-ring shrink-0" />
            <span>Workspace Active</span>
          </div>
          <h2 className="font-display font-bold text-lg text-white">
            Workspace Owner: <span className="font-sans text-slate-300 text-sm font-medium">({currentUser.email || "Anonymous Sandbox Owner"})</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Publish rewards, configure your dynamic bio, and export click listings anytime. Your changes sync instantly.
          </p>
        </div>

        <button
          id="logout-btn"
          onClick={handleSignOut}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 rounded-xl text-white border border-white/5 transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Exit Workspace</span>
        </button>
      </div>

      {/* Segment Navigation */}
      <div className="flex border-b border-slate-100 gap-1 overflow-x-auto">
        <button
          id="tab-btn-links"
          onClick={() => setActiveTab("links")}
          className={`flex items-center gap-1.5 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "links"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          <span>Manage Referral Offers</span>
        </button>

        <button
          id="tab-btn-analytics"
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-1.5 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "analytics"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Analytics Insights</span>
        </button>

        <button
          id="tab-btn-profile"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-1.5 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "profile"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Directory Header & Bio</span>
        </button>
      </div>

      {/* PANELS */}
      {activeTab === "links" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Form Create/Edit Link (Left 1/3) */}
          <div
            id="link-form-container"
            className="xl:col-span-1 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs space-y-4"
          >
            <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Sliders className="h-4 w-4 text-emerald-600" />
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
              {/* Offer Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Program / Product Name *
                </label>
                <input
                  id="form-title"
                  type="text"
                  placeholder="e.g. Hostinger, Figma Pro, Shopify"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-emerald-500 bg-slate-50/30"
                />
              </div>

              {/* Referral Target URL */}
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-emerald-500 bg-slate-50/30 font-mono text-[11px]"
                />
              </div>

              {/* Category Grid Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Industry Category
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["SaaS", "Shopping", "Finance", "Tech", "Hosting", "Custom"].map((cat) => (
                    <button
                      id={`form-cat-${cat.toLowerCase()}`}
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        formData.category === cat
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800"
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
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-emerald-500 bg-slate-50/30"
                  />
                )}
              </div>

              {/* Promo Code Coupon */}
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-emerald-500 bg-slate-50/30 font-mono"
                />
              </div>

              {/* Click Reward (Guest bonus) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Visitor Incentive (What they save)
                </label>
                <input
                  id="form-incentive-text"
                  type="text"
                  placeholder="e.g. 10% Discount, Free Trial, $20 Credit"
                  value={formData.rewardText}
                  onChange={(e) => setFormData({ ...formData, rewardText: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-emerald-500 bg-slate-50/30 font-medium"
                />
              </div>

              {/* Referral bounty (Owner bonus) */}
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-emerald-500 bg-slate-50/30"
                />
              </div>

              {/* Brief details paragraph */}
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-emerald-500 bg-slate-50/30 resize-none"
                />
              </div>

              {/* Action Operations */}
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
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
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
        <div className="max-w-2xl mx-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-50 pb-4">
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

            <div className="pt-2 border-t border-slate-50 flex items-center justify-between gap-4">
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
    </div>
  );
}
