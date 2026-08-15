import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Scale, FileText, AlertTriangle } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export const TermsView: React.FC = () => {
  const { theme } = useTheme();
  const brandName = theme.globalSettings.logoText || "Eker Listings";

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-500 font-sans text-left">
      {/* Header section */}
      <div className="text-center space-y-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm mb-2">
          <Scale className="h-7 w-7" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          Terms of Service
        </h1>
        <p className="text-sm md:text-base text-slate-500 font-medium max-w-xl mx-auto">
          Please read these terms carefully before accessing our directory, casino reviews, and promotion listings.
        </p>
        <div className="text-[10px] font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-full inline-block">
          Last Updated: July 2026
        </div>
      </div>

      {/* 18+ Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col sm:flex-row items-start gap-4 shadow-xs">
        <div className="text-3xl shrink-0">🔞</div>
        <div className="space-y-1.5">
          <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Strict Age Requirement: 18+ Only
          </h3>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            Access to {brandName} and its content is strictly restricted to individuals who are 18 years of age or older (or the legal age for gambling in your jurisdiction). By using this platform, you verify that you meet this age requirement.
          </p>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-10 space-y-8 shadow-xs text-slate-600">
        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-600 pl-3">
            1. Agreement to Terms
          </h2>
          <p className="text-xs leading-relaxed font-medium pl-4 text-slate-500">
            By accessing or using {brandName}, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this website are protected by applicable copyright and trademark law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-600 pl-3">
            2. Affiliate & Broker Disclaimer
          </h2>
          <p className="text-xs leading-relaxed font-medium pl-4 text-slate-500">
            {brandName} is an independent online casino directory and affiliate broker. We do not operate an online casino, we do not accept real-money bets, nor do we handle financial transactions between players and casino operators. All referral links, welcome bonuses, and match promotions redirect users to licensed third-party casino operators.
          </p>
          <p className="text-xs leading-relaxed font-medium pl-4 text-slate-500">
            While we strive to keep all listed promotions, cashbacks, and codes up to date, casino operators frequently change their promotions. We cannot be held responsible for incorrect information, expired offers, or issues experienced on external operator websites.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-600 pl-3">
            3. Accuracy of Listings & User Submissions
          </h2>
          <p className="text-xs leading-relaxed font-medium pl-4 text-slate-500">
            Users may submit jackpot and winnings screenshots to our Jackpot Winner Gallery. By submitting a screenshot, you warrant that the image is authentic, belongs to you, and does not violate any third-party rights. We reserve the absolute right to moderate, approve, or delete any user submissions at our discretion to protect player trust and maintain compliance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-600 pl-3">
            4. Limitation of Liability
          </h2>
          <p className="text-xs leading-relaxed font-medium pl-4 text-slate-500">
            In no event shall {brandName} or its owners be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on {brandName}, even if we have been notified orally or in writing of the possibility of such damage.
          </p>
          <p className="text-xs leading-relaxed font-medium pl-4 text-slate-500">
            Gambling involves substantial financial risk. You should only gamble with money you can afford to lose. We are not liable for any losses incurred at third-party online casinos recommended or listed on our platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-600 pl-3">
            5. Governing Law
          </h2>
          <p className="text-xs leading-relaxed font-medium pl-4 text-slate-500">
            Any claim relating to {brandName} shall be governed by the laws of our jurisdiction without regard to its conflict of law provisions.
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
        <Link to="/responsible-gaming" className="w-full sm:w-auto">
          <button className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all active:scale-97 cursor-pointer text-center">
            Responsible Gaming Info
          </button>
        </Link>
      </div>
    </div>
  );
};
