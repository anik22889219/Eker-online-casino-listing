import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { MostWinningGameItem, ThemeSection } from "../../types/firestore";

interface MostWinningGamesSectionProps {
  config: ThemeSection;
  games: MostWinningGameItem[];
}

const slugifyGame = (name: string, id: string) => {
  if (!name || !name.trim()) return id;
  const slug = name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || id;
};

export const MostWinningGamesSection: React.FC<MostWinningGamesSectionProps> = ({ config, games }) => {
  if (!games || games.length === 0) {
    return null;
  }

  // Ensure base list has enough items so marquee fills any screen width smoothly
  let baseList = [...games];
  while (baseList.length < 8 && baseList.length > 0) {
    baseList = [...baseList, ...games];
  }
  // Duplicate baseList into 2 identical halves for seamless 0% -> -50% marquee loop
  const marqueeItems = [...baseList, ...baseList];

  return (
    <section 
      id={config.id} 
      className="py-1 animate-fade-in text-left overflow-hidden"
    >
      {/* Marquee container with edge fade gradients */}
      <div className="relative w-full overflow-hidden group">
        {/* Left & Right gradient fades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 sm:w-16 z-10 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 sm:w-16 z-10 bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent" />

        {/* Marquee sliding track */}
        <div className="flex gap-3 sm:gap-4 animate-marquee py-2">
          {marqueeItems.map((game, idx) => (
            <div
              key={`${game.id}-${idx}`}
              className="w-40 sm:w-48 shrink-0 group/card relative bg-white border border-slate-200/80 hover:border-indigo-400 rounded-2xl overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
            >
              <Link
                to={`/game/${slugifyGame(game.name, game.id)}`}
                className="block w-full h-full flex flex-col text-center"
              >
                {/* Game Image */}
                <div className="aspect-4/3 w-full bg-slate-900 relative overflow-hidden shrink-0 flex items-center justify-center p-2">
                  <img
                    src={
                      game.logoUrl ||
                      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200"
                    }
                    alt={game.name}
                    className="w-full h-full object-contain group-hover/card:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-amber-400 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-amber-400/20 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    HOT
                  </div>
                </div>

                {/* Content below image: Game Name & Brand Name (Center aligned, no Play Game text) */}
                <div className="p-2.5 sm:p-3 bg-white flex-1 flex flex-col justify-center items-center text-center space-y-0.5">
                  <h3 className="font-display font-black text-slate-900 text-xs sm:text-sm truncate uppercase tracking-tight group-hover/card:text-indigo-600 transition-colors w-full text-center">
                    {game.name}
                  </h3>
                  {game.brandName && (
                    <p className="text-[11px] text-slate-500 font-semibold truncate w-full text-center">
                      {game.brandName}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};


