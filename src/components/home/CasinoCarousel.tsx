import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Casino } from "../../types/firestore";
import CasinoCard from "./CasinoCard";

interface CasinoCarouselProps {
  casinos: Casino[];
  displayCount?: number;
  slideCount?: number;
  autoSlide?: boolean;
  slideSpeed?: number;
}

export const CasinoCarousel: React.FC<CasinoCarouselProps> = ({ 
  casinos,
  displayCount = 4,
  slideCount = 1,
  autoSlide = true,
  slideSpeed = 3000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(displayCount);
  const [isPaused, setIsPaused] = useState(false);

  // Update visible count based on screen size dynamically
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setVisibleCount(Math.min(2, displayCount)); // Mobile: 2 cards max
      } else if (window.innerWidth < 1024) {
        setVisibleCount(Math.min(3, displayCount)); // Tablet: 3 cards max
      } else {
        setVisibleCount(displayCount); // Desktop: User configured displayCount
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [displayCount]);

  const maxIndex = Math.max(0, casinos.length - visibleCount);

  // Auto-slide based on slideSpeed and autoSlide toggles unless paused on hover
  useEffect(() => {
    if (casinos.length <= visibleCount || isPaused || !autoSlide) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : Math.min(maxIndex, prev + slideCount)));
    }, slideSpeed);

    return () => clearInterval(timer);
  }, [casinos.length, visibleCount, isPaused, maxIndex, autoSlide, slideSpeed, slideCount]);

  // Adjust current index if screen resize makes it out of bounds
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [visibleCount, currentIndex, maxIndex]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : Math.min(maxIndex, prev + slideCount)));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : Math.max(0, prev - slideCount)));
  };

  const goToPage = (index: number) => {
    setCurrentIndex(Math.min(index, maxIndex));
  };

  if (!casinos || casinos.length === 0) return null;

  // Total pages/positions available to slide to
  const totalPages = maxIndex + 1;

  return (
    <div 
      className="relative group/carousel w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Outer wrapper that clips content but allows negative horizontal margins */}
      <div className="overflow-hidden rounded-3xl p-1 -mx-2 sm:-mx-3 px-2 sm:px-3">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`,
          }}
        >
          {casinos.map((c) => (
            <div
              key={c.id}
              className="shrink-0 px-2 sm:px-3"
              style={{
                width: `${100 / visibleCount}%`,
              }}
            >
              <CasinoCard casino={c} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {casinos.length > visibleCount && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 sm:-left-5 top-1/2 -translate-y-1/2 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition-all hover:bg-indigo-50 hover:text-indigo-600 focus:outline-hidden cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 sm:-right-5 top-1/2 -translate-y-1/2 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition-all hover:bg-indigo-50 hover:text-indigo-600 focus:outline-hidden cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {totalPages > 1 && (
        <div className="mt-5 flex justify-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === i ? "w-6 bg-indigo-600" : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CasinoCarousel;
