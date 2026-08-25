import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  memo,
} from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../state/context/AuthContext';
import api from '../../api/client/axiosInstance';
import {
  FaUpload,
  FaEye,
  FaLock,
  FaTimes,
  FaCloud,
  FaUsers,
  FaUser,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';
import { FiDownload, FiTrash2 } from 'react-icons/fi';
import { compressFileList, shouldUseCompressedFileList } from '../../utils/checkoutUrlEncoding';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { FamilyRelationship } from '../../types/user';
import {
  Search,
  Grid3x3,
  Upload,
  Share2,
  Users,
  ChevronRight,
  Image as ImageIcon,
  Cloud,
  FileType,
  CheckCircle2,
  X,
  LayoutGrid,
  Calendar,
  Play,
  Filter,
  Database,
  FolderOpen,
} from 'lucide-react';
import './imagesPageTheme.css';
import ProgressiveImage from '../../components/photo-studio/ProgressiveImage';
import { LIGHTBOX_PROGRESSIVE_OPTIONS } from '../../utils/progressiveImageConfig';
import type { ImageVariants } from '../../utils/progressiveImageVariants';
import HlsVideoPlayer from '../../components/video/HlsVideoPlayer';
import { resolveVideoPlayback, isVideoProcessing } from '../../utils/videoPlayback';
import { useProgressiveImageSrc } from '../../hooks/useProgressiveImageSrc';
import { useMarqueeSelect } from '../../hooks/useMarqueeSelect';
import {
  getConnectionHint,
  getSaveData,
  getVariantsFingerprint,
  imageVariantsNeedPolling,
  variantsNeedPolling,
} from '../../utils/progressiveImageVariants';
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
  mediaType?: string;
  hasThumbnail?: boolean;
  variants?: ImageVariants;
}

interface UserImagesResponse {
  totalImages: number;
  images: UserImage[];
  page?: number;
  size?: number;
  totalPages?: number;
}

/** GET /api/flags – control visibility of email, phone, etc. */
interface FlagItem {
  name: string;
  id: number;
  value: boolean;
}
interface FlagsResponse {
  flags?: FlagItem[];
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

function parseUploadTime(raw: string | number | undefined | null): Date | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') {
    const ms = raw > 9_999_999_999 ? raw : raw * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const str = String(raw).trim();
  const asNum = Number(str);
  if (!Number.isNaN(asNum) && asNum > 1_000_000_000) {
    const d = new Date(asNum > 9_999_999_999 ? asNum : asNum * 1000);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(dateString: string): string {
  const d = parseUploadTime(dateString);
  if (!d) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatImageCardDate(dateString: string): string {
  const d = parseUploadTime(dateString);
  if (!d) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Local calendar day key for grouping (YYYY-MM-DD). */
function uploadDayKey(dateString: string): string {
  const d = parseUploadTime(dateString);
  if (!d) return 'invalid';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDayKeyLabel(dayKey: string, invalidLabel: string): string {
  if (dayKey === 'invalid') return invalidLabel;
  const parts = dayKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return invalidLabel;
  const [y, m, day] = parts;
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function imageDedupeKey(image: UserImage): string {
  if (image.id != null && image.id !== '') return `id:${image.id}`;
  return `f:${image.previewUrl}|${image.filename}|${image.uploadTime}`;
}

function resolveImageApiId(image: UserImage): string | undefined {
  if (image.id != null && image.id !== '') return String(image.id);
  const match =
    image.downloadUrl.match(/\/api\/images\/(\d+)(?:\/|$|\?)/) ??
    image.downloadUrl.match(/\/images\/(\d+)(?:\/|$|\?)/);
  return match ? match[1] : undefined;
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

function isImageType(fileType: string, filename?: string): boolean {
  if (/^(png|jpg|jpeg|gif|webp)$/i.test(fileType)) return true;
  if (String(fileType).toLowerCase() === 'unknown' && filename) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
  }
  return false;
}

function isVideoType(fileType: string, filename?: string, mediaType?: string): boolean {
  if (mediaType === 'VIDEO') return true;
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  const videoExt = ['mov', 'mp4', 'avi', 'mkv', 'webm', 'm4v'];
  if (videoExt.includes(ext)) return true;
  if (/^(mp4|mov|webm|avi|mkv|m4v)$/i.test(fileType)) return true;
  if (String(fileType).toLowerCase() === 'unknown') return videoExt.includes(ext);
  return false;
}

function getEnabledServicesCount(enabledServices: { [key: string]: string }): number {
  return Object.keys(enabledServices).length;
}

// ---------------------------------------------------------------------------
// Skeleton placeholder (fixed aspect ratio, shimmer)
// ---------------------------------------------------------------------------

function fileExtensionLabel(fileType: string, filename?: string): string {
  if (fileType && fileType !== 'unknown') return fileType.toUpperCase().slice(0, 4);
  const ext = filename?.split('.').pop()?.toUpperCase();
  return ext?.slice(0, 4) || 'FILE';
}

const SkeletonPlaceholder = memo(function SkeletonPlaceholder() {
  return <div className="lumina-shimmer" aria-hidden />;
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
  /** When set, show checkbox for share / bulk selection */
  isSelected?: boolean;
  onToggleSelect?: (image: UserImage) => void;
  /** Stable id for marquee selection (`data-select-id`) */
  selectId?: string;
  /** When true, ignore click-to-open (active drag select) */
  suppressOpen?: boolean;
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
  isSelected,
  onToggleSelect,
  selectId,
  suppressOpen,
}: ImageCardProps) {
  const { t } = useTranslation();
  const [loadState, setLoadState] = useState<ImageLoadState>('idle');
  const [imageRetryKey, setImageRetryKey] = useState(0);
  const showImage = isImageType(image.fileType, image.filename);
  const showVideo = isVideoType(image.fileType, image.filename, image.mediaType);
  const variantsFingerprint = getVariantsFingerprint(image);
  const videoPosterUrl = image.thumbnailUrl || '';

  // When visible and image or video type, start loading
  useEffect(() => {
    if ((!showImage && !showVideo) || !isVisible) return;
    if (loadState === 'idle') setLoadState('loading');
  }, [showImage, showVideo, isVisible, loadState]);

  useEffect(() => {
    if (loadState !== 'error') return;
    if (showImage && imageVariantsNeedPolling(image)) {
      setLoadState('loading');
      setImageRetryKey((k) => k + 1);
    }
  }, [variantsFingerprint, image, loadState, showImage]);

  const handleLoad = useCallback(() => setLoadState('loaded'), []);
  const handleError = useCallback(() => {
    if (showImage && imageVariantsNeedPolling(image)) return;
    setLoadState('error');
  }, [image, showImage]);

  const handleRetry = useCallback(() => {
    setLoadState('loading');
    setImageRetryKey((k) => k + 1);
  }, []);

  const showSkeleton = (showImage || showVideo) && (loadState === 'idle' || loadState === 'loading');
  const showImg = showImage && (loadState === 'loading' || loadState === 'loaded');
  const showError = (showImage || showVideo) && loadState === 'error';
  const showIcon = !showImage && !showVideo || loadState === 'error';

  const extLabel = fileExtensionLabel(image.fileType, image.filename);

  return (
    <article
      ref={cardRef}
      data-index={index}
      data-select-id={selectId || undefined}
      className={`lumina-gallery-card group ${isSelected ? 'lumina-gallery-card--selected' : ''}`}
    >
      <div
        className="lumina-media cursor-pointer"
        onClick={() => {
          if (suppressOpen) return;
          onView(image);
        }}
        onDragStart={(e) => e.preventDefault()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (suppressOpen) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onView(image);
          }
        }}
        aria-label={image.filename}
      >
        {showSkeleton && <SkeletonPlaceholder />}
        {showImg && (
          <div
            className="absolute inset-0 transition-opacity duration-500 ease-out"
            style={{ opacity: loadState === 'loaded' ? 1 : 0 }}
          >
            <ProgressiveImage
              key={imageRetryKey}
              image={image}
              enabled={isVisible}
              mode="gallery"
              alt={image.filename}
              className="h-full w-full object-cover"
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        )}

        {showVideo && (
          <>
            {videoPosterUrl ? (
              <img
                src={isVisible ? videoPosterUrl : undefined}
                alt=""
                draggable={false}
                className="h-full w-full object-cover"
                style={{ opacity: loadState === 'loaded' ? 1 : 0, transition: 'opacity 0.4s ease' }}
                onLoad={handleLoad}
                onError={handleError}
                onDragStart={(e) => e.preventDefault()}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <video
                src={isVisible ? image.previewUrl : undefined}
                className="h-full w-full object-cover"
                style={{ opacity: loadState === 'loaded' ? 1 : 0, transition: 'opacity 0.4s ease' }}
                onLoadedData={handleLoad}
                onError={handleError}
                controls
                muted
                playsInline
                preload="metadata"
              />
            )}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/30 text-white backdrop-blur-md">
                <Play className="h-6 w-6 fill-white" />
              </div>
            </div>
          </>
        )}

        {showError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#eceef0] p-4">
            <p className="mb-2 text-center text-xs font-medium text-[#4a4455]">
              {t('imagesPage.loadErrorTitle')}
            </p>
            <button type="button" onClick={handleRetry} className="lumina-btn-primary px-4 py-2 text-xs">
              {t('imagesPage.retryAction')}
            </button>
          </div>
        )}

        {showIcon && !showError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#eceef0]">
            <div
              className={`${getFileTypeColor(image.fileType, image.filename)} rounded-2xl p-5 text-4xl text-white shadow-lg`}
            >
              {getFileTypeIcon(image.fileType, image.filename)}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4a4455]/60">
              Preview unavailable
            </span>
          </div>
        )}

        <div className="lumina-media-overlay" aria-hidden />

        <span className="lumina-ext-badge">{extLabel}</span>

        {onToggleSelect && (
          <div className="lumina-card-select" data-no-marquee>
            <input
              type="checkbox"
              checked={!!isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(image);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5 rounded-full border-white bg-white/20 text-[#630ed4] focus:ring-[#630ed4]"
              aria-label={isSelected ? t('imagesPage.clearSelection') : t('imagesPage.shareLink')}
            />
          </div>
        )}

        <div className="lumina-card-actions" data-no-marquee>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onView(image);
            }}
            className="lumina-action-icon"
            aria-label={t('imagesPage.view')}
          >
            <FaEye className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(image);
            }}
            className="lumina-action-icon"
            aria-label="Download"
          >
            <FiDownload className="h-3.5 w-3.5" />
          </button>
          {viewMode === 'my' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(image);
              }}
              disabled={deletePending}
              className="lumina-action-icon lumina-action-icon--danger"
              aria-label={t('imagesPage.delete')}
            >
              {deletePending ? <LoadingSpinner size="sm" /> : <FiTrash2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* <div className="lumina-card-footer">
        <p className="lumina-card-filename" title={image.filename}>
          {image.filename}
        </p>
        <p className="lumina-card-meta">{formatImageCardDate(image.uploadTime)}</p>
      </div> */}
    </article>
  );
});

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const ClientImagesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });
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
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [gallerySearch, setGallerySearch] = useState('');
  const [gallerySearchOpen, setGallerySearchOpen] = useState(false);
  const [galleryDateFilter, setGalleryDateFilter] = useState('');
  const [gridCompact, setGridCompact] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareContactIds, setShareContactIds] = useState<Set<string>>(new Set());
  const [shareNewEmails, setShareNewEmails] = useState('');
  const [shareNewMobileCountryCode, setShareNewMobileCountryCode] = useState('+91');
  const [shareNewMobiles, setShareNewMobiles] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareChannels, setShareChannels] = useState<{ email: boolean; sms: boolean }>({ email: true, sms: true });
  const [shareSending, setShareSending] = useState(false);
  const [shareContactSearch, setShareContactSearch] = useState('');
  const [shareAlreadySent, setShareAlreadySent] = useState<{ email?: string; mobile?: string; alreadySent: boolean } | null>(null);
  const [publicShareUrl, setPublicShareUrl] = useState('');
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());
  const cardRefsMapRef = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRestoredRef = useRef(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const familyRelationships = user?.familyRelationships || [];

  useEffect(() => {
    setGalleryDateFilter('');
  }, [viewMode, selectedUser?.inviterId]);

  const {
    data: userImagesData,
    isPending,
    isError,
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
        params: {
          token,
          page: pageParam,
          size: IMAGES_PAGE_SIZE,
          connection: getConnectionHint(),
          saveData: getSaveData(),
        },
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
    refetchInterval: (query) => {
      const pages = query.state.data?.pages ?? [];
      const all = pages.flatMap((p) => (p as UserImagesResponse).images ?? []);
      return variantsNeedPolling(all) ? 4000 : false;
    },
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

  const bulkDeleteImagesMutation = useMutation({
    mutationFn: async (imageIds: string[]) => {
      const results = await Promise.allSettled(
        imageIds.map((id) => api.delete(`/api/images/${id}`))
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      return { total: imageIds.length, failed, ok: imageIds.length - failed };
    },
    onSuccess: ({ ok, failed }) => {
      if (ok > 0) {
        toast.success(
          failed > 0
            ? t('imagesPage.bulkDeletePartial', { ok, failed })
            : t('imagesPage.bulkDeleteSuccess', { n: ok })
        );
      } else {
        toast.error(t('imagesPage.bulkDeleteFailed'));
      }
      setSelectedImageIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['userImages'] });
    },
    onError: () => {
      toast.error(t('imagesPage.bulkDeleteFailed'));
    },
  });

  const images = useMemo(() => {
    const flat = userImagesData?.pages?.flatMap((p) => (p as UserImagesResponse).images ?? []) ?? [];
    const seen = new Set<string>();
    return flat.filter((img) => {
      const key = imageDedupeKey(img);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [userImagesData]);

  const availableUploadDays = useMemo(() => {
    const keys = new Set<string>();
    for (const img of images) {
      const k = uploadDayKey(img.uploadTime);
      if (k !== 'invalid') keys.add(k);
    }
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [images]);

  const filteredImagesWithIndex = useMemo(() => {
    const q = gallerySearch.trim().toLowerCase();
    return images
      .map((image, index) => ({ image, index }))
      .filter(({ image }) => {
        if (galleryDateFilter && uploadDayKey(image.uploadTime) !== galleryDateFilter) return false;
        if (!q) return true;
        return image.filename.toLowerCase().includes(q);
      });
  }, [images, gallerySearch, galleryDateFilter]);

  /** Group by calendar day (Map) so each date appears once even if API order is mixed. */
  const galleryImagesByDay = useMemo(() => {
    type Row = (typeof filteredImagesWithIndex)[number];
    const byDay = new Map<string, Row[]>();
    for (const row of filteredImagesWithIndex) {
      const key = uploadDayKey(row.image.uploadTime);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(row);
    }
    const sortTime = (a: Row, b: Row) => {
      const ta = parseUploadTime(a.image.uploadTime)?.getTime() ?? 0;
      const tb = parseUploadTime(b.image.uploadTime)?.getTime() ?? 0;
      return tb - ta;
    };
    return Array.from(byDay.entries())
      .sort(([a], [b]) => {
        if (a === 'invalid') return 1;
        if (b === 'invalid') return -1;
        return b.localeCompare(a);
      })
      .map(([dayKey, items]) => ({
        dayKey,
        items: [...items].sort(sortTime),
      }));
  }, [filteredImagesWithIndex]);

  const getImageKey = useCallback((image: UserImage) => {
    if (image.id != null && image.id !== '') return String(image.id);
    return image.previewUrl || image.filename || '';
  }, []);

  /** Live row from query so lightbox picks up variant polling while open. */
  const activeLightboxImage = useMemo(() => {
    if (!selectedImage) return null;
    const key = getImageKey(selectedImage);
    return images.find((img) => getImageKey(img) === key) ?? selectedImage;
  }, [selectedImage, images, getImageKey]);

  const lightboxIsImage =
    !!activeLightboxImage &&
    isImageType(activeLightboxImage.fileType, activeLightboxImage.filename);

  const lightboxProgressive = useProgressiveImageSrc(
    activeLightboxImage ?? {
      previewUrl: '',
      filename: '',
      downloadUrl: '',
      thumbnailUrl: '',
      enabledServices: {},
      uploadTime: '',
      fileType: '',
    },
    lightboxIsImage,
    'progressive',
    LIGHTBOX_PROGRESSIVE_OPTIONS
  );

  const selectedImages = useMemo(
    () => images.filter((img) => selectedImageIds.has(getImageKey(img))),
    [images, selectedImageIds, getImageKey]
  );

  /** Same as StudioCheckout / PhotoStudioAlbum: label for POST /api/public-share/send */
  const shareAlbumName = useMemo(() => {
    if (viewMode === 'invited' && selectedUser) {
      const name = [selectedUser.inviterFirstName, selectedUser.inviterLastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      return name ? t('imagesPage.theirImagesAlbum', { name }) : t('imagesPage.sharedImages');
    }
    return t('imagesPage.myImagesLower');
  }, [viewMode, selectedUser, t]);

  const handleToggleSelect = useCallback(
    (image: UserImage) => {
      const key = getImageKey(image);
      setSelectedImageIds((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [getImageKey]
  );

  const handleMarqueeSelectionChange = useCallback((ids: string[]) => {
    setSelectedImageIds(new Set(ids));
  }, []);

  const galleryMarqueeRef = useRef<HTMLDivElement | null>(null);
  const {
    isSelecting: isGalleryMarqueeSelecting,
    marqueeStyle: galleryMarqueeStyle,
    surfaceProps: galleryMarqueeSurfaceProps,
  } = useMarqueeSelect({
    containerRef: galleryMarqueeRef,
    enabled: viewMode === 'my',
    selectedIds: selectedImageIds,
    onSelectionChange: handleMarqueeSelectionChange,
  });

  const handleBulkDeleteSelected = useCallback(() => {
    if (selectedImageIds.size === 0) return;
    const apiIds: string[] = [];
    for (const img of images) {
      const key = getImageKey(img);
      if (!selectedImageIds.has(key)) continue;
      const id = resolveImageApiId(img);
      if (id) apiIds.push(id);
    }
    if (apiIds.length === 0) {
      toast.error(t('imagesPage.bulkDeleteNoIds'));
      return;
    }
    if (!window.confirm(t('imagesPage.bulkDeleteConfirm', { n: apiIds.length }))) return;
    bulkDeleteImagesMutation.mutate(apiIds);
  }, [selectedImageIds, images, getImageKey, bulkDeleteImagesMutation, t]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const tokenForUrl = typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || '') : '';

  // Build public images-display URL for share modal – when we have imageIds, send this URL (token + imageIds) so recipients get imageIds
  useEffect(() => {
    if (!showShareModal || selectedImages.length === 0) {
      setPublicShareUrl('');
      return;
    }
    const fileNames = selectedImages.map((img) => img.filename);
    const imageIds = selectedImages.map((img) => img.id).filter((id): id is number => typeof id === 'number');
    if (imageIds.length > 0) {
      setPublicShareUrl(`${baseUrl}/public/images-display?token=${encodeURIComponent(tokenForUrl)}&imageIds=${imageIds.join(',')}`);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post<{ id?: string }>('/api/public/share-link', {
          token: tokenForUrl,
          fileNames,
        });
        const id = res.data?.id;
        if (!cancelled && id) {
          setPublicShareUrl(`${baseUrl}/public/images-display?token=${encodeURIComponent(tokenForUrl)}&imageIds=${imageIds.join(',')}`);

          return;
        }
      } catch {
        // fallback below
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showShareModal, selectedImages, tokenForUrl, baseUrl]);

  const { data: shareContactsData } = useQuery({
    queryKey: ['publicShareContacts', shareContactSearch],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (shareContactSearch.trim()) params.set('search', shareContactSearch.trim());
        params.set('limit', '50');
        params.set('offset', '0');
        const res = await api.get<{
          contacts?: { id: string; email?: string; mobile?: string; countryCode?: string; displayName?: string }[];
          total?: number;
        }>(`/api/public-share/contacts?${params.toString()}`);
        return res.data ?? { contacts: [] };
      } catch {
        return { contacts: [] };
      }
    },
    enabled: showShareModal,
    retry: 0,
  });
  const shareContacts = shareContactsData?.contacts ?? [];

  // Feature flags: show/hide email and phone (GET /api/flags)
  const { data: flagsData } = useQuery({
    queryKey: ['flags'],
    queryFn: async () => {
      const res = await api.get<FlagsResponse>('/api/flags');
      return res.data;
    },
    retry: 1,
    staleTime: 60_000,
  });
  const showEmail = useMemo(() => {
    const flags = flagsData?.flags;
    if (!Array.isArray(flags)) return true;
    const f = flags.find((x) => x.name === 'isEmail');
    return f?.value ?? true;
  }, [flagsData]);
  const showPhone = useMemo(() => {
    const flags = flagsData?.flags;
    if (!Array.isArray(flags)) return true;
    const f = flags.find((x) => x.name === 'isPhone');
    return f?.value ?? true;
  }, [flagsData]);

  // When flags hide email/phone, disable those channels
  useEffect(() => {
    setShareChannels((c) => {
      const next = { ...c };
      if (!showEmail && c.email) next.email = false;
      if (!showPhone && c.sms) next.sms = false;
      return next.email === c.email && next.sms === c.sms ? c : next;
    });
  }, [showEmail, showPhone]);

  const checkRecipient = useCallback(
    async (emailInput: string, mobileInput: string) => {
      const firstEmail = emailInput.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean)[0] ?? '';
      const firstPart = mobileInput.split(/[\s,]+/).map((m) => m.trim()).filter(Boolean)[0] ?? '';
      const m = firstPart
        ? firstPart.startsWith('+')
          ? firstPart
          : `${shareNewMobileCountryCode.replace(/\s/g, '')}${firstPart}`
        : '';
      if (!firstEmail && !m) {
        setShareAlreadySent(null);
        return;
      }
      try {
        const params = new URLSearchParams();
        if (firstEmail) params.set('email', firstEmail);
        if (m) params.set('mobile', m);
        if (publicShareUrl) params.set('publicUrl', publicShareUrl);
        const res = await api.get<{
          alreadySent?: boolean;
          email?: string | null;
          mobile?: string | null;
        }>(`/api/public-share/check-recipient?${params.toString()}`);
        setShareAlreadySent({
          email: res.data?.email ?? undefined,
          mobile: res.data?.mobile ?? undefined,
          alreadySent: !!res.data?.alreadySent,
        });
      } catch {
        setShareAlreadySent(null);
      }
    },
    [publicShareUrl, shareNewMobileCountryCode]
  );

  const handleShareSend = useCallback(async () => {
    if (!publicShareUrl) {
      toast.error('No URL to share. Please select images first.');
      return;
    }
    const emails = shareNewEmails
      .split(/[\s,]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    const mobileParts = shareNewMobiles
      .split(/[\s,]+/)
      .map((m) => m.trim())
      .filter(Boolean);
    const mobiles = mobileParts.map((part) =>
      part.startsWith('+') ? part : `${shareNewMobileCountryCode.replace(/\s/g, '')}${part}`
    );
    if (shareContactIds.size === 0 && emails.length === 0 && mobiles.length === 0) {
      toast.error('Select at least one contact or enter email/mobile.');
      return;
    }
    const channels: string[] = [];
    if (shareChannels.email) channels.push('email');
    if (shareChannels.sms) channels.push('sms');
    if (channels.length === 0) {
      toast.error('Select at least one channel (Email or SMS).');
      return;
    }
    setShareSending(true);
    try {
      const res = await api.post<{
        success?: boolean;
        sent?: { email?: number; sms?: number };
        failed?: unknown[];
        shareIds?: { email?: number[]; sms?: number[] };
      }>('/api/public-share/send', {
        publicUrl: publicShareUrl,
        message: shareMessage.trim() || undefined,
        sendTo: {
          contactIds: Array.from(shareContactIds),
          emails,
          mobiles,
        },
        albumName: shareAlbumName,
        channels,
      });
      if (res.data?.success) {
        const emailCount = res.data.sent?.email ?? 0;
        const smsCount = res.data.sent?.sms ?? 0;
        const shareIds = res.data.shareIds;
        const idList =
          shareIds?.email?.length || shareIds?.sms?.length
            ? ` Share ID(s): ${[...(shareIds?.email ?? []), ...(shareIds?.sms ?? [])].join(', ')}.`
            : ' Each recipient gets a Share ID in the email/SMS for reference.';
        toast.success(`Link sent (email: ${emailCount}, SMS: ${smsCount}).${idList}`);
        setShowShareModal(false);
        setShareContactIds(new Set());
        setShareNewEmails('');
        setShareNewMobiles('');
        setShareMessage('');
        setShareAlreadySent(null);
        setSelectedImageIds(new Set());
      } else {
        toast.error('Failed to send. Please try again.');
      }
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { message?: string } } };
      if (ax.response?.status === 404 || ax.response?.status === 501) {
        toast.error('Share by email/SMS is not available yet. Use Copy link instead.');
      } else {
        toast.error(ax.response?.data?.message || 'Failed to send share.');
      }
    } finally {
      setShareSending(false);
    }
  }, [
    publicShareUrl,
    shareNewEmails,
    shareNewMobiles,
    shareNewMobileCountryCode,
    shareContactIds,
    shareChannels,
    shareMessage,
    shareAlbumName,
  ]);

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

  const navigateToImageIndex = useCallback((targetIndex: number) => {
    if (images.length === 0) return;
    const normalizedIndex = (targetIndex + images.length) % images.length;
    setSelectedImage(images[normalizedIndex]);
    setSelectedImageIndex(normalizedIndex);
  }, [images]);

  const handlePrevImage = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    if (!selectedImage || images.length === 0) return;
    const currentIndex =
      selectedImageIndex >= 0
        ? selectedImageIndex
        : images.findIndex((img) => getImageKey(img) === getImageKey(selectedImage));
    navigateToImageIndex((currentIndex >= 0 ? currentIndex : 0) - 1);
  }, [selectedImage, images, selectedImageIndex, getImageKey, navigateToImageIndex]);

  const handleNextImage = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    if (!selectedImage || images.length === 0) return;
    const currentIndex =
      selectedImageIndex >= 0
        ? selectedImageIndex
        : images.findIndex((img) => getImageKey(img) === getImageKey(selectedImage));
    navigateToImageIndex((currentIndex >= 0 ? currentIndex : 0) + 1);
  }, [selectedImage, images, selectedImageIndex, getImageKey, navigateToImageIndex]);

  // Save scroll when opening lightbox
  const handleView = useCallback((image: UserImage) => {
    try {
      sessionStorage.setItem(SCROLL_RESTORE_KEY, String(window.scrollY));
    } catch {
      // ignore
    }
    const index = images.findIndex((img) => getImageKey(img) === getImageKey(image));
    setSelectedImageIndex(index);
    setSelectedImage(image);
  }, [images, getImageKey]);

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
      const imageId = resolveImageApiId(image);
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

  const closeLightbox = useCallback(() => {
    setSelectedImage(null);
    setSelectedImageIndex(-1);
  }, []);

  useEffect(() => {
    if (!activeLightboxImage || !lightboxIsImage) return;
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    setLightboxIsPanning(false);
  }, [activeLightboxImage, lightboxIsImage]);

  useEffect(() => {
    if (!selectedImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextImage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedImage, closeLightbox, handlePrevImage, handleNextImage]);

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

  const loadErrorMessage = (() => {
    if (!error) return '';
    const ax = error as { response?: { status?: number; data?: unknown }; message?: string };
    if (ax.response?.data != null) {
      const body = ax.response.data;
      if (typeof body === 'string') return body;
      if (typeof body === 'object' && body !== null && 'error' in body) {
        return String((body as { error: unknown }).error);
      }
      if (typeof body === 'object' && body !== null && 'message' in body) {
        return String((body as { message: unknown }).message);
      }
    }
    if (error instanceof Error) return error.message;
    return String(error);
  })();

  const skeletonGridClass = gridCompact
    ? 'lumina-gallery-grid lumina-gallery-grid--compact'
    : 'lumina-gallery-grid';

  if (isError && !userImagesData) {
    return (
      <div className="images-library-scope relative min-h-screen">
        <main className="flex min-h-screen flex-col">
          <div className="lumina-page-body flex flex-1 flex-col items-center justify-center py-16">
            <div className="lumina-glass w-full max-w-md rounded-2xl p-8 text-center">
              <h2 className="text-lg font-semibold text-[#191c1e]">{t('imagesPage.loadErrorTitle')}</h2>
              <p className="mt-2 text-sm text-[#4a4455]">{t('imagesPage.loadErrorBody')}</p>
              {loadErrorMessage && (
                <p className="mt-3 rounded-lg bg-[#eceef0] px-3 py-2 font-mono text-xs text-[#4a4455]">
                  {loadErrorMessage}
                </p>
              )}
              <button type="button" onClick={() => refetch()} className="lumina-btn-primary lumina-primary-glow mt-6">
                {t('imagesPage.retryAction')}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isPending && !userImagesData && !isError) {
    return (
      <div className="images-library-scope relative min-h-screen">
        <main className="flex min-h-screen flex-col">
          <header className="lumina-top-bar">
            <div className="lumina-page-body flex h-14 items-center">
              <div className="lumina-top-search flex-1 sm:flex-none">
                <Search className="h-5 w-5 shrink-0 text-[#7b7487]" />
                <input
                  type="search"
                  value=""
                  readOnly
                  disabled
                  placeholder={t('imagesPage.searchPlaceholder')}
                  aria-hidden
                />
              </div>
            </div>
          </header>
          <div className="lumina-page-body space-y-8">
            <div className="lumina-hero lumina-glass h-40 animate-pulse" />
            <div className={skeletonGridClass}>
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="lumina-skeleton-card">
                  <div className="lumina-skeleton-media lumina-shimmer" />
                  <div className="lumina-skeleton-footer lumina-shimmer" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="images-library-scope relative min-h-screen">
      <main className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Top bar — search only (no left sidebar) */}
        <header className="lumina-top-bar">
          <div className="lumina-page-body flex h-14 items-center justify-between gap-4">
            <div className="lumina-top-search min-w-0 flex-1 sm:max-w-md">
              <Search className="h-5 w-5 shrink-0 text-[#7b7487]" />
              <input
                type="search"
                value={gallerySearch ?? ''}
                onChange={(e) => setGallerySearch(e.target.value)}
                placeholder={t('imagesPage.searchPlaceholder')}
                aria-label={t('imagesPage.searchPlaceholder')}
              />
            </div>
            <button
              type="button"
              onClick={() => setGridCompact((c) => !c)}
              className="lumina-btn-secondary hidden shrink-0 px-3 py-2 sm:inline-flex"
              aria-label="Toggle grid density"
            >
              {gridCompact ? <Grid3x3 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <div className="lumina-page-body flex-1">
          {/* Hero — Lumina glass (no left sidebar) */}
          <section className="lumina-hero lumina-glass relative z-10">
            <div className="lumina-hero-glow" aria-hidden />
            <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="min-w-0 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="lumina-pulse-dot" aria-hidden />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#630ed4]">
                    {t('imagesPage.libraryKicker')}
                  </span>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-[#191c1e] sm:text-4xl md:text-5xl">
                  {viewMode === 'my'
                    ? t('imagesPage.myImages')
                    : t('imagesPage.theirFiles', {
                      name:
                        [selectedUser?.inviterFirstName, selectedUser?.inviterLastName]
                          .filter(Boolean)
                          .join(' ')
                          .trim() || '—',
                    })}
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-[#4a4455]">
                  {viewMode === 'my'
                    ? t('imagesPage.librarySubtitleMy')
                    : t('imagesPage.librarySubtitleTheir')}
                </p>
                <div className="pt-1">
                  <span className="lumina-stat-chip">
                    <Database className="h-4 w-4" />
                    {userImagesData?.pages?.[0]?.totalImages ?? images.length} {t('imagesPage.totalFiles')}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="lumina-view-toggle">
                  <button
                    type="button"
                    onClick={() => setGridCompact(false)}
                    className={!gridCompact ? 'lumina-view-toggle--active' : ''}
                    aria-label="Comfortable grid"
                  >
                    <Grid3x3 className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridCompact(true)}
                    className={gridCompact ? 'lumina-view-toggle--active' : ''}
                    aria-label="Compact grid"
                  >
                    <LayoutGrid className="h-5 w-5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedImageIds.size > 0) {
                      setShowShareModal(true);
                    } else {
                      toast(t('imagesPage.selectHint'), { icon: '💡' });
                    }
                  }}
                  className="lumina-btn-secondary"
                >
                  <Share2 className="h-5 w-5" />
                  {selectedImageIds.size > 0
                    ? `${t('imagesPage.shareLink')} (${selectedImageIds.size})`
                    : t('imagesPage.shareLink')}
                </button>
                {viewMode === 'my' && selectedImageIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDeleteSelected}
                    disabled={bulkDeleteImagesMutation.isPending}
                    className="lumina-btn-secondary inline-flex items-center gap-2 text-red-700 border-red-200 hover:bg-red-50"
                  >
                    <FiTrash2 className="h-5 w-5" />
                    {bulkDeleteImagesMutation.isPending
                      ? t('imagesPage.deleting')
                      : `${t('imagesPage.delete')} (${selectedImageIds.size})`}
                  </button>
                )}
                {viewMode === 'my' && selectedImageIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedImageIds(new Set())}
                    className="lumina-btn-secondary"
                  >
                    {t('imagesPage.clearSelection')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = '/upload';
                  }}
                  className="lumina-btn-primary lumina-primary-glow bg-[var(--header-background)]"
                >
                  <Upload className="h-5 w-5" />
                  {t('imagesPage.uploadFile')}
                </button>
              </div>
            </div>
          </section>

          {/* Image sources */}
          {familyRelationships.length > 0 && (
            <section className="mb-8">
              <h3 className="mb-3 text-xl font-semibold tracking-tight text-[#191c1e]">
                {t('imagesPage.fileSource')}
              </h3>
              <div className="flex flex-wrap gap-3">
                {viewMode === 'my' && !selectedUser ? (
                  <span className="lumina-source-active">
                    <FolderOpen className="h-[18px] w-[18px]" />
                    {t('imagesPage.myImages')}
                  </span>
                ) : (
                  <button type="button" onClick={handleBackToMyFiles} className="lumina-source-chip">
                    <FolderOpen className="h-[18px] w-[18px]" />
                    {t('imagesPage.myImages')}
                  </button>
                )}


                {familyRelationships.map((member) => {
                  const active = selectedUser?.inviterId === member.inviterId;
                  const name = [member.inviterFirstName, member.inviterLastName].filter(Boolean).join(' ');
                  const initials = name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  if (active) {
                    return (
                      <span key={member.inviterId} className="lumina-source-active">
                        <span className="lumina-source-avatar">{initials || '·'}</span>
                        {name}
                      </span>
                    );
                  }
                  return (
                    <button
                      key={member.inviterId}
                      type="button"
                      onClick={() => handleUserSelect(member)}
                      className="lumina-source-chip"
                    >
                      <span className="lumina-source-avatar">{initials || '·'}</span>
                      <span className="truncate">{name}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs leading-5 text-[#4a4455]">{t('imagesPage.familySectionHint')}</p>
            </section>
          )}




        {/* {viewMode === 'my' && (
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[color:color-mix(in_oklab,var(--primary),transparent_90%)] text-[color:var(--primary)]">
                  <Users className="h-4 w-4" />
                </div>
                <h2 className="truncate text-base font-semibold text-[color:var(--foreground)]">
                  {t('imagesPage.familyMembers')}
                </h2>
              </div>
            </div>
            {familyRelationships.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:color-mix(in_oklab,var(--border),transparent_25%)] bg-[var(--card)]/50 py-10 text-center">
                <FaUsers className="mx-auto mb-2 h-12 w-12 text-[color:var(--muted-foreground)] opacity-40" />
                <p className="text-sm text-[color:var(--muted-foreground)]">{t('imagesPage.noFamily')}</p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)] opacity-80">{t('imagesPage.noFamilyHint')}</p>
              </div>
            ) : (
              <>
                <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
                  {familyRelationships.map((member) => {
                    const initials = [member.inviterFirstName?.trim()?.[0], member.inviterLastName?.trim()?.[0]]
                      .filter(Boolean)
                      .join('')
                      .toUpperCase() || '?';
                    return (
                      <button
                        key={member.inviterId}
                        type="button"
                        onClick={() => handleUserSelect(member)}
                        className="group flex min-w-[260px] flex-col rounded-2xl border border-[color:color-mix(in_oklab,var(--border),transparent_35%)] bg-[var(--card)]/70 p-4 text-left il-shadow-soft backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-[color:color-mix(in_oklab,var(--primary),transparent_60%)] hover:il-shadow-elegant sm:min-w-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-semibold text-white shadow-md">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                              {member.inviterFirstName} {member.inviterLastName}
                            </p>
                            <p className="text-xs text-[color:var(--muted-foreground)]">{member.relationshipType}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[color:var(--muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-[color:var(--primary)]" />
                        </div>
                        {member.relationshipNotes && (
                          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[color:var(--muted-foreground)]">
                            <span className="font-medium text-[color:var(--foreground)]">{t('common.notes')}:</span>{' '}
                            {member.relationshipNotes}
                          </p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[color:color-mix(in_oklab,var(--border),transparent_50%)] pt-3">
                          {member.canViewImages && (
                            <span className="rounded-md bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--secondary-foreground)]">
                              {t('imagesPage.view')}
                            </span>
                          )}
                          {member.canUploadImages && (
                            <span className="rounded-md bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--secondary-foreground)]">
                              {t('imagesPage.upload')}
                            </span>
                          )}
                          {member.canDeleteImages && (
                            <span className="rounded-md bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--secondary-foreground)]">
                              {t('imagesPage.delete')}
                            </span>
                          )}
                          {member.canManageAlbums && (
                            <span className="rounded-md bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--secondary-foreground)]">
                              {t('imagesPage.albums')}
                            </span>
                          )}
                          {!member.canViewImages &&
                            !member.canUploadImages &&
                            !member.canDeleteImages &&
                            !member.canManageAlbums && (
                              <span className="rounded-md bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--muted-foreground)]">
                                No permissions
                              </span>
                            )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-center text-[11px] text-[color:var(--muted-foreground)] sm:text-left">
                  {t('imagesPage.familySwipeHint')}
                </p>
              </>
            )}
          </section>
        )} */}

        <section>
          {images.length === 0 ? (
            <div className="lumina-empty">
              <Upload className="mx-auto h-14 w-14 text-[color:var(--muted-foreground)] opacity-45" />
              <h3 className="mt-4 text-lg font-semibold text-[color:var(--foreground)]">
                {viewMode === 'my' ? t('imagesPage.noFilesMy') : t('imagesPage.noFilesShared')}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[color:var(--muted-foreground)]">
                {viewMode === 'my'
                  ? t('imagesPage.uploadHint')
                  : t('imagesPage.noFilesTheir', {
                    name: [selectedUser?.inviterFirstName, selectedUser?.inviterLastName]
                      .filter(Boolean)
                      .join(' ')
                      .trim() || '—',
                  })}
              </p>
              {viewMode === 'my' && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = '/upload';
                  }}
                  className="mt-6 inline-flex items-center rounded-xl il-primary-gradient px-5 py-2.5 text-sm font-semibold text-[color:var(--header-background)] il-shadow-elegant transition hover:opacity-95"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('imagesPage.uploadFile')}
                </button>
              )}
            </div>
          ) : filteredImagesWithIndex.length === 0 ? (
            <div className="lumina-empty py-14">
              <Search className="mx-auto mb-3 h-10 w-10 text-[color:var(--muted-foreground)] opacity-45" />
              <p className="text-sm text-[color:var(--muted-foreground)]">
                {galleryDateFilter ? t('imagesPage.noDateMatches') : t('imagesPage.noSearchMatches')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setGallerySearch('');
                  setGalleryDateFilter('');
                  setGallerySearchOpen(false);
                }}
                className="mt-4 inline-flex items-center rounded-xl border border-[color:color-mix(in_oklab,var(--border),transparent_25%)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:bg-[var(--muted)]"
              >
                {galleryDateFilter ? t('imagesPage.clearDateFilter') : t('imagesPage.clearSearch')}
              </button>
            </div>
          ) : (
            <>
              <div className="lumina-gallery-bar lumina-glass flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-[#191c1e]">{t('imagesPage.galleryHeading')}</span>
                  <span className="text-sm text-[#4a4455]">
                    • {t('imagesPage.itemsShowing', { n: filteredImagesWithIndex.length })}
                  </span>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <div className="relative min-w-0 sm:min-w-[11rem]">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7b7487]" />
                    <select
                      id="gallery-date-filter"
                      value={galleryDateFilter}
                      onChange={(e) => setGalleryDateFilter(e.target.value)}
                      className="lumina-select w-full"
                    >
                      <option value="">{t('imagesPage.allDates')}</option>
                      {availableUploadDays.map((dayKey) => (
                        <option key={dayKey} value={dayKey}>
                          {formatDayKeyLabel(dayKey, t('imagesPage.unknownDate'))}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGridCompact((c) => !c)}
                    className="lumina-btn-secondary inline-flex shrink-0 px-3 py-2 sm:hidden"
                    aria-label="Toggle grid density"
                  >
                    {gridCompact ? <Grid3x3 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div
                ref={galleryMarqueeRef}
                className={`lumina-marquee-surface space-y-10 relative ${
                  isGalleryMarqueeSelecting ? 'lumina-marquee-surface--active' : ''
                }`}
                {...galleryMarqueeSurfaceProps}
              >
                {galleryMarqueeStyle && (
                  <div className="lumina-marquee-box" style={galleryMarqueeStyle} aria-hidden />
                )}
                {galleryImagesByDay.map((group) => (
                  <div key={group.dayKey}>
                    <h4 className="lumina-day-title mb-4">
                      {formatDayKeyLabel(group.dayKey, t('imagesPage.unknownDate'))}
                      <span className="lumina-day-meta">
                        • {t('imagesPage.photosOnDay', { n: group.items.length })}
                      </span>
                    </h4>
                    <div
                      className={
                        gridCompact ? 'lumina-gallery-grid lumina-gallery-grid--compact' : 'lumina-gallery-grid'
                      }
                    >
                      {group.items.map(({ image, index }) => (
                        <ImageCard
                          key={`${getImageKey(image)}-${index}`}
                          image={image}
                          index={index}
                          isVisible={visibleIndices.has(index)}
                          onView={handleView}
                          onDownload={handleDownload}
                          onDelete={handleDelete}
                          viewMode={viewMode}
                          deletePending={deleteImageMutation.isPending || bulkDeleteImagesMutation.isPending}
                          cardRef={setCardRef(index)}
                          selectId={viewMode === 'my' ? getImageKey(image) : undefined}
                          isSelected={viewMode === 'my' ? selectedImageIds.has(getImageKey(image)) : undefined}
                          onToggleSelect={viewMode === 'my' ? handleToggleSelect : undefined}
                          suppressOpen={isGalleryMarqueeSelecting}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div ref={loadMoreSentinelRef} className="h-4" aria-hidden />
              {isFetchingNextPage && (
                <div className="mt-4 flex justify-center py-4">
                  <LoadingSpinner size="md" text={t('imagesPage.loadingMore')} />
                </div>
              )}
            </>
          )}
        </section>
        </div>
      </main>

      {/* Share modal – send public selection URL to contacts / email / SMS */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[color:color-mix(in_oklab,var(--foreground),transparent_55%)] p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-[color:color-mix(in_oklab,var(--border),transparent_25%)] bg-[var(--card)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[color:color-mix(in_oklab,var(--border),transparent_45%)] px-5 py-4">
              <h3 className="text-base font-semibold text-[color:var(--foreground)]">{t('imagesPage.shareLink')}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  setShareContactSearch('');
                  setShareAlreadySent(null);
                }}
                className="rounded-lg p-2 text-[color:var(--muted-foreground)] transition hover:bg-[var(--muted)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              {selectedImages.length > 0 && (
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  Sharing link for <strong className="text-[color:var(--foreground)]">{selectedImages.length}</strong>{' '}
                  image{selectedImages.length !== 1 ? 's' : ''}.
                </p>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[color:var(--foreground)]">
                  Existing contacts
                </label>
                <input
                  type="text"
                  value={shareContactSearch}
                  onChange={(e) => setShareContactSearch(e.target.value)}
                  placeholder="Search by name, email, mobile..."
                  className="mb-2 w-full rounded-xl border border-[color:var(--input)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                />
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-[color:color-mix(in_oklab,var(--border),transparent_35%)] bg-[var(--background)] p-2">
                  {shareContacts.length === 0 ? (
                    <p className="text-sm text-[color:var(--muted-foreground)]">
                      No contacts yet. Add email or mobile below.
                    </p>
                  ) : (
                    shareContacts.map((c) => (
                      <label key={c.id} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={shareContactIds.has(c.id)}
                          onChange={(e) => {
                            const next = new Set(shareContactIds);
                            if (e.target.checked) next.add(c.id);
                            else next.delete(c.id);
                            setShareContactIds(next);
                          }}
                          className="rounded border-[color:var(--input)]"
                        />
                        <span className="text-sm text-[color:var(--foreground)]">
                          {c.displayName || c.email || c.mobile || c.id}
                        </span>
                        {(c.email || c.mobile) && (
                          <span className="text-xs text-[color:var(--muted-foreground)]">
                            ({[c.email, c.mobile].filter(Boolean).join(', ')})
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>
              {showEmail && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[color:var(--foreground)]">
                    New recipients – email (comma separated)
                  </label>
                  <input
                    type="text"
                    value={shareNewEmails}
                    onChange={(e) => {
                      setShareNewEmails(e.target.value);
                      setShareAlreadySent(null);
                    }}
                    onBlur={() => checkRecipient(shareNewEmails, shareNewMobiles)}
                    placeholder="e.g. a@example.com, b@example.com"
                    className="w-full rounded-xl border border-[color:var(--input)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                  />
                </div>
              )}
              {showPhone && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[color:var(--foreground)]">
                    New recipients – mobile (comma separated)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={shareNewMobileCountryCode}
                      onChange={(e) => setShareNewMobileCountryCode(e.target.value)}
                      className="w-24 shrink-0 rounded-xl border border-[color:var(--input)] bg-[var(--background)] px-3 py-2.5 text-sm text-[color:var(--foreground)] focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+971">+971</option>
                      <option value="+61">+61</option>
                      <option value="+81">+81</option>
                      <option value="+86">+86</option>
                      <option value="+33">+33</option>
                      <option value="+49">+49</option>
                      <option value="+55">+55</option>
                    </select>
                    <input
                      type="text"
                      value={shareNewMobiles}
                      onChange={(e) => {
                        setShareNewMobiles(e.target.value);
                        setShareAlreadySent(null);
                      }}
                      onBlur={() => checkRecipient(shareNewEmails, shareNewMobiles)}
                      placeholder="e.g. 9876543210, 9123456789"
                      className="min-w-0 flex-1 rounded-xl border border-[color:var(--input)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                    />
                  </div>
                </div>
              )}
              {shareAlreadySent?.alreadySent && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Already sent to this {shareAlreadySent.email ? 'email' : 'mobile'}. You can resend if needed.
                </p>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[color:var(--foreground)]">Optional message</label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Add a short message to include in the email/SMS"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-[color:var(--input)] bg-[var(--background)] px-3.5 py-2.5 text-sm text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                {showEmail && (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={shareChannels.email}
                      onChange={(e) => setShareChannels((c) => ({ ...c, email: e.target.checked }))}
                      className="rounded border-[color:var(--input)]"
                    />
                    <span className="text-sm text-[color:var(--foreground)]">Send via Email</span>
                  </label>
                )}
                {showPhone && (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={shareChannels.sms}
                      onChange={(e) => setShareChannels((c) => ({ ...c, sms: e.target.checked }))}
                      className="rounded border-[color:var(--input)]"
                    />
                    <span className="text-sm text-[color:var(--foreground)]">Send via SMS</span>
                  </label>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[color:color-mix(in_oklab,var(--border),transparent_45%)] bg-[color:color-mix(in_oklab,var(--secondary),transparent_60%)] px-5 py-3.5">
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  setShareContactSearch('');
                  setShareAlreadySent(null);
                }}
                className="rounded-xl border border-[color:color-mix(in_oklab,var(--border),transparent_25%)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:bg-[var(--muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleShareSend}
                disabled={shareSending || !publicShareUrl}
                className="rounded-xl il-primary-gradient px-4 py-2 text-sm font-semibold text-[color:var(--primary-foreground)] il-shadow-elegant transition hover:opacity-95 disabled:opacity-50"
              >
                {shareSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
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
          className="fixed inset-0 z-[99999] bg-[oklch(0.12_0.02_270/0.97)] backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div className="lumina-lightbox-chrome pointer-events-none absolute inset-x-0 top-0 z-[100000] flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="pointer-events-auto min-w-0 flex-1 pr-4">
              <p className="truncate text-sm font-semibold text-white">
                {(activeLightboxImage ?? selectedImage).filename}
              </p>
              <p className="mt-0.5 text-xs text-white/55">
                {formatDate((activeLightboxImage ?? selectedImage).uploadTime)}
              </p>
            </div>
            <div className="lumina-lightbox-pill pointer-events-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  const key = getImageKey(selectedImage);
                  setSelectedImageIds(new Set([key]));
                  closeLightbox();
                  setTimeout(() => setShowShareModal(true), 50);
                }}
                aria-label={t('imagesPage.shareLink')}
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => handleDownload(activeLightboxImage ?? selectedImage)}
                aria-label="Download"
              >
                <FiDownload className="h-5 w-5" />
              </button>
              <button type="button" onClick={closeLightbox} aria-label="Close">
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="absolute inset-0 pt-[4.5rem]">
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                  className="lumina-nav-btn absolute left-3 top-1/2 z-30 -translate-y-1/2 md:left-6"
                >
                  <FaChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next image"
                  className="lumina-nav-btn absolute right-3 top-1/2 z-30 -translate-y-1/2 md:right-6"
                >
                  <FaChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
            {lightboxIsImage && activeLightboxImage ? (
              (() => {
                const displayUrl = lightboxProgressive.baseSrc;
                const isZoomed = lightboxZoom > 1;
                const showQuality =
                  lightboxProgressive.isUpgrading ||
                  lightboxProgressive.stepIndex < lightboxProgressive.totalSteps - 1;
                const progressPct =
                  lightboxProgressive.totalSteps > 1
                    ? Math.round(
                        ((lightboxProgressive.stepIndex + 1) / lightboxProgressive.totalSteps) *
                          100
                      )
                    : 100;
                return (
                  <div
                    ref={lightboxZoomContainerRef}
                    className="relative flex h-full w-full select-none items-center justify-center overflow-hidden touch-none"
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
                      className="absolute flex h-full w-full items-center justify-center"
                      style={{
                        willChange: 'transform',
                        transform: `translate(50%, 50%) translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom}) translate(-50%, -50%)`,
                        transition: lightboxIsPanning ? 'none' : 'transform 0.15s ease-out',
                      }}
                    >
                      {displayUrl ? (
                        <>
                          <img
                            src={displayUrl}
                            alt={activeLightboxImage.filename}
                            className="absolute inset-0 m-auto h-full w-full max-h-full max-w-full object-contain"
                            draggable={false}
                          />
                          {lightboxProgressive.overlaySrc && (
                            <img
                              src={lightboxProgressive.overlaySrc}
                              alt=""
                              aria-hidden
                              className="absolute inset-0 m-auto h-full w-full max-h-full max-w-full object-contain transition-opacity duration-300 ease-in-out"
                              style={{ opacity: lightboxProgressive.overlayVisible ? 1 : 0 }}
                              draggable={false}
                            />
                          )}
                        </>
                      ) : null}
                    </div>
                    {showQuality && (
                      <div
                        className="pointer-events-none absolute bottom-5 left-1/2 z-20 w-[min(280px,88vw)] -translate-x-1/2 rounded-full bg-black/45 px-4 py-2 backdrop-blur-sm"
                        aria-live="polite"
                      >
                        <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-white/90">
                          <span>{lightboxProgressive.qualityLabel}</span>
                          <span className="text-white/60">
                            {lightboxProgressive.stepIndex + 1}/{lightboxProgressive.totalSteps}
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full bg-white/85 transition-all duration-300 ease-out"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {isZoomed && (
                      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
                        <p className="rounded bg-black/50 px-3 py-1.5 text-xs text-white/70">
                          Scroll to zoom · Drag to pan · Double-click to reset
                        </p>
                        <button
                          type="button"
                          onClick={handleLightboxResetZoom}
                          className="rounded bg-white/20 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/30"
                          aria-label="Reset zoom"
                        >
                          Reset zoom
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : isVideoType(selectedImage.fileType, selectedImage.filename, selectedImage.mediaType) ? (
              <div className="relative flex justify-center items-center w-full h-full">
                <HlsVideoPlayer
                  source={resolveVideoPlayback(selectedImage)}
                  className="w-full h-full object-contain"
                  controls
                  waitForReady={isVideoProcessing(resolveVideoPlayback(selectedImage))}
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