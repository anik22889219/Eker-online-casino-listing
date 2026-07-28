import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Lock, Eye, CheckCircle2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export const PrivacyView: React.FC = () => {
  const { theme } = useTheme();
  const brandName = theme.globalSettings.logoText || "Eker Listings";

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-500 font-sans text-left">
      {/* Header section */}
      <div className="text-center space-y-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 shadow-sm mb-2">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          Privacy Policy
        </h1>
        <p className="text-sm md:text-base text-slate-500 font-medium max-w-xl mx-auto">
          Your privacy matters to us. Learn how {brandName} collects, protects, and handles your information.
        </p>
        <div className="text-[10px] font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-full inline-block">
          Last Updated: July 2026
        </div>
      </div>

      {/* Trust Badge Banner */}
      <div className="bg-teal-50/70 border border-teal-100 rounded-3xl p-6 flex flex-col sm:flex-row items-start gap-4 shadow-xs">
        <div className="text-3xl shrink-0">🛡️</div>
        <div className="space-y-1.5">
          <h3 className="text-xs font-black text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
            Safe & Transparent Data Policies
          </h3>
          <p className="text-xs text-teal-850 leading-relaxed font-medium">
            We operate fully under privacy best practices. We do not sell user personal data, we minimize tracking cookies, and we ensure security for user profiles and uploaded jackpot winner screenshots.
          </p>
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-10 space-y-8 shadow-xs text-slate-600">
        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-teal-500 pl-3">
            1. Information We Collect
          </h2>
          <p className="text-xs leading-relaxed font-medium pl-4 text-slate-500">
            When you browse {brandName}, we may collect minimal data to run our referral broker engine:
          </p>
          <ul className="list-none pl-4 space-y-2 pt-1 text-xs font-semibold text-slate-500">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
              <span><strong>Account Credentials:</strong> Email, Display Name, and Password (hashed securely via Firebase Auth) when registering.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
              <span><strong>Screenshots:</strong> Winning screenshots and metadata you upload voluntarily to the Jackpot Winner Gallery.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
              <span><strong>Click Tracking:</strong> Total times links are clicked (used for analytics and conversion rate statistics for our directory).</span>
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-teal-500 pl-3">
            2. Cookies & Tracker Disclosures
          </h2>
          <p className="text-xs leading-relaxed font-medium pl-4 text-slate-500">
            We use localized, secure cookies to save your user session, maintain your 18+ age verification consent state (`age_verified` localStorage), and track basic outbound affiliate link routing stats. You can disable cookies in your web browser, but some features such as logging in or maintaining layout preferences may be limited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-teal-500 pl-3">
            3. Third-Party Link Redirection
          </h2>
          <p className="text-xs leading-relaxed font-medium pl-4 text-slate-500">
            Our app includes various links to third-party licensed casino websites. Once you click these links and leave {brandName}, we have no control over the privacy guidelines, tracking systems, or security protocols of those respective operators. Please review their privacy policy agreements separately.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-teal-500 pl-3">
            4. Security of Information
          </h2>
          <p className="text-xs leading-relaxed font-medium pl-4 text-slate-500">
            We protect your registration and profile records using industry-leading Firebase database rules and standard HTTPS protocols. No method of internet transmission is 100% secure, but we implement every precaution to safeguard database state from unauthorized access.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-teal-500 pl-3">
            5. User Rights (GDPR & CCPA)
          </h2>
          <p className="text-xs leading-relaxed font-medium pl-4 text-slate-500">
            You hold full rights to view, request, or permanently delete your account data. If you have registered a profile or submitted screenshots and wish to erase them from our cloud database, please contact our support desk directly, and our team will process your request within 48 hours.
          </p>
        </section>
      </div>

      {/* Button controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link to="/" className="w-full sm:w-auto">
          <button className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-97 cursor-pointer text-center">
            Return to Directory Home
          </button>
        </Link>
        <Link to="/contact" className="w-full sm:w-auto">
          <button className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all active:scale-97 cursor-pointer text-center">
            Contact Support Desk
          </button>
        </Link>
      </div>
    </div>
  );
};
