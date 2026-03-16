import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  memo,
} from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  FaUpload,
  FaEye,
  FaLock,
  FaTimes,
  FaCloud,
  FaUsers,
  FaUser,
} from 'react-icons/fa';
import { FiDownload, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { FamilyRelationship } from '../../types/user';
const SCROLL_RESTORE_KEY = 'photo-studio-images-scroll';
const ASPECT_RATIO = 4 / 3;
const IMAGE_ROOT_MARGIN = '100px';
const IMAGES_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// API types
// ---------------------------------------------------------------------------

interface UserImage {
  id?: number | string;
  previewUrl: string;
  filename: string;
  downloadUrl: string;
  thumbnailUrl: string;
  enabledServices: { [key: string]: string };
  uploadTime: string;
  fileType: string;
}

interface UserImagesResponse {
  totalImages: number;
  images: UserImage[];
  page?: number;
  size?: number;
  totalPages?: number;
}

// ---------------------------------------------------------------------------
// Helpers (pure, stable)
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileTypeIcon(fileType: string, filename?: string): string {
  if (fileType === 'unknown' && filename) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['mov', 'mp4', 'avi', 'mkv', 'webm', 'm4v'].includes(ext)) return '🎬';
  }
  switch (fileType.toLowerCase()) {
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return '🖼️';
    case 'pdf':
      return '📄';
    case 'txt':
      return '📝';
    case 'doc':
    case 'docx':
      return '📄';
    case 'xls':
    case 'xlsx':
      return '📊';
    case 'ppt':
    case 'pptx':
      return '📈';
    default:
      return '📁';
  }
}

function getFileTypeColor(fileType: string, filename?: string): string {
  if (fileType === 'unknown' && filename) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['mov', 'mp4', 'avi', 'mkv', 'webm', 'm4v'].includes(ext)) return 'bg-purple-500';
  }
  switch (fileType.toLowerCase()) {
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return 'bg-blue-500';
    case 'pdf':
      return 'bg-red-500';
    case 'txt':
      return 'bg-gray-500';
    case 'doc':
    case 'docx':
      return 'bg-blue-600';
    case 'xls':
    case 'xlsx':
      return 'bg-green-500';
    case 'ppt':
    case 'pptx':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
}

function isImageType(fileType: string): boolean {
  return /^(png|jpg|jpeg|gif|webp)$/i.test(fileType);
}

function isVideoType(fileType: string, filename?: string): boolean {
  if (fileType === 'unknown') return true;
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  return ['mov', 'mp4', 'avi', 'mkv', 'webm', 'm4v'].includes(ext);
}

function getEnabledServicesCount(enabledServices: { [key: string]: string }): number {
  return Object.keys(enabledServices).length;
}

// ---------------------------------------------------------------------------
// Skeleton placeholder (fixed aspect ratio, shimmer)
// ---------------------------------------------------------------------------

const SkeletonPlaceholder = memo(function SkeletonPlaceholder() {
  return (
    <div className="absolute inset-0 bg-gray-200 animate-pulse" />
  );
});

// ---------------------------------------------------------------------------
// Image card (memoized, lazy load, per-image state)
// ---------------------------------------------------------------------------

type ImageLoadState = 'idle' | 'loading' | 'loaded' | 'error';

interface ImageCardProps {
  image: UserImage;
  index: number;
  isVisible: boolean;
  onView: (image: UserImage) => void;
  onDownload: (image: UserImage) => void;
  onDelete: (image: UserImage) => void;
  viewMode: 'my' | 'invited';
  deletePending: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
}

const ImageCard = memo(function ImageCard({
  image,
  index,
  isVisible,
  onView,
  onDownload,
  onDelete,
  viewMode,
  deletePending,
  cardRef,
}: ImageCardProps) {
  const [loadState, setLoadState] = useState<ImageLoadState>('idle');
  const imgRef = useRef<HTMLImageElement | null>(null);
  const showImage = isImageType(image.fileType);
  const showVideo = isVideoType(image.fileType, image.filename);

  // When visible and image or video type, start loading
  useEffect(() => {
    if ((!showImage && !showVideo) || !isVisible) return;
    if (loadState === 'idle') setLoadState('loading');
  }, [showImage, showVideo, isVisible, loadState]);

  const handleLoad = useCallback(() => setLoadState('loaded'), []);
  const handleError = useCallback(() => setLoadState('error'), []);

  const handleRetry = useCallback(() => {
    setLoadState('loading');
    if (imgRef.current) {
      const src = image.previewUrl;
      imgRef.current.src = '';
      imgRef.current.src = src;
    }
  }, [image.previewUrl]);

  const showSkeleton = (showImage || showVideo) && (loadState === 'idle' || loadState === 'loading');
  const showImg = showImage && (loadState === 'loading' || loadState === 'loaded');
  const showError = (showImage || showVideo) && loadState === 'error';
  const showIcon = !showImage && !showVideo || loadState === 'error';

  return (
    <div
      ref={cardRef}
      data-index={index}
      className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-300"
    >
      {/* Preview area - fixed aspect ratio to prevent layout shift */}
      <div
        className="relative w-full bg-gray-100"
        style={{ paddingBottom: `${(1 / ASPECT_RATIO) * 100}%` }}
      >
        <div className="absolute inset-0">
          {showSkeleton && <SkeletonPlaceholder />}
          {showImg &&  image.fileType !== 'unknown' && (
            <img
              ref={imgRef}
              src={isVisible ?image.thumbnailUrl || image.previewUrl : undefined}
              alt={image.filename}
              className="w-full h-full object-cover transition-opacity duration-300"
              style={{
                opacity: loadState === 'loaded' ? 1 : 0,
              }}
              loading="lazy"
              onLoad={handleLoad}
              onError={handleError}
              decoding="async"
            />
          )}
          {showVideo && (
            <video
              src={isVisible ? image.previewUrl : undefined}
              className="w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: loadState === 'loaded' ? 1 : 0 }}
              onLoadedData={handleLoad}
              onError={handleError}
              controls
              muted
              playsInline
              preload="metadata"
            />
          )}
          {showError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-4">
              <p className="text-xs text-gray-500 text-center mb-2">Failed to load preview</p>
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          {showIcon && !showError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div
                className={`${getFileTypeColor(image.fileType, image.filename)} text-white rounded-xl p-4 text-3xl shadow-inner`}
              >
                {getFileTypeIcon(image.fileType, image.filename)}
              </div>
            </div>
          )}

          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-800/90 text-white backdrop-blur-sm">
              {showVideo ? 'VIDEO' : image.fileType.toUpperCase()}
            </span>
          </div>
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
              <FaCloud className="h-3 w-3 mr-1" />
              {getEnabledServicesCount(image.enabledServices)}
            </span>
          </div>
        </div>
      </div>

      {/* Info & actions */}
      <div className="p-4">
        <h3
          className="text-sm font-medium text-gray-900 truncate"
          title={image.filename}
        >
          {image.filename}
        </h3>
        <p className="text-xs text-gray-500 mt-1">{formatDate(image.uploadTime)}</p>
        {Object.keys(image.enabledServices).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.keys(image.enabledServices).map((service) => (
              <span
                key={service}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {service}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onView(image)}
            className="flex-1 inline-flex justify-center items-center px-2 py-1.5 border border-gray-200 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <FaEye className="h-3 w-3 mr-1" />
            View
          </button>
          <button
            type="button"
            onClick={() => onDownload(image)}
            className="flex-1 inline-flex justify-center items-center px-2 py-1.5 border border-gray-200 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <FiDownload className="h-3 w-3 mr-1" />
            Download
          </button>
          {viewMode === 'my' && (
            <button
              type="button"
              onClick={() => onDelete(image)}
              disabled={deletePending}
              className="inline-flex justify-center items-center px-2 py-1.5 border border-red-200 text-xs font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-50 min-w-[2rem]"
            >
              {deletePending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <FiTrash2 className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const ClientImagesPage = () => {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null);
  const [lightboxPreviewReady, setLightboxPreviewReady] = useState(false);
  const [lightboxPreviewFailed, setLightboxPreviewFailed] = useState(false);
  const [lightboxPreviewVisible, setLightboxPreviewVisible] = useState(false);
  const [lightboxImageLoaded, setLightboxImageLoaded] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });
  const lightboxPreviewUrlRef = useRef<string | null>(null);
  const lightboxZoomContainerRef = useRef<HTMLDivElement | null>(null);
  const lightboxPanStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const lightboxPanRafRef = useRef<number | null>(null);
  const lightboxPendingPanRef = useRef<{ x: number; y: number } | null>(null);
  const lightboxTouchStateRef = useRef<{
    startDistance: number;
    startCenter: { x: number; y: number };
    startScale: number;
    startPan: { x: number; y: number };
    centerX: number;
    centerY: number;
  } | null>(null);
  const [lightboxIsPanning, setLightboxIsPanning] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FamilyRelationship | null>(null);
  const [viewMode, setViewMode] = useState<'my' | 'invited'>('my');
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());
  const cardRefsMapRef = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRestoredRef = useRef(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const familyRelationships = user?.familyRelationships || [];

  const {
    data: userImagesData,
    isLoading,
    error,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['userImages', selectedUser?.inviterApiToken, viewMode],
    queryFn: async ({ pageParam }) => {
      let token = localStorage.getItem('token');
      if (selectedUser && viewMode === 'invited') {
        token = selectedUser.inviterApiToken;
      }
      const response = await api.get(`/api/images/user/all`, {
        params: { token, page: pageParam, size: IMAGES_PAGE_SIZE },
      });
      return response.data as UserImagesResponse;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const page = lastPage?.page ?? 0;
      const totalPages = lastPage?.totalPages ?? 1;
      return page + 1 < totalPages ? page + 1 : undefined;
    },
    retry: 2,
    refetchInterval: 30000,
    enabled: !!user && (viewMode === 'my' || (viewMode === 'invited' && !!selectedUser)),
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await api.delete(`/api/images/${imageId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Image deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['userImages'] });
    },
    onError: () => {
      toast.error('Failed to delete image');
    },
  });

  const images = useMemo(
    () => userImagesData?.pages?.flatMap((p) => (p as UserImagesResponse).images ?? []) ?? [],
    [userImagesData]
  );

  // Restore scroll position on mount
  useEffect(() => {
    if (scrollRestoredRef.current) return;
    try {
      const saved = sessionStorage.getItem(SCROLL_RESTORE_KEY);
      if (saved !== null) {
        const y = parseInt(saved, 10);
        if (!isNaN(y)) {
          scrollRestoredRef.current = true;
          requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'auto' }));
        }
        sessionStorage.removeItem(SCROLL_RESTORE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save scroll when opening lightbox
  const handleView = useCallback((image: UserImage) => {
    try {
      sessionStorage.setItem(SCROLL_RESTORE_KEY, String(window.scrollY));
    } catch {
      // ignore
    }
    setSelectedImage(image);
  }, []);

  const handleDownload = useCallback((image: UserImage) => {
    toast.success(`Downloading ${image.filename}...`);
    const link = document.createElement('a');
    link.href = image.downloadUrl;
    link.download = image.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDelete = useCallback(
    (image: UserImage) => {
      // Prefer id from API; otherwise parse from URL (e.g. .../api/images/123/download)
      let imageId: string | undefined;
      if (image.id != null && image.id !== '') {
        imageId = String(image.id);
      } else {
        const match = image.downloadUrl.match(/\/api\/images\/(\d+)(?:\/|$|\?)/) ?? image.downloadUrl.match(/\/images\/(\d+)(?:\/|$|\?)/);
        imageId = match ? match[1] : undefined;
      }
      if (imageId) {
        deleteImageMutation.mutate(imageId);
      } else {
        toast.error('Unable to determine image ID for delete');
      }
    },
    [deleteImageMutation]
  );

  const handleUserSelect = useCallback((familyMember: FamilyRelationship) => {
    setSelectedUser(familyMember);
    setViewMode('invited');
  }, []);

  const handleBackToMyFiles = useCallback(() => {
    setSelectedUser(null);
    setViewMode('my');
  }, []);

  // Infinite scroll: when sentinel is visible, load next page
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Intersection Observer: track visible card indices (run after refs are attached)
  useEffect(() => {
    if (images.length === 0) return;
    const observer =
      observerRef.current ||
      new IntersectionObserver(
        (entries) => {
          setVisibleIndices((prev) => {
            const next = new Set(prev);
            let changed = false;
            entries.forEach((entry) => {
              const idx = Number((entry.target as HTMLElement).dataset.index);
              if (Number.isNaN(idx)) return;
              if (entry.isIntersecting && !next.has(idx)) {
                next.add(idx);
                changed = true;
              }
            });
            return changed ? next : prev;
          });
        },
        { rootMargin: IMAGE_ROOT_MARGIN, threshold: 0.01 }
      );
    observerRef.current = observer;
    const map = cardRefsMapRef.current;
    const scheduleObserve = () => {
      map.forEach((el) => {
        if (el) observer.observe(el);
      });
    };
    const id = requestAnimationFrame(scheduleObserve);
    return () => {
      cancelAnimationFrame(id);
      map.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, [images.length]);

  const setCardRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    if (el) el.dataset.index = String(index);
    cardRefsMapRef.current.set(index, el);
  }, []);

  const closeLightbox = useCallback(() => setSelectedImage(null), []);

  // Progressive image loading in lightbox: show thumbnail immediately, preload previewUrl, then fade in preview when ready
  useEffect(() => {
    if (!selectedImage || !isImageType(selectedImage.fileType)) return;
    const thumb = selectedImage.thumbnailUrl || selectedImage.previewUrl;
    const preview = selectedImage.previewUrl;
    setLightboxImageLoaded(false);
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    setLightboxIsPanning(false);
    setLightboxPreviewReady(false);
    setLightboxPreviewFailed(false);
    setLightboxPreviewVisible(false);
    if (!preview || preview === thumb) {
      setLightboxPreviewReady(true);
      return;
    }
    const url = preview;
    lightboxPreviewUrlRef.current = url;
    const img = new Image();
    const onLoad = () => {
      if (lightboxPreviewUrlRef.current === url) {
        setLightboxPreviewReady(true);
      }
    };
    const onError = () => {
      if (lightboxPreviewUrlRef.current === url) {
        setLightboxPreviewFailed(true);
      }
    };
    img.onload = onLoad;
    img.onerror = onError;
    img.src = url;
    return () => {
      lightboxPreviewUrlRef.current = null;
      img.onload = null;
      img.onerror = null;
      img.src = '';
    };
  }, [selectedImage]);

  // Trigger fade-in after preview is in DOM (avoids no transition on first paint)
  useEffect(() => {
    if (!lightboxPreviewReady) return;
    const id = requestAnimationFrame(() => {
      setLightboxPreviewVisible(true);
    });
    return () => cancelAnimationFrame(id);
  }, [lightboxPreviewReady]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeLightbox]);

  const LIGHTBOX_MIN_ZOOM = 1;
  const LIGHTBOX_MAX_ZOOM = 5;
  const LIGHTBOX_ZOOM_SENSITIVITY = 0.0012;

  const handleLightboxWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const el = lightboxZoomContainerRef.current;
      if (!el) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const delta = -e.deltaY * LIGHTBOX_ZOOM_SENSITIVITY;
      setLightboxZoom((prev) => {
        const next = Math.min(LIGHTBOX_MAX_ZOOM, Math.max(LIGHTBOX_MIN_ZOOM, prev * (1 + delta)));
        setLightboxPan((p) => ({
          x: mouseX - centerX - (mouseX - centerX - p.x) * (next / prev),
          y: mouseY - centerY - (mouseY - centerY - p.y) * (next / prev),
        }));
        return next;
      });
    },
    []
  );

  const handleLightboxMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || lightboxZoom <= 1) return;
    e.preventDefault();
    setLightboxIsPanning(true);
    lightboxPanStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: lightboxPan.x,
      panY: lightboxPan.y,
    };
  }, [lightboxZoom, lightboxPan]);

  const handleLightboxMouseMove = useCallback((e: MouseEvent) => {
    const start = lightboxPanStartRef.current;
    if (!start) return;
    const nextPan = {
      x: start.panX + (e.clientX - start.x),
      y: start.panY + (e.clientY - start.y),
    };
    lightboxPendingPanRef.current = nextPan;
    if (lightboxPanRafRef.current !== null) return;
    lightboxPanRafRef.current = requestAnimationFrame(() => {
      lightboxPanRafRef.current = null;
      const pending = lightboxPendingPanRef.current;
      if (pending) {
        lightboxPendingPanRef.current = null;
        setLightboxPan(pending);
      }
    });
  }, []);

  const handleLightboxMouseUp = useCallback(() => {
    lightboxPanStartRef.current = null;
    setLightboxIsPanning(false);
  }, []);

  useEffect(() => {
    if (!lightboxPanStartRef.current) return;
    window.addEventListener('mousemove', handleLightboxMouseMove);
    window.addEventListener('mouseup', handleLightboxMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleLightboxMouseMove);
      window.removeEventListener('mouseup', handleLightboxMouseUp);
    };
  }, [handleLightboxMouseMove, handleLightboxMouseUp]);

  // Prevent wheel from scrolling page when zooming in lightbox (passive: false required)
  useEffect(() => {
    if (!selectedImage) return;
    const el = lightboxZoomContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [selectedImage]);

  // Prevent page scroll during pinch/touch in lightbox (passive: false so preventDefault works)
  useEffect(() => {
    if (!selectedImage) return;
    const el = lightboxZoomContainerRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lightboxTouchStateRef.current) e.preventDefault();
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [selectedImage]);

  const handleLightboxDoubleClick = useCallback(() => {
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
  }, []);

  const handleLightboxResetZoom = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
  }, []);

  const getTouchCenter = useCallback((touches: React.TouchList) => {
    const a = touches[0];
    const b = touches[1];
    return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
  }, []);
  const getTouchDistance = useCallback((touches: React.TouchList) => {
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  }, []);

  const handleLightboxTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const el = lightboxZoomContainerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        lightboxTouchStateRef.current = {
          startDistance: getTouchDistance(e.touches),
          startCenter: getTouchCenter(e.touches),
          startScale: lightboxZoom,
          startPan: { ...lightboxPan },
          centerX,
          centerY,
        };
      }
    },
    [lightboxZoom, lightboxPan, getTouchDistance, getTouchCenter]
  );

  const handleLightboxTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const state = lightboxTouchStateRef.current;
      if (e.touches.length !== 2 || !state) return;
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const scaleRatio = distance / state.startDistance;
      const newScale = Math.min(
        LIGHTBOX_MAX_ZOOM,
        Math.max(LIGHTBOX_MIN_ZOOM, state.startScale * scaleRatio)
      );
      const ratio = newScale / state.startScale;
      setLightboxZoom(newScale);
      setLightboxPan({
        x: center.x - state.centerX - (state.startCenter.x - state.centerX - state.startPan.x) * ratio,
        y: center.y - state.centerY - (state.startCenter.y - state.centerY - state.startPan.y) * ratio,
      });
    },
    [getTouchDistance, getTouchCenter]
  );

  const handleLightboxTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) lightboxTouchStateRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (lightboxPanRafRef.current !== null) cancelAnimationFrame(lightboxPanRafRef.current);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden border border-gray-100"
                style={{ paddingBottom: `${(1 / ASPECT_RATIO) * 100}%` }}
              >
                <div className="absolute inset-0 bg-gray-200 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // if (error) {
  //   return (
  //     <div className="p-6">
  //       <div className="text-center py-12">
  //         <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Images</h2>
  //         <p className="text-gray-600 mb-4">Failed to load your images. Please try again.</p>
  //         <button
  //           type="button"
  //           onClick={() => refetch()}
  //           className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
  //         >
  //           Retry
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {viewMode === 'my'
              ? 'My Images'
              : `${selectedUser?.inviterFirstName ?? ''} ${selectedUser?.inviterLastName ?? ''}'s Files`}
          </h1>
          {viewMode === 'invited' && (
            <button
              type="button"
              onClick={handleBackToMyFiles}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaUser className="h-4 w-4 mr-2" />
              Back to My Files
            </button>
          )}
        </div>
      </div>

      {/* Family members (my view) */}
      {viewMode === 'my' && (
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaUsers className="h-5 w-5 mr-2 text-blue-600" />
              Family Members
            </h3>
            {familyRelationships.length === 0 ? (
              <div className="text-center py-6">
                <FaUsers className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No family relationships found</p>
                <p className="text-sm text-gray-400">You haven't been invited to any family accounts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {familyRelationships.map((member) => (
                  <div
                    key={member.inviterId}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleUserSelect(member)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUserSelect(member)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FaUser className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-900">
                          {member.inviterFirstName} {member.inviterLastName}
                        </h4>
                        <p className="text-sm text-gray-500">{member.relationshipType}</p>
                      </div>
                    </div>
                    {member.relationshipNotes && (
                      <p className="text-xs text-gray-600 mb-2">
                        <span className="font-medium">Notes:</span> {member.relationshipNotes}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {member.canViewImages && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          View
                        </span>
                      )}
                      {member.canUploadImages && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Upload
                        </span>
                      )}
                      {member.canDeleteImages && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Delete
                        </span>
                      )}
                      {member.canManageAlbums && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Albums
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaUpload className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Files</p>
              <p className="text-lg font-semibold text-gray-900">
                {userImagesData?.pages?.[0]?.totalImages ?? images.length}
              </p>
            </div>
          </div>
        </div>
        {/* <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FaCloud className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Cloud Services</p>
              <p className="text-lg font-semibold text-gray-900">
                {images.reduce((acc, img) => acc + getEnabledServicesCount(img.enabledServices), 0)}
              </p>
            </div>
          </div>
        </div> */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FaEye className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">File Types</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Set(images.map((img) => img.fileType)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FiDownload className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Available</p>
              <p className="text-lg font-semibold text-gray-900">
                {images.filter((img) => Object.keys(img.enabledServices).length > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Images grid or empty state */}
      {images.length === 0 ? (
        <div className="text-center py-16 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          <FaUpload className="h-14 w-14 text-gray-400 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {viewMode === 'my' ? 'No files uploaded' : 'No files shared'}
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            {viewMode === 'my'
              ? 'Get started by uploading your first file.'
              : `${selectedUser?.inviterFirstName ?? ''} hasn't shared any files yet.`}
          </p>
          {viewMode === 'my' && (
            <button
              type="button"
              onClick={() => (window.location.href = '/upload')}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <FaUpload className="mr-2 h-4 w-4" />
              Upload File
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image, index) => (
              <div key={`${image.previewUrl}-${index}`}>
                <ImageCard
                  image={image}
                  index={index}
                  isVisible={visibleIndices.has(index)}
                  onView={handleView}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  viewMode={viewMode}
                  deletePending={deleteImageMutation.isPending}
                  cardRef={setCardRef(index)}
                />
              </div>
            ))}
          </div>
          <div ref={loadMoreSentinelRef} className="h-4" aria-hidden />
          {isFetchingNextPage && (
            <div className="mt-4 flex justify-center py-4">
              <LoadingSpinner size="md" text="Loading more..." />
            </div>
          )}
        </>
      )}

      {/* Upgrade modal */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-modal-title"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <FaLock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 id="upgrade-modal-title" className="text-lg font-medium text-gray-900 mt-4">
                Upgrade Required
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                This feature is only available for premium plans.
              </p>
              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate('/plans');
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Plans
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox - full screen with dark blur overlay */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          {/* Overlay controls */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 pointer-events-none">
            <h3 className="text-sm font-medium text-white/90 truncate max-w-[50%] drop-shadow-lg">
              {selectedImage.filename}
            </h3>
            <div className="flex items-center gap-1 pointer-events-auto">
              <button
                type="button"
                onClick={() => handleDownload(selectedImage)}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Download"
              >
                <FiDownload className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={closeLightbox}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="absolute inset-0 pt-14">
            {isImageType(selectedImage.fileType) ? (
              (() => {
                const thumbUrl = selectedImage.thumbnailUrl || selectedImage.previewUrl;
                const previewUrl = selectedImage.previewUrl;
                const hasDistinctPreview =
                  !!previewUrl &&
                  previewUrl !== thumbUrl &&
                  lightboxPreviewReady &&
                  !lightboxPreviewFailed;
                const showingPreviewOverlay = hasDistinctPreview && lightboxPreviewVisible;
                const isLoadingPreview =
                  !!previewUrl &&
                  previewUrl !== thumbUrl &&
                  !lightboxPreviewReady &&
                  !lightboxPreviewFailed;
                const isZoomed = lightboxZoom > 1;
                return (
                  <div
                    ref={lightboxZoomContainerRef}
                    className="relative flex justify-center items-center w-full h-full overflow-hidden select-none touch-none"
                    style={{
                      cursor: lightboxIsPanning ? 'grabbing' : isZoomed ? 'grab' : 'default',
                      touchAction: 'none',
                    }}
                    onWheel={handleLightboxWheel}
                    onMouseDown={handleLightboxMouseDown}
                    onDoubleClick={handleLightboxDoubleClick}
                    onTouchStart={handleLightboxTouchStart}
                    onTouchMove={handleLightboxTouchMove}
                    onTouchEnd={handleLightboxTouchEnd}
                    role="presentation"
                  >
                    <div
                      className="absolute flex justify-center items-center w-full h-full"
                      style={{
                        willChange: 'transform',
                        transform: `translate(50%, 50%) translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom}) translate(-50%, -50%)`,
                        transition: lightboxIsPanning ? 'none' : 'transform 0.15s ease-out',
                      }}
                    >
                      {selectedImage.fileType !== 'unknown' && (
                        <>
                          {/* Thumbnail as loading background - always visible until preview loads */}
                          {/* <img
                            src={thumbUrl}
                            alt={selectedImage.filename}
                            height={200}
                            className={`absolute w-full h-full object-contain transition-opacity duration-300 ${
                              showingPreviewOverlay ? 'opacity-0' : 'opacity-100'
                            }`}
                            // onLoad={() => setLightboxImageLoaded(true)}
                            draggable={false}
                            style={{
                              transform: 'rotate(-90deg)',
                            }}
                            
                          /> */}
                          {/* ${
                           showingPreviewOverlay ? 'opacity-0' : 'opacity-100'
                          } */}
                          <img
                          src={thumbUrl}
                          alt={selectedImage.filename}
                          className={`absolute object-contain transition-opacity duration-300 ${
                            showingPreviewOverlay ? 'opacity-0' : 'opacity-100'
                           }`}
                          style={{top: '20%', transform: 'rotate(-90deg)',height: '50%',width: 'auto',}}
                          draggable={false}
                        />
                          {/* Loading overlay on top of thumbnail - thumbnail stays visible as background */}
                          {isLoadingPreview && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                              <LoadingSpinner size="lg" />
                              <span className="mt-2 text-sm text-white">Loading...</span>
                            </div>
                          )}
                        </>
                      )}
   
                      {hasDistinctPreview && selectedImage.fileType !== 'unknown' && (
                        
                        <img
                          src={previewUrl}
                          alt={selectedImage.filename}
                          className={`absolute w-full h-full object-contain transition-opacity duration-300 ${
                            lightboxPreviewVisible ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                          draggable={false}
                        />
                      )}
                    </div>
                    {isZoomed && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                        <p className="text-xs text-white/70 bg-black/50 px-3 py-1.5 rounded">
                          Scroll to zoom · Drag to pan · Double-click to reset
                        </p>
                        <button
                          type="button"
                          onClick={handleLightboxResetZoom}
                          className="text-xs font-medium text-white/90 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded transition-colors"
                          aria-label="Reset zoom"
                        >
                          Reset zoom
                        </button>
                      </div>
                    )}
                    {selectedImage.fileType === 'unknown' && (
                      <video
                        src={selectedImage.previewUrl}
                        className="w-full h-full object-contain"
                        controls
                        muted
                        playsInline
                        preload="auto"
                      />
                    )}
                  </div>
                );
              })()
            ) : isVideoType(selectedImage.fileType, selectedImage.filename) ? (
              <div className="relative flex justify-center items-center w-full h-full">
                <video
                  src={selectedImage.previewUrl}
                  className="w-full h-full object-contain"
                  controls
                  muted
                  playsInline
                  preload="auto"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gray-900">
                <div className={`${getFileTypeColor(selectedImage.fileType, selectedImage.filename)} text-white rounded-xl p-8 text-6xl`}>
                  {getFileTypeIcon(selectedImage.fileType, selectedImage.filename)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientImagesPage;
