import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
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
}

export const SellRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<SellRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeRequest, setActiveRequest] = useState<SellRequest | null>(null);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

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

  const handleUpdateStatus = async (id: string, newStatus: SellRequest["status"]) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const docRef = doc(db, "sellRequests", id);
      await updateDoc(docRef, { status: newStatus });
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
    if (!window.confirm(`Are you sure you want to permanently delete the sell request for "${casinoName}"?`)) {
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const docRef = doc(db, "sellRequests", id);
      await deleteDoc(docRef);
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
                    onClick={() => handleDeleteRequest(req.id, req.casinoName)}
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
                onClick={() => handleDeleteRequest(activeRequest.id, activeRequest.casinoName)}
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
    </div>
  );
};

export default SellRequestsManager;
