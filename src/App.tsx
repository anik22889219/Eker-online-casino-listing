import React, { useState, useEffect, useMemo } from "react";
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate, 
  useSearchParams, 
  useNavigate, 
  Link 
} from "react-router-dom";
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
  getDoc,
  setDoc,
  increment,
} from "firebase/firestore";
import {
  Coins,
  Settings2,
  ExternalLink,
  Sparkles,
  Award,
  Heart,
  Check,
  RefreshCw,
  Share2,
} from "lucide-react";
import { AffiliateLink, UserProfile } from "./types";
import AdminPanel from "./components/AdminPanel";
import DealsGrid from "./components/DealsGrid";
import DealModal from "./components/DealModal";
import CasinoDetails from "./components/CasinoDetails";
import HomeView from "./components/home/HomeView";

// Predefined demo fallbacks if DB has no links yet, keeping the site looking magnificent
const DEMO_PRESETS = [
  {
    title: "Hostinger Web Hosting",
    name: "Hostinger Web Hosting",
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
    name: "Notion Premium Workspace",
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
    name: "Shopify Starter Package",
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
    name: "Ledger Hardware Secure Wallet",
    description: "Secure and isolate your valuable decentralized smart contracts, digital art collections, and Web3 crypto tokens.",
    category: "Tech",
    discountCode: "LEDSAVE",
    rewardText: "Get $10 BTC bonus directly into your account",
    ownerRewardText: "10% referral allocation",
    clicks: 42,
    slug: "ledger",
  },
];

// Router-connected wrapper
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  // Authentication & Directory Owners
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  // Directory UI filtering
  const [urlCreatorId, setUrlCreatorId] = useState<string | null>(null);
  const [matchedCreatorProfile, setMatchedCreatorProfile] = useState<UserProfile | null>(null);

  // States
  const [allDeals, setAllDeals] = useState<AffiliateLink[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<AffiliateLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // 1. Sync search parameters on load (supporting ?u=... legacy routing seamlessly)
  useEffect(() => {
    const uId = searchParams.get("u") || searchParams.get("user") || searchParams.get("creator");
    if (uId) {
      setUrlCreatorId(uId);
    }
  }, [searchParams]);

  // 2. Auth State Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profileRef = doc(db, "users", user.uid);
          const snap = await getDoc(profileRef);
          if (snap.exists()) {
            setCurrentUserProfile({ uid: user.uid, ...snap.data() } as UserProfile);
          } else {
            const tempProfile: Omit<UserProfile, "uid"> = {
              email: user.email || "anonymous-owner@directory.com",
              displayName: user.displayName || "My Premium Directory",
              role: "admin",
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            // Add custom bio to match legacy schema
            const bioData = {
              ...tempProfile,
              bio: "Get exclusive discount codes, promo links, and custom deals on my favorite SaaS, web hosting, and hardware platforms below!",
            };
            await setDoc(profileRef, bioData);
            setCurrentUserProfile({ uid: user.uid, ...bioData } as unknown as UserProfile);
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
            setMatchedCreatorProfile({ uid: urlCreatorId, ...res.data() } as unknown as UserProfile);
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

    if (urlCreatorId) {
      q = query(collection(db, "affiliateLinks"), where("userId", "==", urlCreatorId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AffiliateLink[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          list.push({ 
            id: docSnap.id, 
            name: raw.title || raw.name || "",
            title: raw.title || raw.name || "",
            url: raw.originalUrl || raw.url || "",
            originalUrl: raw.originalUrl || raw.url || "",
            ...raw 
          } as AffiliateLink);
        });

        if (list.length === 0 && !urlCreatorId) {
          const dummyDeals = DEMO_PRESETS.map((p, index) => ({
            id: `demo-${index}`,
            userId: "demo-creator",
            ...p,
            isArchived: false,
            status: "active",
            commission: p.ownerRewardText,
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
        status: "active",
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
      const dealRef = doc(db, "affiliateLinks", dealId);
      await updateDoc(dealRef, { isArchived: true });
    } catch (error) {
      console.error("Failed to archive affiliate link: ", error);
      handleFirestoreError(error, OperationType.UPDATE, `affiliateLinks/${dealId}`);
    }
  };

  // 6. Clicks & Navigation Router Handlers
  const handleGoToLink = async (deal: AffiliateLink) => {
    setAllDeals((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, clicks: (d.clicks || 0) + 1 } : d))
    );

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

    window.open(deal.originalUrl, "_blank", "noopener,noreferrer");
    setSelectedDeal(null);
  };

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

  const handleCopyPortalShare = () => {
    const spaceId = urlCreatorId || (currentUser ? currentUser.uid : "");
    const baseShareUrl = window.location.origin + (spaceId ? `?u=${spaceId}` : "");
    navigator.clipboard.writeText(baseShareUrl);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2000);
  };

  const activeHeader = useMemo(() => {
    if (matchedCreatorProfile) {
      return {
        title: (matchedCreatorProfile as any).displayName,
        bio: (matchedCreatorProfile as any).bio,
        user: matchedCreatorProfile,
      };
    }
    if (currentUserProfile && !urlCreatorId) {
      return {
        title: (currentUserProfile as any).displayName,
        bio: (currentUserProfile as any).bio,
        user: currentUserProfile,
      };
    }
    return {
      title: "Premium Affiliate Deals Hub",
      bio: "Instantly claim exclusive cashbacks, lifetime software trials, discount promos, and hardware bonuses. Verified by community creators.",
      user: null,
    };
  }, [matchedCreatorProfile, currentUserProfile, urlCreatorId]);

  // Universal layout helper
  const renderLayout = (content: React.ReactNode, hideHeader = false, hideFooter = false) => {
    return (
      <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans antialiased flex flex-col justify-between">
        {!hideHeader && (
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-sans font-black text-base tracking-tight text-slate-900 leading-none block">
                    Eker Listings
                  </span>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-indigo-600 block mt-0.5">
                    Verified Casino Broker
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-3">
                {currentUser && (
                  <div className="flex items-center gap-2 border-r border-slate-200 pr-3 hidden md:flex">
                    {currentUser.photoURL ? (
                      <img
                        id="user-avatar-img"
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || "User"}
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-full border border-slate-200 shadow-xs"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-800 flex items-center justify-center text-xs font-bold font-mono border border-indigo-200 shadow-xs">
                        {(currentUser.displayName || currentUser.email || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="text-left leading-tight">
                      <div className="text-xs font-bold text-slate-800 max-w-[120px] truncate">
                        {(currentUserProfile as any)?.displayName || currentUser.displayName || "Creator Admin"}
                      </div>
                      <div className="text-[10px] text-slate-400 max-w-[120px] truncate">
                        {currentUser.email || "Sandbox Owner"}
                      </div>
                    </div>
                  </div>
                )}

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

                <button
                  id="header-admin-toggle-btn"
                  onClick={() => navigate(currentUser ? "/admin" : "/login")}
                  className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
                >
                  <Settings2 className="h-4 w-4" />
                  <span>Creator Portal</span>
                </button>
              </div>
            </div>
          </header>
        )}

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {content}
        </main>

        {!hideFooter && (
          <footer className="border-t border-slate-100 bg-white/60 py-6 mt-12 text-center text-xs text-slate-400 font-sans space-y-4">
            <div className="flex items-center justify-center gap-1">
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
              <span>Powered securely with RefDirect Cloud-run Broker</span>
            </div>

            {!urlCreatorId && currentUserProfile && (
              <div className="max-w-md mx-auto bg-slate-50 border border-slate-100 p-2.5 rounded-2xl flex items-center justify-between text-[11px] font-medium text-slate-500 gap-2">
                <span>Visit your personal branded URL:</span>
                <Link
                  to={`/?u=${currentUserProfile.uid}`}
                  className="text-indigo-600 hover:underline font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-100 flex items-center gap-1"
                >
                  <span>Branded Space</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </footer>
        )}

        <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} onGoToLink={handleGoToLink} />
      </div>
    );
  };

  return (
    <Routes>
      {/* 1. HOME CATALOG PATH */}
      <Route path="/" element={renderLayout(
        <HomeView />,
        false,
        true
      )} />

      {/* 2. DETAILED LANDING OVERVIEW PAGE (Task 2) */}
      <Route path="/casino/:slug" element={renderLayout(
        <CasinoDetails deals={allDeals} onGoToLink={handleGoToLink} />,
        false,
        true
      )} />

      {/* 3. SECURE AUTHORIZED GATE */}
      <Route path="/login" element={
        currentUser ? (
          <Navigate to="/admin" replace />
        ) : (
          renderLayout(
            <div className="flex items-center justify-center py-10">
              <AdminPanel
                deals={allDeals}
                onAddDeal={handleAddDeal}
                onUpdateDeal={handleUpdateDeal}
                onDeleteDeal={handleDeleteDeal}
                currentUser={currentUser}
                userProfile={currentUserProfile}
                onUpdateProfile={handleUpdateProfile}
              />
            </div>
          )
        )
      } />

      {/* 4. MASTER ADMIN DESKTOP WORKSPACE */}
      <Route path="/admin" element={
        currentUser ? (
          <AdminPanel
            deals={allDeals.filter(deal => currentUser && deal.userId === currentUser.uid)}
            onAddDeal={handleAddDeal}
            onUpdateDeal={handleUpdateDeal}
            onDeleteDeal={handleDeleteDeal}
            currentUser={currentUser}
            userProfile={currentUserProfile}
            onUpdateProfile={handleUpdateProfile}
          />
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      {/* 5. 404 NOT FOUND */}
      <Route path="*" element={renderLayout(
        <div className="text-center py-24 space-y-4">
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">404</h2>
          <p className="text-base text-slate-500 font-medium">We couldn't locate that page</p>
          <div className="pt-2">
            <Link to="/">
              <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer">
                Return to Directory
              </button>
            </Link>
          </div>
        </div>
      )} />
    </Routes>
  );
}
