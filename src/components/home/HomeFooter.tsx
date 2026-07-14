import React from "react";
import { Link } from "react-router-dom";
import { Heart, Smartphone, Download } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export const HomeFooter: React.FC = () => {
  const { theme } = useTheme();
  const settings = theme.globalSettings;

  return (
    <footer className="border-t border-slate-200/50 bg-white pt-12 pb-8 mt-16 text-slate-500 text-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Col 1: Brand declaration */}
          <div className="space-y-4 md:col-span-2 text-left">
            <div className="flex items-center gap-2">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.logoText || "Logo"}
                  className="h-14 md:h-16 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <>
                  <div 
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-extrabold shadow-xs text-base"
                    style={{ backgroundColor: "var(--color-brand-primary)" }}
                  >
                    {settings.faviconText ? settings.faviconText.trim() : (settings.logoText ? settings.logoText[0] : "E")}
                  </div>
                  <span className="font-sans font-black text-slate-900 text-base tracking-tight leading-none">
                    {settings.logoText || "Eker Listings"}
                  </span>
                </>
              )}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              {settings.logoText || "Eker"} is a premium global affiliate directory. We review, rate, and index verified online casino brands to bring players safe, reliable, and high-converting signup promotions.
            </p>
            
            {/* Responsible Gambling labels */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600">
                18+
              </span>
              <a 
                href="https://www.begambleaware.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md bg-amber-50 border border-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 hover:bg-amber-100 transition-colors"
              >
                BeGambleAware.org
              </a>
              <a 
                href="https://www.gamcare.org.uk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-800 hover:bg-indigo-100 transition-colors"
              >
                GamCare Certified
              </a>
            </div>
          </div>

          {/* Col 2: Directory filters */}
          <div className="space-y-3 text-left">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Main Directory</h4>
            <ul className="space-y-2 text-slate-400 font-semibold text-xs">
              <li>
                <Link to="/" className="hover:text-indigo-600 transition">All Listed Casinos</Link>
              </li>
              <li>
                <Link to="/" className="hover:text-indigo-600 transition">Featured Slots (VIP)</Link>
              </li>
              <li>
                <Link to="/" className="hover:text-indigo-600 transition">Live Table Operators</Link>
              </li>
              <li>
                <Link to="/jackpot-listing" className="hover:text-indigo-600 transition text-indigo-600 font-extrabold flex items-center gap-1">
                  <span>Submit Jackpot Screenshot</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Compliance & Legal */}
          <div className="space-y-3 text-left">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Trust & Legal</h4>
            <ul className="space-y-2 text-slate-400 font-semibold text-xs">
              <li>
                <Link to="/terms" className="hover:text-indigo-600 transition">Terms of Service</Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-indigo-600 transition">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/responsible-gaming" className="hover:text-indigo-600 transition">Responsible Gaming</Link>
              </li>
              <li>
                <Link to="/admin" className="text-indigo-600 hover:underline">Creator Portal (Admin)</Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Download App CTA Banner */}
        <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50 border border-indigo-100 rounded-2xl p-4 sm:p-5 mb-8 text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Smartphone className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                RefDirect অ্যান্ড্রয়েড অ্যাপ ইনস্টল করুন 📱
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed mt-0.5">
                আপনার অ্যান্ড্রয়েড স্ক্রিনে সরাসরি অ্যাপের মতো দ্রুত লোড পেতে এবং ব্রাউজার ছাড়াই সরাসরি ব্যবহার করতে ইনস্টল করুন।
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              if ((window as any).triggerPwaInstall) {
                (window as any).triggerPwaInstall();
              } else {
                alert("আপনার ব্রাউজারে ইনস্টল ফিচারটি এই মুহূর্তে প্রস্তুত নয়। অনুগ্রহ করে ক্রোম/ডিফল্ট ব্রাউজার ব্যবহার করুন অথবা ব্রাউজার মেনু থেকে 'Add to Home Screen' চাপুন।");
              }
            }}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer w-full md:w-auto shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>ইনস্টল করুন / Install App</span>
          </button>
        </div>

        {/* Disclaimer Warning */}
        <div className="border-t border-slate-100 pt-6 pb-4 text-[10px] text-slate-400 leading-relaxed space-y-2 text-left">
          <p>
            <strong>Disclaimer:</strong> Gambling carries risk. All promotional welcome offers, match bonuses, and free trials listed are subject to terms and conditions (T&Cs) of the respective operators. We strongly endorse responsible gaming practices. If you or someone you know is struggling with a gaming addiction, please seek support from BeGambleAware.org or GamCare.
          </p>
          <p>
            © {new Date().getFullYear()} {settings.logoText || "Eker"} Online Casino Listing. Supported by RefDirect Cloud Broker services. All rights reserved.
          </p>
        </div>

        {/* Powered by */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-slate-300 border-t border-slate-100 pt-4 mt-4">
          <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
          <span>Crafted for high conversions & player trust</span>
        </div>

      </div>
    </footer>
  );
};

export default HomeFooter;
