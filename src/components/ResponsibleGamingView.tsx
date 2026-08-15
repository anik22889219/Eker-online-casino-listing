import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Heart, PhoneCall, HelpCircle, CheckSquare } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export const ResponsibleGamingView: React.FC = () => {
  const { theme } = useTheme();
  const brandName = theme.globalSettings.logoText || "Eker Listings";

  // Self assessment items
  const selfAssessmentQuestions = [
    "Do you spend more time or money gambling than you can comfortably afford?",
    "Do you find it difficult to stop gambling once you have started?",
    "Have you ever lied to family or friends about how much you gamble?",
    "Do you gamble to escape anxiety, boredom, stress, or sadness?",
    "Have you ever borrowed money or sold personal items to fund your gambling?",
    "Do you attempt to chase back previous gambling losses?"
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-500 font-sans text-left">
      {/* Header section */}
      <div className="text-center space-y-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-sm mb-2">
          <Heart className="h-7 w-7 fill-rose-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
          Responsible Gaming
        </h1>
        <p className="text-sm md:text-base text-slate-500 font-medium max-w-xl mx-auto">
          We want your gaming experience to be enjoyable and safe. Understand your habits, set boundaries, and access support.
        </p>
        <div className="text-[10px] font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-full inline-block">
          Play Safely, Play Within Limits
        </div>
      </div>

      {/* Immediate Helpline Info Banner */}
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="flex gap-4 items-start text-left">
          <div className="text-4xl shrink-0">☎️</div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
              Need Immediate Help or Counseling?
            </h3>
            <p className="text-xs text-rose-850 leading-relaxed font-medium">
              If gambling is causing issues in your life, you can speak confidentially with experienced advisors 24/7. These support networks provide professional counseling completely free.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <a
            href="https://www.begambleaware.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-sm"
          >
            BeGambleAware Online Help
          </a>
          <a
            href="https://www.gamcare.org.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center bg-white hover:bg-slate-50 text-rose-700 border border-rose-200 font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-xs"
          >
            GamCare Live Chat
          </a>
        </div>
      </div>

      {/* Main Grid Layout: self-assessment checklist and tips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Self-assessment and Guideline rules */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Self assessment checklist */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
            <h2 className="text-xs font-black text-slate-950 uppercase tracking-widest border-l-4 border-rose-500 pl-3">
              Player Self-Assessment Checklist
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              If you are unsure whether your gaming behavior is crossing into a problematic area, take a moment to ask yourself the following questions:
            </p>
            <div className="space-y-3.5 pt-2">
              {selfAssessmentQuestions.map((q, idx) => (
                <div key={idx} className="flex gap-3 items-start bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                  <CheckSquare className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold text-slate-600 leading-normal">{q}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 italic font-medium leading-relaxed">
              *If you answered &quot;Yes&quot; to even one of these questions, we encourage you to take advantage of self-exclusion tools or reach out to the professional support services listed on this page.
            </p>
          </div>

          {/* Safer gaming guidelines */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
            <h2 className="text-xs font-black text-slate-950 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">
              5 Golden Rules of Safer Gaming
            </h2>
            
            <div className="space-y-5 pt-2">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-extrabold text-xs shrink-0">1</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-0.5">Set Budget Limits First</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Determine exactly how much you can afford to spend before you start playing, and never cross that threshold.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-extrabold text-xs shrink-0">2</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-0.5">Don&apos;t Chase Losses</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Chasing lost funds always increases risks of worse outcomes. Accept that losses can occur and log off when your budget is reached.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-extrabold text-xs shrink-0">3</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-0.5">Keep Track of Time</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">It&apos;s easy to lose track of time when playing slots or tables. Set alarms or timers to check in with reality regularly.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-extrabold text-xs shrink-0">4</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-0.5">Never Play While Emotional or Influenced</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Avoid playing online casinos when feeling depressed, anxious, angry, or under the influence of substances which lower decision-making control.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-extrabold text-xs shrink-0">5</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-0.5">Use Self-Exclusion Options</h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">All reputable licensed casino platforms offer custom deposit blocks, cooling-off breaks, and full self-exclusion forms inside settings.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right 1 Column: Directory support contacts */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 space-y-6 shadow-md border border-slate-800 text-left">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-400">Global Help Centers</h3>
            
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-4">
                <h4 className="text-xs font-bold text-white mb-1">GamCare Helpline</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-2">Available 24 hours over free phone line or dynamic online support room in the United Kingdom.</p>
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                  <PhoneCall className="h-3.5 w-3.5" />
                  <span>0808 8020 133</span>
                </div>
              </div>

              <div className="border-b border-slate-800 pb-4">
                <h4 className="text-xs font-bold text-white mb-1">Gambling Therapy</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-2">A global service offering secure advice groups, direct emails, and support forums in over 30 languages.</p>
                <a 
                  href="https://www.gamblingtherapy.org" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[11px] font-bold text-rose-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>gamblingtherapy.org</span>
                  <span>→</span>
                </a>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white mb-1">Gamblers Anonymous</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-2">A fellowship of men and women who share their experiences and support each other to recover from gaming addictions.</p>
                <a 
                  href="https://www.gamblersanonymous.org" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[11px] font-bold text-rose-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>gamblersanonymous.org</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-xs">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Our Commitment</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
              At {brandName}, we pledge to maintain compliant listings, avoid targeting minors, and keep our player resources clear and accurate.
            </p>
            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
              <span>🔞 Be Safe</span>
            </div>
          </div>
        </div>

      </div>

      {/* Button controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link to="/" className="w-full sm:w-auto">
          <button className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-97 cursor-pointer text-center">
            Return to Directory Home
          </button>
        </Link>
        <Link to="/terms" className="w-full sm:w-auto">
          <button className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all active:scale-97 cursor-pointer text-center">
            Review Terms of Service
          </button>
        </Link>
      </div>
    </div>
  );
};
