import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  addDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User,
} from "firebase/auth";
import { Casino, JackpotScreenshot, Review, Rating, Bonus } from "../types/firestore";
import { AffiliateLink } from "../types";
import ReactMarkdown from "react-markdown";
import SeoHelper from "./SeoHelper";
import { trackAffiliateClick, getOrCreateVisitorId } from "../services/ClickTrackingService";
import { uploadToCloudinary } from "../services/cloudinaryService";
import {
  ArrowLeft,
  Star,
  Globe,
  ShieldCheck,
  Check,
  X,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Flame,
  RefreshCw,
  Layers,
  MessageSquare,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Percent,
} from "lucide-react";

interface CasinoDetailsProps {
  deals?: AffiliateLink[];
  onGoToLink?: (deal: AffiliateLink) => void;
}

export const CasinoDetails: React.FC<CasinoDetailsProps> = ({ deals = [], onGoToLink }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Core Data States
  const [casino, setCasino] = useState<Casino | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBonuses, setActiveBonuses] = useState<Bonus[]>([]);
  const [relatedCasinos, setRelatedCasinos] = useState<Casino[]>([]);

  // User Review / Rating States
  const [reviews, setReviews] = useState<Review[]>([]);
  const [allRatings, setAllRatings] = useState<Rating[]>([]);
  const [userRating, setUserRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>("");
  const [reviewComment, setReviewComment] = useState<string>("");
  const [userExistingReview, setUserExistingReview] = useState<Review | null>(null);
  const [userExistingRating, setUserExistingRating] = useState<Rating | null>(null);

  // Action Banners
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 1. Auth Sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
    });
    return unsub;
  }, []);

  // 2. Fetch Casino details by slug
  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    const q = query(collection(db, "casinos"), where("slug", "==", slug), where("status", "==", "published"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          setCasino({ id: docSnap.id, ...docSnap.data() } as Casino);
          setLoading(false);
        } else {
          // Backwards compatibility fallback to deals array
          const foundDeal = deals.find((d) => d.slug === slug || d.id === slug);
          if (foundDeal) {
            setCasino({
              id: foundDeal.id,
              slug: foundDeal.slug || foundDeal.id,
              affiliateLink: foundDeal.originalUrl || foundDeal.url || "",
              casinoName: foundDeal.title || foundDeal.name || "",
              casinoLogo: foundDeal.imageUrl || "",
              bannerImage: "",
              shortDescription: foundDeal.description || "",
              landingContent: foundDeal.description || "",
              manualReview: foundDeal.description || "",
              welcomeBonus:
                foundDeal.rewardText ||
                "Exclusive offer code: " + (foundDeal.discountCode || "N/A"),
              category: foundDeal.category || "General",
              country: "Universal",
              seoTitle: foundDeal.title,
              metaDescription: foundDeal.description,
              keywords: [],
              status: "published",
              aiGenerated: false,
              featured: false,
              averageRating: 4.8,
              totalReviews: foundDeal.clicks || 0,
              createdAt: foundDeal.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as unknown as Casino);
          } else {
            setCasino(null);
          }
          setLoading(false);
        }
      },
      (err) => {
        console.warn("Error fetching casino detail:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [slug, deals]);

  // 3. Page Impression Tracking (Part 7: Real-time CTR calculation helper)
  useEffect(() => {
    if (!casino) return;

    const trackImpression = async () => {
      try {
        const anonymousVisitorId = getOrCreateVisitorId();
        await addDoc(collection(db, "pageViews"), {
          casinoId: casino.id,
          timestamp: new Date().toISOString(),
          anonymousVisitorId,
        });
      } catch (err) {
        console.warn("Could not log pageView impression:", err);
      }
    };

    trackImpression();
  }, [casino]);

  // 4. Load dynamic reviews, ratings, active bonuses, and screenshots for this casino
  useEffect(() => {
    if (!casino) return;

    // B. Related Casinos in same category (limit to 3)
    const qRelated = query(
      collection(db, "casinos"),
      where("category", "==", casino.category),
      where("status", "==", "published")
    );
    const unsubRelated = onSnapshot(qRelated, (snap) => {
      const list: Casino[] = [];
      snap.forEach((doc) => {
        const data = doc.data() as Casino;
        if (doc.id !== casino.id && !data.isDeleted) {
          list.push({ id: doc.id, ...data });
        }
      });
      setRelatedCasinos(list.slice(0, 3));
    });

    // C. Active Bonuses linked to this casino (Part 4)
    const qBonuses = query(
      collection(db, "bonuses"),
      where("casinoId", "==", casino.id),
      where("active", "==", true)
    );
    const unsubBonuses = onSnapshot(qBonuses, (snap) => {
      const list: Bonus[] = [];
      snap.forEach((doc) => {
        const b = { id: doc.id, ...doc.data() } as Bonus;
        // Verify expiryDate client-side gracefully if present
        if (!b.expiryDate || new Date(b.expiryDate) >= new Date()) {
          list.push(b);
        }
      });
      setActiveBonuses(list);
    });

    // D. User Reviews for this casino (Part 2: approved reviews visible to public)
    const qReviews = query(
      collection(db, "reviews"),
      where("casinoId", "==", casino.id),
      where("approved", "==", true)
    );
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      const list: Review[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Review);
      });
      setReviews(list);
    });

    // E. User Ratings (Part 1: all ratings used to calculate dynamic average live)
    const qRatings = query(
      collection(db, "ratings"),
      where("casinoId", "==", casino.id)
    );
    const unsubRatings = onSnapshot(qRatings, (snap) => {
      const list: Rating[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as Rating);
      });
      setAllRatings(list);
    });

    return () => {
      unsubRelated();
      unsubBonuses();
      unsubReviews();
      unsubRatings();
    };
  }, [casino]);

  // 5. Track if the current logged-in user already rated/reviewed this casino
  useEffect(() => {
    if (!currentUser || !casino) {
      setUserExistingReview(null);
      setUserExistingRating(null);
      return;
    }

    const matchedReview = reviews.find((r) => r.userId === currentUser.uid);
    const matchedRating = allRatings.find((r) => r.userId === currentUser.uid);

    if (matchedReview) {
      setUserExistingReview(matchedReview);
      setReviewTitle(matchedReview.title);
      setReviewComment(matchedReview.comment);
    } else {
      setUserExistingReview(null);
      setReviewTitle("");
      setReviewComment("");
    }

    if (matchedRating) {
      setUserExistingRating(matchedRating);
      setUserRating(matchedRating.rating);
    } else {
      setUserExistingRating(null);
      setUserRating(5);
    }
  }, [currentUser, casino, reviews, allRatings]);

  // Compute Dynamic Live Ratings (extremely robust fallback if static averages aren't ready)
  const computedStats = useMemo(() => {
    if (allRatings.length === 0) {
      return {
        averageRating: casino?.averageRating || 4.8,
        totalReviews: casino?.totalReviews || 0,
      };
    }
    const sum = allRatings.reduce((acc, r) => acc + r.rating, 0);
    return {
      averageRating: Number((sum / allRatings.length).toFixed(1)),
      totalReviews: allRatings.length,
    };
  }, [allRatings, casino]);

  // Log in with Google popup helper
  const handleGoogleSignIn = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setActionSuccess("Successfully signed in!");
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to sign in. Please verify your internet connection.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Submit User Rating & Review (Part 1 & 2)
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !casino) return;

    if (!reviewTitle || !reviewComment) {
      setActionError("Please enter a review title and comment.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // A. Write Rating to Firestore
      const ratingDocId = `${currentUser.uid}_${casino.id}`;
      const ratingRef = doc(db, "ratings", ratingDocId);
      const ratingData: Rating = {
        casinoId: casino.id,
        userId: currentUser.uid,
        rating: userRating,
        createdAt: userExistingRating?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(ratingRef, ratingData);

      // B. Write Review to Firestore (approved starts as false as per specifications)
      if (userExistingReview) {
        // Update existing review doc
        const reviewRef = doc(db, "reviews", userExistingReview.id);
        await updateDoc(reviewRef, {
          title: reviewTitle,
          comment: reviewComment,
          rating: userRating,
          // Re-evaluation leaves approved status intact or resets to false for re-moderation
          approved: false, 
        });
        setActionSuccess("Your review has been updated and placed in the moderation queue.");
      } else {
        // Create new review doc (must have exactly 7 keys upon create to pass validation rules)
        const reviewsColRef = collection(db, "reviews");
        await addDoc(reviewsColRef, {
          casinoId: casino.id,
          userId: currentUser.uid,
          rating: userRating,
          title: reviewTitle,
          comment: reviewComment,
          approved: false, // Must start unapproved
          createdAt: new Date().toISOString(),
        });
        setActionSuccess("Thank you! Your review has been submitted and is awaiting moderator verification.");
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to submit review due to security policy rules.");
    } finally {
      setActionLoading(false);
    }
  };

  // Visit Affiliate link
  const handleVisitClick = () => {
    if (!casino) return;
    trackAffiliateClick(casino.id, casino.casinoName);

    if (onGoToLink) {
      onGoToLink({
        id: casino.id,
        title: casino.casinoName,
        name: casino.casinoName,
        originalUrl: casino.affiliateLink,
        url: casino.affiliateLink,
      } as any);
    } else {
      window.open(casino.affiliateLink, "_blank", "noopener,noreferrer");
    }
  };

  // Filter approved reviews for public rendering and parse any sell request attributes
  const approvedReviews = useMemo(() => {
    return reviews
      .filter((r) => r.approved)
      .map((r) => {
        const isSellRequest = r.title && r.title.startsWith("Verified Win:");
        let displayName = "Verified Player";
        let displayTitle = r.title;

        if (isSellRequest) {
          const parts = r.title.split(" | By ");
          if (parts.length > 1) {
            displayName = parts[1];
            displayTitle = parts[0];
          }
        }

        return {
          ...r,
          isSellRequest,
          displayName,
          displayTitle,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reviews]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-650" />
        <span className="text-sm font-bold text-slate-500">Retrieving operator specifications...</span>
      </div>
    );
  }

  if (!casino) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-6">
        <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900">Operator Not Found</h2>
          <p className="text-xs font-semibold text-slate-500 leading-relaxed">
            The requested casino operator is not listed or has been removed from our directory.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  const features =
    casino?.keywords?.length && casino.keywords.length > 0
      ? casino.keywords
      : [
          "Fully licensed and legally vetted operator",
          "Instant payouts with verified security standards",
          "24/7 dedicated support desk with interactive live chat",
          "Supports multiple secure transaction methods",
        ];

  const pros = [
    "Exceptional payout rates validated by audit screenshots",
    "Exclusive bonuses for platform referrals",
    "Optimized mobile and desktop gaming experience",
  ];

  const cons = [
    "Welcome bonuses expire within 30 days of registration",
    "Verification guidelines require formal identity proofing",
  ];

  const faqs = [
    {
      q: `How do I claim the welcome bonus at ${casino?.casinoName}?`,
      a: `Simply click the 'Claim Bonus & Visit Casino' button. This redirects you directly to the verified signup portal where the promotion is active. No manual coupon input is required unless specifically listed.`,
    },
    {
      q: "Is playing at this casino safe?",
      a: `Yes. ${casino?.casinoName} is a licensed brand, verified through our thorough vetting process for fairness, payment speed, and regulatory compliance.`,
    },
  ];

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "GameServer",
      name: casino?.casinoName,
      image: casino?.casinoLogo,
    },
    author: {
      "@type": "Organization",
      name: "Eker Casino Listings",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: computedStats.averageRating,
      bestRating: "5",
    },
    reviewBody: casino?.shortDescription || casino?.metaDescription,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-10 animate-fade-in font-sans">
      <SeoHelper
        title={`${casino.casinoName} Review & Signup Bonus`}
        description={
          casino.metaDescription ||
          `Read expert reviews on ${casino.casinoName}, get exclusive welcome bonuses of ${casino.welcomeBonus}, and verify jackpot win slips.`
        }
        keywords={
          casino.keywords || [
            casino.casinoName,
            "welcome bonus",
            "manual review",
            "related casinos",
          ]
        }
        image={casino.casinoLogo}
        schemaJson={schemaJson}
      />

      {/* Back button */}
      <button
        id="back-to-directory-btn"
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Directory
      </button>

      {/* Alert toasts feedback banner */}
      {(actionSuccess || actionError || actionLoading) && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
            actionError
              ? "bg-red-50 border-red-100 text-red-800"
              : actionLoading
              ? "bg-indigo-50 border-indigo-100 text-indigo-850"
              : "bg-emerald-50 border-emerald-100 text-emerald-800"
          }`}
        >
          {actionLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          ) : actionError ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          )}
          <span className="text-xs font-semibold flex-1">{actionSuccess || actionError || "Connecting to secure blockchain database..."}</span>
          <button onClick={() => { setActionSuccess(null); setActionError(null); }} className="text-slate-400 p-1 rounded-full hover:bg-slate-200/50">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Premium Hero Banner Block */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-slate-900 text-white shadow-xl">
        <div className="absolute inset-0 h-full w-full">
          {casino.bannerImage ? (
            <img src={casino.bannerImage} alt="" className="h-full w-full object-cover opacity-25" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 pt-24">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-20 w-20 rounded-2xl bg-white p-2 border border-slate-100 shadow-lg overflow-hidden shrink-0 flex items-center justify-center">
              {casino.casinoLogo ? (
                <img src={casino.casinoLogo} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <span className="font-black text-2xl text-slate-800">{casino.casinoName.substring(0, 2)}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-white leading-none">
                  {casino.casinoName}
                </h1>
                {casino.featured && (
                  <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                    <Flame className="h-3 w-3 fill-amber-950" /> Featured
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-300 text-xs">
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-indigo-400" /> {casino.country}
                </span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  {casino.category}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`h-3.5 w-3.5 ${
                          idx < Math.round(computedStats.averageRating)
                            ? "fill-amber-400"
                            : "text-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-extrabold text-white">{computedStats.averageRating}</span>
                  <span className="text-slate-400">({computedStats.totalReviews} player reviews)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={handleVisitClick}
              className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Visit & Claim {casino.welcomeBonus}</span>
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns (Main Content & Sidebar widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Col (2 Columns wide) */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Active Bonuses promotions section (Part 4) */}
          {activeBonuses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Percent className="h-5.5 w-5.5 text-indigo-600" />
                <h3 className="font-sans font-black text-slate-900 text-base sm:text-lg">Active Promotions & Codes</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeBonuses.map((b) => (
                  <div key={b.id} className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[9px] font-black uppercase text-indigo-700 tracking-wider">
                          {b.bonusType}
                        </span>
                        {b.expiryDate && (
                          <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1 font-mono">
                            <Calendar className="h-3 w-3" /> Expiry: {new Date(b.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <h4 className="font-sans font-black text-slate-950 text-sm leading-tight">{b.title}</h4>
                      <p className="text-xs text-slate-500 leading-normal italic">"{b.description}"</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
                      <span className="text-xs font-black text-indigo-800">Value: {b.amount.toLocaleString()}+</span>
                      <button onClick={handleVisitClick} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase rounded-lg transition">
                        Claim Code
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expert Manual Review text block */}
          {casino.manualReview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <ShieldCheck className="h-5.5 w-5.5 text-indigo-600" />
                <h2 className="font-sans font-black text-slate-900 text-base sm:text-lg">Expert Review & Vetting</h2>
              </div>
              <div className="markdown-body prose prose-sm max-w-none text-slate-600 text-xs sm:text-sm leading-relaxed">
                <ReactMarkdown>{casino.manualReview}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Player Reviews & Ratings Vetting Desk (Part 1 & 2) */}
          {approvedReviews.length > 0 && (
            <div className="space-y-5 bg-white border border-slate-150 rounded-3xl p-5 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 shadow-xs">
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-sans font-black text-slate-900 text-sm sm:text-base leading-tight font-display">Player Testimonials & Ratings</h3>
                  <p className="text-[10px] font-semibold text-slate-400 leading-none">Vetted and verified community reviews</p>
                </div>
              </div>

              {/* Public Approved Reviews List (Part 2) */}
              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Approved Player Reviews ({approvedReviews.length})</h5>

                <div className="space-y-4">
                  {approvedReviews.map((rev) => (
                    <div key={rev.id} className="bg-white border border-slate-150 rounded-2xl p-4 sm:p-5 hover:border-slate-300 transition duration-150 space-y-3.5 animate-fade-in shadow-xs">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <h6 className="font-sans font-black text-slate-900 text-xs sm:text-sm leading-snug">{(rev as any).displayTitle || rev.title}</h6>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold flex-wrap">
                            <span className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-slate-200">
                              {(rev as any).displayName || "Verified Player"}
                            </span>
                            <span className={`${(rev as any).isSellRequest ? "text-amber-700 bg-amber-50 border-amber-100" : "text-emerald-700 bg-emerald-50 border-emerald-100"} px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border flex items-center gap-0.5`}>
                              <CheckCircle className={`h-2.5 w-2.5 ${(rev as any).isSellRequest ? "text-amber-600" : "text-emerald-600"}`} />
                              {(rev as any).isSellRequest ? "Verified Win Seller" : "Verified Player"}
                            </span>
                            <span>•</span>
                            <span className="text-slate-400 font-medium">{new Date(rev.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-100 font-bold text-xs font-mono shadow-xs">
                          <span>{rev.rating}</span>
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 shrink-0" />
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed italic font-semibold pl-1.5 border-l-2 border-indigo-150">
                        "{rev.comment}"
                      </p>

                      {/* Render Jackpot and Balance screenshots inside the review if present */}
                      {(rev.jackpotScreenshot || rev.balanceScreenshot) && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          {rev.jackpotScreenshot && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Jackpot Screenshot</span>
                              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-32 flex items-center justify-center shadow-xs">
                                <img 
                                  src={rev.jackpotScreenshot} 
                                  alt="Jackpot win screenshot" 
                                  className="h-full w-full object-contain cursor-zoom-in hover:scale-102 transition duration-250"
                                  onClick={() => window.open(rev.jackpotScreenshot, "_blank")}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          )}
                          {rev.balanceScreenshot && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Balance Screenshot</span>
                              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-32 flex items-center justify-center shadow-xs">
                                <img 
                                  src={rev.balanceScreenshot} 
                                  alt="Balance proof screenshot" 
                                  className="h-full w-full object-contain cursor-zoom-in hover:scale-102 transition duration-250"
                                  onClick={() => window.open(rev.balanceScreenshot, "_blank")}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Col (1 Column wide): Features, Pros, Cons, FAQs */}
        <div className="space-y-6">
          {/* Features check list */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="font-sans font-black text-slate-900 text-sm uppercase tracking-wider">Operator Features</h3>
            <ul className="space-y-3.5 text-xs text-slate-600 font-semibold">
              {features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pros and Cons */}
          <div className="space-y-4">
            {/* Pros */}
            <div className="bg-emerald-50/15 border border-emerald-100 rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600" /> Key Pros
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 font-semibold">
                {pros.map((p, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-black text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                <X className="h-4 w-4 text-slate-400" /> Things to Note
              </h4>
              <ul className="space-y-2 text-xs text-slate-500 font-semibold">
                {cons.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="font-sans font-black text-slate-900 text-sm uppercase tracking-wider">Casino FAQ</h3>
            <div className="space-y-3.5">
              {faqs.map((faq, idx) => (
                <div key={idx} className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> {faq.q}
                  </h4>
                  <p className="text-[11px] text-slate-500 pl-4.5 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Related/Recommend list */}
      {relatedCasinos.length > 0 && (
        <div className="space-y-5 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="h-5.5 w-5.5 text-indigo-600" />
            <h3 className="font-sans font-black text-slate-900 text-lg sm:text-xl font-display">Related Operator Recommendations</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedCasinos.map((c) => (
              <div
                id={`related-card-${c.slug}`}
                key={c.id}
                className="group relative border border-slate-100 bg-white rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <h4 className="font-sans font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition truncate max-w-[240px]">
                      {c.casinoName}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{c.category}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-emerald-600 max-w-[160px] truncate">{c.welcomeBonus}</span>
                  <Link
                    to={`/casino/${c.slug}`}
                    className="inline-flex items-center gap-0.5 text-xs font-bold text-indigo-600 hover:underline shrink-0"
                  >
                    <span>Review</span>
                    <ArrowLeft className="h-3 w-3 rotate-180" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CasinoDetails;
