import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Check,
  Loader2,
  Trash2,
  Inbox,
  Clock,
  User,
  ExternalLink,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Eye,
  X,
  FileText,
} from "lucide-react";

interface ContactConfig {
  email: string;
  phone: string;
  address: string;
  description: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status: "unread" | "read";
}

const DEFAULT_CONFIG: ContactConfig = {
  email: "broker@ekerlistings.com",
  phone: "+1 (888) 555-EKER",
  address: "Valletta, Malta",
  description: "Have a partnership inquiry, advertising campaign pitch, or need review support? Reach out to our brokerage desk."
};

export function ContactPageManager() {
  const [config, setConfig] = useState<ContactConfig>(DEFAULT_CONFIG);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  
  // Settings edit states
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");

  // View message modal
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Fetch or create config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "contactInfo", "info");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as ContactConfig;
          setConfig(data);
          setEditEmail(data.email || "");
          setEditPhone(data.phone || "");
          setEditAddress(data.address || "");
          setEditDescription(data.description || "");
        } else {
          // Initialize with default
          await setDoc(docRef, DEFAULT_CONFIG);
          setConfig(DEFAULT_CONFIG);
          setEditEmail(DEFAULT_CONFIG.email);
          setEditPhone(DEFAULT_CONFIG.phone);
          setEditAddress(DEFAULT_CONFIG.address);
          setEditDescription(DEFAULT_CONFIG.description);
        }
      } catch (err) {
        console.warn("Failed to fetch contactInfo config:", err);
        // Set local fallback inputs so the admin can write them anyway
        setEditEmail(DEFAULT_CONFIG.email);
        setEditPhone(DEFAULT_CONFIG.phone);
        setEditAddress(DEFAULT_CONFIG.address);
        setEditDescription(DEFAULT_CONFIG.description);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, []);

  // Sync messages
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "contactMessages"),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ContactMessage[];

        // Sort by createdAt descending
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setMessages(list);
        setLoadingMessages(false);
      },
      (err) => {
        console.error("Failed to sync contactMessages:", err);
        setLoadingMessages(false);
      }
    );

    return unsubscribe;
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSuccess(false);
    setError("");

    try {
      const payload = {
        email: editEmail.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
        description: editDescription.trim(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "contactInfo", "info"), payload);
      setConfig(payload);
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save contactInfo:", err);
      setError("Failed to save contact config. Make sure rules permit writes.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleRead = async (id: string, currentStatus: "unread" | "read") => {
    try {
      const nextStatus = currentStatus === "unread" ? "read" : "unread";
      await updateDoc(doc(db, "contactMessages", id), { status: nextStatus });
      setSuccess(`Message status updated to ${nextStatus}.`);
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      console.error("Failed to toggle read status:", err);
      setError("Failed to change read status.");
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this message?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "contactMessages", id));
      setSuccess("Message deleted successfully.");
      setTimeout(() => setSuccess(""), 3000);
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
      setError("Failed to delete message.");
    }
  };

  const handleOpenMessage = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    if (msg.status === "unread") {
      // Auto mark as read when opened
      try {
        await updateDoc(doc(db, "contactMessages", msg.id), { status: "read" });
      } catch (e) {
        console.warn("Failed to auto mark read:", e);
      }
    }
  };

  // Filters logic
  const filteredMessages = messages.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.message.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Upper header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-600" />
          Contact Page & Inbox Desk
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Manage dynamic support helpdesk info (Hotline, Email, Headquarters) and handle incoming visitor inquiries in your dashboard inbox.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="ml-auto text-emerald-400 hover:text-emerald-650 font-black">&times;</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-rose-400 hover:text-rose-650 font-black">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Dynamic Helpdesk Config Settings - Left (4 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              Dynamic Helpdesk Details
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Update details rendering on the public contact card.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            {configSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-bounce">
                <Check className="w-4 h-4 shrink-0" />
                <span>Contact info updated successfully!</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Support Email Address
              </label>
              <input
                type="email"
                required
                placeholder="broker@ekerlistings.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Hotline VIP Phone Number
              </label>
              <input
                type="text"
                required
                placeholder="+1 (888) 555-EKER"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Broker Headquarter / Address
              </label>
              <input
                type="text"
                required
                placeholder="Valletta, Malta"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Helpdesk Intro Tagline / Description
              </label>
              <textarea
                required
                rows={3}
                placeholder="Have an inquiry? Contact our brokerage desk..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50 resize-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {savingConfig ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Save Helpdesk Details</span>
            </button>
          </form>
        </div>

        {/* Contact Message Inbox - Right (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Inbox className="w-4 h-4 text-indigo-600" />
                Visitor Proposals & Messages ({filteredMessages.length})
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                Review lead details, VIP applications, and broker requests.
              </p>
            </div>
          </div>

          {/* Search & Filter widgets */}
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, email, proposals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden bg-white w-full sm:w-auto"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>
          </div>

          {/* Messages list */}
          {loadingMessages ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/20 border border-dashed border-slate-200 rounded-2xl">
              <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">No contact messages match filter</p>
              <p className="text-[10px] text-slate-450 mt-1">Incoming visitor inquiries show up here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleOpenMessage(msg)}
                  className={`p-4 border rounded-2xl text-left cursor-pointer transition duration-150 flex items-start gap-3 relative hover:shadow-xs ${
                    msg.status === "unread"
                      ? "bg-indigo-50/25 border-indigo-200 hover:bg-indigo-55/30"
                      : "bg-slate-50/30 border-slate-150 hover:bg-slate-50/60"
                  }`}
                >
                  {/* Status dot */}
                  {msg.status === "unread" && (
                    <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                  )}

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900 text-xs truncate">
                        {msg.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-350" />
                        {new Date(msg.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest leading-none">
                      {msg.subject}
                    </p>

                    <p className="text-xs text-slate-600 font-semibold line-clamp-1">
                      {msg.message}
                    </p>

                    <p className="text-[10px] text-slate-400 font-bold truncate">
                      {msg.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message view detail modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                  {selectedMessage.subject}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  Inquiry from {selectedMessage.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-xs font-semibold">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sender Name</p>
                  <p className="text-slate-800 font-extrabold mt-0.5">{selectedMessage.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inquiry Category</p>
                  <p className="text-indigo-700 font-extrabold mt-0.5">{selectedMessage.subject}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</p>
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    className="text-indigo-600 hover:underline font-extrabold mt-0.5 flex items-center gap-1"
                  >
                    {selectedMessage.email}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Received Date</p>
                  <p className="text-slate-500 font-mono mt-0.5">
                    {new Date(selectedMessage.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Message / Proposal Text
                </p>
                <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50/30 border border-slate-100 p-4 rounded-2xl break-words whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => handleDeleteMessage(selectedMessage.id)}
                className="px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete message</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleRead(selectedMessage.id, selectedMessage.status)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {selectedMessage.status === "unread" ? "Mark Read" : "Mark Unread"}
                </button>
                <a
                  href={`mailto:${selectedMessage.email}?subject=RE: ${encodeURIComponent(
                    selectedMessage.subject
                  )}`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Reply via Email</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
