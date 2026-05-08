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
  FaShare,
  FaCheck,
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
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
      style={{ transform: hovered ? 'translateY(-4px)' : 'translateY(0)', transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease' }}
    >
      {/* Preview area */}
      <div
        className="relative w-full bg-gray-100 overflow-hidden"
        style={{ paddingBottom: `${(1 / ASPECT_RATIO) * 100}%` }}
      >
        <div className="absolute inset-0">
          {showSkeleton && <SkeletonPlaceholder />}
          {showImg && image.fileType !== 'unknown' && (
            <img
              ref={imgRef}
              src={isVisible ? image.thumbnailUrl || image.previewUrl : undefined}
              alt={image.filename}
              className="w-full h-full object-cover transition-all duration-500"
              style={{
                opacity: loadState === 'loaded' ? 1 : 0,
                filter: hovered ? 'blur(0px) brightness(1)' : 'blur(4px) brightness(0.92)',
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
                transition: 'filter 0.4s ease, transform 0.4s ease, opacity 0.3s ease',
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

          {/* Overlay gradient on hover */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
            style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.4s ease' }}
          />

          {/* File type badge */}
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-black/70 text-white backdrop-blur-sm tracking-wide">
              {showVideo ? 'VIDEO' : image.fileType.toUpperCase()}
            </span>
          </div>

          {/* Top-right: checkbox + services */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            {onToggleSelect && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleSelect(image); }}
                className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                  isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white/90 border-gray-300 hover:border-indigo-500'
                }`}
                aria-label={isSelected ? 'Deselect' : 'Select for share'}
              >
                {isSelected && <FaCheck className="w-3 h-3" />}
              </button>
            )}
            <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/90 text-white backdrop-blur-sm">
              <FaCloud className="h-2.5 w-2.5 mr-1" />
              {getEnabledServicesCount(image.enabledServices)}
            </span>
          </div>

          {/* Quick action buttons on hover */}
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
      <div className="px-3 py-2.5">
        <h3
          className="text-xs font-semibold text-gray-800 truncate leading-tight"
          title={image.filename}
        >
          {image.filename}
        </h3>
        <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(image.uploadTime)}</p>
        {Object.keys(image.enabledServices).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {Object.keys(image.enabledServices).map((service) => (
              <span
                key={service}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
              >
                {service}
              </span>
            ))}
          </div>
        )}
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {viewMode === 'my'
              ? t('imagesPage.myImages')
              : t('imagesPage.theirFiles', {
                  name: [selectedUser?.inviterFirstName, selectedUser?.inviterLastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim() || '—',
                })}
          </h1>
          <div className="flex items-center gap-2">
            {viewMode === 'my' && selectedImageIds.size > 0 && (
              <>
                <span className="text-sm text-gray-500">
                  {t('imagesPage.selected', { n: selectedImageIds.size })}
                </span>
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold"
                >
                  <FaShare className="h-4 w-4 mr-2" />
                  {t('imagesPage.shareLink')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImageIds(new Set())}
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
                >
                  {t('imagesPage.clearSelection')}
                </button>
              </>
            )}
            {viewMode === 'invited' && (
              <button
                type="button"
                onClick={handleBackToMyFiles}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FaUser className="h-4 w-4 mr-2" />
                {t('imagesPage.backToMyFiles')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Family members (my view) */}
      {viewMode === 'my' && (
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaUsers className="h-5 w-5 mr-2 text-blue-600" />
              {t('imagesPage.familyMembers')}
            </h3>
            {familyRelationships.length === 0 ? (
              <div className="text-center py-6">
                <FaUsers className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">{t('imagesPage.noFamily')}</p>
                <p className="text-sm text-gray-400">{t('imagesPage.noFamilyHint')}</p>
              </div>
            ) : (
              <div className="relative">
                <Swiper
                  modules={[Navigation]}
                  navigation={{
                    prevEl: '.family-swiper-prev',
                    nextEl: '.family-swiper-next',
                  }}
                  spaceBetween={14}
                  slidesPerView={1.2}
                  speed={600}
                  grabCursor
                  style={{ alignItems: 'stretch' }}
                  breakpoints={{
                    768: { slidesPerView: 2.2, spaceBetween: 16 },
                    1024: { slidesPerView: 3.2, spaceBetween: 18 },
                  }}
                  className="family-members-swiper px-1 md:px-2 py-1"
                >
                  {familyRelationships.map((member) => (
                    <SwiperSlide key={member.inviterId} style={{ height: 'auto', alignSelf: 'stretch' }}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleUserSelect(member)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUserSelect(member)}
                        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                        className="p-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-blue-50/40 shadow-sm hover:shadow-lg hover:border-blue-300 hover:scale-[1.02] transition-all duration-300 ease-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {/* Avatar + name */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
                            <FaUser className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900 leading-tight truncate text-sm">
                              {member.inviterFirstName} {member.inviterLastName}
                            </h4>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-indigo-100 text-indigo-700">
                              {member.relationshipType}
                            </span>
                          </div>
                        </div>

                        {/* Notes – grows to fill space */}
                        <div className="flex-1">
                          {member.relationshipNotes && (
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                              <span className="font-medium text-gray-600">{t('common.notes')}:</span>{' '}
                              {member.relationshipNotes}
                            </p>
                          )}
                        </div>

                        {/* Permission tags – always at bottom */}
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                          {member.canViewImages && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
                              {t('imagesPage.view')}
                            </span>
                          )}
                          {member.canUploadImages && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700">
                              {t('imagesPage.upload')}
                            </span>
                          )}
                          {member.canDeleteImages && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
                              {t('imagesPage.delete')}
                            </span>
                          )}
                          {member.canManageAlbums && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                              {t('imagesPage.albums')}
                            </span>
                          )}
                          {!member.canViewImages && !member.canUploadImages && !member.canDeleteImages && !member.canManageAlbums && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
                              No permissions
                            </span>
                          )}
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>

                <button
                  type="button"
                  aria-label="Previous"
                  className="family-swiper-prev absolute left-0 md:-left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white text-blue-600 border border-blue-100 shadow-sm hover:shadow-md hover:bg-blue-50 transition-all flex items-center justify-center"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next"
                  className="family-swiper-next absolute right-0 md:-right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white text-blue-600 border border-blue-100 shadow-sm hover:shadow-md hover:bg-blue-50 transition-all flex items-center justify-center"
                >
                  ›
                </button>
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
              <p className="text-sm font-medium text-gray-500">{t('imagesPage.totalFiles')}</p>
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
              <p className="text-sm font-medium text-gray-500">{t('imagesPage.fileTypes')}</p>
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
              <p className="text-sm font-medium text-gray-500">{t('imagesPage.available')}</p>
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
            {viewMode === 'my' ? t('imagesPage.noFilesMy') : t('imagesPage.noFilesShared')}
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
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
              onClick={() => (window.location.href = '/upload')}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <FaUpload className="mr-2 h-4 w-4" />
              {t('imagesPage.uploadFile')}
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
                  isSelected={viewMode === 'my' ? selectedImageIds.has(getImageKey(image)) : undefined}
                  onToggleSelect={viewMode === 'my' ? handleToggleSelect : undefined}
                />
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

      {/* Share modal – send public selection URL to contacts / email / SMS */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('imagesPage.shareLink')}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  setShareContactSearch('');
                  setShareAlreadySent(null);
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {selectedImages.length > 0 && (
                <p className="text-sm text-gray-600">
                  Sharing link for <strong>{selectedImages.length}</strong> image{selectedImages.length !== 1 ? 's' : ''}.
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Existing contacts</label>
                <input
                  type="text"
                  value={shareContactSearch}
                  onChange={(e) => setShareContactSearch(e.target.value)}
                  placeholder="Search by name, email, mobile..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
                />
                <div className="border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                  {shareContacts.length === 0 ? (
                    <p className="text-sm text-gray-500">No contacts yet. Add email or mobile below.</p>
                  ) : (
                    shareContacts.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareContactIds.has(c.id)}
                          onChange={(e) => {
                            const next = new Set(shareContactIds);
                            if (e.target.checked) next.add(c.id);
                            else next.delete(c.id);
                            setShareContactIds(next);
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{c.displayName || c.email || c.mobile || c.id}</span>
                        {(c.email || c.mobile) && (
                          <span className="text-xs text-gray-500">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
              {showPhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New recipients – mobile (comma separated)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={shareNewMobileCountryCode}
                      onChange={(e) => setShareNewMobileCountryCode(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 shrink-0"
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
                      className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
              {shareAlreadySent?.alreadySent && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Already sent to this {shareAlreadySent.email ? 'email' : 'mobile'}. You can resend if needed.
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Optional message</label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Add a short message to include in the email/SMS"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-4">
                {showEmail && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareChannels.email}
                      onChange={(e) => setShareChannels((c) => ({ ...c, email: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Send via Email</span>
                  </label>
                )}
                {showPhone && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareChannels.sms}
                      onChange={(e) => setShareChannels((c) => ({ ...c, sms: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Send via SMS</span>
                  </label>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  setShareContactSearch('');
                  setShareAlreadySent(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleShareSend}
                disabled={shareSending || !publicShareUrl}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-sm font-semibold"
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
