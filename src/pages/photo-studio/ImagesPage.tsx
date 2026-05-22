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
} from 'lucide-react';
import './imagesPageTheme.css';
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
// hour: '2-digit',
// minute: '2-digit',

/** Local calendar day key for grouping (YYYY-MM-DD). */
function uploadDayKey(dateString: string): string {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return 'invalid';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

function isVideoType(fileType: string, filename?: string): boolean {
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
  /** When set, show checkbox for share selection */
  isSelected?: boolean;
  onToggleSelect?: (image: UserImage) => void;
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
}: ImageCardProps) {
  const [loadState, setLoadState] = useState<ImageLoadState>('idle');
  const [hovered, setHovered] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const showImage = isImageType(image.fileType, image.filename);
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative overflow-hidden rounded-2xl border bg-[var(--card)] il-shadow-soft ${isSelected
        ? 'border-blue-500'
        : 'border-[color:color-mix(in_oklab,var(--border),transparent_35%)] hover:border-[color:color-mix(in_oklab,var(--primary),transparent_60%)]'
        }`}
    >
      {/* Preview area */}
      <div
        className="relative w-full overflow-hidden bg-[color:var(--muted)]"
        style={{ paddingBottom: `${(1 / ASPECT_RATIO) * 100}%` }}
        onClick={() => onView(image)}


      >
        <div className="absolute inset-0">
          {showSkeleton && <SkeletonPlaceholder />}
          {showImg && (
            <img
              ref={imgRef}
              src={isVisible ? image.thumbnailUrl || image.previewUrl : undefined}
              alt={image.filename}
              className="h-full w-full object-cover transition-all duration-500"
              style={{
                opacity: loadState === 'loaded' ? 1 : 0,
                transition: 'opacity 0.3s ease',
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
              className="w-full h-full object-cover"
              style={{ opacity: loadState === 'loaded' ? 1 : 0, transition: 'opacity 0.3s ease' }}
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
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div
                className={`${getFileTypeColor(image.fileType, image.filename)} text-white rounded-2xl p-5 text-4xl shadow-lg`}
              >
                {getFileTypeIcon(image.fileType, image.filename)}
              </div>
            </div>
          )}

          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
            style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.4s ease' }}
          />

          <div className="absolute right-2 top-2 flex items-center gap-1">
            {onToggleSelect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(image);
                }}
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200 ${isSelected
                  ? 'border-white bg-blue-600 text-white shadow-md'
                  : 'border-white/70 bg-black/25 backdrop-blur-sm hover:border-white'
                  }`}
                aria-label={isSelected ? 'Deselect' : 'Select for share'}
              >
                {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
              </button>
            )}
          </div>

          <div
            className="absolute bottom-2 left-2 right-2 flex gap-1.5 pointer-events-none"
            style={{ opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.3s ease, transform 0.3s ease', pointerEvents: hovered ? 'auto' : 'none' }}
          >
            <button
              type="button"
              onClick={() => onView(image)}
              className="flex-1 inline-flex justify-center items-center px-2 py-1.5 text-xs font-semibold rounded-lg text-white bg-white/20 hover:bg-white/35 backdrop-blur-sm border border-white/30 transition-colors"
            >
              <FaEye className="h-3 w-3 mr-1" />
              View
            </button>
            <button
              type="button"
              onClick={() => onDownload(image)}
              className="flex-1 inline-flex justify-center items-center px-2 py-1.5 text-xs font-semibold rounded-lg text-white bg-white/20 hover:bg-white/35 backdrop-blur-sm border border-white/30 transition-colors"
            >
              <FiDownload className="h-3 w-3 mr-1" />
              Save
            </button>
            {viewMode === 'my' && (
              <button
                type="button"
                onClick={() => onDelete(image)}
                disabled={deletePending}
                className="inline-flex justify-center items-center px-2 py-1.5 text-xs font-semibold rounded-lg text-white bg-red-500/70 hover:bg-red-500/90 backdrop-blur-sm border border-red-400/40 transition-colors disabled:opacity-50 min-w-[2rem]"
              >
                {deletePending ? <LoadingSpinner size="sm" /> : <FiTrash2 className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="border-t border-[color:color-mix(in_oklab,var(--border),transparent_55%)] bg-[var(--card)] px-3 py-2.5">
        <h3
          className="truncate text-xs font-semibold leading-tight text-[color:var(--foreground)]"
          title={image.filename}
        >
          {image.filename}
        </h3>
      </div>
    </div>
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
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [gallerySearch, setGallerySearch] = useState('');
  const [gallerySearchOpen, setGallerySearchOpen] = useState(false);
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

  const filteredImagesWithIndex = useMemo(() => {
    const q = gallerySearch.trim().toLowerCase();
    return images
      .map((image, index) => ({ image, index }))
      .filter(({ image }) => !q || image.filename.toLowerCase().includes(q));
  }, [images, gallerySearch]);

  /** Newest-first, grouped by local calendar day for gallery sections. */
  const galleryImagesByDay = useMemo(() => {
    const sorted = [...filteredImagesWithIndex].sort(
      (a, b) => new Date(b.image.uploadTime).getTime() - new Date(a.image.uploadTime).getTime()
    );
    type Row = (typeof filteredImagesWithIndex)[number];
    const groups: { dayKey: string; items: Row[] }[] = [];
    for (const row of sorted) {
      const key = uploadDayKey(row.image.uploadTime);
      const prev = groups[groups.length - 1];
      if (prev && prev.dayKey === key) {
        prev.items.push(row);
      } else {
        groups.push({
          dayKey: key,
          items: [row],
        });
      }
    }
    return groups;
  }, [filteredImagesWithIndex]);

  const getImageKey = useCallback((image: UserImage) => {
    if (image.id != null && image.id !== '') return String(image.id);
    return image.previewUrl || image.filename || '';
  }, []);

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

  const closeLightbox = useCallback(() => {
    setSelectedImage(null);
    setSelectedImageIndex(-1);
  }, []);

  // Progressive image loading in lightbox: show thumbnail immediately, preload previewUrl, then fade in preview when ready
  useEffect(() => {
    if (!selectedImage || !isImageType(selectedImage.fileType, selectedImage.filename)) return;
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

  const loadErrorMessage =
    error instanceof Error ? error.message : error ? String(error) : '';

  if (isError && !userImagesData) {
    return (
      <div className="images-library-scope relative min-h-screen bg-[var(--gradient-surface)] font-clients text-[color:var(--foreground)]">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[color:var(--primary)]/20 blur-3xl" />
          <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-[var(--primary-glow)]/15 blur-3xl" />
        </div>
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-6">
          <div className="w-full max-w-md rounded-2xl border border-[color:color-mix(in_oklab,var(--border),transparent_30%)] bg-[var(--card)]/90 p-8 text-center il-shadow-soft backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{t('imagesPage.loadErrorTitle')}</h2>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{t('imagesPage.loadErrorBody')}</p>
            {loadErrorMessage && (
              <p className="mt-3 rounded-lg bg-[color:var(--muted)] px-3 py-2 font-mono text-xs text-[color:var(--muted-foreground)]">
                {loadErrorMessage}
              </p>
            )}
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-6 inline-flex items-center justify-center rounded-xl il-primary-gradient px-5 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] il-shadow-elegant transition hover:opacity-95"
            >
              {t('imagesPage.retryAction')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isPending && !userImagesData && !isError) {
    return (
      <div className="images-library-scope relative min-h-screen bg-[var(--gradient-surface)] font-clients">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[color:var(--primary)]/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="mb-8 h-10 w-48 animate-pulse rounded-xl bg-[color:var(--muted)]" />
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-[color:color-mix(in_oklab,var(--card),var(--muted)_40%)]"
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-[color:color-mix(in_oklab,var(--border),transparent_40%)]"
              >
                <div
                  className="animate-pulse bg-[color:var(--muted)]"
                  style={{ paddingBottom: `${(1 / ASPECT_RATIO) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="images-library-scope relative min-h-screen bg-[var(--gradient-surface)] font-clients text-[color:var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[color:var(--primary)]/20 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-[var(--primary-glow)]/15 blur-3xl" />
      </div>

      <div className="relative w-full px-4 py-6 sm:px-6 sm:py-8">

        {/* header section start */}
        <header
          className="relative mb-6 overflow-hidden rounded-3xl border border-[#D9E7FF] px-8 py-7 shadow-[0_10px_40px_rgba(37,99,235,0.06)]"
          style={{
            background:
              'linear-gradient(135deg, rgb(238, 244, 255) 0%, rgb(231, 240, 255) 35%, rgb(245, 249, 255) 100%)',
          }}
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-blue-300/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-blue-400/5 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* LEFT */}
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D9E7FF] bg-white/70 px-3 py-1 backdrop-blur-xl">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2563EB] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563EB]">
                  Photo Library
                </span>
              </div>

              <h1 className="mt-4 text-[2.25rem] font-semibold leading-[1.1] tracking-tight text-[#0F172A]">
                {viewMode === 'my'
                  ? 'My Images'
                  : t('imagesPage.theirFiles', {
                    name:
                      [selectedUser?.inviterFirstName, selectedUser?.inviterLastName]
                        .filter(Boolean)
                        .join(' ')
                        .trim() || '—',
                  })}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Browse, organize, and manage every file in your librarccdasfy.
              </p>

              {/* Stat row — flatter, more enterprise */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-[#D9E7FF] bg-white/80 px-4 py-2.5 backdrop-blur-xl">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] shadow-[0_6px_16px_rgba(37,99,235,0.25)]">
                    <ImageIcon className="h-4 w-4 text-white" strokeWidth={2.4} />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold tabular-nums text-[#0F172A]">
                      {userImagesData?.pages?.[0]?.totalImages ?? images.length}
                    </span>
                    <span className="text-xs font-medium text-slate-500">files</span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-[#D9E7FF] bg-white/80 px-4 py-2.5 backdrop-blur-xl">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-slate-600">All synced</span>
                </div>
              </div>
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-[#D9E7FF] bg-white/60 p-1.5 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setGallerySearchOpen((o) => !o)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all ${gallerySearchOpen || gallerySearch
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-white hover:text-[#0F172A]'
                  }`}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setGridCompact((c) => !c)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-white hover:text-[#0F172A]"
                aria-label="Toggle layout"
              >
                {gridCompact ? <LayoutGrid className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
              </button>

              <div className="mx-1 h-6 w-px bg-[#D9E7FF]" />

              <button
                type="button"
                onClick={() => {
                  if (selectedImageIds.size > 0) {
                    setShowShareModal(true);
                  } else {
                    toast('Select images using the ☑ checkbox on each card, then share.', { icon: '💡' });
                  }
                }}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-all ${selectedImageIds.size > 0
                  ? 'text-blue-900 shadow-sm hover:opacity-90'
                  : 'text-slate-500 hover:bg-white hover:text-[#0F172A]'
                  }`}
                style={selectedImageIds.size > 0 ? { background: 'linear-gradient(135deg, rgb(238, 244, 255) 0%, rgb(231, 240, 255) 35%, rgb(245, 249, 255) 100%)' } : undefined}
                aria-label="Share"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {selectedImageIds.size > 0 ? `Share (${selectedImageIds.size})` : 'Share'}
                </span>
                {selectedImageIds.size > 0 && (
                  <span className="sm:hidden text-xs font-bold">{selectedImageIds.size}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { window.location.href = '/upload'; }}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] px-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:shadow-[0_10px_28px_rgba(37,99,235,0.32)]"
                aria-label="Upload"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>
          </div>
        </header>

        {viewMode === 'my' && familyRelationships.length > 0 && (
          <section className="mb-8 overflow-hidden rounded-3xl border border-[#D9E7FF] bg-white/80 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
            {/* Header — always visible, tap to expand on mobile */}
            <button
              type="button"
              className="flex w-full items-center justify-between px-6 py-4 sm:cursor-default"
              onClick={() => setShowSourcesPanel((v) => !v)}
            >
              <div className="text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                  Image Sources
                </p>
                <h3 className="mt-0.5 text-base font-semibold tracking-tight text-[#0F172A]">
                  Show files from
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {familyRelationships.length + 1} sources
                </span>
                <span className={`text-slate-400 transition-transform duration-200 sm:hidden ${showSourcesPanel ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </div>
            </button>

            {/* Body — always visible on sm+, collapsible on mobile */}
            <div className={`px-6 pb-5 sm:block ${showSourcesPanel ? 'block' : 'hidden'}`}>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleBackToMyFiles}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${viewMode === 'my' && !selectedUser
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'border border-[#D9E7FF] bg-white text-slate-600 hover:border-[#2563EB]/40 hover:text-[#0F172A]'
                    }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${viewMode === 'my' && !selectedUser ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                  {t('imagesPage.myImages')}
                </button>

                {familyRelationships.map((member) => {
                  const active = selectedUser?.inviterId === member.inviterId;
                  const name = [member.inviterFirstName, member.inviterLastName].filter(Boolean).join(' ');
                  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <button
                      key={member.inviterId}
                      type="button"
                      onClick={() => { handleUserSelect(member); setShowSourcesPanel(false); }}
                      className={`inline-flex shrink-0 max-w-[200px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${active
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'border border-[#D9E7FF] bg-white text-slate-600 hover:border-[#2563EB]/40 hover:text-[#0F172A]'
                        }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${active ? 'bg-white/15 text-white' : 'bg-[#EFF6FF] text-[#2563EB]'}`}>
                        {initials || '·'}
                      </span>
                      <span className="truncate">{name}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 border-t border-[#D9E7FF] pt-3 text-xs leading-5 text-slate-500">
                {t('imagesPage.familySectionHint')}
              </p>
            </div>
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
            <div className="rounded-2xl border-2 border-dashed border-[color:color-mix(in_oklab,var(--border),transparent_25%)] bg-[var(--card)]/50 px-4 py-16 text-center sm:py-20">
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
            <div className="rounded-2xl border border-[color:color-mix(in_oklab,var(--border),transparent_35%)] bg-[var(--card)]/70 py-14 text-center il-shadow-soft backdrop-blur-sm">
              <Search className="mx-auto mb-3 h-10 w-10 text-[color:var(--muted-foreground)] opacity-45" />
              <p className="text-sm text-[color:var(--muted-foreground)]">{t('imagesPage.noSearchMatches')}</p>
              <button
                type="button"
                onClick={() => {
                  setGallerySearch('');
                  setGallerySearchOpen(false);
                }}
                className="mt-4 inline-flex items-center rounded-xl border border-[color:color-mix(in_oklab,var(--border),transparent_25%)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[color:var(--foreground)] transition hover:bg-[var(--muted)]"
              >
                {t('imagesPage.clearSearch')}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-1 border-b border-[color:color-mix(in_oklab,var(--border),transparent_45%)] pb-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[color:var(--foreground)]">{t('imagesPage.galleryHeading')}</h2>
                  <p className="text-xs text-[color:var(--muted-foreground)]">
                    {t('imagesPage.itemsShowing', { n: filteredImagesWithIndex.length })}
                  </p>
                </div>
              </div>
              <div className="space-y-10">
                {galleryImagesByDay.map((group) => (
                  <div key={group.dayKey}>
                    <p className="mb-3 mt-0.5 text-[16px] text-[color:var(--muted-foreground)]">
                      {formatDate(group.items[0].image.uploadTime)}
                    </p>
                    <div
                      className={`grid gap-3 ${gridCompact
                        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'
                        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                        }`}
                    >
                      {group.items.map(({ image, index }) => (
                        <div key={`${getImageKey(image)}-${index}`}>
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
                            isSelected={viewMode === 'my' ? selectedImageIds.has(getImageKey(image)) : undefined}
                            onToggleSelect={viewMode === 'my' ? handleToggleSelect : undefined}
                          />
                        </div>
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
                onClick={() => {
                  // Select this image and open share modal
                  const key = getImageKey(selectedImage);
                  setSelectedImageIds(new Set([key]));
                  closeLightbox();
                  setTimeout(() => setShowShareModal(true), 50);
                }}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
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
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                  className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-30 h-11 w-11 rounded-full bg-white/95 text-blue-600 shadow-md hover:shadow-lg hover:scale-105 hover:text-blue-700 transition-all flex items-center justify-center"
                >
                  <FaChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next image"
                  className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-30 h-11 w-11 rounded-full bg-white/95 text-blue-600 shadow-md hover:shadow-lg hover:scale-105 hover:text-blue-700 transition-all flex items-center justify-center"
                >
                  <FaChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
            {isImageType(selectedImage.fileType, selectedImage.filename) ? (
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
                      <>
                        <img
                          src={thumbUrl}
                          alt={selectedImage.filename}
                          className={`absolute inset-0 m-auto h-full w-full max-h-full max-w-full object-contain transition-opacity duration-300 ${showingPreviewOverlay ? 'opacity-0' : 'opacity-100'
                            }`}
                          draggable={false}
                        />
                        {/* {isLoadingPreview && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                            <LoadingSpinner size="lg" />
                            <span className="mt-2 text-sm text-white">Loading...</span>
                          </div>
                        )} */}
                      </>

                      {hasDistinctPreview && (
                        <img
                          src={previewUrl}
                          alt={selectedImage.filename}
                          className={`absolute inset-0 m-auto h-full w-full max-h-full max-w-full object-contain transition-opacity duration-300 ${lightboxPreviewVisible ? 'opacity-100' : 'opacity-0'
                            }`}
                          draggable={false}
                        />
                      )}
                    </div>
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