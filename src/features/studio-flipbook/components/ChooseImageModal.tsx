import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaSpinner, FaTimes, FaArrowDown, FaExclamationTriangle } from 'react-icons/fa';
import ProgressiveImage from '../../../components/photo-studio/ProgressiveImage';
import type { UserImageWithVariants, ImageVariants } from '../../../utils/progressiveImageVariants';
import { getThumbnailSrc } from '../../../utils/progressiveImageVariants';
import { getConnectionHint, getSaveData } from '../../../utils/progressiveImageConfig';
import { toProgressiveImage } from '../../../utils/albumImageVariants';
import type { AlbumImageLike } from '../../../utils/albumImageVariants';
import api from '../../../api/client/axiosInstance';

const PAGE_SIZE = 5;
const SCROLL_LOAD_OFFSET = 120;

function mapRawImage(raw: Record<string, unknown>): UserImageWithVariants {
  const id = Number(raw.id);
  const previewUrl = String(
    raw.previewUrl ?? raw.url ?? raw.imageUrl ?? raw.thumbnailUrl ?? raw.downloadUrl ?? ''
  );
  const thumb: AlbumImageLike = {
    id,
    previewUrl,
    thumbnailUrl: String(raw.thumbnailUrl ?? previewUrl),
    filename: String(raw.filename ?? raw.originalFilename ?? `image-${id}`),
    downloadUrl: String(raw.downloadUrl ?? previewUrl),
    fileType: String(raw.fileType ?? 'image/jpeg'),
    uploadTime: String(raw.uploadTime ?? ''),
    variants: raw.variants as ImageVariants | undefined,
  };
  return toProgressiveImage(thumb, thumb.fileType);
}

function getImagesFromResponse(res: any): Record<string, unknown>[] {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.images)) return data.images;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getTotalPagesFromResponse(res: any, count: number): number {
  const data = res?.data;
  const tp = Number(data?.totalPages);
  if (Number.isFinite(tp) && tp > 0) return tp;
  const total = Number(data?.totalElements ?? data?.total ?? data?.count);
  if (Number.isFinite(total) && total > 0) return Math.ceil(total / PAGE_SIZE);
  return count < PAGE_SIZE ? 1 : Number.MAX_SAFE_INTEGER;
}

type ThumbProps = {
  image: UserImageWithVariants;
  eager: boolean;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
  onSelect: (id: number) => void;
};

const ThumbSkeleton = memo(function ThumbSkeleton() {
  return <div className="studio-flipbook-thumb-skeleton" aria-hidden />;
});

const ChooseImageThumb = memo(function ChooseImageThumb({
  image, eager, scrollRoot, onSelect,
}: ThumbProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (eager || visible) return;
    const el = btnRef.current;
    const root = scrollRoot.current;
    if (!el || !root) return;

    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setVisible(true); },
      { root, rootMargin: '160px 0px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [eager, visible, scrollRoot]);

  return (
    <button
      ref={btnRef}
      type="button"
      className="studio-flipbook-modal-thumb"
      onClick={() => onSelect(Number(image.id))}
      title={image.filename}
    >
      <div className="studio-flipbook-modal-thumb-inner">
        {!visible && <ThumbSkeleton />}
        {visible && (
          <ProgressiveImage
            image={image}
            enabled
            mode="thumbnail"
            alt={image.filename}
            className="h-full w-full object-cover"
          />
        )}
      </div>
    </button>
  );
});

type Props = {
  open: boolean;
  albumId: number;
  images?: UserImageWithVariants[];   // ← pre-loaded from builder (preferred)
  onClose: () => void;
  onSelect: (imageId: number) => void;
};

const ChooseImageModal: React.FC<Props> = ({ open, albumId, images: propImages, onClose, onSelect }) => {
  const [images, setImages] = useState<UserImageWithVariants[]>([]);
  const [nextPage, setNextPage] = useState(0);
  const [totalPages, setTotalPages] = useState(Number.MAX_SAFE_INTEGER);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(0);
  const loadingRef = useRef(false);
  const prevOpenRef = useRef(false);
  const propImagesRef = useRef<UserImageWithVariants[] | undefined>(undefined);

  const reset = useCallback(() => {
    setImages([]);
    setNextPage(0);
    setTotalPages(Number.MAX_SAFE_INTEGER);
    setLoading(false);
    setReady(false);
    setHasMore(true);
    setError(null);
    loadingRef.current = false;
    sessionIdRef.current += 1;
  }, []);

  /* ── When modal opens, seed from propImages or fetch ── */
  useEffect(() => {
    if (!open) { prevOpenRef.current = false; return; }
    if (prevOpenRef.current) return;          // already open, skip reset
    prevOpenRef.current = true;

    if (propImages && propImages.length > 0) {
      // Use pre-loaded images — instant, no API call needed
      reset();
      setImages(propImages);
      setReady(true);
      setHasMore(false);
      setTotalPages(1);
      propImagesRef.current = propImages;
    } else {
      // Fallback: fetch ourselves (standalone usage)
      reset();
      const currentImages = propImages;
      if (currentImages && currentImages.length > 0) {
        setImages(currentImages);
        setReady(true);
        setHasMore(false);
        setTotalPages(1);
      } else {
        // Need to fetch from API
        const t = window.setTimeout(() => fetchPage(0), 0);
        return () => window.clearTimeout(t);
      }
    }
  }, [open, propImages]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Also re-seed when propImages changes while open ── */
  useEffect(() => {
    if (!open) return;
    if (propImagesRef.current === propImages) return;
    if (!propImages || propImages.length === 0) return;
    propImagesRef.current = propImages;
    reset();
    setImages(propImages);
    setReady(true);
    setHasMore(false);
    setTotalPages(1);
  }, [propImages, open, reset]);

  const fetchPage = useCallback(async (pageNum: number) => {
    if (loadingRef.current) return;
    if (!Number.isFinite(albumId) || albumId <= 0) {
      setError('Invalid album');
      setReady(true);
      setHasMore(false);
      return;
    }
    const sid = sessionIdRef.current;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/api/albums/${albumId}/images`, {
        params: {
          page: pageNum,
          size: PAGE_SIZE,
          variantDetail: 'full',
          connection: getConnectionHint(),
          saveData: getSaveData(),
        },
      });
      if (sid !== sessionIdRef.current) return;

      const mapped = getImagesFromResponse(res).map(mapRawImage);
      const tp = getTotalPagesFromResponse(res, mapped.length);

      setTotalPages(tp);
      setImages((prev) => {
        const ids = new Set(prev.map((i) => Number(i.id)));
        return [...prev, ...mapped.filter((i) => !ids.has(Number(i.id)))];
      });

      const done = mapped.length === 0 || mapped.length < PAGE_SIZE || pageNum + 1 >= tp;
      setHasMore(!done);
      setNextPage(pageNum + 1);
      setReady(true);
    } catch (err: unknown) {
      if (sid === sessionIdRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to load images';
        setError(msg);
        setHasMore(false);
        setReady(true);
      }
    } finally {
      if (sid === sessionIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [albumId]);

  useEffect(() => {
    for (const img of images) {
      const url = getThumbnailSrc(img) || img.thumbnailUrl || img.previewUrl;
      if (url) { const el = new Image(); el.fetchPriority = 'low'; el.src = url; }
    }
  }, [images]);

  const loadMore = useCallback(() => {
    if (!open || !ready || !hasMore || loadingRef.current) return;
    if (nextPage >= totalPages) { setHasMore(false); return; }
    fetchPage(nextPage);
  }, [open, ready, hasMore, nextPage, totalPages, fetchPage]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_LOAD_OFFSET;
    if (nearBottom) loadMore();
  }, [loadMore]);

  if (!open) return null;

  const showInitialLoading = !ready && loading && images.length === 0;
  const showError = error && images.length === 0;
  const allDone = ready && !loading && !hasMore;

  return createPortal(
    <div className="studio-flipbook-modal-overlay" onClick={onClose}>
      <div
        className="studio-flipbook-modal studio-flipbook-choose-image-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="studio-flipbook-modal-header">
          <h3>
            Choose Image
            {images.length > 0 && (
              <span className="studio-flipbook-image-count">
                {images.length}{hasMore ? '+' : ''}
              </span>
            )}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close"><FaTimes /></button>
        </div>

        {/* Single inner scroll area */}
        <div
          ref={scrollRef}
          className="studio-flipbook-choose-image-scroll"
          onScroll={handleScroll}
        >
          {/* Initial loading spinner */}
          {showInitialLoading && (
            <div className="studio-flipbook-choose-image-initial-load">
              <FaSpinner className="animate-spin" size={22} />
              <span>Loading images…</span>
            </div>
          )}

          {/* Error state */}
          {showError && (
            <div className="studio-flipbook-choose-image-error">
              <FaExclamationTriangle size={20} />
              <span>Failed to load images</span>
              <p className="studio-flipbook-choose-image-error-msg">{error}</p>
              <button
                type="button"
                className="studio-flipbook-load-more-btn"
                onClick={() => { reset(); fetchPage(0); }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Image grid */}
          {images.length > 0 && (
            <div className="studio-flipbook-choose-image-grid">
              {images.map((img, index) => (
                <ChooseImageThumb
                  key={String(img.id)}
                  image={img}
                  eager={index < PAGE_SIZE}
                  scrollRoot={scrollRef}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}

          {/* Footer: load more / all done / empty */}
          <div className="studio-flipbook-choose-image-footer">
            {loading && images.length > 0 && (
              <div className="studio-flipbook-loading-more">
                <FaSpinner className="animate-spin" size={14} />
                <span>Loading more…</span>
              </div>
            )}

            {ready && hasMore && !loading && images.length > 0 && (
              <button
                type="button"
                className="studio-flipbook-load-more-btn"
                onClick={loadMore}
              >
                <FaArrowDown size={11} />
                Load more images ({images.length} shown)
              </button>
            )}

            {allDone && images.length > 0 && (
              <span className="studio-flipbook-all-loaded">
                All {images.length} images loaded
              </span>
            )}

            {ready && !loading && images.length === 0 && !error && (
              <span className="studio-flipbook-all-loaded">No images in this album</span>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ChooseImageModal;
