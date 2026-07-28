import React, { useState, useEffect, useMemo } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import {
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Search,
  Eye,
  Loader2,
  AlertCircle,
  X,
  MessageSquare,
  Image as ImageIcon,
  Check,
  Building2,
  Trophy,
  List,
  LayoutGrid,
  Pencil,
  Upload,
  Star,
  Save,
  Plus,
  UploadCloud,
  Gamepad2,
  ChevronDown,
} from "lucide-react";
import { Review, JackpotScreenshot, Casino } from "../../types/firestore";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { useTheme } from "../../context/ThemeContext";
import { LightboxImage } from "../ui/Lightbox";

export interface UnifiedWinSlip {
  id: string;
  source: "jackpotScreenshots" | "reviews";
  originalId: string;
  casinoId: string;
  image: string;
  amount?: number;
  approved: boolean;
  uploadedBy: string;
  uploadedAt: string;
  title?: string;
  comment?: string;
  type: "jackpot" | "balance" | "direct";
  gameName?: string;
  gameIcon?: string;
}

const DEFAULT_POPULAR_GAMES: { name: string; brandName?: string; logoUrl: string }[] = [];

interface GameSelectorProps {
  selectedGameName: string;
  selectedGameIcon?: string;
  onSelectGame: (gameName: string, gameIcon: string) => void;
  gamesList: { name: string; brandName?: string; logoUrl: string }[];
}

const GameSelector: React.FC<GameSelectorProps> = ({
  selectedGameName,
  selectedGameIcon,
  onSelectGame,
  gamesList,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const filteredGames = gamesList.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.brandName && g.brandName.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelectOption = (g: { name: string; brandName?: string; logoUrl: string }) => {
    onSelectGame(g.name, g.logoUrl);
    setIsCustom(false);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      onSelectGame(customInput.trim(), selectedGameIcon || "");
      setIsOpen(false);
    }
  };

  const selectedItem = gamesList.find(
    (g) => g.name.toLowerCase() === selectedGameName.toLowerCase()
  );

  return (
    <div className="relative">
      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
        Game Name (Listing Games)
      </label>

      {/* Selected Box / Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white hover:border-indigo-400 transition cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedGameIcon || selectedItem?.logoUrl ? (
            <img
              src={selectedGameIcon || selectedItem?.logoUrl}
              alt={selectedGameName || "Game Icon"}
              className="w-5 h-5 rounded-md object-cover border border-slate-200 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Gamepad2 className="w-4 h-4 text-indigo-500 shrink-0" />
          )}
          <span className="font-bold text-slate-800 text-xs truncate">
            {selectedGameName || "Select Game Name..."}
          </span>
          {selectedItem?.brandName && (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
              {selectedItem.brandName}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-2 max-h-64 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search game name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onSelectGame("", "");
                setIsOpen(false);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-100 text-left text-xs font-bold text-slate-500 flex items-center justify-between cursor-pointer"
            >
              <span>-- None / General Review --</span>
            </button>

            {filteredGames.map((g) => (
              <button
                key={g.name}
                type="button"
                onClick={() => handleSelectOption(g)}
                className={`w-full px-2.5 py-1.5 rounded-xl hover:bg-indigo-50/80 transition flex items-center justify-between cursor-pointer ${
                  selectedGameName.toLowerCase() === g.name.toLowerCase()
                    ? "bg-indigo-50 border border-indigo-200 font-bold"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <img
                    src={g.logoUrl}
                    alt={g.name}
                    className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-left truncate">
                    <div className="text-xs font-black text-slate-800 leading-tight truncate">
                      {g.name}
                    </div>
                    {g.brandName && (
                      <div className="text-[10px] font-semibold text-slate-400 leading-none">
                        {g.brandName}
                      </div>
                    )}
                  </div>
                </div>
                {selectedGameName.toLowerCase() === g.name.toLowerCase() && (
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            {!isCustom ? (
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className="w-full text-center py-1 text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                + Enter custom game name manually
              </button>
            ) : (
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Type custom game name..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ModerationManager: React.FC = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"reviews" | "screenshots">("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [screenshots, setScreenshots] = useState<JackpotScreenshot[]>([]);
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [sellRequests, setSellRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenshotsViewMode, setScreenshotsViewMode] = useState<"table" | "grid">("grid");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved">("all");
  const [selectedCasinoFilter, setSelectedCasinoFilter] = useState<string>("all");

  // Selected items for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Feedback states
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal display states
  const [selectedScreenshot, setSelectedScreenshot] = useState<UnifiedWinSlip | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: "review" | "screenshot";
    id: string;
    title: string;
    originalItem: any;
  } | null>(null);

  // Edit/Create Review State
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isNewReview, setIsNewReview] = useState<boolean>(false);
  const [reviewForm, setReviewForm] = useState({
    casinoId: "",
    casinoName: "",
    rating: 5,
    title: "",
    comment: "",
    approved: true,
    jackpotScreenshot: "",
    balanceScreenshot: "",
    gameName: "",
    gameIcon: "",
  });
  const [uploadingJackpot, setUploadingJackpot] = useState(false);
  const [uploadingBalance, setUploadingBalance] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

  // Edit Win Slip State
  const [editingWinSlip, setEditingWinSlip] = useState<UnifiedWinSlip | null>(null);
  const [winSlipForm, setWinSlipForm] = useState<{
    casinoId: string;
    amount: number | string;
    approved: boolean;
    image: string;
    gameName: string;
    gameIcon: string;
  }>({
    casinoId: "",
    amount: "",
    approved: true,
    image: "",
    gameName: "",
    gameIcon: "",
  });
  const [uploadingWinSlip, setUploadingWinSlip] = useState(false);
  const [savingWinSlip, setSavingWinSlip] = useState(false);

  // Games list from Theme Config & Firestore Collections
  const [themeGames, setThemeGames] = useState<any[]>([]);
  const [firestoreGames, setFirestoreGames] = useState<any[]>([]);

  useEffect(() => {
    const unsubTheme = onSnapshot(
      doc(db, "themeConfigs", "main"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.mostWinningGames && Array.isArray(data.mostWinningGames)) {
            setThemeGames(data.mostWinningGames);
          }
        }
      },
      (err) => console.warn("themeConfigs error:", err)
    );

    const unsubGamesCol = onSnapshot(
      collection(db, "games"),
      (snap) => {
        const list: any[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.name || data.title || data.gameName) {
            list.push({
              name: data.name || data.title || data.gameName,
              brandName: data.brandName || data.brand || data.provider || "",
              logoUrl: data.logoUrl || data.logo || data.imageUrl || data.image || "",
            });
          }
        });
        setFirestoreGames((prev) => {
          const map = new Map<string, any>();
          prev.forEach((item) => map.set(item.name.toLowerCase().trim(), item));
          list.forEach((item) => map.set(item.name.toLowerCase().trim(), item));
          return Array.from(map.values());
        });
      },
      (err) => console.warn("games col error:", err)
    );

    const unsubMwgCol = onSnapshot(
      collection(db, "most_winning_games"),
      (snap) => {
        const list: any[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.name || data.title || data.gameName) {
            list.push({
              name: data.name || data.title || data.gameName,
              brandName: data.brandName || data.brand || data.provider || "",
              logoUrl: data.logoUrl || data.logo || data.imageUrl || data.image || "",
            });
          }
        });
        setFirestoreGames((prev) => {
          const map = new Map<string, any>();
          prev.forEach((item) => map.set(item.name.toLowerCase().trim(), item));
          list.forEach((item) => map.set(item.name.toLowerCase().trim(), item));
          return Array.from(map.values());
        });
      },
      (err) => console.warn("most_winning_games col error:", err)
    );

    return () => {
      unsubTheme();
      unsubGamesCol();
      unsubMwgCol();
    };
  }, []);

  const allListingGames = useMemo(() => {
    const map = new Map<string, { name: string; brandName?: string; logoUrl: string }>();

    // 1. Add DEFAULT_POPULAR_GAMES
    DEFAULT_POPULAR_GAMES.forEach((g) => {
      if (g && g.name) {
        map.set(g.name.toLowerCase().trim(), g);
      }
    });

    // 2. Add games from theme (ThemeContext)
    (theme?.mostWinningGames || []).forEach((g) => {
      if (g && g.name) {
        const key = g.name.toLowerCase().trim();
        const existing = map.get(key);
        map.set(key, {
          name: g.name,
          brandName: g.brandName || existing?.brandName || "Listing Game",
          logoUrl: g.logoUrl || existing?.logoUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200",
        });
      }
    });

    // 3. Add games from themeGames state
    themeGames.forEach((g) => {
      if (g && g.name) {
        const key = g.name.toLowerCase().trim();
        const existing = map.get(key);
        map.set(key, {
          name: g.name,
          brandName: g.brandName || existing?.brandName || "Listing Game",
          logoUrl: g.logoUrl || existing?.logoUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200",
        });
      }
    });

    // 4. Add games from firestoreGames state (most_winning_games & games collections)
    firestoreGames.forEach((g) => {
      if (g && g.name) {
        const key = g.name.toLowerCase().trim();
        const existing = map.get(key);
        map.set(key, {
          name: g.name,
          brandName: g.brandName || existing?.brandName || "",
          logoUrl: g.logoUrl || existing?.logoUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200",
        });
      }
    });

    return Array.from(map.values());
  }, [theme?.mostWinningGames, themeGames, firestoreGames]);

  useEffect(() => {
    // 1. Load casinos
    const unsubCasinos = onSnapshot(
      collection(db, "casinos"),
      (snap) => {
        const list: Casino[] = [];
        snap.forEach((d) => {
          const data = d.data() as Casino;
          if (!data.isDeleted) {
            list.push({ id: d.id, ...data });
          }
        });
        setCasinos(list);
      },
      (err) => console.warn("casinos listener error:", err)
    );

    // 2. Load reviews in real-time
    const unsubReviews = onSnapshot(
      collection(db, "reviews"),
      (snap) => {
        const list: Review[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Review);
        });
        setReviews(list);
        setLoading(false);
      },
      (err) => {
        console.warn("reviews listener error:", err);
        setLoading(false);
      }
    );

    // 3. Load jackpot screenshots in real-time
    const unsubScreenshots = onSnapshot(
      collection(db, "jackpotScreenshots"),
      (snap) => {
        const list: JackpotScreenshot[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as JackpotScreenshot);
        });
        setScreenshots(list);
      },
      (err) => console.warn("jackpotScreenshots listener error:", err)
    );

    // 4. Load sell requests in real-time
    const unsubSellRequests = onSnapshot(
      collection(db, "sellRequests"),
      (snap) => {
        const list: any[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        setSellRequests(list);
      },
      (err) => console.warn("sellRequests listener error:", err)
    );

    return () => {
      unsubCasinos();
      unsubReviews();
      unsubScreenshots();
      unsubSellRequests();
    };
  }, []);

  const getCasinoName = (idOrReview: string | Review) => {
    const id = typeof idOrReview === "string" ? idOrReview : idOrReview.casinoId;
    const casino = casinos.find((c) => c.id === id);
    if (casino) return casino.casinoName;
    
    if (typeof idOrReview !== "string") {
      const rev = idOrReview as any;
      
      // 1. Check if we have a matching sell request by document id
      const sellReq = sellRequests.find((s) => s.id === rev.id);
      if (sellReq && sellReq.casinoName) {
        const cleanString = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        const matched = casinos.find(
          (c) => cleanString(c.casinoName) === cleanString(sellReq.casinoName) ||
                 cleanString(c.casinoName).includes(cleanString(sellReq.casinoName)) ||
                 cleanString(sellReq.casinoName).includes(cleanString(c.casinoName))
        );
        if (matched) return matched.casinoName;
        return sellReq.casinoName;
      }

      // 2. Fallback to review's embedded casinoName
      if (rev.casinoName) {
        const cleanString = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        const matched = casinos.find(
          (c) => cleanString(c.casinoName) === cleanString(rev.casinoName) ||
                 cleanString(c.casinoName).includes(cleanString(rev.casinoName)) ||
                 cleanString(rev.casinoName).includes(cleanString(c.casinoName))
        );
        if (matched) return matched.casinoName;
        return rev.casinoName;
      }

      // 3. Extrapolate from the review comment
      if (rev.comment && rev.comment.toLowerCase().includes("jackpot submission for")) {
        const parts = rev.comment.split(/jackpot submission for/i);
        if (parts.length > 1) {
          const possibleName = parts[1].trim();
          if (possibleName) {
            const cleanString = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
            const matched = casinos.find(
              (c) => cleanString(c.casinoName) === cleanString(possibleName) ||
                     cleanString(c.casinoName).includes(cleanString(possibleName)) ||
                     cleanString(possibleName).includes(cleanString(c.casinoName))
            );
            if (matched) return matched.casinoName;
            return possibleName;
          }
        }
      }
    }
    return "Unknown Casino";
  };

  const createNotification = async (userId: string, title: string, message: string, type: string) => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId,
        title,
        message,
        read: false,
        type,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Could not create notification (likely user is moderator, not admin):", err);
    }
  };

  // 1. Single Moderation actions
  const handleUnifiedStatus = async (item: UnifiedWinSlip, approved: boolean) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const docRef = doc(db, item.source, item.originalId);
      await updateDoc(docRef, { approved });
      
      setActionSuccess(`Jackpot screenshot proof has been successfully ${approved ? "approved" : "unapproved"}.`);

      // Trigger notification
      const prizeText = item.amount ? `$${item.amount.toLocaleString()}` : "Jackpot win proof";
      await createNotification(
        item.uploadedBy,
        approved ? "Jackpot Winner Verified!" : "Jackpot Slide Flagged",
        `Your winning screenshot of ${prizeText} has been ${approved ? "approved & shared in the gallery!" : "declined by moderation"}.`,
        approved ? "screenshot_approved" : "screenshot_rejected"
      );
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to update screenshot status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUnified = async (item: UnifiedWinSlip) => {
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, item.source, item.originalId));
      setActionSuccess("Screenshot win-record deleted permanently.");
      setSelectedIds(selectedIds.filter(selected => selected !== item.id));
    } catch (err: any) {
      setActionError(err.message || "Failed to delete record.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewStatus = async (review: Review, approved: boolean) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const docRef = doc(db, "reviews", review.id);
      await updateDoc(docRef, { approved });
      
      setActionSuccess(`Review has been successfully ${approved ? "approved" : "unapproved"}.`);

      // Trigger notification
      await createNotification(
        review.userId,
        approved ? "Review Approved!" : "Review Flagged",
        `Your review for ${getCasinoName(review.casinoId)} has been ${approved ? "approved & published" : "placed back into moderation"}.`,
        approved ? "review_approved" : "review_rejected"
      );
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to update review status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, "reviews", id));
      setActionSuccess("Review deleted permanently.");
      setSelectedIds(selectedIds.filter(selected => selected !== id));
    } catch (err: any) {
      setActionError(err.message || "Failed to delete review.");
    } finally {
      setActionLoading(false);
    }
  };

  // 1b. Edit / Create Review & Win Slip Handlers
  const handleOpenAddNewReview = () => {
    setIsNewReview(true);
    setEditingReview({
      id: "new",
      casinoId: casinos[0]?.id || "",
      userId: auth.currentUser?.uid || "admin",
      rating: 5,
      title: "",
      comment: "",
      approved: true,
      createdAt: new Date().toISOString(),
    });
    setReviewForm({
      casinoId: casinos[0]?.id || "",
      casinoName: casinos[0]?.casinoName || "",
      rating: 5,
      title: "",
      comment: "",
      approved: true,
      jackpotScreenshot: "",
      balanceScreenshot: "",
      gameName: "",
      gameIcon: "",
    });
  };

  const handleOpenEditReview = (rev: Review) => {
    setIsNewReview(false);
    setEditingReview(rev);
    setReviewForm({
      casinoId: rev.casinoId || "",
      casinoName: rev.casinoName || getCasinoName(rev.casinoId),
      rating: rev.rating || 5,
      title: rev.title || "",
      comment: rev.comment || "",
      approved: rev.approved ?? true,
      jackpotScreenshot: rev.jackpotScreenshot || "",
      balanceScreenshot: rev.balanceScreenshot || "",
      gameName: rev.gameName || "",
      gameIcon: rev.gameIcon || "",
    });
  };

  const handleSaveReviewEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;
    setSavingReview(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const selectedCasino = casinos.find((c) => c.id === reviewForm.casinoId);
      const resolvedCasinoName = selectedCasino
        ? selectedCasino.casinoName
        : reviewForm.casinoName || getCasinoName(reviewForm.casinoId);

      const payload = {
        casinoId: reviewForm.casinoId,
        casinoName: resolvedCasinoName,
        rating: Number(reviewForm.rating),
        title: reviewForm.title,
        comment: reviewForm.comment,
        approved: reviewForm.approved,
        jackpotScreenshot: reviewForm.jackpotScreenshot,
        balanceScreenshot: reviewForm.balanceScreenshot,
        gameName: reviewForm.gameName || "",
        gameIcon: reviewForm.gameIcon || "",
        updatedAt: new Date().toISOString(),
      };

      if (isNewReview) {
        await addDoc(collection(db, "reviews"), {
          ...payload,
          userId: auth.currentUser?.uid || "admin",
          createdAt: new Date().toISOString(),
        });
        setActionSuccess("New review submission created successfully!");
      } else {
        await updateDoc(doc(db, "reviews", editingReview.id), payload);
        setActionSuccess("Review submission updated successfully!");
      }

      setEditingReview(null);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to save review changes.");
    } finally {
      setSavingReview(false);
    }
  };

  const handleUploadReviewImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetField: "jackpotScreenshot" | "balanceScreenshot"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (targetField === "jackpotScreenshot") setUploadingJackpot(true);
    else setUploadingBalance(true);

    try {
      const url = await uploadToCloudinary(file, "user-submissions");
      setReviewForm((prev) => ({ ...prev, [targetField]: url }));
    } catch (err: any) {
      setActionError(`Failed to upload screenshot: ${err.message || err}`);
    } finally {
      if (targetField === "jackpotScreenshot") setUploadingJackpot(false);
      else setUploadingBalance(false);
    }
  };

  const handleOpenEditWinSlip = (slip: UnifiedWinSlip) => {
    if (slip.source === "reviews") {
      const rev = reviews.find((r) => r.id === slip.originalId);
      if (rev) {
        handleOpenEditReview(rev);
        return;
      }
    }

    setEditingWinSlip(slip);
    setWinSlipForm({
      casinoId: slip.casinoId || "",
      amount: slip.amount !== undefined ? slip.amount : "",
      approved: slip.approved ?? true,
      image: slip.image || "",
      gameName: slip.gameName || "",
      gameIcon: slip.gameIcon || "",
    });
  };

  const handleSaveWinSlipEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWinSlip) return;
    setSavingWinSlip(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const docRef = doc(db, editingWinSlip.source, editingWinSlip.originalId);
      await updateDoc(docRef, {
        casinoId: winSlipForm.casinoId,
        amount: Number(winSlipForm.amount) || 0,
        approved: winSlipForm.approved,
        image: winSlipForm.image,
        gameName: winSlipForm.gameName || "",
        gameIcon: winSlipForm.gameIcon || "",
        updatedAt: new Date().toISOString(),
      });
      setActionSuccess("Win slip record updated successfully!");
      setEditingWinSlip(null);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to save win slip edits.");
    } finally {
      setSavingWinSlip(false);
    }
  };

  const handleUploadWinSlipImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingWinSlip(true);
    try {
      const url = await uploadToCloudinary(file, "jackpots");
      setWinSlipForm((prev) => ({ ...prev, image: url }));
    } catch (err: any) {
      setActionError(`Failed to upload image: ${err.message || err}`);
    } finally {
      setUploadingWinSlip(false);
    }
  };

  // 2. Bulk Moderation actions
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      let count = 0;
      if (activeTab === "reviews") {
        for (const id of selectedIds) {
          const rev = reviews.find((r) => r.id === id);
          if (rev && !rev.approved) {
            await updateDoc(doc(db, "reviews", id), { approved: true });
            await createNotification(
              rev.userId,
              "Review Approved!",
              `Your review for ${getCasinoName(rev.casinoId)} has been approved.`,
              "review_approved"
            );
            count++;
          }
        }
      } else {
        for (const id of selectedIds) {
          const item = unifiedScreenshots.find((s) => s.id === id);
          if (item && !item.approved) {
            await updateDoc(doc(db, item.source, item.originalId), { approved: true });
            const prizeText = item.amount ? `$${item.amount.toLocaleString()}` : "Jackpot Proof";
            await createNotification(
              item.uploadedBy,
              "Winner Slip Approved!",
              `Your jackpot screenshot of ${prizeText} has been approved!`,
              "screenshot_approved"
            );
            count++;
          }
        }
      }
      setActionSuccess(`Successfully bulk-approved ${count} records!`);
      setSelectedIds([]);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Bulk approval failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      let count = 0;
      if (activeTab === "reviews") {
        for (const id of selectedIds) {
          const rev = reviews.find((r) => r.id === id);
          if (rev) {
            await updateDoc(doc(db, "reviews", id), { approved: false });
            count++;
          }
        }
      } else {
        for (const id of selectedIds) {
          const item = unifiedScreenshots.find((s) => s.id === id);
          if (item) {
            await updateDoc(doc(db, item.source, item.originalId), { approved: false });
            count++;
          }
        }
      }
      setActionSuccess(`Successfully rejected ${count} records.`);
      setSelectedIds([]);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Bulk rejection failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAllToggle = (items: any[]) => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  const handleSelectItemToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Reset selected ids on tab swap
  useEffect(() => {
    setSelectedIds([]);
    setSearchQuery("");
    setStatusFilter("all");
    setSelectedCasinoFilter("all");
  }, [activeTab]);

  // Combine screenshots and reviews that have screenshots
  const unifiedScreenshots: UnifiedWinSlip[] = useMemo(() => {
    const list: UnifiedWinSlip[] = [];

    // 1. Direct screenshots from jackpotScreenshots collection
    screenshots.forEach((s) => {
      list.push({
        id: `direct_${s.id}`,
        source: "jackpotScreenshots",
        originalId: s.id,
        casinoId: s.casinoId,
        image: s.image,
        amount: s.amount,
        approved: s.approved,
        uploadedBy: s.uploadedBy,
        uploadedAt: s.uploadedAt,
        type: "direct",
        gameName: s.gameName,
        gameIcon: s.gameIcon,
      });
    });

    // 2. Screenshots uploaded via reviews
    reviews.forEach((r) => {
      if (r.jackpotScreenshot) {
        list.push({
          id: `rev_jp_${r.id}`,
          source: "reviews",
          originalId: r.id,
          casinoId: r.casinoId,
          image: r.jackpotScreenshot,
          amount: undefined, // Reviews don't have explicit amounts, but they are win proofs
          approved: r.approved,
          uploadedBy: r.userId,
          uploadedAt: r.createdAt,
          title: r.title,
          comment: r.comment,
          type: "jackpot",
          gameName: r.gameName,
          gameIcon: r.gameIcon,
        });
      }
    });

    // Sort by uploadedAt / createdAt descending
    return list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [screenshots, reviews]);

  // Filters mapping
  const filteredReviews = reviews.filter((r) => {
    const matchedSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCasinoName(r).toLowerCase().includes(searchQuery.toLowerCase());
    const matchedStatus =
      statusFilter === "all" ||
      (statusFilter === "approved" && r.approved) ||
      (statusFilter === "pending" && !r.approved);
    const matchedCasino =
      selectedCasinoFilter === "all" || r.casinoId === selectedCasinoFilter;
    return matchedSearch && matchedStatus && matchedCasino;
  });

  const filteredScreenshots = useMemo(() => {
    return unifiedScreenshots.filter((s) => {
      const casinoName = getCasinoName(s.casinoId).toLowerCase();
      const matchedSearch =
        casinoName.includes(searchQuery.toLowerCase()) ||
        (s.amount !== undefined && s.amount.toString().includes(searchQuery)) ||
        (s.title !== undefined && s.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.comment !== undefined && s.comment.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchedStatus =
        statusFilter === "all" ||
        (statusFilter === "approved" && s.approved) ||
        (statusFilter === "pending" && !s.approved);

      const matchedCasino =
        selectedCasinoFilter === "all" || s.casinoId === selectedCasinoFilter;

      return matchedSearch && matchedStatus && matchedCasino;
    });
  }, [unifiedScreenshots, searchQuery, statusFilter, selectedCasinoFilter, casinos]);

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {(actionSuccess || actionError || actionLoading) && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
            actionError
              ? "bg-red-50 border-red-150 text-red-800"
              : actionLoading
              ? "bg-indigo-50 border-indigo-150 text-indigo-800"
              : "bg-emerald-50 border-emerald-150 text-emerald-800"
          }`}
        >
          {actionLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          ) : actionError ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          )}
          <span className="text-xs font-semibold flex-1">
            {actionLoading ? "Processing changes..." : actionSuccess || actionError}
          </span>
          <button
            onClick={() => {
              setActionSuccess(null);
              setActionError(null);
            }}
            className="p-1 rounded-full hover:bg-slate-200/30 text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Trust Moderation Deck Layout Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Tab selection */}
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto shrink-0">
          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "reviews"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Player Reviews ({reviews.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("screenshots")}
            className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "screenshots"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            <span>Win Slips ({unifiedScreenshots.length})</span>
          </button>
        </div>

        {/* Global Controls Filter bar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto md:justify-end">
          {activeTab === "screenshots" && (
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setScreenshotsViewMode("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  screenshotsViewMode === "grid"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Grid Gallery View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setScreenshotsViewMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  screenshotsViewMode === "table"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Table List View"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          )}

          <div className="relative flex-1 md:w-60">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-600"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
          </select>

                          {activeTab === "reviews" && (
                            <button
                              onClick={handleOpenAddNewReview}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                              title="Add new review submission"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Add Review</span>
                            </button>
                          )}

                          <select
                            value={selectedCasinoFilter}
                            onChange={(e) => setSelectedCasinoFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 text-slate-600 max-w-[160px] truncate"
                          >
            <option value="all">All Casinos</option>
            {casinos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.casinoName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-600 text-white rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in shadow-md">
          <span className="text-xs font-black">
            {selectedIds.length} item(s) selected for batch moderation
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkApprove}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition"
            >
              Bulk Approve
            </button>
            <button
              onClick={handleBulkReject}
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition"
            >
              Bulk Reject
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 text-indigo-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB PANEL 1: PLAYER REVIEWS MODERATION */}
      {activeTab === "reviews" && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          {filteredReviews.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <h4 className="font-display font-extrabold text-sm text-slate-700">No matching player reviews</h4>
              <p className="text-xs text-slate-500">Reviews submitted by registered players will render here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredReviews.length && filteredReviews.length > 0}
                        onChange={() => handleSelectAllToggle(filteredReviews)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="p-4">Brand Listing</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Review Body</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredReviews.map((rev) => (
                    <tr key={rev.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(rev.id)}
                          onChange={() => handleSelectItemToggle(rev.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-900">{getCasinoName(rev)}</span>
                          </div>
                          {rev.gameName && (
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-bold w-fit">
                              {rev.gameIcon ? (
                                <img
                                  src={rev.gameIcon}
                                  alt={rev.gameName}
                                  className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <Gamepad2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              )}
                              <span className="truncate max-w-[130px]">{rev.gameName}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-100 font-bold">
                          <span>{rev.rating}</span>
                          <span>★</span>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs md:max-w-md">
                        <div className="space-y-1">
                          <h5 className="font-bold text-slate-900 line-clamp-1">{rev.title}</h5>
                          <p className="text-slate-500 line-clamp-2 leading-relaxed italic">"{rev.comment}"</p>
                          
                          {/* Display uploaded proofs if present */}
                          {(rev.jackpotScreenshot || rev.balanceScreenshot) && (
                            <div className="flex items-center gap-2 pt-1.5">
                              {rev.jackpotScreenshot && (
                                <div className="flex items-center gap-1">
                                  <LightboxImage
                                    src={rev.jackpotScreenshot}
                                    title={`Jackpot Proof: ${getCasinoName(rev)}`}
                                    subtitle={rev.title}
                                    alt="Jackpot Proof"
                                    className="w-7 h-7 rounded-lg object-cover border border-indigo-200"
                                    showZoomBadge={false}
                                  />
                                  <span className="text-[10px] font-bold text-indigo-700">Jackpot</span>
                                </div>
                              )}
                              {rev.balanceScreenshot && (
                                <div className="flex items-center gap-1">
                                  <LightboxImage
                                    src={rev.balanceScreenshot}
                                    title={`Balance Proof: ${getCasinoName(rev)}`}
                                    subtitle={rev.title}
                                    alt="Balance Proof"
                                    className="w-7 h-7 rounded-lg object-cover border border-indigo-200"
                                    showZoomBadge={false}
                                  />
                                  <span className="text-[10px] font-bold text-indigo-700">Balance</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-400 font-mono font-bold text-[10px]">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize
                            ${
                              rev.approved
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                : "bg-amber-50 border-amber-100 text-amber-700 animate-pulse"
                            }`}
                        >
                          {rev.approved ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {rev.approved ? (
                            <button
                              onClick={() => handleReviewStatus(rev, false)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
                              title="Unapprove review"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReviewStatus(rev, true)}
                              className="p-1.5 rounded-lg border border-emerald-250 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                              title="Approve review"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditReview(rev)}
                            className="p-1.5 rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer transition"
                            title="Edit review submission"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmTarget({
                              type: "review",
                              id: rev.id,
                              title: rev.title || `Review by user`,
                              originalItem: rev
                            })}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Delete review"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB PANEL 2: PLAYER WIN SCREENSHOTS MODERATION */}
      {activeTab === "screenshots" && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          {filteredScreenshots.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <h4 className="font-display font-extrabold text-sm text-slate-700">No jackpot screenshots found</h4>
              <p className="text-xs text-slate-500">Player uploaded jackpot slips awaiting vetting appear here.</p>
            </div>
          ) : screenshotsViewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredScreenshots.map((scr) => (
                <div 
                  key={scr.id} 
                  className={`bg-white border rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between relative group ${
                    scr.approved ? "border-slate-200" : "border-amber-200 bg-amber-50/5"
                  }`}
                >
                  {/* Card Checkbox for Bulk Actions */}
                  <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-xs p-1.5 rounded-lg border border-slate-200/80 shadow-xs">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(scr.id)}
                      onChange={() => handleSelectItemToggle(scr.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    />
                  </div>

                  {/* Screenshot Image Container */}
                  <div 
                    className="relative h-48 bg-slate-950 flex items-center justify-center overflow-hidden cursor-zoom-in group"
                    onClick={() => setSelectedScreenshot(scr)}
                  >
                    <img 
                      src={scr.image} 
                      alt="Win proof screenshot" 
                      className="h-full w-full object-contain group-hover:scale-102 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-2">
                      <Eye className="h-5 w-5 text-white" />
                      <span className="text-white text-xs font-bold">View Fullscreen</span>
                    </div>
                    {/* Source Indicator Tag */}
                    <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase border shadow-xs ${
                      scr.source === "reviews" 
                        ? "bg-indigo-600 border-indigo-500 text-white" 
                        : "bg-amber-500 border-amber-400 text-slate-950"
                    }`}>
                      {scr.type === "jackpot" ? "Review: Jackpot" : scr.type === "balance" ? "Review: Balance" : "Direct Slip"}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      {/* Brand Info */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          {scr.source === "reviews" ? (
                            <MessageSquare className="h-4 w-4 text-indigo-500 shrink-0" />
                          ) : (
                            <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                          <span className="font-extrabold text-slate-900 text-sm truncate">{getCasinoName(scr.casinoId)}</span>
                        </div>
                        {scr.gameName && (
                          <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0">
                            {scr.gameIcon ? (
                              <img
                                src={scr.gameIcon}
                                alt={scr.gameName}
                                className="w-3 h-3 rounded-full object-cover shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Gamepad2 className="w-3 h-3 text-indigo-500 shrink-0" />
                            )}
                            <span className="truncate max-w-[90px]">{scr.gameName}</span>
                          </div>
                        )}
                      </div>

                      {/* Cash Claim or Review Text */}
                      {scr.amount !== undefined ? (
                        <div className="font-black text-emerald-700 text-lg leading-none">
                          ${Number(scr.amount).toLocaleString()}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {scr.title && (
                            <h5 className="font-bold text-slate-900 text-xs line-clamp-1">{scr.title}</h5>
                          )}
                          {scr.comment && (
                            <p className="text-slate-500 text-[11px] leading-relaxed italic line-clamp-2">
                              "{scr.comment}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      {/* Meta info */}
                      <div className="text-[10px] text-slate-400 font-medium">
                        <span>Uploaded {new Date(scr.uploadedAt).toLocaleDateString()}</span>
                      </div>

                      {/* Status Badging */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border capitalize
                          ${
                            scr.approved
                              ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                              : "bg-amber-50 border-amber-100 text-amber-700 animate-pulse"
                          }`}
                      >
                        {scr.approved ? "Approved" : "Pending"}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    {scr.approved ? (
                      <button
                        onClick={() => handleUnifiedStatus(scr, false)}
                        className="px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Unapprove"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Revoke</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnifiedStatus(scr, true)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Approve"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                    )
                    }
                    <button
                      onClick={() => handleOpenEditWinSlip(scr)}
                      className="p-1.5 border border-slate-200 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                      title="Edit win slip submission"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmTarget({
                        type: "screenshot",
                        id: scr.id,
                        title: scr.amount ? `$${scr.amount.toLocaleString()} jackpot proof` : (scr.title || "Jackpot win proof"),
                        originalItem: scr
                      })}
                      className="p-1.5 border border-slate-200 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Delete proof"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredScreenshots.length && filteredScreenshots.length > 0}
                        onChange={() => handleSelectAllToggle(filteredScreenshots)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="p-4">Brand Listing</th>
                    <th className="p-4">Prize Amount / Detail</th>
                    <th className="p-4">Preview</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredScreenshots.map((scr) => (
                    <tr key={scr.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(scr.id)}
                          onChange={() => handleSelectItemToggle(scr.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="font-bold text-slate-900">{getCasinoName(scr.casinoId)}</span>
                          </div>
                          {scr.gameName && (
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-bold w-fit">
                              {scr.gameIcon ? (
                                <img
                                  src={scr.gameIcon}
                                  alt={scr.gameName}
                                  className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <Gamepad2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              )}
                              <span className="truncate max-w-[130px]">{scr.gameName}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {scr.amount !== undefined ? (
                          <span className="font-bold text-emerald-700 text-sm">
                            ${Number(scr.amount).toLocaleString()}
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-bold uppercase">
                              {scr.type === "jackpot" ? "Review Jackpot" : "Review Balance"}
                            </span>
                            {scr.title && (
                              <p className="text-slate-500 text-[10px] line-clamp-1 italic mt-1">"{scr.title}"</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div 
                          className="relative h-12 w-20 rounded-lg overflow-hidden border border-slate-200 cursor-zoom-in bg-slate-950 flex items-center justify-center group"
                          onClick={() => setSelectedScreenshot(scr)}
                        >
                          <img 
                            src={scr.image} 
                            alt="Screenshot preview" 
                            className="h-full w-full object-contain group-hover:scale-105 transition"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Eye className="h-3 w-3 text-white" />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-400 font-mono font-bold text-[10px]">
                        {new Date(scr.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize
                            ${
                              scr.approved
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                : "bg-amber-50 border-amber-100 text-amber-700 animate-pulse"
                            }`}
                        >
                          {scr.approved ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {scr.approved ? (
                            <button
                              onClick={() => handleUnifiedStatus(scr, false)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
                              title="Unapprove screenshot"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnifiedStatus(scr, true)}
                              className="p-1.5 rounded-lg border border-emerald-250 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                              title="Approve screenshot"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditWinSlip(scr)}
                            className="p-1.5 rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer transition"
                            title="Edit win slip submission"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmTarget({
                              type: "screenshot",
                              id: scr.id,
                              title: scr.amount ? `$${scr.amount.toLocaleString()} jackpot proof` : (scr.title || "Jackpot win proof"),
                              originalItem: scr
                            })}
                            className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Delete screenshot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Screen Preview Lightbox Modal */}
       {selectedScreenshot && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl flex flex-col justify-between">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Win Proof: {getCasinoName(selectedScreenshot.casinoId)}
              </span>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="p-1 rounded-full border border-slate-200 hover:bg-slate-200/50 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border rounded-2xl overflow-hidden max-h-[60vh] bg-slate-950 flex items-center justify-center">
                <img
                  src={selectedScreenshot.image}
                  alt="Jackpot win validation proof"
                  className="max-h-[55vh] object-contain w-full cursor-zoom-in"
                  onClick={() => window.open(selectedScreenshot.image, "_blank")}
                  title="Click to open image in a new tab"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                    {selectedScreenshot.amount !== undefined ? "Winner Claim" : "Player Rating & Review"}
                  </span>
                  {selectedScreenshot.amount !== undefined ? (
                    <span className="text-xl font-black text-slate-900">${Number(selectedScreenshot.amount).toLocaleString()}</span>
                  ) : (
                    <div className="space-y-1 mt-0.5">
                      <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 border border-indigo-150 rounded-lg font-bold text-[10px]">
                        <span>{selectedScreenshot.title || "Jackpot Proof"}</span>
                      </div>
                      {selectedScreenshot.comment && (
                        <p className="text-slate-500 text-xs italic leading-tight block mt-1">
                          "{selectedScreenshot.comment}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Moderation Status</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize mt-0.5
                      ${
                        selectedScreenshot.approved
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                          : "bg-amber-50 border-amber-100 text-amber-700"
                      }`}
                  >
                    {selectedScreenshot.approved ? "Approved" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              {!selectedScreenshot.approved ? (
                <button
                  onClick={() => {
                    handleUnifiedStatus(selectedScreenshot, true);
                    setSelectedScreenshot(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Check className="h-4 w-4" /> Verify & Publish
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleUnifiedStatus(selectedScreenshot, false);
                    setSelectedScreenshot(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Revoke Verification
                </button>
              )}
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition text-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / CREATE REVIEW MODAL */}
      {editingReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    {isNewReview ? "Create New Review Submission" : "Edit Player Review Submission"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Modify title, rating, casino brand, comments, or screenshot proofs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingReview(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReviewEdit} className="space-y-4 text-xs">
              {/* Casino Brand & Rating */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Casino Brand / Platform
                  </label>
                  <select
                    value={reviewForm.casinoId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const cas = casinos.find((c) => c.id === cid);
                      setReviewForm((prev) => ({
                        ...prev,
                        casinoId: cid,
                        casinoName: cas ? cas.casinoName : prev.casinoName,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 bg-slate-50/50 focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="">Select Casino...</option>
                    {casinos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.casinoName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Star Rating (1 - 5)
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                        className={`p-1.5 rounded-xl border transition cursor-pointer ${
                          reviewForm.rating >= star
                            ? "bg-amber-50 border-amber-200 text-amber-500"
                            : "bg-slate-50 border-slate-200 text-slate-300"
                        }`}
                      >
                        <Star className={`h-4 w-4 ${reviewForm.rating >= star ? "fill-amber-400" : ""}`} />
                      </button>
                    ))}
                    <span className="ml-2 font-black text-slate-700">{reviewForm.rating} / 5 Stars</span>
                  </div>
                </div>
              </div>

              {/* Game Name Selector */}
              <GameSelector
                selectedGameName={reviewForm.gameName}
                selectedGameIcon={reviewForm.gameIcon}
                onSelectGame={(gName, gIcon) =>
                  setReviewForm((prev) => ({ ...prev, gameName: gName, gameIcon: gIcon }))
                }
                gamesList={allListingGames}
              />

              {/* Title */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Review Title / Headline
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Instant cashouts and fair bonus terms!"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Review Details / Player Comment
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter detailed feedback or player review experience..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Moderation Status */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Moderation Approval Status
                </label>
                <select
                  value={reviewForm.approved ? "approved" : "pending"}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, approved: e.target.value === "approved" }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 bg-slate-50/50 focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="approved">Approved & Published</option>
                  <option value="pending">Pending Review / Vetting</option>
                </select>
              </div>

              {/* Jackpot Screenshot URL + Upload */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Jackpot Win Screenshot Proof
                  </label>
                  {reviewForm.jackpotScreenshot && (
                    <button
                      type="button"
                      onClick={() => setReviewForm((prev) => ({ ...prev, jackpotScreenshot: "" }))}
                      className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://... image URL"
                    value={reviewForm.jackpotScreenshot}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, jackpotScreenshot: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl font-mono text-[11px] focus:border-indigo-500 bg-white"
                  />
                  <label className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5 shrink-0">
                    {uploadingJackpot ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadReviewImage(e, "jackpotScreenshot")}
                      className="hidden"
                      disabled={uploadingJackpot}
                    />
                  </label>
                </div>

                {reviewForm.jackpotScreenshot && (
                  <div className="h-24 bg-slate-950 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-1 relative">
                    <img
                      src={reviewForm.jackpotScreenshot}
                      alt="Jackpot Proof Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Balance Screenshot URL + Upload */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Account Balance Screenshot Proof
                  </label>
                  {reviewForm.balanceScreenshot && (
                    <button
                      type="button"
                      onClick={() => setReviewForm((prev) => ({ ...prev, balanceScreenshot: "" }))}
                      className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://... image URL"
                    value={reviewForm.balanceScreenshot}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, balanceScreenshot: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl font-mono text-[11px] focus:border-indigo-500 bg-white"
                  />
                  <label className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5 shrink-0">
                    {uploadingBalance ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadReviewImage(e, "balanceScreenshot")}
                      className="hidden"
                      disabled={uploadingBalance}
                    />
                  </label>
                </div>

                {reviewForm.balanceScreenshot && (
                  <div className="h-24 bg-slate-950 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-1 relative">
                    <img
                      src={reviewForm.balanceScreenshot}
                      alt="Balance Proof Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReview}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {savingReview ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>{isNewReview ? "Create Review" : "Save Review Changes"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WIN SLIP MODAL */}
      {editingWinSlip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-2xl">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Edit Win Slip Submission
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Update prize claim amount, brand, or winning screenshot image.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWinSlip(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWinSlipEdit} className="space-y-4 text-xs">
              {/* Casino Brand */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Casino Brand / Platform
                </label>
                <select
                  value={winSlipForm.casinoId}
                  onChange={(e) => setWinSlipForm((prev) => ({ ...prev, casinoId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 bg-slate-50/50 focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="">Select Casino...</option>
                  {casinos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.casinoName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Win Amount */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Jackpot Prize Amount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={winSlipForm.amount}
                  onChange={(e) => setWinSlipForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Game Name Selector */}
              <GameSelector
                selectedGameName={winSlipForm.gameName}
                selectedGameIcon={winSlipForm.gameIcon}
                onSelectGame={(gName, gIcon) =>
                  setWinSlipForm((prev) => ({ ...prev, gameName: gName, gameIcon: gIcon }))
                }
                gamesList={allListingGames}
              />

              {/* Status */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Moderation Approval Status
                </label>
                <select
                  value={winSlipForm.approved ? "approved" : "pending"}
                  onChange={(e) => setWinSlipForm((prev) => ({ ...prev, approved: e.target.value === "approved" }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 bg-slate-50/50 focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="approved">Approved & Verified</option>
                  <option value="pending">Pending Vetting</option>
                </select>
              </div>

              {/* Screenshot Image URL + Upload */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Winning Screenshot Image
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="https://... image URL"
                    value={winSlipForm.image}
                    onChange={(e) => setWinSlipForm((prev) => ({ ...prev, image: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl font-mono text-[11px] focus:border-indigo-500 bg-white"
                  />
                  <label className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5 shrink-0">
                    {uploadingWinSlip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadWinSlipImage}
                      className="hidden"
                      disabled={uploadingWinSlip}
                    />
                  </label>
                </div>

                {winSlipForm.image && (
                  <div className="h-32 bg-slate-950 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-1 relative">
                    <img
                      src={winSlipForm.image}
                      alt="Win Slip Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingWinSlip(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWinSlip}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {savingWinSlip ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Win Slip Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Confirm Deletion?
                </h3>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Are you sure you want to permanently delete the {deleteConfirmTarget.title}? This action is irreversible and will permanently remove this record from the database.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition duration-150 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={async () => {
                  const target = deleteConfirmTarget;
                  setDeleteConfirmTarget(null);
                  if (target.type === "review") {
                    await handleDeleteReview(target.id);
                  } else {
                    await handleDeleteUnified(target.originalItem);
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition duration-150 disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-rose-100 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationManager;
