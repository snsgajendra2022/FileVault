import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { FaSpinner, FaTimes, FaArrowDown } from 'react-icons/fa';
import ProgressiveImage from '../../../components/photo-studio/ProgressiveImage';
import type {
  UserImageWithVariants,
  ImageVariants,
} from '../../../utils/progressiveImageVariants';
import { getThumbnailSrc } from '../../../utils/progressiveImageVariants';
import {
  getConnectionHint,
  getSaveData,
} from '../../../utils/progressiveImageConfig';
import { toProgressiveImage } from '../../../utils/albumImageVariants';
import type { AlbumImageLike } from '../../../utils/albumImageVariants';
import api from '../../../api/client/axiosInstance';

const PAGE_SIZE = 10;
const VISIBLE_ROOT_MARGIN = '120px';

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

function getTotalPagesFromResponse(res: any, currentCount: number): number {
  const data = res?.data;
  const tp = Number(data?.totalPages);
  if (Number.isFinite(tp) && tp > 0) return tp;
  const total = Number(data?.totalElements ?? data?.total ?? data?.count);
  if (Number.isFinite(total) && total > 0) return Math.ceil(total / PAGE_SIZE);
  if (currentCount < PAGE_SIZE) return 1;
  return Number.MAX_SAFE_INTEGER;
}

type ThumbProps = {
  image: UserImageWithVariants;
  index: number;
  isVisible: boolean;
  thumbRef: (el: HTMLButtonElement | null) => void;
  onSelect: (id: number) => void;
};

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const ThumbSkeleton = memo(function ThumbSkeleton() {
  return <div className="studio-flipbook-thumb-skeleton" aria-hidden />;
});

const ChooseImageThumb = memo(function ChooseImageThumb({
  image,
  index,
  isVisible,
  thumbRef,
  onSelect,
}: ThumbProps) {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const id = Number(image.id);

  useEffect(() => {
    if (!isVisible || loadState !== 'idle') return;
    setLoadState('loading');
  }, [isVisible, loadState]);

  const showSkeleton = loadState === 'idle' || loadState === 'loading';
  const showImage = loadState === 'loading' || loadState === 'loaded';

  return (
    <button
      ref={thumbRef}
      type="button"
      data-idx={index}
      className="studio-flipbook-modal-thumb"
      onClick={() => onSelect(id)}
      title={image.filename}
    >
      <div className="studio-flipbook-modal-thumb-inner">
        {showSkeleton && <ThumbSkeleton />}
        {showImage && (
          <div
            className="studio-flipbook-modal-thumb-img"
            style={{ opacity: loadState === 'loaded' ? 1 : 0 }}
          >
            <ProgressiveImage
              image={image}
              enabled={isVisible}
              mode="thumbnail"
              alt={image.filename}
              className="h-full w-full object-cover"
              onLoad={() => setLoadState('loaded')}
              onError={() => setLoadState('error')}
            />
          </div>
        )}
        {loadState === 'error' && (
          <div className="studio-flipbook-modal-thumb-error">!</div>
        )}
      </div>
    </button>
  );
});

type Props = {
  open: boolean;
  albumId: number;
  onClose: () => void;
  onSelect: (imageId: number) => void;
};

const ChooseImageModal: React.FC<Props> = ({ open, albumId, onClose, onSelect }) => {
  const [images, setImages] = useState<UserImageWithVariants[]>([]);
  const [nextPage, setNextPage] = useState(0);
  const [totalPages, setTotalPages] = useState(Number.MAX_SAFE_INTEGER);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

  const gridRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(0);
  const loadingRef = useRef(false);
  const thumbRefsMapRef = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const reset = useCallback(() => {
    setImages([]);
    setNextPage(0);
    setTotalPages(Number.MAX_SAFE_INTEGER);
    setLoading(false);
    setReady(false);
    setHasMore(true);
    setVisibleIndices(new Set());
    loadingRef.current = false;
    thumbRefsMapRef.current.clear();
    sessionIdRef.current += 1;
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const fetchPage = useCallback(async (pageNum: number) => {
    if (loadingRef.current) return;
    const sid = sessionIdRef.current;
    loadingRef.current = true;
    setLoading(true);

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

      const raw = getImagesFromResponse(res);
      const mapped = raw.map(mapRawImage);
      const tp = getTotalPagesFromResponse(res, mapped.length);

      setTotalPages(tp);
      setImages((prev) => {
        const ids = new Set(prev.map((i) => Number(i.id)));
        return [...prev, ...mapped.filter((i) => !ids.has(Number(i.id)))];
      });

      const done =
        mapped.length === 0 ||
        mapped.length < PAGE_SIZE ||
        pageNum + 1 >= tp;
      setHasMore(!done);
      setNextPage(pageNum + 1);
      setReady(true);
    } catch {
      if (sid === sessionIdRef.current) {
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
    if (!open) return;
    reset();
    const t = window.setTimeout(() => fetchPage(0), 0);
    return () => window.clearTimeout(t);
  }, [open, albumId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    for (const img of images) {
      const url = getThumbnailSrc(img) || img.thumbnailUrl || img.previewUrl;
      if (url) {
        const el = new Image();
        el.fetchPriority = 'low';
        el.src = url;
      }
    }
  }, [images]);

  const loadMore = useCallback(() => {
    if (!open || !ready || !hasMore || loadingRef.current) return;
    if (nextPage >= totalPages) {
      setHasMore(false);
      return;
    }
    fetchPage(nextPage);
  }, [open, ready, hasMore, nextPage, totalPages, fetchPage]);

  const handleScroll = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const { scrollTop, scrollHeight, clientHeight } = grid;
    if (scrollHeight - scrollTop - clientHeight < 180) loadMore();
  }, [loadMore]);

  const setThumbRef = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      if (el) el.dataset.idx = String(index);
      thumbRefsMapRef.current.set(index, el);
    },
    []
  );

  /* Mark first row visible immediately so images show without waiting for observer */
  useEffect(() => {
    if (!images.length) return;
    setVisibleIndices((prev) => {
      const next = new Set(prev);
      let changed = false;
      const initialVisible = Math.min(images.length, PAGE_SIZE);
      for (let i = 0; i < initialVisible; i += 1) {
        if (!next.has(i)) {
          next.add(i);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [images.length]);

  useEffect(() => {
    if (!open || !ready || images.length === 0) return;

    const grid = gridRef.current;
    const observer =
      observerRef.current ||
      new IntersectionObserver(
        (entries) => {
          setVisibleIndices((prev) => {
            const next = new Set(prev);
            let changed = false;
            for (const entry of entries) {
              const idx = Number((entry.target as HTMLElement).dataset.idx);
              if (!Number.isFinite(idx)) continue;
              if (entry.isIntersecting && !next.has(idx)) {
                next.add(idx);
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        },
        {
          root: grid,
          rootMargin: VISIBLE_ROOT_MARGIN,
          threshold: 0.01,
        }
      );

    observerRef.current = observer;

    const scheduleObserve = () => {
      thumbRefsMapRef.current.forEach((el) => {
        if (el) observer.observe(el);
      });
    };

    const frameId = requestAnimationFrame(scheduleObserve);
    return () => {
      cancelAnimationFrame(frameId);
      thumbRefsMapRef.current.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, [open, ready, images.length]);

  if (!open) return null;

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
                {images.length}
                {hasMore ? '+' : ''}
              </span>
            )}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div
          ref={gridRef}
          className="studio-flipbook-choose-image-grid"
          onScroll={handleScroll}
        >
          {images.map((img, index) => (
            <ChooseImageThumb
              key={String(img.id)}
              image={img}
              index={index}
              isVisible={visibleIndices.has(index)}
              thumbRef={setThumbRef(index)}
              onSelect={onSelect}
            />
          ))}

          <div className="studio-flipbook-grid-bottom">
            {loading && (
              <div className="studio-flipbook-loading-more">
                <FaSpinner className="animate-spin" size={16} />
                <span>Loading…</span>
              </div>
            )}
            {allDone && images.length > 0 && (
              <span className="studio-flipbook-all-loaded">
                All {images.length} images loaded
              </span>
            )}
            {ready && !loading && images.length === 0 && (
              <span className="studio-flipbook-all-loaded">No images found</span>
            )}
          </div>
        </div>

        {ready && hasMore && (
          <div className="studio-flipbook-load-more-bar">
            <button
              type="button"
              className="studio-flipbook-load-more-btn"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" size={14} /> Loading…
                </>
              ) : (
                <>
                  <FaArrowDown size={12} /> Load More ({images.length} loaded)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ChooseImageModal;
