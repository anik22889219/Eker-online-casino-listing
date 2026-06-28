import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "How does the Eker Casino Listings validation process work?",
    a: "Every casino list added to our catalog passes a rigorous 5-stage vetting protocol. We verify their regulatory licensing, testing-lab payout certifications, payment-processing speed, direct interactive support desks, and overall promotional transparency. Only brands scoring a score of 85+ are published.",
  },
  {
    q: "How do I claim a promotional Welcome Bonus?",
    a: "Simple! Find the casino of your choice on our directory, and click 'Claim Bonus'. The referral tracking link automatically directs you to the operator's secure landing with the promotion embedded. In cases where an explicit code exists, copy it from the card and insert it during registration.",
  },
  {
    q: "Are there any hidden service costs involved with your platform?",
    a: "Absolutely not. Our platform is 100% free of charge to players and users. We operate as an affiliate directory partner. This means when you click and claim offers through our verified links, we may receive compensation from the operators, allowing us to keep our deep reviews and screenshots program entirely free.",
  },
  {
    q: "How does the 'Sell Your Winning Screenshot' CTA work?",
    a: "If you hit a big jackpot, high-roller multiplier, or lucky run on any of our listed casinos, you can submit a screenshot of your win slip through our portal. Once verified by our support desk to ensure authentication, we acquire the publishing rights from you. We pay you a pre-agreed bonus directly to your preferred wallet.",
  },
  {
    q: "Can I play at these casinos from my specific country?",
    a: "Each listing card features a country label representing the primary accessible geo. However, local gambling laws apply. We strongly recommend filtering by your specific country using our dropdown selector in the search console to ensure 100% compatible play.",
  },
];

export const HomeFaq: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <HelpCircle className="h-5.5 w-5.5 text-indigo-600" />
          Frequently Asked Questions
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Get transparent answers about casino licensing, welcome rewards, and how we validate listings.
        </p>
      </div>

      <div className="space-y-3 max-w-4xl mx-auto">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className={`rounded-2xl border transition duration-200 overflow-hidden ${
                isOpen ? "border-indigo-100 bg-indigo-50/10 shadow-xs" : "border-slate-100 bg-white hover:border-slate-200"
              }`}
            >
              <button
                id={`faq-toggle-${index}`}
                type="button"
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-bold text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20 cursor-pointer"
                onClick={() => toggleAccordion(index)}
                aria-expanded={isOpen}
              >
                <span>{item.q}</span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-indigo-600 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                )}
              </button>

              <div
                id={`faq-content-${index}`}
                className={`transition-all duration-300 ease-in-out ${
                  isOpen ? "max-h-40 border-t border-slate-50 p-5 bg-white text-xs leading-relaxed text-slate-600" : "max-h-0 overflow-hidden"
                }`}
              >
                <p>{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HomeFaq;
