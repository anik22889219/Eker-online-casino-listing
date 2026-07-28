import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { 
  Trophy, 
  Star, 
  ArrowLeft, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  MessageSquare, 
  RefreshCw, 
  Building2, 
  ExternalLink,
  ChevronRight,
  Play,
  Image as ImageIcon,
  Upload,
  X,
  ZoomIn
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { db } from "../firebase";
import { collection, query, onSnapshot, addDoc } from "firebase/firestore";
import { MostWinningGameItem, AffiliateLink } from "../types/firestore";

export const slugifyGame = (name: string, id: string) => {
  if (!name || !name.trim()) return id;
  const slug = name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || id;
};

interface GameReview {
  id: string;
  gameId: string;
  gameName: string;
  userName: string;
  rating: number;
  comment: string;
  screenshotUrl?: string;
  createdAt: string;
}

export default function GameDetailView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [game, setGame] = useState<MostWinningGameItem | null>(null);
  const [allGameReviews, setAllGameReviews] = useState<GameReview[]>([]);
  const [casinos, setCasinos] = useState<AffiliateLink[]>([]);

  // Review Form States
  const [userName, setUserName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Find game by slug or id
  useEffect(() => {
    const games = theme?.mostWinningGames || [];
    if (!slug) return;

    const matched = games.find(
      (g) => slugifyGame(g.name, g.id) === slug || g.id === slug || g.name.toLowerCase() === slug.toLowerCase()
    );

    if (matched) {
      setGame(matched);
    } else {
      setGame(null);
    }
  }, [slug, theme?.mostWinningGames]);

  // Load reviews from Firestore
  useEffect(() => {
    if (!game) return;

    const q = query(collection(db, "game_reviews"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: GameReview[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.gameId === game.id || data.gameName === game.name) {
          list.push({
            id: docSnap.id,
            gameId: data.gameId || game.id,
            gameName: data.gameName || game.name,
            userName: data.userName || "Anonymous",
            rating: Number(data.rating) || 5,
            comment: data.comment || "",
            screenshotUrl: data.screenshotUrl || "",
            createdAt: data.createdAt ? (data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : data.createdAt) : new Date().toISOString()
          });
        }
      });
      setAllGameReviews(list);
    });

    return () => unsub();
  }, [game]);

  // Handle Review Screenshot Upload to Cloudinary
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingScreenshot(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", "game_reviews");

      const response = await fetch("/api/upload-cloudinary", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          setScreenshotUrl(data.url);
        }
      } else {
        alert("স্ক্রিনশট আপলোড ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      console.error("Screenshot upload error:", err);
      alert("স্ক্রিনশট আপলোড করতে সমস্যা হয়েছে।");
    } finally {
      setUploadingScreenshot(false);
    }
  };

  // Load casinos for recommendations
  useEffect(() => {
    const q = query(collection(db, "affiliateLinks"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: AffiliateLink[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AffiliateLink;
        if (!data.isArchived) {
          list.push({ ...data, id: docSnap.id });
        }
      });
      setCasinos(list);
    });

    return () => unsub();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!game) return;

    if (!userName.trim() || !comment.trim()) {
      setSubmitError("অনুগ্রহ করে আপনার নাম এবং মতামত প্রদান করুন।");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      await addDoc(collection(db, "game_reviews"), {
        gameId: game.id,
        gameName: game.name,
        userName: userName.trim(),
        rating,
        comment: comment.trim(),
        screenshotUrl: screenshotUrl || "",
        createdAt: new Date().toISOString()
      });

      setSubmitSuccess(true);
      setUserName("");
      setRating(5);
      setComment("");
      setScreenshotUrl("");
    } catch (err: any) {
      console.error("Error submitting game review:", err);
      setSubmitError(err.message || "রিভিউ সাবমিট করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = allGameReviews.length > 0
    ? (allGameReviews.reduce((acc, r) => acc + r.rating, 0) / allGameReviews.length).toFixed(1)
    : "5.0";

  if (!game) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl border border-amber-100 animate-pulse">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-800">গেমটি খুঁজে পাওয়া যায়নি</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          আপনার অন্বেষণকৃত গেমটি বর্তমানে উপলব্ধ নয় বা মুছে ফেলা হয়েছে।
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>হোম পেজে ফিরে যান</span>
        </Link>
      </div>
    );
  }

  const otherGames = (theme?.mostWinningGames || []).filter((g) => g.id !== game.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left animate-fade-in">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Link to="/" className="hover:text-indigo-600 transition flex items-center gap-1">
          <span>হোম (Home)</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-600">Most Winning Games</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-indigo-600 font-bold truncate">{game.name}</span>
      </div>

      {/* Main Hero Header Section */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden flex flex-col md:flex-row gap-6 items-center md:items-start justify-between">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left flex-1 min-w-0">
          {/* Logo */}
          <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl bg-slate-950 p-2 overflow-hidden shrink-0 border border-slate-200 shadow-md relative group">
            <img
              src={game.logoUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=300"}
              alt={game.name}
              className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent rounded-xl" />
          </div>

          {/* Title & Info */}
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/60 rounded-full text-amber-700 text-[10px] font-black uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                <span>Verified High Win Game</span>
              </div>
              {game.brandName && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200/60 rounded-full text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                  <span>Provider: {game.brandName}</span>
                </div>
              )}
            </div>

            <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 uppercase tracking-tight">
              {game.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">
              {game.name} আমাদের প্ল্যাটফর্মের অন্যতম শীর্ষ জনপ্রিয় জয়ী গেম। প্লেয়ারদের সতাক্স ও ভেরিফাইড রিভিউ অনুযায়ী এটি উচ্চ উইনিং পোটেনশিয়াল সম্পন্ন।
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1">
              <div className="flex items-center gap-1.5 text-amber-500 font-black text-sm">
                <Star className="w-4 h-4 fill-current" />
                <span>{avgRating}</span>
                <span className="text-slate-400 font-normal text-xs">({allGameReviews.length} রিভিউ)</span>
              </div>

              <div className="flex items-center gap-1 text-emerald-600 font-extrabold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Vetted Game</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="w-full md:w-auto shrink-0 flex flex-col gap-2">
          <a
            href="#recommended-casinos"
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase rounded-2xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>ক্যাসিনোতে খেলুন (Play Game)</span>
          </a>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>ফিরে যান (Back)</span>
          </button>
        </div>
      </div>

      {/* Grid: Left Column (Reviews & Details), Right Column (Top Casinos offering this game) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 cols */}
        <div className="lg:col-span-2 space-y-8">
          {/* Reviews & Feedback Section */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h2 className="font-display font-black text-slate-900 text-base uppercase tracking-tight flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>প্লেয়ার মতামত ও রিভিউ ({allGameReviews.length})</span>
                </h2>
                <p className="text-xs text-slate-400 font-semibold">
                  প্রকৃত প্লেয়ারদের অভিজ্ঞতা ও পারফরম্যান্স ফিডব্যাক
                </p>
              </div>
            </div>

            {/* Existing Reviews */}
            {allGameReviews.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50 space-y-2">
                <Sparkles className="w-6 h-6 text-indigo-400 mx-auto" />
                <p className="text-xs text-slate-500 font-bold uppercase">এখনো কোনো রিভিউ নেই।</p>
                <p className="text-[11px] text-slate-400">আপনার অভিজ্ঞতার ভিত্তিতে প্রথম রিভিউটি প্রদান করুন!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allGameReviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-slate-50/70 border border-slate-150 rounded-2xl space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-800 text-xs uppercase">{rev.userName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < rev.rating ? "fill-current" : "text-slate-200"}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-650 leading-relaxed font-medium">
                      {rev.comment}
                    </p>

                    {/* Optional Attached Win Screenshot */}
                    {rev.screenshotUrl && (
                      <div className="pt-1">
                        <div 
                          onClick={() => setPreviewImage(rev.screenshotUrl || null)}
                          className="relative inline-block group/img cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-black/5"
                        >
                          <img 
                            src={rev.screenshotUrl} 
                            alt="Win Screenshot" 
                            className="h-24 w-auto max-w-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span>বড় করে দেখুন</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Write a Review Form */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h3 className="font-display font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>আপনার নিজস্ব রিভিউ লিখুন (Write Your Review)</span>
              </h3>

              {submitSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs font-bold uppercase tracking-wide">
                    আপনার রিভিউটি সফলভাবে জমা করা হয়েছে! ধন্যবাদ।
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4 text-left">
                  {submitError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold">
                      {submitError}
                    </div>
                  )}

                  {/* Rating Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      রেটিং দিন (Rating)
                    </label>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const starVal = i + 1;
                        return (
                          <button
                            type="button"
                            key={i}
                            onClick={() => setRating(starVal)}
                            className="p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 transition-transform ${
                                starVal <= rating ? "text-amber-500 fill-current scale-110" : "text-slate-200"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Name Input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      আপনার নাম (Your Name)
                    </label>
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="আপনার নাম লিখুন..."
                      className="w-full px-3.5 py-2.5 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-800"
                    />
                  </div>

                  {/* Comment Input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      আপনার অভিজ্ঞতা / মতামত (Your Review)
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="এই গেমটি সম্পর্কে আপনার মতামত প্রকাশ করুন..."
                      className="w-full px-3.5 py-2.5 border border-slate-250 bg-slate-50/50 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 text-slate-800"
                    />
                  </div>

                  {/* Optional Review Screenshot Upload */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      উইন / উইনিং প্রুফ স্ক্রিনশট (Review Win Screenshot - Optional)
                    </label>

                    {screenshotUrl ? (
                      <div className="relative inline-block rounded-xl border border-slate-200 overflow-hidden bg-slate-100 p-1">
                        <img 
                          src={screenshotUrl} 
                          alt="Review Screenshot" 
                          className="h-20 w-auto object-cover rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setScreenshotUrl("")}
                          className="absolute top-1 right-1 p-1 bg-slate-900/80 text-white rounded-full hover:bg-rose-600 transition cursor-pointer"
                          title="রিমুভ করুন"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl hover:bg-slate-100/80 transition cursor-pointer text-slate-600 text-xs font-bold">
                        {uploadingScreenshot ? (
                          <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 text-indigo-600" />
                        )}
                        <span>{uploadingScreenshot ? "আপলোড হচ্ছে..." : "স্ক্রিনশট আপলোড করুন (Upload Image)"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotUpload}
                          disabled={uploadingScreenshot}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || uploadingScreenshot}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>রিভিউ জমা দিন (Submit Review)</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recommended Casinos where user can play this game */}
        <div className="space-y-6">
          <div id="recommended-casinos" className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-display font-black text-slate-900 text-sm uppercase tracking-tight flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>{game.name} খেলার সেরা ক্যাসিনো</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                ভেরিফাইড লিংক থেকে ক্যাসিনোতে যুক্ত হয়ে বোনাস পান
              </p>
            </div>

            {casinos.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                কোনো ক্যাসিনো তালিকাভুক্ত নেই।
              </div>
            ) : (
              <div className="space-y-3">
                {casinos.slice(0, 5).map((casino) => (
                  <div
                    key={casino.id}
                    className="p-3.5 bg-slate-50/80 border border-slate-150 rounded-2xl flex items-center justify-between gap-3 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                        {casino.imageUrl ? (
                          <img
                            src={casino.imageUrl}
                            alt={casino.title}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-800 text-xs truncate group-hover:text-indigo-600 transition-colors">
                          {casino.title || casino.name}
                        </h4>
                        <span className="text-[10px] text-emerald-600 font-bold block truncate">
                          {casino.rewardText || "Verified Partner"}
                        </span>
                      </div>
                    </div>

                    <a
                      href={casino.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <span>খেলুন</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Other Most Winning Games */}
          {otherGames.length > 0 && (
            <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="font-display font-black text-slate-900 text-sm uppercase tracking-tight flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>অন্যান্য জনপ্রিয় জয়ী গেম</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {otherGames.slice(0, 4).map((og) => (
                  <Link
                    key={og.id}
                    to={`/game/${slugifyGame(og.name, og.id)}`}
                    className="p-2.5 bg-slate-50 border border-slate-150 hover:border-indigo-300 rounded-2xl flex flex-col items-center text-center space-y-2 hover:bg-indigo-50/30 transition group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-slate-950 overflow-hidden border border-slate-200">
                      <img
                        src={og.logoUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200"}
                        alt={og.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="font-black text-[11px] text-slate-800 uppercase truncate w-full group-hover:text-indigo-600">
                      {og.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Previewing Screenshots */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-slate-800 text-white rounded-full hover:bg-rose-600 transition cursor-pointer z-10"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-2 max-h-[85vh] overflow-auto flex items-center justify-center w-full">
              <img 
                src={previewImage} 
                alt="Enlarged Screenshot" 
                className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
