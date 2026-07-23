import React from "react";
import { FaTimes, FaChevronLeft, FaChevronRight, FaDownload } from "react-icons/fa";

export type MemoriesLightboxImage = {
  id?: string | number;
  url: string;
  title?: string;
  caption?: string;
  fileName?: string;
};

type MemoriesLightboxProps = {
  images: MemoriesLightboxImage[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onIndexChange?: (index: number) => void;
};

export function MemoriesLightbox({
  images,
  currentIndex,
  open,
  onClose,
  onNext,
  onPrevious,
  onIndexChange,
}: MemoriesLightboxProps) {
  const image = images[currentIndex];

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();

      if (event.key === "ArrowRight") {
        if (onNext) onNext();
        else if (onIndexChange && images.length > 0) {
          onIndexChange((currentIndex + 1) % images.length);
        }
      }

      if (event.key === "ArrowLeft") {
        if (onPrevious) onPrevious();
        else if (onIndexChange && images.length > 0) {
          onIndexChange((currentIndex - 1 + images.length) % images.length);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, currentIndex, images.length, onClose, onNext, onPrevious, onIndexChange]);

  if (!open || !image) return null;

  const goPrevious = () => {
    if (onPrevious) return onPrevious();
    if (onIndexChange && images.length > 0) {
      onIndexChange((currentIndex - 1 + images.length) % images.length);
    }
  };

  const goNext = () => {
    if (onNext) return onNext();
    if (onIndexChange && images.length > 0) {
      onIndexChange((currentIndex + 1) % images.length);
    }
  };

  const downloadImage = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = image.fileName || image.title || `memory-photo-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(image.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-0 z-[10050] bg-black/90 text-white">
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {image.title || image.fileName || `Photo ${currentIndex + 1}`}
          </p>
          <p className="text-xs text-white/70">
            {currentIndex + 1} of {images.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadImage}
            className="rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            aria-label="Download image"
          >
            <FaDownload className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            aria-label="Close lightbox"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrevious}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white transition hover:bg-white/20"
            aria-label="Previous image"
          >
            <FaChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={goNext}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white transition hover:bg-white/20"
            aria-label="Next image"
          >
            <FaChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div className="flex h-full w-full items-center justify-center p-4 pt-20">
        <img
          src={image.url}
          alt={image.title || image.caption || "Memory photo"}
          className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl"
        />
      </div>

      {(image.caption || image.title) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-center">
          {image.caption && <p className="text-sm text-white/90">{image.caption}</p>}
        </div>
      )}
    </div>
  );
}