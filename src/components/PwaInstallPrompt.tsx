import React, { useState, useEffect } from "react";
import { Download, Sparkles, X, Smartphone, ArrowRight, Info, HelpCircle, Monitor, Compass, ShieldCheck } from "lucide-react";

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem("pwa_prompt_dismissed") === "true";
  });
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Detect if app is currently loaded inside an iframe (like AI Studio preview panel)
    const checkIframe = () => {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    };
    setIsInIframe(checkIframe());

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      // Dispatch custom event to notify any other component that install prompt is available
      window.dispatchEvent(new CustomEvent("pwa-prompt-available"));
      // Show the install banner if not dismissed before
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      console.log("PWA was installed successfully");
      setIsVisible(false);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Provide a global helper trigger
    (window as any).triggerPwaInstall = () => {
      const activePrompt = (window as any).deferredPrompt || deferredPrompt;
      if (activePrompt) {
        activePrompt.prompt();
        activePrompt.userChoice.then((choiceResult: any) => {
          console.log(`User response to install prompt: ${choiceResult.outcome}`);
          if (choiceResult.outcome === "accepted") {
            (window as any).deferredPrompt = null;
            setDeferredPrompt(null);
            setIsVisible(false);
          }
        });
      } else {
        // If automatic prompt is not available, show manual step-by-step guidance
        setShowInstructions(true);
      }
    };

    // If already in standalone mode, hide prompts
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setIsVisible(false);
    } else {
      // Always show banner after 3 seconds on standard browser so user is aware of the option
      const timer = setTimeout(() => {
        if (!isDismissed) {
          setIsVisible(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      delete (window as any).triggerPwaInstall;
    };
  }, [isDismissed, deferredPrompt]);

  const handleInstallClick = () => {
    const activePrompt = (window as any).deferredPrompt || deferredPrompt;
    if (activePrompt) {
      activePrompt.prompt();
      activePrompt.userChoice.then((choiceResult: any) => {
        console.log(`User response: ${choiceResult.outcome}`);
        if (choiceResult.outcome === "accepted") {
          setDeferredPrompt(null);
          (window as any).deferredPrompt = null;
          setIsVisible(false);
        }
      });
    } else {
      // Prompt not available (common in iOS, Chrome inside iframe, or unsupported browsers)
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa_prompt_dismissed", "true");
    setIsDismissed(true);
  };

  return (
    <>
      {/* Visual Install Prompt Toast at bottom */}
      {isVisible && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-white border border-indigo-100 rounded-2xl shadow-[0_12px_40px_rgba(79,70,229,0.18)] z-50 p-4 animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-full p-1 shadow-md animate-bounce">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Smartphone className="h-6 w-6 text-indigo-500 animate-pulse" />
            </div>
            
            <div className="flex-1 space-y-1 text-left">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight flex items-center gap-1">
                  RefDirect অ্যাপ ইনস্টল করুন 📱
                </h4>
                <button
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed">
                আপনার অ্যান্ড্রয়েড ফোনে সরাসরি হোম স্ক্রিনে অ্যাপের মতো ব্যবহার করতে এবং ১-ক্লিকে ব্রাউজারে চালু করতে ইনস্টল করুন।
              </p>

              {isInIframe && (
                <p className="text-[10px] text-amber-600 font-bold bg-amber-50 rounded-lg p-1.5 mt-1 border border-amber-100 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>আইফ্রেমের ভেতরে ইনস্টল হবে না। অনুগ্রহ করে উপরের "Open in new tab" আইকনে ক্লিক করে নতুন ট্যাবে ওপেন করুন!</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-md active:scale-97 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ইনস্টল করুন / Install Now</span>
            </button>
            <button
              onClick={() => setShowInstructions(true)}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>সহায়তা</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Installation Steps Help Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-[110] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-5 relative">
              <button
                onClick={() => setShowInstructions(false)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-2xl border border-white/20">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight">মোবাইলে কীভাবে ইনস্টল করবেন?</h3>
                  <p className="text-[11px] text-indigo-100 font-medium">সহজ ২-ধাপে অ্যাপটি আপনার স্ক্রিনে যোগ করুন</p>
                </div>
              </div>
            </div>

            {/* Steps Body */}
            <div className="p-6 space-y-5">
              
              {isInIframe && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex gap-2.5 items-start">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h5 className="text-xs font-black text-amber-900">গুরুত্বপূর্ণ সতর্কতা:</h5>
                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed mt-0.5">
                      আপনি বর্তমানে এই অ্যাপটি একটি <strong>Iframe / Preview Box</strong> এর ভেতরে দেখছেন। এখানে সরাসরি ডাউনলোড বা ইনস্টল করা যাবে না। 
                    </p>
                    <p className="text-[11px] text-indigo-600 font-bold mt-1.5 underline cursor-pointer" onClick={() => window.open(window.location.href, "_blank")}>
                      👉 এখানে ক্লিক করে নতুন ট্যাবে অ্যাপটি ওপেন করুন, তারপর নিচের নিয়মে ইনস্টল করুন।
                    </p>
                  </div>
                </div>
              )}

              {/* Instructions list */}
              <div className="space-y-4">
                {/* Method 1: Chrome / Android */}
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    ১
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-emerald-500" />
                      <span>অ্যান্ড্রয়েড (Google Chrome) ব্যবহারকারীদের জন্য:</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                      ১. প্রথমে অ্যাপটি <strong className="text-indigo-600">গুগল ক্রোম (Chrome)</strong> ব্রাউজারে ওপেন করুন।<br />
                      ২. ব্রাউজারের উপরে ডানদিকের <strong className="text-slate-800">৩টি ডট (মেনু)</strong> আইকনে ক্লিক করুন।<br />
                      ৩. মেনু থেকে <strong className="text-indigo-600">"Install app"</strong> অথবা <strong className="text-indigo-600">"Add to Home Screen"</strong> অপশনে চাপ দিন।<br />
                      ৪. স্ক্রিনে একটি পপ-আপ আসবে, সেখানে <strong className="text-slate-800">"Install"</strong> বাটনে ক্লিক করলেই অ্যাপটি ডাউনলোড ও ইনস্টল হয়ে যাবে!
                    </p>
                  </div>
                </div>

                {/* Method 2: iOS / Safari */}
                <div className="flex gap-3 border-t border-slate-100 pt-3">
                  <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    ২
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Monitor className="w-4 h-4 text-sky-500" />
                      <span>আইফোন (iOS Safari) ব্যবহারকারীদের জন্য:</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                      ১. অ্যাপটি অবশ্যই <strong className="text-indigo-600">Safari</strong> ব্রাউজারে ওপেন করুন।<br />
                      ২. ব্রাউজারের নিচের দিকে থাকা <strong className="text-slate-800">"Share" (শেয়ার)</strong> বাটনে ক্লিক করুন।<br />
                      ৩. মেনুটি স্ক্রোল করে নিচের দিকে গিয়ে <strong className="text-indigo-600">"Add to Home Screen"</strong> চাপুন।<br />
                      ৪. উপরে ডানে <strong className="text-slate-800">"Add"</strong> বাটনে ক্লিক করলেই আপনার ফোনে আইকন হিসেবে সেভ হয়ে যাবে!
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Badge */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 flex items-center gap-2 justify-center">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span className="text-[10px] text-slate-500 font-bold tracking-tight uppercase">
                  Safe & Secure PWA Technology • No Play Store Needed
                </span>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-2">
              <button
                onClick={() => {
                  if (!isInIframe) {
                    const activePrompt = (window as any).deferredPrompt || deferredPrompt;
                    if (activePrompt) {
                      activePrompt.prompt();
                    }
                  } else {
                    window.open(window.location.href, "_blank");
                  }
                  setShowInstructions(false);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-sm transition active:scale-97 cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isInIframe ? "নতুন ট্যাবে ওপেন করুন" : "ইনস্টল করার চেষ্টা করুন"}</span>
              </button>
              <button
                onClick={() => setShowInstructions(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default PwaInstallPrompt;

