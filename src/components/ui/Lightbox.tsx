import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Eye,
} from "lucide-react";

export interface LightboxImageItem {
  src: string;
  alt?: string;
  title?: string;
  subtitle?: string;
}

export interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  // Can pass single image or array of images
  image?: string | LightboxImageItem;
  images?: (string | LightboxImageItem)[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
}

export const Lightbox: React.FC<LightboxProps> = ({
  isOpen,
  onClose,
  image,
  images: inputImages,
  initialIndex = 0,
  title: globalTitle,
  subtitle: globalSubtitle,
}) => {
  // Normalize image list
  const normalizedImages: LightboxImageItem[] = React.useMemo(() => {
    if (inputImages && inputImages.length > 0) {
      return inputImages.map((img) =>
        typeof img === "string" ? { src: img } : img
      );
    }
    if (image) {
      return [typeof image === "string" ? { src: image } : image];
    }
    return [];
  }, [image, inputImages]);

  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(true);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, normalizedImages.length - 1)));
      resetTransform();
    }
  }, [isOpen, initialIndex, normalizedImages.length]);

  const currentItem = normalizedImages[currentIndex];

  const resetTransform = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setImageError(false);
    setImageLoading(true);
  }, []);

  // Reset zoom & pan when image changes
  useEffect(() => {
    resetTransform();
  }, [currentIndex, resetTransform]);

  // Handle Keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (normalizedImages.length > 1) {
            handlePrev();
          }
          break;
        case "ArrowRight":
          if (normalizedImages.length > 1) {
            handleNext();
          }
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
        case "_":
          handleZoomOut();
          break;
        case "0":
          resetTransform();
          break;
        default:
          break;
      }
    },
    [isOpen, normalizedImages.length, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || normalizedImages.length === 0 || !currentItem) {
    return null;
  }

  const activeTitle = currentItem.title || globalTitle || currentItem.alt || "Image Viewer";
  const activeSubtitle = currentItem.subtitle || globalSubtitle;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % normalizedImages.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + normalizedImages.length) % normalizedImages.length);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.3, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(prev - 0.3, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDoubleTap = () => {
    if (zoom > 1) {
      resetTransform();
    } else {
      setZoom(2.2);
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || zoom <= 1 || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Download image helper
  const handleDownload = async () => {
    try {
      const response = await fetch(currentItem.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // create safe filename
      const filename =
        (activeTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "download_image") + ".jpg";
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(currentItem.src, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/92 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900/80 border-b border-slate-800/80 z-20 text-white gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="truncate">
            <h3 className="text-sm font-black tracking-tight text-slate-100 truncate">
              {activeTitle}
            </h3>
            {activeSubtitle && (
              <p className="text-[11px] font-medium text-slate-400 truncate">
                {activeSubtitle}
              </p>
            )}
          </div>
          {normalizedImages.length > 1 && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              {currentIndex + 1} / {normalizedImages.length}
            </span>
          )}
        </div>

        {/* Control Action Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-extrabold text-slate-300 min-w-[3rem] text-center hidden sm:inline">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            disabled={zoom >= 4}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleRotate}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {zoom !== 1 || rotation !== 0 ? (
            <button
              onClick={resetTransform}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-400 transition cursor-pointer"
              title="Reset View (0)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          ) : null}

          <div className="w-px h-5 bg-slate-800 mx-1 hidden sm:block" />

          <button
            onClick={handleDownload}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition cursor-pointer hidden sm:flex"
            title="Download Image"
          >
            <Download className="w-4 h-4" />
          </button>

          <a
            href={currentItem.src}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition cursor-pointer hidden sm:flex"
            title="Open original in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={onClose}
            className="p-2 ml-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition cursor-pointer"
            title="Close Lightbox (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden p-4 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleTap}
      >
        {/* Previous Image Button */}
        {normalizedImages.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 z-20 p-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-slate-100 hover:bg-indigo-600 hover:border-indigo-500 transition shadow-xl cursor-pointer"
            title="Previous Image (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Loading Spinner */}
        {imageLoading && !imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 z-10">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
            <span className="text-xs font-semibold">Loading full resolution image...</span>
          </div>
        )}

        {/* Fallback Error State */}
        {imageError ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center bg-slate-900/80 border border-slate-800 rounded-3xl max-w-md">
            <X className="w-10 h-10 text-rose-500" />
            <h4 className="text-sm font-bold text-slate-200">Failed to load image</h4>
            <p className="text-xs text-slate-400">
              The image URL might be broken or restricted by CORS policy.
            </p>
            <a
              href={currentItem.src}
              target="_blank"
              rel="noreferrer"
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              Open Direct Link <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          /* Actual Image */
          <img
            src={currentItem.src}
            alt={currentItem.alt || activeTitle}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
              maxHeight: "82vh",
              maxWidth: "92vw",
            }}
            className="object-contain rounded-lg shadow-2xl pointer-events-auto"
            referrerPolicy="no-referrer"
            draggable={false}
          />
        )}

        {/* Next Image Button */}
        {normalizedImages.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 z-20 p-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-slate-100 hover:bg-indigo-600 hover:border-indigo-500 transition shadow-xl cursor-pointer"
            title="Next Image (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (Only if multiple images) */}
      {normalizedImages.length > 1 && (
        <div className="bg-slate-900/90 border-t border-slate-800/80 p-3 flex items-center justify-center gap-2 overflow-x-auto max-w-full z-20">
          {normalizedImages.map((imgItem, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all w-14 h-12 shrink-0 cursor-pointer ${
                idx === currentIndex
                  ? "border-indigo-500 scale-105 shadow-md shadow-indigo-500/20"
                  : "border-slate-800 opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={imgItem.src}
                alt={imgItem.alt || `Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* Convenience Drop-In Wrapper Component */
export interface LightboxImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  containerClassName?: string;
  images?: (string | LightboxImageItem)[];
  initialIndex?: number;
  showZoomBadge?: boolean;
}

export const LightboxImage: React.FC<LightboxImageProps> = ({
  src,
  alt = "Image",
  title,
  subtitle,
  className = "",
  containerClassName = "",
  images,
  initialIndex = 0,
  showZoomBadge = true,
  ...imgProps
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className={`group relative cursor-pointer overflow-hidden inline-block ${containerClassName}`}
        title={title || "Click to expand image"}
      >
        <img
          src={src}
          alt={alt}
          className={`transition duration-200 group-hover:scale-[1.02] ${className}`}
          {...imgProps}
        />

        {/* Hover overlay indicator */}
        <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/30 transition duration-200 flex items-center justify-center pointer-events-none">
          <div className="p-2 rounded-xl bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 transition duration-200 transform scale-90 group-hover:scale-100 shadow-lg flex items-center gap-1.5 text-xs font-bold">
            <Eye className="w-4 h-4 text-indigo-400" />
            {showZoomBadge && <span>Enlarge</span>}
          </div>
        </div>
      </div>

      <Lightbox
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        image={{ src, alt, title, subtitle }}
        images={images}
        initialIndex={initialIndex}
      />
    </>
  );
};

export default Lightbox;
