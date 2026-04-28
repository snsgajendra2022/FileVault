import React, { useEffect, useRef, useState } from 'react';
import { FaSpinner, FaExclamationTriangle, FaRedoAlt } from 'react-icons/fa';

interface LightboxImageProps {
  src: string | null;
  thumbnailSrc?: string | null;
  alt: string;
  onLoad?: () => void;
  onError?: () => void;
}

const LightboxImage: React.FC<LightboxImageProps> = ({ src, thumbnailSrc, alt, onLoad, onError }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!src) { setError(true); return; }

    setError(false);

    const el = imgRef.current;
    if (!el) return;

    // ── Key insight: if the browser already has this URL cached,
    //    setting src makes .complete = true synchronously BEFORE
    //    onload fires. Check immediately after assignment.
    el.src = src;

    if (el.complete && el.naturalWidth > 0) {
      // Instant cache hit — no spinner needed
      setLoaded(true);
      onLoad?.();
      return;
    }

    // Not cached yet — show placeholder/spinner until onload fires
    setLoaded(false);
  }, [src, retryKey]);

  if (!src) {
    return (
      <div className="flex flex-col items-center justify-center text-white gap-3 w-full h-full">
        <FaExclamationTriangle className="text-4xl text-yellow-400" />
        <p className="text-sm text-gray-300">Image not available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">

      {/* Blurred placeholder — shown while full image loads, absolutely positioned */}
      {!loaded && !error && thumbnailSrc && (
        <img
          src={thumbnailSrc}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          style={{ filter: 'blur(20px)', transform: 'scale(1.08)', opacity: 0.5 }}
        />
      )}

      {/* Spinner — centred, only while loading */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-black/40 rounded-full p-3">
            <FaSpinner className="text-white text-2xl animate-spin" />
          </div>
        </div>
      )}

      {/* Single persistent <img> — src is swapped via useEffect, never remounted */}
      <img
        ref={imgRef}
        alt={alt}
        draggable={false}
        onLoad={() => { setLoaded(true); setError(false); onLoad?.(); }}
        onError={() => { setError(true); onError?.(); }}
        className="relative z-20 object-contain select-none transition-opacity duration-150"
        style={{
          opacity: loaded ? 1 : 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 z-30">
          <FaExclamationTriangle className="text-4xl text-yellow-400" />
          <p className="text-sm text-gray-300">Failed to load image</p>
          <button
            type="button"
            onClick={() => { setError(false); setLoaded(false); setRetryKey(k => k + 1); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm"
          >
            <FaRedoAlt className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default LightboxImage;
