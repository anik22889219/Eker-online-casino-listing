import React, { useState, useEffect } from "react";
import { User, Mail, ShieldAlert, Award, Calendar, LogOut, CheckCircle, Clock, Sparkles, Smartphone, Coins } from "lucide-react";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { UserProfile } from "../types";

interface UserProfileViewProps {
  currentUser: any;
  userProfile: UserProfile | null;
}

export default function UserProfileView({ currentUser, userProfile }: UserProfileViewProps) {
  const [submittals, setSubmittals] = useState<any[]>([]);
  const [loadingSubmittals, setLoadingSubmittals] = useState(false);
  
  const [sellRequests, setSellRequests] = useState<any[]>([]);
  const [loadingSellRequests, setLoadingSellRequests] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // 1. Fetch jackpotListings (original submissions)
    const fetchUserSubmittals = async () => {
      setLoadingSubmittals(true);
      try {
        const q = query(collection(db, "jackpotListings"), where("userId", "==", currentUser.uid));
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setSubmittals(list);
      } catch (err) {
        console.warn("Could not load user submissions:", err);
      } finally {
        setLoadingSubmittals(false);
      }
    };

    fetchUserSubmittals();

    // 2. Fetch sellRequests (new screenshot selling requests) using a real-time listener
    setLoadingSellRequests(true);
    const qSell = query(collection(db, "sellRequests"), where("userId", "==", currentUser.uid));
    const unsubSell = onSnapshot(qSell, (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort by creation date descending
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setSellRequests(list);
      setLoadingSellRequests(false);
    }, (err) => {
      console.warn("Could not subscribe to sell requests:", err);
      setLoadingSellRequests(false);
    });

    return () => unsubSell();

  }, [currentUser]);

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
        day: "numeric"
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
                  alt={currentUser.displayName || "User"}
                  referrerPolicy="no-referrer"
                  className="h-24 w-24 rounded-full border-4 border-white shadow-md object-cover relative z-10"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-indigo-50 text-indigo-800 flex items-center justify-center text-3xl font-bold font-mono border-4 border-white shadow-md relative z-10">
                  {(currentUser.displayName || currentUser.email || "?")[0].toUpperCase()}
                </div>
              )}
              
              <div className="text-center sm:text-left space-y-0.5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
                  <span>{userProfile?.displayName || currentUser.displayName || "Eker Member"}</span>
                  <CheckCircle className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                </h2>
                <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1 font-semibold">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{currentUser.email}</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer self-center sm:self-end"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
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
            {sellRequests.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">ID: {item.id.slice(0, 8)}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider
                      ${item.status === "approved" ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                        item.status === "rejected" ? "bg-red-50 border-red-100 text-red-700" :
                        "bg-amber-50 border-amber-100 text-amber-700 animate-pulse"}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 text-sm leading-tight">
                    {item.casinoName || "App / Casino"}
                  </h4>
                  <div className="space-y-1 text-xs text-slate-500 font-semibold">
                    <p className="flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                      <span>bKash Wallet: <strong className="text-slate-800 font-mono">{item.bikashNumber}</strong></span>
                    </p>
                    {item.dateTime && (
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Win Time: <strong className="text-slate-700">{new Date(item.dateTime).toLocaleString()}</strong></span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold font-mono">
                  <span className="flex items-center gap-1 text-slate-800 font-black">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    {item.amount?.toLocaleString()} Taka Jackpot
                  </span>
                  <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Pending"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaign Submissions Section */}
      <div className="space-y-4">
        <h3 className="font-black text-slate-900 text-base flex items-center gap-1.5">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <span>My Verified Campaign Submissions</span>
        </h3>

        {loadingSubmittals ? (
          <div className="bg-white border border-slate-150 p-12 text-center rounded-2xl italic text-xs text-slate-400">
            Retrieving submissions from Eker Vault...
          </div>
        ) : submittals.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 text-center rounded-3xl space-y-3">
            <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-300 mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 font-semibold">No submissions found.</p>
            <p className="text-[11px] text-slate-400 leading-normal max-w-sm mx-auto">
              Have you hit a massive jackpot or qualified for custom bonuses on our partner casinos? Submit proof to receive exclusive brokerage rewards.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {submittals.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-xs flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">ID: {item.id.slice(0, 8)}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider
                      ${item.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        item.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                        "bg-slate-50 text-slate-500 border border-slate-100"}`}
                    >
                      {item.status || "Pending Vetting"}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm leading-tight">
                    {item.casinoName || "Partner Casino Review"}
                  </h4>
                  <p className="text-xs text-slate-500 leading-normal font-semibold">
                    {item.reviewText || "Jackpot win verification submission."}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold font-mono">
                  <span>Win amount: {item.multiplier ? `${item.multiplier}x` : "Verified Play"}</span>
                  <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Pending"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
