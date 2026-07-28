import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Mail,
  User,
  DollarSign,
  Loader2,
  AlertCircle,
  X,
  Smartphone,
  Wallet,
  ArrowDownLeft,
} from "lucide-react";

interface Withdrawal {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  walletType: string;
  walletNumber: string;
  walletAccountType?: string;
  amount: number;
  status: "pending" | "approved" | "completed" | "rejected";
  createdAt?: string;
}

export const WithdrawalsManager: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<Withdrawal | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "withdrawals"),
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Withdrawal[];
        docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setWithdrawals(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Withdrawals subscription error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: Withdrawal["status"]) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const docRef = doc(db, "withdrawals", id);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      setActionSuccess(`Withdrawal request status updated to ${newStatus}!`);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to update withdrawal status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await deleteDoc(doc(db, "withdrawals", id));
      setActionSuccess("Withdrawal record deleted.");
      setItemToDelete(null);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to delete record.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            <span>Withdrawals Management (উইথড্রয়াল ম্যানেজার)</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Review and process user mobile banking withdrawal requests (bKash / Nagad / Rocket).
          </p>
        </div>
      </div>

      {(actionSuccess || actionError || actionLoading) && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 shadow-xs transition-all ${
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
            {actionLoading ? "Updating database..." : actionSuccess || actionError}
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
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-xs text-slate-400 font-bold">Loading withdrawal records...</p>
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-400 max-w-xl mx-auto space-y-2">
          <Clock className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="font-extrabold text-sm text-slate-800">No Withdrawal Requests Yet</h4>
          <p className="text-xs text-slate-500">
            When users reach minimum ৳100 balance and request withdrawals, they will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {withdrawals.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xs transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      item.status === "approved" || item.status === "completed"
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                        : item.status === "rejected"
                        ? "bg-red-50 border-red-100 text-red-700"
                        : "bg-amber-50 border-amber-100 text-amber-700 animate-pulse"
                    }`}
                  >
                    {item.status}
                  </span>

                  <span className="text-base font-black text-emerald-600 font-mono">
                    ৳{item.amount?.toLocaleString()} Tk
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">{item.walletType || "bKash"} ({item.walletAccountType || "Personal"})</span>
                  </div>
                  <p className="font-mono font-black text-sm text-slate-900">{item.walletNumber}</p>
                </div>

                <div className="space-y-1 text-xs text-slate-500 font-semibold">
                  <p className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{item.userName || "User"}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{item.userEmail}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-slate-400">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                </span>

                <div className="flex items-center gap-1.5">
                  {item.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(item.id, "approved")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                        title="Mark as Paid"
                      >
                        Approve (Paid)
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, "rejected")}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold transition cursor-pointer"
                        title="Reject"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setItemToDelete(item)}
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

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-slate-900 text-base">Delete Withdrawal Record?</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Are you sure you want to delete this withdrawal request of <strong className="text-slate-800">৳{itemToDelete.amount} Tk</strong> for {itemToDelete.walletNumber}?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(itemToDelete.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalsManager;
