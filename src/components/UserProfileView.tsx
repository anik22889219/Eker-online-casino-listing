import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  ShieldAlert,
  Award,
  Calendar,
  LogOut,
  CheckCircle,
  Clock,
  Sparkles,
  Smartphone,
  Coins,
  Wallet,
  DollarSign,
  Check,
  Save,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CreditCard,
  Building2,
  RefreshCw,
  Edit3,
  UserCheck,
} from "lucide-react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  addDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { UserProfile } from "../types";

interface UserProfileViewProps {
  currentUser: any;
  userProfile: UserProfile | null;
}

// Helper to calculate screenshot reward price if not stored
const getCalculatedPriceMoney = (amtNum: number) => {
  if (isNaN(amtNum) || amtNum < 100) return 0;
  if (amtNum >= 2000) return 200;
  return Math.min(200, Math.floor(amtNum / 100) * 10);
};

export default function UserProfileView({ currentUser, userProfile }: UserProfileViewProps) {
  // 1. Sell Requests state
  const [sellRequests, setSellRequests] = useState<any[]>([]);
  const [loadingSellRequests, setLoadingSellRequests] = useState(false);

  // 2. Profile & Mobile Wallet state
  const [walletType, setWalletType] = useState<"bKash" | "Nagad" | "Rocket">("bKash");
  const [walletNumber, setWalletNumber] = useState("");
  const [walletAccountType, setWalletAccountType] = useState<"Personal" | "Agent">("Personal");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // Edit Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editWalletType, setEditWalletType] = useState<"bKash" | "Nagad" | "Rocket">("bKash");
  const [editWalletNumber, setEditWalletNumber] = useState("");
  const [editWalletAccountType, setEditWalletAccountType] = useState<"Personal" | "Agent">("Personal");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // 3. Withdrawals state
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string | null>(null);
  const [withdrawErrorMsg, setWithdrawErrorMsg] = useState<string | null>(null);

  // Fetch initial User Profile & Wallet info
  useEffect(() => {
    if (!currentUser) return;
    const fetchUserWalletAndProfile = async () => {
      try {
        const uDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (uDoc.exists()) {
          const d = uDoc.data();
          if (d.walletNumber) {
            setWalletNumber(d.walletNumber);
            setEditWalletNumber(d.walletNumber);
          }
          if (d.walletType) {
            setWalletType(d.walletType);
            setEditWalletType(d.walletType);
          }
          if (d.walletAccountType) {
            setWalletAccountType(d.walletAccountType);
            setEditWalletAccountType(d.walletAccountType);
          }
          const name = d.displayName || userProfile?.displayName || currentUser.displayName || "Eker Member";
          setDisplayName(name);
          setEditDisplayName(name);

          const b = d.bio || userProfile?.bio || "";
          setBio(b);
          setEditBio(b);
        } else {
          const name = userProfile?.displayName || currentUser.displayName || "Eker Member";
          setDisplayName(name);
          setEditDisplayName(name);
          const b = userProfile?.bio || "";
          setBio(b);
          setEditBio(b);
        }
      } catch (e) {
        console.warn("Could not fetch user profile data:", e);
      }
    };
    fetchUserWalletAndProfile();
  }, [currentUser, userProfile]);

  // Real-time listener for User's Sell Requests
  useEffect(() => {
    if (!currentUser) return;
    setLoadingSellRequests(true);
    const qSell = query(collection(db, "sellRequests"), where("userId", "==", currentUser.uid));
    const unsubSell = onSnapshot(
      qSell,
      (snap) => {
        const list: any[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setSellRequests(list);
        setLoadingSellRequests(false);
      },
      (err) => {
        console.warn("Could not subscribe to sell requests:", err);
        setLoadingSellRequests(false);
      }
    );

    return () => unsubSell();
  }, [currentUser]);

  // Real-time listener for User's Withdrawals
  useEffect(() => {
    if (!currentUser) return;
    setLoadingWithdrawals(true);
    const qWith = query(collection(db, "withdrawals"), where("userId", "==", currentUser.uid));
    const unsubWith = onSnapshot(
      qWith,
      (snap) => {
        const list: any[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setWithdrawals(list);
        setLoadingWithdrawals(false);
      },
      (err) => {
        console.warn("Could not subscribe to withdrawals:", err);
        setLoadingWithdrawals(false);
      }
    );

    return () => unsubWith();
  }, [currentUser]);

  // Save Full Profile & Wallet in Edit Modal
  const handleSaveFullProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    try {
      const updatedData: any = {
        displayName: editDisplayName.trim() || displayName,
        bio: editBio.trim(),
        walletType: editWalletType,
        walletNumber: editWalletNumber.trim(),
        bkashNumber: editWalletType === "bKash" ? editWalletNumber.trim() : "",
        walletAccountType: editWalletAccountType,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", currentUser.uid), updatedData, { merge: true });

      // Update local view state
      setDisplayName(updatedData.displayName);
      setBio(updatedData.bio);
      setWalletType(editWalletType);
      setWalletNumber(editWalletNumber.trim());
      setWalletAccountType(editWalletAccountType);

      setProfileSuccessMsg("প্রোফাইল ও পেমেন্ট ওয়ালেট তথ্য সফলভাবে আপডেট করা হয়েছে!");
      setTimeout(() => {
        setProfileSuccessMsg(null);
        setIsEditProfileOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setProfileErrorMsg(err.message || "প্রোফাইল সেভ করতে ব্যর্থ হয়েছে।");
    } finally {
      setSavingProfile(false);
    }
  };

  // Calculate Total Earnings, Total Withdrawn & Available Balance
  const totalEarned = sellRequests.reduce((sum, item) => {
    if (item.status === "approved") {
      const reward =
        typeof item.calculatedPrice === "number" && item.calculatedPrice >= 0
          ? item.calculatedPrice
          : getCalculatedPriceMoney(Number(item.amount || 0));
      return sum + reward;
    }
    return sum;
  }, 0);

  const totalWithdrawn = withdrawals.reduce((sum, item) => {
    if (item.status !== "rejected") {
      return sum + Number(item.amount || 0);
    }
    return sum;
  }, 0);

  const availableBalance = Math.max(0, totalEarned - totalWithdrawn);

  // Submit Withdrawal Request
  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);

    if (!walletNumber.trim()) {
      setWithdrawErrorMsg("প্রথমে এডিট প্রোফাইলে গিয়ে বিকাশ/নগদ/রকেট ওয়ালেট নম্বর সেভ করুন।");
      return;
    }
    if (isNaN(amt) || amt < 100) {
      setWithdrawErrorMsg("মিনিমাম ১০০ টাকা উইথড্র করতে হবে।");
      return;
    }
    if (amt > availableBalance) {
      setWithdrawErrorMsg(`আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই। বর্তমান ব্যালেন্স ৳${availableBalance}`);
      return;
    }

    setSubmittingWithdrawal(true);
    setWithdrawErrorMsg(null);

    try {
      await addDoc(collection(db, "withdrawals"), {
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        userName: displayName || currentUser.displayName || "User",
        walletType,
        walletNumber: walletNumber.trim(),
        walletAccountType,
        amount: amt,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      setWithdrawSuccessMsg("আপনার উইথড্রয়াল আবেদন গ্রহণ করা হয়েছে! অ্যাডমিন টিম শিগগিরই রিভিউ করে টাকা পাঠিয়ে দেবে।");
      setIsWithdrawModalOpen(false);
      setWithdrawAmount("");
    } catch (err: any) {
      console.error(err);
      setWithdrawErrorMsg(err.message || "উইথড্রয়াল আবেদন ব্যর্থ হয়েছে।");
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Signout error:", err);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-950">Not Authenticated</h3>
        <p className="text-xs text-slate-500">Please sign in to view your profile page.</p>
      </div>
    );
  }

  const creationDate = currentUser.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently Joined";

  return (
    <div id="user-profile-view" className="max-w-4xl mx-auto py-4 space-y-8">
      {/* Profile Header Block */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
            Verified Account
          </div>
        </div>

        <div className="px-6 pb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={displayName || "User"}
                  referrerPolicy="no-referrer"
                  className="h-24 w-24 rounded-full border-4 border-white shadow-md object-cover relative z-10"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-indigo-50 text-indigo-800 flex items-center justify-center text-3xl font-bold font-mono border-4 border-white shadow-md relative z-10">
                  {(displayName || currentUser.email || "?")[0].toUpperCase()}
                </div>
              )}

              <div className="text-center sm:text-left space-y-0.5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
                  <span>{displayName || "Eker Member"}</span>
                  <CheckCircle className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                </h2>
                <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1 font-semibold">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{currentUser.email}</span>
                </p>
                {bio && <p className="text-xs text-slate-600 font-medium pt-1 italic">"{bio}"</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 self-center sm:self-end">
              <button
                onClick={() => {
                  setProfileErrorMsg(null);
                  setProfileSuccessMsg(null);
                  setEditDisplayName(displayName);
                  setEditBio(bio);
                  setEditWalletNumber(walletNumber);
                  setEditWalletType(walletType);
                  setEditWalletAccountType(walletAccountType);
                  setIsEditProfileOpen(true);
                }}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile (এডিট প্রোফাইল)</span>
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Joined on <strong className="text-slate-800">{creationDate}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-slate-400" />
              <span>Membership Tier: <strong className="text-slate-800 capitalize">{userProfile?.role || "Verified Player"}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Configured Payment Wallet Status Card (Hides setup form when set, shows summary) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-600" />
              <span>Payment Wallet Status (পেমেন্ট ওয়ালেট তথ্য)</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              উইথড্রয়াল এবং স্ক্রিনশট বিক্রির পুরষ্কার পাওয়ার মোবাইল ব্যাংকিং তথ্য।
            </p>
          </div>

          {walletNumber ? (
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" /> Wallet Configured
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" /> Wallet Not Set
            </span>
          )}
        </div>

        {walletNumber ? (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Saved Mobile Banking Account
              </span>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-black text-white ${
                    walletType === "bKash"
                      ? "bg-pink-600"
                      : walletType === "Nagad"
                      ? "bg-amber-600"
                      : "bg-purple-700"
                  }`}
                >
                  {walletType} ({walletAccountType})
                </span>
                <span className="font-mono text-base font-black text-slate-900">{walletNumber}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setProfileErrorMsg(null);
                setProfileSuccessMsg(null);
                setEditDisplayName(displayName);
                setEditBio(bio);
                setEditWalletNumber(walletNumber);
                setEditWalletType(walletType);
                setEditWalletAccountType(walletAccountType);
                setIsEditProfileOpen(true);
              }}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer self-start sm:self-center shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Change Wallet Number (এডিট করুন)</span>
            </button>
          </div>
        ) : (
          <div className="p-5 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-900">
                আপনি এখনও কোনো বিকাশ/নগদ/রকেট পেমেন্ট নাম্বার সেট করেননি।
              </p>
              <p className="text-[11px] text-amber-700/90 font-medium">
                টাকা উইথড্র দেওয়ার পূর্বে এডিট প্রোফাইলে গিয়ে আপনার পেমেন্ট ওয়ালেট নাম্বারটি সেট করে নিন।
              </p>
            </div>

            <button
              onClick={() => {
                setProfileErrorMsg(null);
                setProfileSuccessMsg(null);
                setEditDisplayName(displayName);
                setEditBio(bio);
                setEditWalletNumber(walletNumber);
                setEditWalletType(walletType);
                setEditWalletAccountType(walletAccountType);
                setIsEditProfileOpen(true);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer shrink-0 flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>Set Up Wallet Number (ওয়ালেট সেট করুন)</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Profile & Wallet Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 relative shadow-2xl space-y-6 my-8">
            <button
              onClick={() => setIsEditProfileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 border-b border-slate-100 pb-4">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <span>Edit Profile & Wallet (প্রোফাইল ও ওয়ালেট এডিট)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                আপনার নাম, বায়ো এবং টাকা গ্রহণের বিকাশ/নগদ/রকেট ওয়ালেট তথ্য আপডেট করুন।
              </p>
            </div>

            {profileSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveFullProfile} className="space-y-5">
              {/* Profile Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                  1. Profile Details (প্রোফাইল তথ্য)
                </h4>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Full Name / নাম
                  </label>
                  <input
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="e.g. Your Name"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Bio / বায়ো (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Short bio or note"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Wallet Details */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                  2. Payment Mobile Wallet (পেমেন্ট ওয়ালেট সেটআপ)
                </h4>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Wallet Method / ওয়ালেট মাধ্যম
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditWalletType("bKash")}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        editWalletType === "bKash"
                          ? "bg-pink-600 text-white border-pink-700 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span>bKash (বিকাশ)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditWalletType("Nagad")}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        editWalletType === "Nagad"
                          ? "bg-amber-600 text-white border-amber-700 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span>Nagad (নগদ)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditWalletType("Rocket")}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        editWalletType === "Rocket"
                          ? "bg-purple-700 text-white border-purple-800 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span>Rocket (রকেট)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      {editWalletType} Account Number / ওয়ালেট নম্বর
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 017XXXXXXXX"
                      value={editWalletNumber}
                      onChange={(e) => setEditWalletNumber(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Account Type / অ্যাকাউন্টের ধরন
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditWalletAccountType("Personal")}
                        className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition cursor-pointer text-center ${
                          editWalletAccountType === "Personal"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Personal (পার্সোনাল)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditWalletAccountType("Agent")}
                        className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition cursor-pointer text-center ${
                          editWalletAccountType === "Agent"
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Agent (এজেন্ট)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-2xl transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile & Wallet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Balance & Withdrawal System (উপার্জন ও ব্যালেন্স হিসাব) */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 border border-indigo-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-900/60 pb-5">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-widest inline-flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" /> Wallet Earnings Balance
            </span>
            <h3 className="text-xl font-black text-white tracking-tight">
              My Earnings & Balance (আপনার উপার্জিত ব্যালেন্স)
            </h3>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Min Withdrawal Limit
            </span>
            <span className="text-xs font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full inline-block mt-0.5">
              ৳100 Taka
            </span>
          </div>
        </div>

        {withdrawSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{withdrawSuccessMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Earned */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Sell Earned (মোট আয়)
            </span>
            <div className="text-2xl font-black text-emerald-400 flex items-center gap-1">
              <span>৳{totalEarned.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-slate-400">অনুমোদিত স্ক্রিনশট বিক্রির মোট পুরস্কার</p>
          </div>

          {/* Card 2: Total Withdrawn */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Withdrawn (উইথড্রকৃত)
            </span>
            <div className="text-2xl font-black text-amber-400 flex items-center gap-1">
              <span>৳{totalWithdrawn.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-slate-400">ইতিমধ্যে আবেদনের মাধ্যমে উত্তোলিত</p>
          </div>

          {/* Card 3: Available Balance */}
          <div className="bg-indigo-600/30 border border-indigo-500/50 rounded-2xl p-4 space-y-1 backdrop-blur-xs">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
              Available Balance (বর্তমান ব্যালেন্স)
            </span>
            <div className="text-3xl font-black text-white flex items-center gap-1">
              <span>৳{availableBalance.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-indigo-200">উইথড্র করার জন্য প্রস্তুত টাকা</p>
          </div>
        </div>

        {/* Withdrawal Trigger / Condition Banner */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="text-xs text-slate-300 font-medium">
            {availableBalance >= 100 ? (
              <p className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>আপনার ব্যালেন্স ৳১০০ এর বেশি রয়েছে! আপনি এখনই টাকা উইথড্র করার আবেদন করতে পারবেন।</span>
              </p>
            ) : (
              <p className="flex items-center gap-2 text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>সর্বনিম্ন ১০০ টাকা জমার পর উইথড্র বাটন একটিভ হবে। (বর্তমান ব্যালেন্স: ৳{availableBalance})</span>
              </p>
            )}
          </div>

          <button
            onClick={() => {
              setWithdrawErrorMsg(null);
              setWithdrawAmount(String(availableBalance));
              setIsWithdrawModalOpen(true);
            }}
            disabled={availableBalance < 100}
            className={`px-6 py-3 rounded-2xl font-black text-xs transition shadow-lg shrink-0 flex items-center gap-2 cursor-pointer ${
              availableBalance >= 100
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Request Withdrawal (টাকা তুলুন)</span>
          </button>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 relative shadow-2xl space-y-5">
            <button
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider inline-block">
                Available: ৳{availableBalance} Taka
              </span>
              <h3 className="font-black text-lg text-slate-900">Request Withdrawal (টাকা উইথড্র করুন)</h3>
              <p className="text-xs text-slate-500 font-medium">
                মিনিমাম ১০০ টাকা থেকে শুরু করে সর্বোচ্চ বর্তমান ব্যালেন্স পর্যন্ত উইথড্র রিকোয়েস্ট দিন।
              </p>
            </div>

            {withdrawErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{withdrawErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRequestWithdrawal} className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selected Payment Wallet</span>
                <p className="font-black text-slate-900 flex items-center justify-between">
                  <span>{walletType} ({walletAccountType})</span>
                  <span className="font-mono text-indigo-600">{walletNumber || "Not Set"}</span>
                </p>
                {!walletNumber && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1">
                    ওয়ালেট নাম্বার সেভ করা নেই! রিকোয়েস্ট দেওয়ার পূর্বে এডিট প্রোফাইলে ওয়ালেট সেট করুন।
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Withdrawal Amount (৳ টাকা)
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  max={availableBalance}
                  placeholder="e.g. 150"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-black bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 font-semibold block">মিনিমাম লিমিট ৳১০০ টাকা</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWithdrawal}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingWithdrawal ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Request (উইথড্র দিন)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawals History List */}
      <div className="space-y-4">
        <h3 className="font-black text-slate-900 text-base flex items-center gap-1.5">
          <ArrowDownLeft className="w-5 h-5 text-indigo-600" />
          <span>Withdrawal History (উইথড্রয়াল আবেদনের ইতিহাস)</span>
        </h3>

        {loadingWithdrawals ? (
          <div className="bg-white border border-slate-150 p-8 text-center rounded-2xl italic text-xs text-slate-400">
            Loading withdrawal records...
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 text-center rounded-3xl space-y-2">
            <p className="text-xs text-slate-500 font-semibold">কোন উইথড্রয়াল আবেদনের ইতিহাস পাওয়া যায়নি।</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto font-medium">
              আপনার কাছে জমা ব্যালেন্স ১০০ টাকা বা তার বেশি হলে উইথড্র বাটন দিয়ে টাকা সরাসরি আপনার বিকাশে নিতে পারবেন।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {withdrawals.map((w) => (
              <div key={w.id} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      ID: {w.id.slice(0, 8)}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                        w.status === "approved" || w.status === "completed"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                          : w.status === "rejected"
                          ? "bg-red-50 border-red-100 text-red-700"
                          : "bg-amber-50 border-amber-100 text-amber-700 animate-pulse"
                      }`}
                    >
                      {w.status === "pending" ? "প্রসেসিং (Pending)" : w.status === "approved" || w.status === "completed" ? "পেইড (Paid)" : "বাতিল (Rejected)"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">{w.walletType || "bKash"} ({w.walletAccountType || "Personal"})</span>
                      <span className="text-xs font-mono font-bold text-slate-600">{w.walletNumber}</span>
                    </div>
                    <span className="text-lg font-black text-emerald-600 font-mono">
                      ৳{w.amount?.toLocaleString()} Tk
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold font-mono">
                  <span>Submitted</span>
                  <span>{w.createdAt ? new Date(w.createdAt).toLocaleDateString() : "Recently"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sell Requests Section */}
      <div className="space-y-4">
        <h3 className="font-black text-slate-900 text-base flex items-center gap-1.5">
          <Coins className="w-5 h-5 text-amber-500" />
          <span>My Jackpot Screenshot Sell Requests (জ্যাকপট স্ক্রিনশট বিক্রির ইতিহাস)</span>
        </h3>

        {loadingSellRequests ? (
          <div className="bg-white border border-slate-150 p-12 text-center rounded-2xl italic text-xs text-slate-400">
            Retrieving sell requests...
          </div>
        ) : sellRequests.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 text-center rounded-3xl space-y-3">
            <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-350 mx-auto">
              <Coins className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 font-semibold">কোন স্ক্রিনশট বিক্রির আবেদন পাওয়া যায়নি।</p>
            <p className="text-[11px] text-slate-400 leading-normal max-w-sm mx-auto font-semibold text-center">
              আপনার কাছে কি কোনো উইনিং স্ক্রিনশট আছে? সরাসরি হোম পেজের "সরাসরি বিক্রি করুন" বাটনে ক্লিক করে জমা দিয়ে পেমেন্ট নিন!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sellRequests.map((item) => {
              const estimatedReward =
                typeof item.calculatedPrice === "number" && item.calculatedPrice >= 0
                  ? item.calculatedPrice
                  : getCalculatedPriceMoney(Number(item.amount || 0));

              return (
                <div key={item.id} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        ID: {item.id.slice(0, 8)}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                          item.status === "approved"
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                            : item.status === "rejected"
                            ? "bg-red-50 border-red-100 text-red-700"
                            : "bg-amber-50 border-amber-100 text-amber-700 animate-pulse"
                        }`}
                      >
                        {item.status === "approved" ? "অনুমোদিত (Approved)" : item.status === "rejected" ? "বাতিল (Rejected)" : "পেন্ডিং (Pending)"}
                      </span>
                    </div>

                    <h4 className="font-black text-slate-900 text-sm leading-tight flex items-center justify-between">
                      <span>{item.casinoName || "Casino"} {item.gameName ? `(${item.gameName})` : ""}</span>
                    </h4>

                    <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Jackpot Prize</span>
                        <span className="font-black text-slate-800">৳{Number(item.amount || 0).toLocaleString()}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] font-bold text-emerald-600 uppercase block">Sell Reward Value</span>
                        <span className="font-black text-emerald-600 font-mono">৳{estimatedReward} Tk</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold font-mono">
                    <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Pending"}</span>
                    {item.status === "approved" && (
                      <span className="text-emerald-600 text-[10px]">✓ Balance Credited</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
