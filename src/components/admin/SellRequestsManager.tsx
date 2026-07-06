import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Mail,
  User,
  DollarSign,
  FileText,
  Eye,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";

interface SellRequest {
  id: string;
  name: string;
  email: string;
  casinoName: string;
  affiliateLink: string;
  screenshot?: string;
  balanceScreenshot?: string;
  bikashNumber?: string;
  dateTime?: string;
  amount: number;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
}

export const SellRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<SellRequest[]>([]);
  const [casinos, setCasinos] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeRequest, setActiveRequest] = useState<SellRequest | null>(null);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [requestToDelete, setRequestToDelete] = useState<{ id: string; casinoName: string } | null>(null);

  // 1. Subscribe to sellRequests
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "sellRequests"),
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as SellRequest[];
        setRequests(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Sell requests subscription error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // 2. Subscribe to casinos to map brand name to brand ID
  useEffect(() => {
    const unsubCasinos = onSnapshot(
      collection(db, "casinos"),
      (snap) => {
        const list: any[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (!data.isDeleted) {
            list.push({ id: d.id, ...data });
          }
        });
        setCasinos(list);
      },
      (err) => {
        console.error("Casinos subscription error:", err);
      }
    );
    return () => unsubCasinos();
  }, []);

  // 3. Subscribe to reviews to perform public synchronization check
  useEffect(() => {
    const unsubReviews = onSnapshot(
      collection(db, "reviews"),
      (snap) => {
        const list: any[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        setReviews(list);
      },
      (err) => {
        console.error("Reviews subscription error:", err);
      }
    );
    return () => unsubReviews();
  }, []);

  // 4. Auto-sync approved sell requests to public reviews collection
  useEffect(() => {
    if (requests.length > 0 && casinos.length > 0) {
      requests.forEach(async (req) => {
        if (req.status === "approved") {
          const reviewExists = reviews.some((r) => r.id === req.id);
          if (!reviewExists) {
            console.log(`Auto-syncing approved sell request ${req.id} to public reviews...`);
            const cleanString = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
            const matchingCasino = casinos.find(
              (c) => cleanString(c.casinoName) === cleanString(req.casinoName) ||
                     cleanString(c.casinoName).includes(cleanString(req.casinoName)) ||
                     cleanString(req.casinoName).includes(cleanString(c.casinoName))
            );
            const casinoId = matchingCasino ? matchingCasino.id : "unknown";

            try {
              const reviewData: any = {
                casinoId,
                casinoName: req.casinoName,
                userId: auth.currentUser?.uid || "admin_sync",
                rating: 5,
                title: `Verified Win: ৳${req.amount} | By ${req.name}`,
                comment: req.message || "Winning screenshot proof submitted.",
                approved: true,
                createdAt: req.dateTime || req.createdAt || new Date().toISOString(),
              };
              if (req.screenshot) {
                reviewData.jackpotScreenshot = req.screenshot;
              }
              if (req.balanceScreenshot) {
                reviewData.balanceScreenshot = req.balanceScreenshot;
              }
              await setDoc(doc(db, "reviews", req.id), reviewData);
            } catch (err) {
              console.error("Failed to auto-sync approved sell request to reviews:", err);
            }
          }
        }
      });
    }
  }, [requests, reviews, casinos]);

  // 5. Auto-delete public reviews for non-approved or deleted sell requests
  useEffect(() => {
    if (requests.length > 0 && reviews.length > 0) {
      reviews.forEach(async (rev) => {
        // If the review ID is a sell request ID
        const correspondingReq = requests.find((r) => r.id === rev.id);
        if (correspondingReq && correspondingReq.status !== "approved") {
          console.log(`Auto-removing review for non-approved sell request ${rev.id}...`);
          try {
            await deleteDoc(doc(db, "reviews", rev.id));
          } catch (err) {
            console.error("Failed to auto-remove stale review:", err);
          }
        }
      });
    }
  }, [requests, reviews]);

  const handleUpdateStatus = async (id: string, newStatus: SellRequest["status"]) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const docRef = doc(db, "sellRequests", id);
      await updateDoc(docRef, { status: newStatus });

      const req = requests.find((r) => r.id === id);
      if (req) {
        if (newStatus === "approved") {
          const cleanString = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const matchingCasino = casinos.find(
            (c) => cleanString(c.casinoName) === cleanString(req.casinoName) ||
                   cleanString(c.casinoName).includes(cleanString(req.casinoName)) ||
                   cleanString(req.casinoName).includes(cleanString(c.casinoName))
          );
          const casinoId = matchingCasino ? matchingCasino.id : "unknown";

          const reviewData: any = {
            casinoId,
            casinoName: req.casinoName,
            userId: auth.currentUser?.uid || "admin_sync",
            rating: 5,
            title: `Verified Win: ৳${req.amount} | By ${req.name}`,
            comment: req.message || "Winning screenshot proof submitted.",
            approved: true,
            createdAt: req.dateTime || req.createdAt || new Date().toISOString(),
          };
          if (req.screenshot) {
            reviewData.jackpotScreenshot = req.screenshot;
          }
          if (req.balanceScreenshot) {
            reviewData.balanceScreenshot = req.balanceScreenshot;
          }
          await setDoc(doc(db, "reviews", id), reviewData);
        } else {
          // Remove review if changed to rejected/pending
          await deleteDoc(doc(db, "reviews", id));
        }
      }

      setActionSuccess(`Sell request successfully ${newStatus}!`);
      // Update modal view if open
      if (activeRequest && activeRequest.id === id) {
        setActiveRequest({ ...activeRequest, status: newStatus });
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to update request status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRequest = async (id: string, casinoName: string) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const docRef = doc(db, "sellRequests", id);
      await deleteDoc(docRef);

      // Delete public review mapping as well
      await deleteDoc(doc(db, "reviews", id));

      setActionSuccess(`Successfully deleted sell request for "${casinoName}".`);
      if (activeRequest && activeRequest.id === id) {
        setActiveRequest(null);
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to delete request.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications bar */}
      {(actionSuccess || actionError || actionLoading) && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 shadow-xs transition-all duration-300 ${
            actionError
              ? "bg-red-50 border-red-150 text-red-800"
              : actionLoading
              ? "bg-indigo-50 border-indigo-150 text-indigo-800"
              : "bg-emerald-50 border-emerald-150 text-emerald-800"
          }`}
        >
          {actionLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
          ) : actionError ? (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <div className="text-xs font-semibold flex-1">
            {actionLoading ? "Updating database... Please hold." : actionSuccess || actionError}
          </div>
          <button
            onClick={() => {
              setActionSuccess(null);
              setActionError(null);
            }}
            className="p-1 rounded-full hover:bg-slate-200/50 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-400 font-bold">Synchronizing requests from secure vault...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400 max-w-xl mx-auto">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-display font-extrabold text-sm text-slate-800 mb-1">No Sell Requests Yet</h4>
          <p className="text-xs text-slate-500">
            When affiliate creators submit acquisition listing pitches, they will appear here in real-time.
          </p>
        </div>
      ) : (
        /* Requests Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xs transition duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize
                      ${
                        req.status === "approved"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                          : req.status === "rejected"
                          ? "bg-red-50 border-red-100 text-red-700"
                          : "bg-amber-50 border-amber-100 text-amber-700 animate-pulse"
                      }`}
                  >
                    {req.status === "pending" ? (
                      <Clock className="w-3 h-3" />
                    ) : req.status === "approved" ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {req.status}
                  </span>

                  <span className="text-xs font-black text-slate-800 flex items-center">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    {req.amount?.toLocaleString()}
                  </span>
                </div>

                <h4 className="text-sm font-black text-slate-900 tracking-tight mb-2">
                  {req.casinoName}
                </h4>

                <div className="space-y-1.5 text-xs text-slate-500 mb-4 font-semibold">
                  <p className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{req.name}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{req.email}</span>
                  </p>
                  {req.bikashNumber && (
                    <p className="flex items-center gap-2 text-amber-700">
                      <span className="font-extrabold text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">bKash</span>
                      <span className="font-mono font-bold">{req.bikashNumber}</span>
                    </p>
                  )}
                  {req.dateTime && (
                    <p className="flex items-center gap-2 text-slate-400 text-[10px]">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{new Date(req.dateTime).toLocaleString()}</span>
                    </p>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed mb-4 italic">
                  "{req.message}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveRequest(req)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> View Proposal
                </button>

                <div className="flex items-center gap-1.5">
                  {req.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(req.id, "approved")}
                        className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                        title="Approve Proposal"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(req.id, "rejected")}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Reject Proposal"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setRequestToDelete({ id: req.id, casinoName: req.casinoName })}
                    className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proposal Details Modal */}
      {activeRequest && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Proposal Dossier: {activeRequest.casinoName}
              </span>
              <button
                onClick={() => setActiveRequest(null)}
                className="p-1 rounded-full border border-slate-200 hover:bg-slate-200/50 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Casino Brand / URL
                </span>
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border">
                  <span className="text-xs font-black text-slate-800">{activeRequest.casinoName}</span>
                  <a
                    href={activeRequest.affiliateLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                  >
                    Visit affiliate lander <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Acquisition Submitter
                  </span>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {activeRequest.name}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Contact Email
                  </span>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {activeRequest.email}
                  </p>
                </div>
              </div>

              {/* bKash & Date/Time row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    bKash Wallet Number
                  </span>
                  <p className="text-xs font-mono font-black text-amber-700 bg-amber-50 px-2 py-1.5 rounded-xl border border-amber-100 inline-block">
                    {activeRequest.bikashNumber || "Not Specified"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Jackpot Date & Time
                  </span>
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {activeRequest.dateTime ? new Date(activeRequest.dateTime).toLocaleString() : "Not Specified"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Asking Price / Amount
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 flex items-center">
                    <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                    {activeRequest.amount?.toLocaleString()}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Approval Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize
                      ${
                        activeRequest.status === "approved"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                          : activeRequest.status === "rejected"
                          ? "bg-red-50 border-red-100 text-red-700"
                          : "bg-amber-50 border-amber-100 text-amber-700"
                      }`}
                  >
                    {activeRequest.status}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Submission Pitch Message
                </span>
                <div className="bg-slate-50 p-4 rounded-xl border text-xs text-slate-600 leading-relaxed italic">
                  "{activeRequest.message}"
                </div>
              </div>

              {/* Dual image screenshots render */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeRequest.screenshot && (
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Jackpot Screenshot
                    </span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-slate-50">
                      <img
                        src={activeRequest.screenshot}
                        alt="Jackpot proof attachment"
                        className="w-full object-contain max-h-48"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}

                {activeRequest.balanceScreenshot && (
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Balance Screenshot
                    </span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-slate-50">
                      <img
                        src={activeRequest.balanceScreenshot}
                        alt="Balance proof attachment"
                        className="w-full object-contain max-h-48"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setRequestToDelete({ id: activeRequest.id, casinoName: activeRequest.casinoName })}
                className="px-3.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Delete Request
              </button>

              <div className="flex items-center gap-2">
                {activeRequest.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(activeRequest.id, "rejected")}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Reject Pitch
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(activeRequest.id, "approved")}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Approve Pitch
                    </button>
                  </>
                )}
                <button
                  onClick={() => setActiveRequest(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer text-slate-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {requestToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
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
                  Are you sure you want to permanently delete the sell request for <span className="font-bold text-slate-800">"{requestToDelete.casinoName}"</span>? This action is irreversible and will permanently remove this record and its review mapping from the database.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setRequestToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition duration-150 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={async () => {
                  const target = requestToDelete;
                  setRequestToDelete(null);
                  await handleDeleteRequest(target.id, target.casinoName);
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

export default SellRequestsManager;
