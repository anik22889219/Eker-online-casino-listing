import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, HelpCircle, FileText, Heart } from "lucide-react";

export const HomeFooter: React.FC = () => {
  return (
    <footer className="border-t border-slate-100 bg-white pt-12 pb-8 mt-16 text-slate-500 text-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Col 1: Brand declaration */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-650 text-white font-extrabold shadow-sm">
                E
              </div>
              <span className="font-sans font-black text-slate-900 text-base tracking-tight leading-none">
                Eker Casino Listings
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Eker is a premium global affiliate directory. We review, rate, and index verified online casino brands to bring players safe, reliable, and high-converting signup promotions.
            </p>
            
            {/* Responsible Gambling labels */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600">
                18+
              </span>
              <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                BeGambleAware.org
              </span>
              <span className="inline-flex items-center rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-800">
                GamCare Certified
              </span>
            </div>
          </div>

          {/* Col 2: Directory filters */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Main Directory</h4>
            <ul className="space-y-2 text-slate-400 font-semibold text-xs">
              <li>
                <Link to="/" className="hover:text-indigo-600 transition">All Listed Casinos</Link>
              </li>
              <li>
                <span className="text-slate-300">Featured Slots (VIP)</span>
              </li>
              <li>
                <span className="text-slate-300">Live Table Operators</span>
              </li>
              <li>
                <span className="text-slate-300">Direct Cashback Codes</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Compliance & Legal */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Trust & Legal</h4>
            <ul className="space-y-2 text-slate-400 font-semibold text-xs">
              <li>
                <span className="text-slate-300 cursor-not-allowed">Terms of Service</span>
              </li>
              <li>
                <span className="text-slate-300 cursor-not-allowed">Privacy Policy</span>
              </li>
              <li>
                <span className="text-slate-300 cursor-not-allowed">Responsible Gaming</span>
              </li>
              <li>
                <Link to="/admin" className="text-indigo-600 hover:underline">Creator Portal (Admin)</Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Disclaimer Warning */}
        <div className="border-t border-slate-50 pt-6 pb-4 text-[10px] text-slate-400 leading-relaxed space-y-2">
          <p>
            <strong>Disclaimer:</strong> Gambling carries risk. All promotional welcome offers, match bonuses, and free trials listed are subject to terms and conditions (T&Cs) of the respective operators. We strongly endorse responsible gaming practices. If you or someone you know is struggling with a gaming addiction, please seek support from BeGambleAware.org or GamCare.
          </p>
          <p>
            © {new Date().getFullYear()} Eker Online Casino Listing. Supported by RefDirect Cloud Broker services. All rights reserved.
          </p>
        </div>

        {/* Powered by */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-300 border-t border-slate-50 pt-4 mt-4">
          <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
          <span>Crafted for high conversions & player trust</span>
        </div>

      </div>
    </footer>
  );
};

export default HomeFooter;
