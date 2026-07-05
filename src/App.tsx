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
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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
  Home,
  Search,
  BookOpen,
  Mail,
  ShieldCheck,
  ChevronDown,
  LayoutDashboard,
  Menu,
  Bell,
  User as UserIcon,
} from "lucide-react";
import { AffiliateLink, UserProfile, AppNotification } from "./types";
import AdminPanel from "./components/AdminPanel";
import DealsGrid from "./components/DealsGrid";
import DealModal from "./components/DealModal";
import CasinoDetails from "./components/CasinoDetails";
import HomeView from "./components/home/HomeView";
import { JackpotListing } from "./components/JackpotListing";
import BlogView from "./components/BlogView";
import ContactView from "./components/ContactView";
import UserProfileView from "./components/UserProfileView";
import { AdminSidebar } from "./components/admin/AdminSidebar";

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
  const [adminHeaderTitle, setAdminHeaderTitle] = useState("Admin Workspace");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [isSidebarOpenMobileGlobal, setIsSidebarOpenMobileGlobal] = useState(false);

  useEffect(() => {
    const handleToggle = () => {
      setIsSidebarOpenMobileGlobal((prev) => !prev);
    };
    window.addEventListener("toggle-admin-sidebar", handleToggle);
    return () => {
      window.removeEventListener("toggle-admin-sidebar", handleToggle);
    };
  }, []);

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.warn("Could not mark notification as read:", err);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const notif of unread) {
      try {
        await updateDoc(doc(db, "notifications", notif.id), { read: true });
      } catch (err) {
        console.warn("Could not mark all notifications as read:", err);
      }
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Admin user condition check
  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.email === "aminulhoqueanik@gmail.com") return true;
    const role = currentUserProfile?.role;
    return role === "admin" || role === "super_admin" || role === "moderator";
  }, [currentUser, currentUserProfile]);

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
            const data = snap.data();
            const isBootstrapAdmin = user.email === "aminulhoqueanik@gmail.com";
            if (isBootstrapAdmin && data.role !== "admin" && data.role !== "super_admin") {
              const updatedProfile = {
                ...data,
                role: "admin",
                updatedAt: new Date().toISOString()
              };
              await setDoc(profileRef, updatedProfile, { merge: true });
              setCurrentUserProfile({ uid: user.uid, ...updatedProfile } as unknown as UserProfile);
            } else {
              setCurrentUserProfile({ uid: user.uid, ...data } as UserProfile);
            }
          } else {
            const isBootstrapAdmin = user.email === "aminulhoqueanik@gmail.com";
            const tempProfile: Omit<UserProfile, "uid"> = {
              email: user.email || "anonymous-owner@directory.com",
              displayName: user.displayName || "My Premium Directory",
              role: isBootstrapAdmin ? "admin" : "user",
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

  // Auto Google Login trigger on website load
  useEffect(() => {
    const triggerAutoLogin = async () => {
      // Small graceful delay to let resources load first
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const hasPrompted = sessionStorage.getItem("hasAutoPromptedGoogleLogin");
      if (!auth.currentUser && !hasPrompted) {
        sessionStorage.setItem("hasAutoPromptedGoogleLogin", "true");
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
          await signInWithPopup(auth, provider);
        } catch (err: any) {
          console.warn("Auto Google login popup dismissed or closed:", err);
        }
      }
    };
    
    // Avoid triggering if we are already on the login page or admin tab to prevent UX disruption
    const path = window.location.pathname;
    if (path === "/" || path === "") {
      triggerAutoLogin();
    }
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

  // Real-time sync notifications list for current user
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const q = query(collection(db, "notifications"), where("userId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: AppNotification[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as AppNotification);
      });
      // Sort notifications by createdAt descending
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setNotifications(items);
    }, (error) => {
      console.warn("Error listening to notifications:", error);
    });
    return unsubscribe;
  }, [currentUser]);

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
  const renderLayout = (content: React.ReactNode, hideHeader = false, hideFooter = false, isFullWidth = false) => {
    const showGlobalSidebar = currentUser && isAdmin && !window.location.pathname.startsWith("/admin");

    const innerLayout = (
      <>
        {!hideHeader && (
          <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-xl border-b border-slate-200/50 shrink-0 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Hamburger menu for Admin Sidebar on Mobile */}
                {currentUser && isAdmin && (
                  <button
                    onClick={() => window.dispatchEvent(new Event('toggle-admin-sidebar'))}
                    className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition cursor-pointer"
                    aria-label="Open Admin Menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}

                <Link to="/" className="flex items-center gap-3 group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-indigo-700 text-white shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-display font-extrabold text-base tracking-tight text-slate-900 leading-none block">
                      Eker Listings
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-indigo-600 block mt-1">
                      {window.location.pathname.startsWith("/admin") ? "Admin Workspace" : "Verified Casino Broker"}
                    </span>
                  </div>
                </Link>

                {/* Show the active admin page tab title on desktop next to logo */}
                {window.location.pathname.startsWith("/admin") && (
                  <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100/50">
                      {adminHeaderTitle}
                    </span>
                  </div>
                )}

                {/* Desktop horizontal navigation links (Main Menu) */}
                <nav className="hidden md:flex items-center gap-1.5 ml-10 font-sans">
                  <Link
                    to="/"
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                      window.location.pathname === "/"
                        ? "text-indigo-600 bg-indigo-50/50"
                        : "text-slate-500 hover:text-slate-950 hover:bg-slate-50"
                    }`}
                  >
                    Home
                  </Link>

                  <Link
                    to="/blog"
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                      window.location.pathname === "/blog"
                        ? "text-indigo-600 bg-indigo-50/50"
                        : "text-slate-500 hover:text-slate-950 hover:bg-slate-50"
                    }`}
                  >
                    Blog
                  </Link>

                  {/* Conditions based on user role and authentication status */}
                  {currentUser && isAdmin ? (
                    <Link
                      to="/admin"
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        window.location.pathname.startsWith("/admin")
                          ? "text-indigo-600 bg-indigo-50/50"
                          : "text-slate-500 hover:text-slate-950 hover:bg-slate-50"
                      }`}
                    >
                      Creator Portal
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/contact"
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                          window.location.pathname === "/contact"
                            ? "text-indigo-600 bg-indigo-50/50"
                            : "text-slate-500 hover:text-slate-950 hover:bg-slate-50"
                        }`}
                      >
                        Contact Us
                      </Link>

                      {currentUser && (
                        <Link
                          to="/profile"
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                            window.location.pathname === "/profile"
                              ? "text-indigo-600 bg-indigo-50/50"
                              : "text-slate-500 hover:text-slate-950 hover:bg-slate-50"
                          }`}
                        >
                          Profile
                        </Link>
                      )}
                    </>
                  )}
                </nav>
              </div>

              <div className="flex items-center gap-3">
                {currentUser ? (
                  <>
                    {/* Real-time Notification Bell Icon & Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl relative transition cursor-pointer border border-slate-100 bg-white shadow-xs"
                        aria-label="Toggle notifications"
                      >
                        <Bell className="w-4 h-4 text-slate-500" />
                        {notifications.filter(n => !n.read).length > 0 && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse ring-2 ring-white" />
                        )}
                      </button>

                      {showNotificationDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowNotificationDropdown(false)} 
                          />
                          <div className="absolute right-0 mt-2 w-72 md:w-80 rounded-2xl bg-white border border-slate-150 shadow-xl z-50 p-2 text-left animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-900">Notifications ({notifications.filter(n => !n.read).length})</span>
                              {notifications.filter(n => !n.read).length > 0 && (
                                <button
                                  onClick={() => {
                                    handleMarkAllNotificationsAsRead();
                                    setShowNotificationDropdown(false);
                                  }}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                >
                                  Mark all as read
                                </button>
                              )}
                            </div>
                            <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-50">
                              {notifications.length === 0 ? (
                                <div className="px-3 py-6 text-center text-xs text-slate-400 italic">
                                  No notifications found
                                </div>
                              ) : (
                                notifications.map((notif) => (
                                  <div
                                    key={notif.id}
                                    onClick={async () => {
                                      await handleMarkNotificationAsRead(notif.id);
                                      setShowNotificationDropdown(false);
                                    }}
                                    className={`p-3 text-xs cursor-pointer hover:bg-slate-50/80 transition-colors flex gap-2.5 rounded-xl ${!notif.read ? 'bg-indigo-50/30' : ''}`}
                                  >
                                    <div className="mt-0.5 shrink-0">
                                      <span className={`w-2 h-2 rounded-full inline-block ${!notif.read ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                                    </div>
                                    <div className="space-y-0.5">
                                      <p className="font-bold text-slate-800 leading-tight">{notif.title}</p>
                                      <p className="text-slate-550 text-[11px] leading-snug">{notif.message}</p>
                                      <p className="text-[9px] font-mono text-slate-400 mt-1">
                                        {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : 'Just now'}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Google profile avatar & details - Clicking routes to /profile or /admin */}
                    <Link 
                      to={isAdmin ? "/admin" : "/profile"}
                      className="flex items-center gap-2 border-r border-slate-200 pr-3 hover:opacity-85 transition-opacity"
                    >
                      {currentUserProfile?.photoURL || currentUser.photoURL ? (
                        <img
                          id="user-avatar-img"
                          src={currentUserProfile?.photoURL || currentUser.photoURL}
                          alt={currentUserProfile?.displayName || currentUser.displayName || "User"}
                          referrerPolicy="no-referrer"
                          className="h-8 w-8 rounded-full border border-slate-200 shadow-xs object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-800 flex items-center justify-center text-xs font-bold font-mono border border-indigo-200 shadow-xs">
                          {(currentUserProfile?.displayName || currentUser.displayName || currentUser.email || "?")[0].toUpperCase()}
                        </div>
                      )}
                      
                      <div className="hidden md:block text-left leading-tight">
                        <div className="text-xs font-bold text-slate-800 max-w-[120px] truncate">
                          {currentUserProfile?.displayName || currentUser.displayName || "Eker User"}
                        </div>
                        <div className="text-[10px] text-slate-400 max-w-[120px] truncate">
                          {currentUser.email}
                        </div>
                      </div>
                    </Link>
                  </>
                ) : (
                  /* Premium Google Sign-In Button shown when logged out */
                  <button
                    onClick={async () => {
                      try {
                        const provider = new GoogleAuthProvider();
                        provider.setCustomParameters({ prompt: "select_account" });
                        await signInWithPopup(auth, provider);
                      } catch (err) {
                        console.error("Manual Google login failed:", err);
                      }
                    }}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-97 shrink-0"
                  >
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.111 4.113-3.414 0-6.173-2.76-6.173-6.173s2.76-6.173 6.173-6.173c1.55 0 2.964.57 4.053 1.503l3.05-3.048C19.317 2.115 16.035 1 12.24 1s-8.1 4.385-8.1 9.285 4.385 9.285 8.1 9.285c7.34 0 8.16-5.83 8.16-8.285h-8.16z"/>
                    </svg>
                    <span>Login with Google</span>
                  </button>
                )}


              </div>
            </div>
          </header>
        )}

        <main className={isFullWidth ? "flex-1 w-full flex overflow-hidden bg-slate-50" : "flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8"}>
          {content}
        </main>

        {!hideFooter && (
          <footer className="border-t border-slate-100 bg-white/60 py-6 mt-12 text-center text-xs text-slate-400 font-sans space-y-4">
            <div className="flex items-center justify-center gap-1">
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
              <span>Powered securely with RefDirect Cloud-run Broker</span>
            </div>

            {/* Direct quick footer links including Administration Login */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-bold text-slate-400">
              <Link to="/admin" className="hover:text-indigo-600 transition-colors">
                Administration Login
              </Link>
              <span className="text-slate-200">|</span>
              <Link to="/blog" className="hover:text-indigo-600 transition-colors">
                Chronicle Blog
              </Link>
              <span className="text-slate-200">|</span>
              <Link to="/contact" className="hover:text-indigo-600 transition-colors">
                Support Desk
              </Link>
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

        {/* Mobile Bottom Navigation - Elegant Tab bar */}
        {!hideHeader && (
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-150 h-16 flex md:hidden items-center justify-around px-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-safe">
            <Link
              to="/"
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${
                window.location.pathname === '/' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
              } transition-colors`}
            >
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>

            <Link
              to="/blog"
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${
                window.location.pathname === '/blog' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
              } transition-colors`}
            >
              <BookOpen className="h-5 w-5" />
              <span>Blog</span>
            </Link>

            {currentUser && isAdmin ? (
              <Link
                to="/admin"
                className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${
                  window.location.pathname.startsWith('/admin') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
                } transition-colors`}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span>Creator</span>
              </Link>
            ) : (
              <Link
                to="/contact"
                className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${
                  window.location.pathname === '/contact' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
                } transition-colors`}
              >
                <Mail className="h-5 w-5" />
                <span>Contact Us</span>
              </Link>
            )}
          </nav>
        )}
      </>
    );

    if (showGlobalSidebar) {
      return (
        <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans antialiased flex">
          {/* Global Admin Sidebar */}
          <AdminSidebar
            currentTab=""
            onTabChange={(tab) => {
              navigate(`/admin?tab=${tab}`);
              setIsSidebarOpenMobileGlobal(false);
            }}
            onLogout={async () => {
              try {
                await auth.signOut();
                navigate("/");
              } catch (err) {
                console.error("Signout error:", err);
              }
            }}
            isOpenMobile={isSidebarOpenMobileGlobal}
            onCloseMobile={() => setIsSidebarOpenMobileGlobal(false)}
          />

          {/* Right side container containing Header, Main, Footer */}
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {innerLayout}
          </div>
        </div>
      );
    }

    return (
      <div className={isFullWidth ? "h-screen flex flex-col overflow-hidden bg-slate-50/50 text-slate-800 font-sans antialiased" : "min-h-screen bg-slate-50/50 text-slate-800 font-sans antialiased flex flex-col justify-between"}>
        {innerLayout}
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

      {/* Jackpot Listing Submission Form */}
      <Route path="/jackpot-listing" element={renderLayout(
        <JackpotListing />,
        false,
        true
      )} />

      {/* 2. DETAILED LANDING OVERVIEW PAGE */}
      <Route path="/casino/:slug" element={renderLayout(
        <CasinoDetails deals={allDeals} onGoToLink={handleGoToLink} />,
        false,
        true
      )} />

      {/* Blog view */}
      <Route path="/blog" element={renderLayout(
        <BlogView />,
        false,
        true
      )} />

      {/* Contact view */}
      <Route path="/contact" element={renderLayout(
        <ContactView />,
        false,
        true
      )} />

      {/* Normal authenticated user Profile view */}
      <Route path="/profile" element={
        currentUser ? (
          renderLayout(
            <UserProfileView
              currentUser={currentUser}
              userProfile={currentUserProfile}
            />,
            false,
            true
          )
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      {/* 3. SECURE AUTHORIZED GATE */}
      <Route path="/login" element={
        currentUser ? (
          isAdmin ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/profile" replace />
          )
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
          isAdmin ? (
            renderLayout(
              <AdminPanel
                deals={allDeals}
                onAddDeal={handleAddDeal}
                onUpdateDeal={handleUpdateDeal}
                onDeleteDeal={handleDeleteDeal}
                currentUser={currentUser}
                userProfile={currentUserProfile}
                onUpdateProfile={handleUpdateProfile}
                onActiveTabTitleChange={setAdminHeaderTitle}
              />,
              false,
              true,
              true
            )
          ) : (
            <Navigate to="/profile" replace />
          )
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
