import { useState, useEffect, useMemo } from "react";
import { db, auth, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  increment,
} from "firebase/firestore";
import {
  Coins,
  Settings2,
  ExternalLink,
  Search,
  Sparkles,
  Award,
  Flame,
  LayoutGrid,
  TrendingUp,
  Link2,
  Heart,
  QrCode,
  Check,
  RefreshCw,
  Share2,
} from "lucide-react";
import { AffiliateLink, UserProfile } from "./types";
import AdminPanel from "./components/AdminPanel";
import DealsGrid from "./components/DealsGrid";
import DealModal from "./components/DealModal";

// Predefined demo fallbacks if DB has no links yet, keeping the site looking magnificent
const DEMO_PRESETS = [
  {
    title: "Hostinger Web Hosting",
    description: "Get reliable cloud or shared hosting with free domain name registration, premium SSL, and 24/7 client support.",
    category: "Hosting",
    discountCode: "HOSTING10",
    rewardText: "Additional 10% cash discount on checkouts",
    ownerRewardText: "Supports channel content",
    clicks: 124,
    slug: "hostinger",
  },
  {
    title: "Notion Premium Workspace",
    description: "Connect your wiki, documents, tasks, and project timelines in a collaborative single-screen layout with Notion AI.",
    category: "SaaS",
    discountCode: "WORKSPACEPRO",
    rewardText: "Upgrade to Professional with $20 free credits",
    ownerRewardText: "Extended support credits",
    clicks: 86,
    slug: "notion",
  },
  {
    title: "Shopify Starter Package",
    description: "Build an elegant, high-converting e-commerce web storefront and sell physical or digital goods worldwide instantly.",
    category: "SaaS",
    discountCode: "SHOPIFY1",
    rewardText: "Start your online store for only $1/month",
    ownerRewardText: "$10 referral bounty reward",
    clicks: 292,
    slug: "shopify",
  },
  {
    title: "Ledger Hardware Secure Wallet",
    description: "Secure and isolate your valuable decentralized smart contracts, digital art collections, and Web3 crypto tokens.",
    category: "Tech",
    discountCode: "LEDSAVE",
    rewardText: "Get $10 BTC bonus directly into your account",
    ownerRewardText: "10% referral allocation",
    clicks: 42,
    slug: "ledger",
  },
];

export default function App() {
  // Authentication & Directory Owners
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  // Directory UI filtering
  const [urlCreatorId, setUrlCreatorId] = useState<string | null>(null);
  const [matchedCreatorProfile, setMatchedCreatorProfile] = useState<UserProfile | null>(null);

  // States
  const [allDeals, setAllDeals] = useState<AffiliateLink[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<AffiliateLink | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // 1. Check URL parameters for customized creator space on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uId = params.get("u") || params.get("user") || params.get("creator");
    if (uId) {
      setUrlCreatorId(uId);
    }
  }, []);

  // 2. Auth State Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch current user's profile from /users/{uid}
        try {
          const profileRef = doc(db, "users", user.uid);
          const snap = await getDoc(profileRef);
          if (snap.exists()) {
            setCurrentUserProfile({ uid: user.uid, ...snap.data() } as UserProfile);
          } else {
            // Auto initialize basic profile
            const tempProfile: Omit<UserProfile, "uid"> = {
              email: user.email || "anonymous-owner@directory.com",
              displayName: user.displayName || "My Premium Directory",
              bio: "Get exclusive discount codes, promo links, and custom deals on my favorite SaaS, web hosting, and hardware platforms below!",
              createdAt: new Date().toISOString(),
            };
            await setDoc(profileRef, tempProfile);
            setCurrentUserProfile({ uid: user.uid, ...tempProfile } as UserProfile);
          }
        } catch (error) {
          console.error("Error setting up user profile: ", error);
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setCurrentUserProfile(null);
      }
    });
    return unsubscribe;
  }, []);

  // 3. Fetch Selected URL Creator Profile
  useEffect(() => {
    if (urlCreatorId) {
      const fetchCreatorProfile = async () => {
        try {
          const res = await getDoc(doc(db, "users", urlCreatorId));
          if (res.exists()) {
            setMatchedCreatorProfile({ uid: urlCreatorId, ...res.data() } as UserProfile);
          }
        } catch (err) {
          console.error("Error fetching matching creator profile: ", err);
          handleFirestoreError(err, OperationType.GET, `users/${urlCreatorId}`);
        }
      };
      fetchCreatorProfile();
    } else {
      setMatchedCreatorProfile(null);
    }
  }, [urlCreatorId]);

  // 4. Real-time sync links list
  useEffect(() => {
    setLoading(true);
    let q = query(collection(db, "affiliateLinks"));

    // If viewing a specific creator's directory, restrict queries to their links
    if (urlCreatorId) {
      q = query(collection(db, "affiliateLinks"), where("userId", "==", urlCreatorId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AffiliateLink[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AffiliateLink);
        });

        // If DB has custom results, use them; if looking at global view and it is empty, we fall back to some static DEMO widgets
        if (list.length === 0 && !urlCreatorId) {
          const dummyDeals = DEMO_PRESETS.map((p, index) => ({
            id: `demo-${index}`,
            userId: "demo-creator",
            ...p,
            isArchived: false,
            createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
          })) as AffiliateLink[];
          setAllDeals(dummyDeals);
        } else {
          setAllDeals(list);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Firestore onSnapshot error: ", error);
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, "affiliateLinks");
      }
    );

    return unsubscribe;
  }, [urlCreatorId]);

  // 5. Affiliate Database Operations
  const handleAddDeal = async (dealData: any) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "affiliateLinks"), {
        userId: currentUser.uid,
        clicks: 0,
        createdAt: new Date().toISOString(),
        isArchived: false,
        ...dealData,
      });
    } catch (error) {
      console.error("Failed to add new link: ", error);
      handleFirestoreError(error, OperationType.CREATE, "affiliateLinks");
    }
  };

  const handleUpdateDeal = async (dealId: string, updatedFields: Partial<AffiliateLink>) => {
    try {
      const dealRef = doc(db, "affiliateLinks", dealId);
      await updateDoc(dealRef, updatedFields);
    } catch (error) {
      console.error("Failed to modify link: ", error);
      handleFirestoreError(error, OperationType.UPDATE, `affiliateLinks/${dealId}`);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    try {
      // Instead of hard-deletion, we soft archive so that analytics stats persist for the admin
      const dealRef = doc(db, "affiliateLinks", dealId);
      await updateDoc(dealRef, { isArchived: true });
    } catch (error) {
      console.error("Failed to archive affiliate link: ", error);
      handleFirestoreError(error, OperationType.UPDATE, `affiliateLinks/${dealId}`);
    }
  };

  // 6. Clicks & Navigation Router Handlers (Safe ABAC Client-Side)
  const handleGoToLink = async (deal: AffiliateLink) => {
    // Increment total clicks state immediately for instant feedback
    setAllDeals((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, clicks: (d.clicks || 0) + 1 } : d))
    );

    // Save click increment directly in Firestore safely
    if (deal.id && !deal.id.startsWith("demo-")) {
      try {
        const docRef = doc(db, "affiliateLinks", deal.id);
        await updateDoc(docRef, {
          clicks: increment(1),
        });
      } catch (err) {
        console.error("Failed count update in Firestore: ", err);
        handleFirestoreError(err, OperationType.UPDATE, `affiliateLinks/${deal.id}`);
      }
    }

    // Open link in target frame
    window.open(deal.originalUrl, "_blank", "noopener,noreferrer");
    setSelectedDeal(null);
  };

  // 7. Profile Header branding updates
  const handleUpdateProfile = async (profileData: Partial<UserProfile>) => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, profileData, { merge: true });
      setCurrentUserProfile((prev) => (prev ? { ...prev, ...profileData } : null));
    } catch (error) {
      console.error("Failed to update branding header: ", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  // Clipboard share action
  const handleCopyPortalShare = () => {
    const spaceId = urlCreatorId || (currentUser ? currentUser.uid : "");
    const baseShareUrl = window.location.origin + (spaceId ? `?u=${spaceId}` : "");
    navigator.clipboard.writeText(baseShareUrl);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2000);
  };

  // Custom Active Header UI Calculations
  const activeHeader = useMemo(() => {
    if (matchedCreatorProfile) {
      return {
        title: matchedCreatorProfile.displayName,
        bio: matchedCreatorProfile.bio,
        user: matchedCreatorProfile,
      };
    }
    if (currentUserProfile && !urlCreatorId) {
      return {
        title: currentUserProfile.displayName,
        bio: currentUserProfile.bio,
        user: currentUserProfile,
      };
    }
    return {
      title: "Premium Affiliate Deals Hub",
      bio: "Instantly claim exclusive cashbacks, lifetime software trials, discount promos, and hardware bonuses. Verified by community creators.",
      user: null,
    };
  }, [matchedCreatorProfile, currentUserProfile, urlCreatorId]);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans antialiased flex flex-col justify-between">
      {/* Dynamic Header Navbar Section */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display font-extrabold text-base tracking-tight text-slate-900 leading-none block">
                RefDirect
              </span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-600 block mt-0.5">
                Listing & Reward Broker
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Share Portal Button */}
            <button
              id="header-share-portal-btn"
              onClick={handleCopyPortalShare}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {copiedShareLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span>Share Portal</span>
                </>
              )}
            </button>

            {/* Workspace Editor Trigger Toggle */}
            <button
              id="header-admin-toggle-btn"
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                isAdminMode
                  ? "bg-slate-900 border border-slate-950 text-white hover:bg-slate-850"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Settings2 className="h-4 w-4" />
              <span>{isAdminMode ? "Exit Workspace" : "Creator Portal"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {!isAdminMode ? (
          /* PUBLIC LISTING VIEW */
          <div className="space-y-8">
            {/* Big Welcome Header Block with Custom Creator Tag/Bio */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs text-center relative overflow-hidden max-w-3xl mx-auto">
              {/* Decorative side accent lines */}
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
              <div className="absolute right-0 top-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-emerald-50/50" />

              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-3">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Verified Referral Portal
              </span>

              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight">
                {activeHeader.title}
              </h1>

              <p className="text-slate-600 text-xs sm:text-sm mt-3 leading-relaxed max-w-2xl mx-auto">
                {activeHeader.bio}
              </p>

              {/* Share info box */}
              {urlCreatorId && matchedCreatorProfile && (
                <div className="mt-4 inline-flex items-center gap-1 rounded-xl bg-indigo-50/60 border border-indigo-100/30 px-3.5 py-1.5 text-[11px] font-semibold text-indigo-900">
                  <span>Currently viewing creator portfolio</span>
                  <Award className="h-3.5 w-3.5 text-indigo-600" />
                </div>
              )}
            </div>

            {/* Network directory grid loader */}
            {loading ? (
              <div className="text-center py-20">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-xs font-semibold text-slate-500">Retrieving reward offers...</p>
              </div>
            ) : (
              <DealsGrid deals={allDeals} onSelectDeal={setSelectedDeal} />
            )}
          </div>
        ) : (
          /* OWNER ADMIN WORKSPACE */
          <AdminPanel
            deals={allDeals.filter(deal => currentUser && deal.userId === currentUser.uid)}
            onAddDeal={handleAddDeal}
            onUpdateDeal={handleUpdateDeal}
            onDeleteDeal={handleDeleteDeal}
            currentUser={currentUser}
            userProfile={currentUserProfile}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </main>

      {/* Footer Credits and multi-user portal navigation links */}
      <footer className="border-t border-slate-100 bg-white/60 py-6 mt-12 text-center text-xs text-slate-400 font-sans space-y-4">
        <div className="flex items-center justify-center gap-1">
          <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
          <span>Powered securely with RefDirect Cloud-run Broker</span>
        </div>

        {/* Space navigation parameters demo link generator */}
        {!isAdminMode && !urlCreatorId && currentUserProfile && (
          <div className="max-w-md mx-auto bg-slate-50 border border-slate-100 p-2.5 rounded-2xl flex items-center justify-between text-[11px] font-medium text-slate-500 gap-2">
            <span>Visit your personal branded URL:</span>
            <a
              href={`?u=${currentUserProfile.uid}`}
              className="text-indigo-600 hover:underline font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-100 flex items-center gap-1"
            >
              <span>Branded Space</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </footer>

      {/* Focal Popup modal */}
      <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} onGoToLink={handleGoToLink} />
    </div>
  );
}
