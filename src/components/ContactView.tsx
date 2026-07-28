import React, { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle, Loader2, Sparkles } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";

export default function ContactView() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Partnership Inquiry");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [config, setConfig] = useState({
    email: "broker@ekerlistings.com",
    phone: "+1 (888) 555-EKER",
    address: "Valletta, Malta",
    description: "Have a partnership inquiry, advertising campaign pitch, or need review support? Reach out to our brokerage desk."
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "contactInfo", "info"));
        if (snap.exists()) {
          const data = snap.data();
          setConfig({
            email: data.email || "broker@ekerlistings.com",
            phone: data.phone || "+1 (888) 555-EKER",
            address: data.address || "Valletta, Malta",
            description: data.description || "Have a partnership inquiry, advertising campaign pitch, or need review support? Reach out to our brokerage desk."
          });
        }
      } catch (err) {
        console.warn("Failed to fetch contactInfo config:", err);
      }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await addDoc(collection(db, "contactMessages"), {
        name: name.trim(),
        email: email.trim(),
        subject,
        message: message.trim(),
        createdAt: new Date().toISOString(),
        status: "unread",
      });
      setSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error("Failed to submit contact message:", err);
      setError("Failed to transmit message. Please try again.");
      handleFirestoreError(err, OperationType.CREATE, "contactMessages");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="contact-view" className="max-w-4xl mx-auto py-4 space-y-12">
      {/* Contact Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs">
          <Mail className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-sans font-black tracking-tight text-slate-900 sm:text-4xl">
          Get in Touch
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          {config.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Contact Info (4 cols) */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-150 pb-3 uppercase tracking-wider text-xs">
              Broker Desk
            </h3>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="h-9 w-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  <Mail className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Support</p>
                  <p className="text-xs font-semibold text-slate-800">{config.email}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-9 w-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  <Phone className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hotline VIP</p>
                  <p className="text-xs font-semibold text-slate-800">{config.phone}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-9 w-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Broker Headquarter</p>
                  <p className="text-xs font-semibold text-slate-800">{config.address}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 rounded-3xl p-6 border border-slate-800 text-white space-y-2 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 -mr-8 -mt-8 h-24 w-24 rounded-full bg-indigo-500/10" />
            <h4 className="font-bold text-xs flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Direct Callback</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              Registered casino operators can schedule listing reviews, VIP campaign audits, and integration updates.
            </p>
          </div>
        </div>

        {/* Contact Form (8 cols) */}
        <div className="md:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs">
          {success ? (
            <div className="text-center py-10 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs mb-2">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="font-display font-black text-xl text-slate-900">Message Transmitted</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-semibold">
                Thank you! Your inquiry has been securely routed to our Malta support desk. An Eker Listings brokerage specialist will respond to you within 24 hours.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-semibold">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Anik Hoque"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Your Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Inquiry Category
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
                >
                  <option value="Partnership Inquiry">Partnership Inquiry & Brokerage</option>
                  <option value="Advertising / Sponsored Bids">Advertising & Sponsored Campaign Bids</option>
                  <option value="Review Vetting Support">Review Verification Support</option>
                  <option value="Other / General Feedback">Other / General Feedback</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Your Message / Proposal *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about your campaign details or platform review inquiry..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50 leading-relaxed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition duration-200 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Transmit Secure Proposal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
