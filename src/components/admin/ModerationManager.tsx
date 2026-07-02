import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
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
} from "lucide-react";
import { Review, JackpotScreenshot, Casino } from "../../types/firestore";

export const ModerationManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"reviews" | "screenshots">("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [screenshots, setScreenshots] = useState<JackpotScreenshot[]>([]);
  const [casinos, setCasinos] = useState<Casino[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [selectedScreenshot, setSelectedScreenshot] = useState<JackpotScreenshot | null>(null);

  useEffect(() => {
    // 1. Load casinos
    const unsubCasinos = onSnapshot(collection(db, "casinos"), (snap) => {
      const list: Casino[] = [];
      snap.forEach((d) => {
        const data = d.data() as Casino;
        if (!data.isDeleted) {
          list.push({ id: d.id, ...data });
        }
      });
      setCasinos(list);
    });

    // 2. Load reviews in real-time
    const unsubReviews = onSnapshot(collection(db, "reviews"), (snap) => {
      const list: Review[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Review);
      });
      setReviews(list);
      setLoading(false);
    });

    // 3. Load jackpot screenshots in real-time
    const unsubScreenshots = onSnapshot(collection(db, "jackpotScreenshots"), (snap) => {
      const list: JackpotScreenshot[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as JackpotScreenshot);
      });
      setScreenshots(list);
    });

    return () => {
      unsubCasinos();
      unsubReviews();
      unsubScreenshots();
    };
  }, []);

  const getCasinoName = (id: string) => {
    return casinos.find((c) => c.id === id)?.casinoName || "Unknown Casino";
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

  const handleScreenshotStatus = async (screenshot: JackpotScreenshot, approved: boolean) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const docRef = doc(db, "jackpotScreenshots", screenshot.id);
      await updateDoc(docRef, { approved });
      
      setActionSuccess(`Jackpot screenshot has been successfully ${approved ? "approved" : "unapproved"}.`);

      // Trigger notification
      await createNotification(
        screenshot.uploadedBy,
        approved ? "Jackpot Winner Verified!" : "Jackpot Slide Flagged",
        `Your winning screenshot of $${screenshot.amount.toLocaleString()} has been ${approved ? "approved & shared in the gallery!" : "declined by moderation"}.`,
        approved ? "screenshot_approved" : "screenshot_rejected"
      );
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to update screenshot status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm("Permanently delete this user review from database?")) {
      return;
    }
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

  const handleDeleteScreenshot = async (id: string) => {
    if (!window.confirm("Permanently delete this player jackpot win record?")) {
      return;
    }
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, "jackpotScreenshots", id));
      setActionSuccess("Screenshot win-record deleted permanently.");
      setSelectedIds(selectedIds.filter(selected => selected !== id));
    } catch (err: any) {
      setActionError(err.message || "Failed to delete record.");
    } finally {
      setActionLoading(false);
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
          const scr = screenshots.find((s) => s.id === id);
          if (scr && !scr.approved) {
            await updateDoc(doc(db, "jackpotScreenshots", id), { approved: true });
            await createNotification(
              scr.uploadedBy,
              "Winner Slip Approved!",
              `Your jackpot screenshot has been approved!`,
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
          const scr = screenshots.find((s) => s.id === id);
          if (scr) {
            await updateDoc(doc(db, "jackpotScreenshots", id), { approved: false });
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

  // Filters mapping
  const filteredReviews = reviews.filter((r) => {
    const matchedSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCasinoName(r.casinoId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchedStatus =
      statusFilter === "all" ||
      (statusFilter === "approved" && r.approved) ||
      (statusFilter === "pending" && !r.approved);
    const matchedCasino =
      selectedCasinoFilter === "all" || r.casinoId === selectedCasinoFilter;
    return matchedSearch && matchedStatus && matchedCasino;
  });

  const filteredScreenshots = screenshots.filter((s) => {
    const matchedSearch =
      getCasinoName(s.casinoId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.amount.toString().includes(searchQuery);
    const matchedStatus =
      statusFilter === "all" ||
      (statusFilter === "approved" && s.approved) ||
      (statusFilter === "pending" && !s.approved);
    const matchedCasino =
      selectedCasinoFilter === "all" || s.casinoId === selectedCasinoFilter;
    return matchedSearch && matchedStatus && matchedCasino;
  });

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
            <span>Win Slips ({screenshots.length})</span>
          </button>
        </div>

        {/* Global Controls Filter bar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto md:justify-end">
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
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span className="font-bold text-slate-900">{getCasinoName(rev.casinoId)}</span>
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
                            <div className="flex gap-2 pt-1.5">
                              {rev.jackpotScreenshot && (
                                <a 
                                  href={rev.jackpotScreenshot} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-650 hover:underline bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md"
                                >
                                  <span>Jackpot Src ↗</span>
                                </a>
                              )}
                              {rev.balanceScreenshot && (
                                <a 
                                  href={rev.balanceScreenshot} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-650 hover:underline bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md"
                                >
                                  <span>Balance Src ↗</span>
                                </a>
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
                            onClick={() => handleDeleteReview(rev.id)}
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
                    <th className="p-4">Prize Amount</th>
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
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-amber-500" />
                          <span className="font-bold text-slate-900">{getCasinoName(scr.casinoId)}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-emerald-700 text-sm">
                        ${Number(scr.amount).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedScreenshot(scr)}
                          className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-bold"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Image</span>
                        </button>
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
                              onClick={() => handleScreenshotStatus(scr, false)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
                              title="Unapprove screenshot"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleScreenshotStatus(scr, true)}
                              className="p-1.5 rounded-lg border border-emerald-250 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                              title="Approve screenshot"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteScreenshot(scr.id)}
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
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl flex flex-col justify-between">
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
              <div className="border rounded-2xl overflow-hidden max-h-96 bg-slate-950 flex items-center justify-center">
                <img
                  src={selectedScreenshot.image}
                  alt="Jackpot win validation proof"
                  className="max-h-80 object-contain w-full"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Winner Claim</span>
                  <span className="text-xl font-black text-slate-900">${Number(selectedScreenshot.amount).toLocaleString()}</span>
                </div>
                <div className="text-right">
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
                    handleScreenshotStatus(selectedScreenshot, true);
                    setSelectedScreenshot(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Check className="h-4 w-4" /> Verify & Publish
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleScreenshotStatus(selectedScreenshot, false);
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
    </div>
  );
};

export default ModerationManager;
