import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  ShieldCheck,
  CheckCircle,
  Edit3,
  Save,
  KeyRound,
  Copy,
  ExternalLink,
  Check,
  Smartphone,
  Coins,
  LogOut,
  Clock,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Award,
  QrCode,
  Building2,
  BookOpen,
  TrendingUp,
  Wallet,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Camera,
  ShieldAlert,
} from "lucide-react";
import { db, auth } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";
import {
  updatePassword,
  updateProfile,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { UserProfile } from "../../types";

interface AdminProfileManagerProps {
  currentUser?: FirebaseUser | null;
  userProfile?: UserProfile | null;
  onUpdateProfile?: (profile: Partial<UserProfile>) => Promise<void>;
}

export const AdminProfileManager: React.FC<AdminProfileManagerProps> = ({
  currentUser: propCurrentUser,
  userProfile: propUserProfile,
  onUpdateProfile,
}) => {
  const currentUser = propCurrentUser || auth.currentUser;

  // Active Admin Profile State
  const [displayName, setDisplayName] = useState("");
  const [adminTitle, setAdminTitle] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");

  // Payment Wallet State
  const [walletType, setWalletType] = useState<"bKash" | "Nagad" | "Rocket">("bKash");
  const [walletNumber, setWalletNumber] = useState("");
  const [walletAccountType, setWalletAccountType] = useState<"Personal" | "Agent">("Personal");

  // Form State
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Security & Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Copy state
  const [copiedLink, setCopiedLink] = useState(false);

  // System Stats Counter State for Admin
  const [adminStats, setAdminStats] = useState({
    totalCasinos: 0,
    totalReviews: 0,
    totalBlogs: 0,
    totalSellRequests: 0,
    totalWithdrawals: 0,
  });

  // Load Admin Data from Firestore
  useEffect(() => {
    if (!currentUser) return;

    const fetchAdminProfile = async () => {
      try {
        const uDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (uDoc.exists()) {
          const d = uDoc.data();
          setDisplayName(d.displayName || currentUser.displayName || "Eker Administrator");
          setAdminTitle(d.adminTitle || "Senior System Administrator");
          setPhotoURL(d.photoURL || currentUser.photoURL || "");
          setBio(d.bio || "Managing verified affiliate directories, casino listings, and real-time bonus reward campaigns.");
          setPhone(d.phone || "");
          setTelegram(d.telegram || "");
          if (d.walletType) setWalletType(d.walletType);
          if (d.walletNumber) setWalletNumber(d.walletNumber);
          if (d.walletAccountType) setWalletAccountType(d.walletAccountType);
        } else {
          setDisplayName(currentUser.displayName || "Eker Administrator");
          setAdminTitle("System Administrator");
          setPhotoURL(currentUser.photoURL || "");
          setBio("Managing verified affiliate directories, casino listings, and real-time bonus reward campaigns.");
        }
      } catch (err) {
        console.warn("Error loading admin profile:", err);
      }
    };

    fetchAdminProfile();
  }, [currentUser]);

  // Subscribe to real-time system counters
  useEffect(() => {
    if (!currentUser) return;

    const unsubCasinos = onSnapshot(
      collection(db, "casinos"),
      (snap) => setAdminStats((prev) => ({ ...prev, totalCasinos: snap.size })),
      () => {}
    );

    const unsubReviews = onSnapshot(
      collection(db, "reviews"),
      (snap) => setAdminStats((prev) => ({ ...prev, totalReviews: snap.size })),
      () => {}
    );

    const unsubBlogs = onSnapshot(
      collection(db, "blogs"),
      (snap) => setAdminStats((prev) => ({ ...prev, totalBlogs: snap.size })),
      () => {}
    );

    const unsubSell = onSnapshot(
      collection(db, "sellRequests"),
      (snap) => setAdminStats((prev) => ({ ...prev, totalSellRequests: snap.size })),
      () => {}
    );

    const unsubWithdraw = onSnapshot(
      collection(db, "withdrawals"),
      (snap) => setAdminStats((prev) => ({ ...prev, totalWithdrawals: snap.size })),
      () => {}
    );

    return () => {
      unsubCasinos();
      unsubReviews();
      unsubBlogs();
      unsubSell();
      unsubWithdraw();
    };
  }, [currentUser]);

  // Handle Profile Update
  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSavingProfile(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    try {
      const updatedData: Partial<UserProfile> & Record<string, any> = {
        displayName: displayName.trim(),
        adminTitle: adminTitle.trim(),
        photoURL: photoURL.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        telegram: telegram.trim(),
        walletType,
        walletNumber: walletNumber.trim(),
        walletAccountType,
        updatedAt: new Date().toISOString(),
      };

      // 1. Update Firestore user doc
      await setDoc(doc(db, "users", currentUser.uid), updatedData, { merge: true });

      // 2. Update Auth display name & photo if available
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
          photoURL: photoURL.trim() || undefined,
        });
      }

      // 3. Call parent hook if passed
      if (onUpdateProfile) {
        await onUpdateProfile(updatedData);
      }

      setProfileSuccessMsg("Admin profile & branding settings successfully updated!");
      setTimeout(() => setProfileSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error(err);
      setProfileErrorMsg(err.message || "Failed to update profile settings.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Security Password Update
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setPasswordErrorMsg("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErrorMsg("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg("New password and confirm password do not match");
      return;
    }

    setChangingPassword(true);
    setPasswordErrorMsg(null);
    setPasswordSuccessMsg(null);

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setPasswordSuccessMsg("Password updated successfully! Please use your new password next time you log in.");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccessMsg(null), 4000);
      } else {
        throw new Error("No active user authenticated");
      }
    } catch (err: any) {
      console.error("Password change failed:", err);
      let msg = err.message || "Failed to update password";
      if (msg.includes("requires-recent-login")) {
        msg = "This operation is sensitive and requires a recent login. Please log out and sign back in before changing your password.";
      }
      setPasswordErrorMsg(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCopyCreatorLink = () => {
    if (!currentUser) return;
    const shareUrl = `${window.location.origin}/?u=${currentUser.uid}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
        <h3 className="font-bold text-slate-900 text-lg">Admin Authentication Required</h3>
        <p className="text-xs text-slate-500">Please sign in with administrator credentials to access this page.</p>
      </div>
    );
  }

  const roleLabel = propUserProfile?.role || "super_admin";
  const userEmail = currentUser.email || "admin@eker.com";
  const creatorLink = `${window.location.origin}/?u=${currentUser.uid}`;
  const creationDate = currentUser.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Verified Member";

  const lastLogin = currentUser.metadata?.lastSignInTime
    ? new Date(currentUser.metadata.lastSignInTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      })
    : "Active Now";

  return (
    <div id="admin-profile-manager" className="max-w-6xl mx-auto space-y-8 pb-12 font-sans">
      {/* 1. TOP HERO ADMIN IDENTITY BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-6 md:p-8 text-white shadow-xl">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-cyan-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Avatar image or fallback initial */}
            <div className="relative group">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={displayName}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-lg ring-4 ring-slate-900/80"
                  referrerPolicy="no-referrer"
                  onError={() => setPhotoURL("")}
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-indigo-650 text-white flex items-center justify-center text-3xl font-black font-mono border-2 border-indigo-500/50 shadow-lg ring-4 ring-slate-900/80">
                  {(displayName || userEmail || "A")[0].toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] text-slate-950 font-black" title="Active Verified Admin">
                ✓
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="font-display font-black text-2xl text-white tracking-tight">
                  {displayName || "Administrator"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  {roleLabel.replace("_", " ")}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-400" /> Verified
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-400 flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>{userEmail}</span>
                <span className="text-slate-600">•</span>
                <span className="text-indigo-300 font-mono text-[11px]">{adminTitle || "System Administrator"}</span>
              </p>

              <p className="text-xs text-slate-300 font-medium max-w-xl leading-relaxed italic pt-1">
                "{bio}"
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap sm:flex-col items-center md:items-end justify-center gap-2.5 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
            <button
              onClick={handleCopyCreatorLink}
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? "Link Copied!" : "Copy Creator URL"}</span>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-900/50 text-slate-300 hover:text-rose-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Account Details Footer Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] font-semibold text-slate-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Joined: <strong className="text-white">{creationDate}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Last Login: <strong className="text-white">{lastLogin}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>UID: <strong className="text-amber-300 font-mono text-[10px] truncate">{currentUser.uid}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Security Tier: <strong className="text-white uppercase">Level 1 Master</strong></span>
          </div>
        </div>
      </div>

      {/* 2. SYSTEM ACTIVITY COUNTERS & METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Casino Listings</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{adminStats.totalCasinos}</div>
          <p className="text-[10px] text-slate-500 font-medium">Published & Draft assets</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Moderation Reviews</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{adminStats.totalReviews}</div>
          <p className="text-[10px] text-slate-500 font-medium">User reviews & proofs</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Blog Articles</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{adminStats.totalBlogs}</div>
          <p className="text-[10px] text-slate-500 font-medium">Active news posts</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Sell Bids</span>
            <TrendingUp className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{adminStats.totalSellRequests}</div>
          <p className="text-[10px] text-slate-500 font-medium">Partner screenshot bids</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Withdrawal Desk</span>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{adminStats.totalWithdrawals}</div>
          <p className="text-[10px] text-slate-500 font-medium">Processed payout records</p>
        </div>
      </div>

      {/* 3. MAIN FORM SECTIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Profile Details & Branding Editor (2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section A: Admin Profile & Branding Form */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <h3 className="font-display font-black text-slate-900 text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  <span>Admin Profile & Directory Header</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Update your public administrator details, avatar photo, position title, and directory tagline.
                </p>
              </div>
            </div>

            {profileSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdminProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Full Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Anik Hoque"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Admin Role / Title */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Position / Title
                  </label>
                  <input
                    type="text"
                    value={adminTitle}
                    onChange={(e) => setAdminTitle(e.target.value)}
                    placeholder="e.g. Lead Director & System Admin"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Avatar Image URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Profile Photo URL (Image Link)</span>
                  {photoURL && (
                    <button
                      type="button"
                      onClick={() => setPhotoURL("")}
                      className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Camera className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="url"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-... or custom avatar URL"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Provide a direct HTTPS image URL for your profile picture.
                </p>
              </div>

              {/* Intro Bio Tagline */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Intro Bio / Public Tagline
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your directory mission or personalized welcome invitation..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Phone / WhatsApp (Optional)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+8801700000000"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Telegram Handle (Optional)
                  </label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="@admin_handle"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Submit Profile Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer active:scale-97 disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section B: Admin Payout Mobile Banking Wallet */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <h3 className="font-display font-black text-slate-900 text-base flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-indigo-600" />
                  <span>Admin Revenue & Wallet Settings</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Set up your preferred mobile banking wallet for platform payouts and commission receipts.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Mobile Banking Gateway
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setWalletType("bKash")}
                    className={`py-3 px-4 rounded-2xl border text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
                      walletType === "bKash"
                        ? "bg-pink-600 text-white border-pink-700 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>bKash (বিকাশ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalletType("Nagad")}
                    className={`py-3 px-4 rounded-2xl border text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
                      walletType === "Nagad"
                        ? "bg-amber-600 text-white border-amber-700 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Nagad (নগদ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalletType("Rocket")}
                    className={`py-3 px-4 rounded-2xl border text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 ${
                      walletType === "Rocket"
                        ? "bg-purple-700 text-white border-purple-800 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Rocket (রকেট)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Wallet Number
                  </label>
                  <input
                    type="text"
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value)}
                    placeholder="e.g. 01712345678"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWalletAccountType("Personal")}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition cursor-pointer text-center ${
                        walletAccountType === "Personal"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Personal
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletAccountType("Agent")}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition cursor-pointer text-center ${
                        walletAccountType === "Agent"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Agent
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Password & Security + Direct Link Card (1 col) */}
        <div className="space-y-8">
          {/* Section C: Creator Referral Link Preview Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white border border-indigo-800/50 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                <span>Your Creator URL</span>
              </span>
              <QrCode className="w-5 h-5 text-indigo-400" />
            </div>

            <div className="space-y-1">
              <h4 className="font-display font-black text-white text-base tracking-tight">
                Branded Affiliate Link
              </h4>
              <p className="text-xs text-indigo-200/80 leading-normal font-medium">
                Share this unique link to showcase your directory catalog pre-filtered under your creator profile.
              </p>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-indigo-900/60 font-mono text-xs text-indigo-300 select-all break-all shadow-inner">
              {creatorLink}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopyCreatorLink}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
              </button>

              <a
                href={creatorLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white transition flex items-center justify-center cursor-pointer"
                title="Open Public Directory"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Section D: Admin Security & Password Change */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <h3 className="font-display font-black text-slate-900 text-base flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-600" />
                  <span>Security & Passcode</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Update your master administrator login password.
                </p>
              </div>
            </div>

            {passwordSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  New Passcode / Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-4 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword || !newPassword}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-97 disabled:opacity-50"
                >
                  {changingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
