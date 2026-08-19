import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { FaImages, FaDownload, FaExclamationTriangle, FaFolder, FaFolderOpen, FaChevronRight, FaCheckCircle, FaCheck, FaCopy, FaShare, FaExpandArrowsAlt } from 'react-icons/fa';
import api from '../../api/client/axiosInstance';
import { useAuth } from '../../state/context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { decryptImageIds, decryptCheckoutPayload } from '../../utils/encryption';
import { decompressFileList } from '../../utils/checkoutUrlEncoding';
import Lightbox, { type LightboxItem } from '../../components/lightbox/Lightbox';
import AlbumGalleryThumb from '../../components/photo-studio/AlbumGalleryThumb';
import {
  getAlbumThumbnailUrl,
  toProgressiveImage,
} from '../../utils/albumImageVariants';
import type { ImageVariants } from '../../utils/progressiveImageVariants';
import { getConnectionHint, getSaveData } from '../../utils/progressiveImageConfig';

interface Album {
  id: number;
  name: string;
  description?: string;
  imageCount?: number;
  coverImageId?: number | null;
  coverImageUrl?: string | null;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  images?: AlbumImage[];
  imageIds?: number[];
  [key: string]: any;
}

interface AlbumImage {
  id: number;
  originalFilename: string;
  storedFilename?: string;
  s3PublicUrl?: string | null;
  b2PublicUrl?: string | null;
  googleDriveViewUrl?: string | null;
  uploadTime?: string;
  isPublic?: boolean;
  filename?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  fileType?: string;
  variants?: ImageVariants;
  [key: string]: any;
}

const IMAGES_PAGE_SIZE = 20;
const ALBUMS_PAGE_SIZE = 20;
const ALBUM_IMAGES_PAGE_SIZE = 20; // images visible per album before "Load more"
const ALBUM_IMAGES_FETCH_SIZE = 40; // API page size when loading album photos
const PHOTO_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']);

function isPhotoAlbumImage(image: AlbumImage): boolean {
  const filename = image.originalFilename || image.filename || '';
  const ft = (image.fileType || filename.split('.').pop() || '').toLowerCase();
  if (PHOTO_EXTENSIONS.has(ft)) return true;
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return PHOTO_EXTENSIONS.has(ext);
}

/** GET /api/flags response: controls visibility of email, phone, download, etc. */
interface FlagItem {
  name: string;
  id: number;
  value: boolean;
}
interface FlagsResponse {
  flags?: FlagItem[];
}

const PublicSelectionPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryClient = useQueryClient();
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [selectedAlbums, setSelectedAlbums] = useState<Set<number>>(new Set());
  const [userSelectedImages, setUserSelectedImages] = useState<Map<number, Set<number>>>(new Map()); // albumId -> Set of imageIds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<AlbumImage | null>(null);
  const [fullscreenContext, setFullscreenContext] = useState<
    { mode: 'bulk'; index: number } | { mode: 'album'; albumId: number; index: number } | null
  >(null);
  /** When false, checkboxes are hidden; click "Select" to show them and enable selection */
  const [showSelectionMode, setShowSelectionMode] = useState(false);
  /** Per album: how many images to show (pagination). Key = albumId, value = count. */
  const [albumImagesShownCount, setAlbumImagesShownCount] = useState<Map<number, number>>(new Map());
  /** Full album photos loaded from GET /api/albums/{id}/images (list API only returns cover). */
  const [albumImagesById, setAlbumImagesById] = useState<Map<number, AlbumImage[]>>(new Map());
  const [albumImagesLoadingIds, setAlbumImagesLoadingIds] = useState<Set<number>>(new Set());
  const albumImagesInflightRef = useRef<Set<number>>(new Set());
  const loadMoreBulkSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreAlbumsRef = useRef<HTMLDivElement | null>(null);

  const sid = searchParams.get('sid') || '';
  // shareId is added by the backend when the link is sent via email/SMS (for verification/tracking). Not present when you copy the link in-app.
  const shareIdParam = searchParams.get('shareId') || '';
  const shareId = shareIdParam ? parseInt(shareIdParam, 10) : undefined;
  const validShareId = shareId != null && !isNaN(shareId) && shareId > 0 ? shareId : undefined;
  const qParam = searchParams.get('q') || ''; // encrypted token+albumId (minimal link)
  const token = searchParams.get('token') || '';
  const albumIdParam = searchParams.get('albumId') || ''; // optional: load single album by ID
  const filesParam = searchParams.get('files') || ''; // Legacy support
  const fParam = searchParams.get('f') || ''; // Compressed file list (short URL)
  const imageIdsParam = searchParams.get('imageIds') || '';
  const albumId = albumIdParam ? parseInt(albumIdParam, 10) : null;
  const hasValidAlbumId = albumId != null && !isNaN(albumId) && albumId > 0;

  // Guest share links need sid, q, or token. Logged-in portal users can open albums without those.
  const hasShareIdentifier = !!(sid.trim() || qParam.trim() || token.trim());
  const isPortalMode = isAuthenticated && !hasShareIdentifier;
  const portalAuthToken =
    typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';

  const payloadFromQ = useMemo(() => (qParam.trim() ? decryptCheckoutPayload(qParam.trim()) : null), [qParam]);
  const qInvalid = qParam.trim() !== '' && payloadFromQ === null;

  type ResolvedFromSid = {
    token: string;
    albumId: number | null;
    fileNames: string[];
    imageIds?: number[];
    shareAlbumId?: number | null;
  };
  const [resolvedFromSid, setResolvedFromSid] = useState<ResolvedFromSid | null>(null);
  const [sidLoading, setSidLoading] = useState(false);
  const [sidError, setSidError] = useState(false);

  useEffect(() => {
    if (!sid.trim()) {
      setResolvedFromSid(null);
      setSidError(false);
      return;
    }
    let cancelled = false;
    setSidLoading(true);
    setSidError(false);
    api.get<{
      token: string;
      albumId?: number | null;
      fileNames?: string[];
      imageIds?: number[];
      shareAlbumId?: number | null;
    }>(`/api/public/share-link/${encodeURIComponent(sid)}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        const tokenVal = data?.token ?? '';
        const raw = data?.albumId;
        const n = raw != null ? Number(raw) : NaN;
        const albumIdVal = Number.isFinite(n) ? n : null;
        const fileNamesVal = Array.isArray(data?.fileNames) ? data.fileNames : [];
        const imageIdsVal = Array.isArray(data?.imageIds) ? data.imageIds.filter((id): id is number => typeof id === 'number') : [];
        const rawShareAlbumId = data?.shareAlbumId;
        const sa =
          rawShareAlbumId == null
            ? null
            : Number.isFinite(Number(rawShareAlbumId))
              ? Number(rawShareAlbumId)
              : null;
        setResolvedFromSid({
          token: tokenVal,
          albumId: albumIdVal,
          fileNames: fileNamesVal,
          imageIds: imageIdsVal.length > 0 ? imageIdsVal : undefined,
          shareAlbumId: sa,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSidError(true);
          setResolvedFromSid(null);
        }
      })
      .finally(() => {
        if (!cancelled) setSidLoading(false);
      });
    return () => { cancelled = true; };
  }, [sid]);

  const shareToken = resolvedFromSid?.token ?? payloadFromQ?.token ?? token;
  const effectiveToken = shareToken || (isPortalMode ? portalAuthToken : '');
  const effectiveAlbumId = resolvedFromSid != null ? resolvedFromSid.albumId : (payloadFromQ != null ? payloadFromQ.albumId : albumId);
  const effectiveHasValidAlbumId = effectiveAlbumId != null && !isNaN(effectiveAlbumId) && effectiveAlbumId > 0;

  // Verification gate (OTP / existing user) – same as PublicCheckoutPage
  const verifyStorageKey = useMemo(() => `public_selection_verified_${effectiveToken.slice(0, 24)}`, [effectiveToken]);
  type VerifyStatus = 'idle' | 'checking' | 'skip' | 'existing_user' | 'show_message' | 'needs_input' | 'otp_sent' | 'verified';
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>(isPortalMode ? 'verified' : 'idle');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyInfoMessage, setVerifyInfoMessage] = useState('');
  const [verifyUserId, setVerifyUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isPortalMode) {
      setVerifyStatus('verified');
      return;
    }
    if (!effectiveToken) return;
    const stored = sessionStorage.getItem(verifyStorageKey);
    if (stored === '1') {
      setVerifyStatus('verified');
      return;
    }
    let cancelled = false;
    setVerifyStatus('checking');
    const publicUrl = typeof window !== 'undefined' ? window.location.href : '';
    api.post<{ isExistingUser?: boolean; existingUser?: boolean; sendNotification?: boolean; userId?: string; message?: string }>('/api/public-verify/check-user', validShareId != null ? { id: validShareId } : {})
      .then(async (res) => {
        if (cancelled) return;
        const isExisting = res.data?.isExistingUser === true || res.data?.existingUser === true;
        const sendNotification = res.data?.sendNotification === true;
        const userId = res.data?.userId;
        if (isExisting && !sendNotification) {
          setVerifyInfoMessage(res.data?.message || '');
          setVerifyStatus('show_message');
          return;
        }
        if (isExisting && sendNotification && userId) {
          setVerifyUserId(userId);
          try {
            await api.post('/api/public-verify/send-otp', {
              userId,
              linkId: effectiveToken,
              ...(validShareId != null ? { id: validShareId } : {}),
            });
            setVerifyStatus('otp_sent');
            setVerifyOtp('');
            toast.success(t('publicSelectionPage.toastOtpSentEmailPhone'));
          } catch {
            setVerifyStatus('needs_input');
          }
          return;
        }
        setVerifyStatus('needs_input');
      })
      .catch(() => {
        if (cancelled) return;
        setVerifyStatus('needs_input'); // API failed or not implemented – still show verification page
      });
    return () => { cancelled = true; };
  }, [isPortalMode, effectiveToken, verifyStorageKey, validShareId]);

  const handleVerifySubmit = async () => {
    const email = verifyEmail.trim();
    if (!email) {
      setVerifyError(t('publicSelectionPage.verifyEnterEmail'));
      return;
    }
    setVerifyError('');
    setVerifySending(true);
    try {
      const checkRes = await api.post<{ isExistingUser?: boolean; existingUser?: boolean; sendNotification?: boolean; message?: string }>('/api/public-verify/check-user', {
        email: email || undefined,
        ...(validShareId != null ? { id: validShareId } : {}),
      });
      const isExisting = checkRes.data?.isExistingUser === true || checkRes.data?.existingUser === true;
      const sendNotification = checkRes.data?.sendNotification === true;
      if (isExisting && !sendNotification) {
        setVerifyInfoMessage(checkRes.data?.message || '');
        setVerifyStatus('show_message');
        return;
      }
      if (isExisting && sendNotification) {
        await api.post('/api/public-verify/send-otp', {
          email: email || undefined,
          channel: 'email',
          linkId: effectiveToken,
          ...(validShareId != null ? { id: validShareId } : {}),
        });
        setVerifyStatus('otp_sent');
        setVerifyOtp('');
        toast.success(t('publicSelectionPage.toastOtpSentEmail'));
        return;
      }
      // Not existing → call send-otp and show OTP page
      const sendOtpBody: { email?: string; channel: string; linkId?: string; id?: number } = {
        email: email || undefined,
        channel: 'email',
        linkId: effectiveToken,
      };
      if (validShareId != null) sendOtpBody.id = validShareId;
      await api.post('/api/public-verify/send-otp', sendOtpBody);
      setVerifyStatus('otp_sent');
      setVerifyOtp('');
      toast.success(t('publicSelectionPage.toastOtpSentEmail'));
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 501) {
        sessionStorage.setItem(verifyStorageKey, '1');
        setVerifyStatus('verified');
        toast.success(t('publicSelectionPage.toastVerificationSkipped'));
      } else {
        setVerifyError(err.response?.data?.message || t('publicSelectionPage.verifyGenericError'));
      }
    } finally {
      setVerifySending(false);
    }
  };

  const handleResendOtp = async () => {
    if (verifyUserId) {
      setVerifySending(true);
      setVerifyError('');
      try {
        await api.post('/api/public-verify/send-otp', {
          userId: verifyUserId,
          linkId: effectiveToken,
          ...(validShareId != null ? { id: validShareId } : {}),
        });
        setVerifyOtp('');
        toast.success(t('publicSelectionPage.toastOtpSentAgain'));
      } catch (err: any) {
        setVerifyError(err.response?.data?.message || t('publicSelectionPage.verifyFailedResendOtp'));
      } finally {
        setVerifySending(false);
      }
    } else {
      handleVerifySubmit();
    }
  };

  const handleVerifyOtpSubmit = async () => {
    if (!verifyOtp.trim()) {
      setVerifyError(t('publicSelectionPage.verifyEnterOtp'));
      return;
    }
    setVerifyError('');
    setVerifySending(true);
    try {
      const email = verifyEmail.trim();
      const res = await api.post<{ success?: boolean }>('/api/public-verify/verify-otp', {
        ...(verifyUserId ? { userId: verifyUserId } : { email: email || undefined }),
        otp: verifyOtp.trim(),
        linkId: effectiveToken,
        ...(validShareId != null ? { id: validShareId } : {}),
      });
      if (res.data?.success) {
        sessionStorage.setItem(verifyStorageKey, '1');
        setVerifyStatus('verified');
        toast.success(t('publicSelectionPage.toastVerifiedLoading'));
      } else {
        setVerifyError(t('publicSelectionPage.verifyInvalidOtp'));
      }
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || t('publicSelectionPage.verifyInvalidOtp'));
    } finally {
      setVerifySending(false);
    }
  };

  const [decodedFilesFromF, setDecodedFilesFromF] = useState<string[]>([]);
  useEffect(() => {
    if (!fParam.trim()) {
      setDecodedFilesFromF([]);
      return;
    }
    let cancelled = false;
    decompressFileList(fParam).then((list) => {
      if (!cancelled) setDecodedFilesFromF(list);
    });
    return () => { cancelled = true; };
  }, [fParam]);

  // Auto-enable "show only selected" when imageIds or files are provided in URL
  useEffect(() => {
    if ((imageIdsParam && imageIdsParam.trim().length > 0) || (filesParam && filesParam.trim().length > 0) || fParam.trim().length > 0) {
      setShowOnlySelected(true);
    }
  }, [imageIdsParam, filesParam, fParam]);

  // Parse image IDs from URL parameter (preferred method)
  const targetImageIds = useMemo(() => {
    if (imageIdsParam) {
      try {
        const decrypted = decryptImageIds(imageIdsParam);
        if (decrypted.length > 0) return decrypted;
      } catch {
        // fallback to plain
      }
      return imageIdsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    }
    return [];
  }, [imageIdsParam]);

  // Parse filenames: from sid payload, or decoded f= (short URL), or files= (legacy)
  const targetFilenames = useMemo(() => {
    if (resolvedFromSid?.fileNames?.length) return resolvedFromSid.fileNames;
    if (fParam) return decodedFilesFromF;
    if (!filesParam) return [];
    return filesParam.split(',').map(f => decodeURIComponent(f.trim())).filter(f => f);
  }, [resolvedFromSid, fParam, filesParam, decodedFilesFromF]);

  // Image IDs for bulk fetch: from sid response (when share was created with imageIds) or from URL imageIds=
  const bulkImageIds = useMemo(() => {
    if (resolvedFromSid?.imageIds?.length) return resolvedFromSid.imageIds;
    if (targetImageIds.length > 0) return targetImageIds;
    return [];
  }, [resolvedFromSid?.imageIds, targetImageIds]);

  const isBulkMode = bulkImageIds.length > 0 && !!effectiveToken;

  // Fetch selected images by IDs via GET /api/images/bulk with pagination (chunked ids)
  const {
    data: bulkImagesData,
    isLoading: bulkImagesLoading,
    isError: bulkImagesError,
    isFetchingNextPage: bulkFetchingNextPage,
    hasNextPage: bulkHasNextPage,
    fetchNextPage: bulkFetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['publicSelectionBulkImages', effectiveToken, bulkImageIds.join(',')],
    queryFn: async ({ pageParam }) => {
      const start = pageParam * IMAGES_PAGE_SIZE;
      const chunk = bulkImageIds.slice(start, start + IMAGES_PAGE_SIZE);
      if (chunk.length === 0) return [];
      const ids = chunk.join(',');
      const res = await api.get<AlbumImage[] | { images?: AlbumImage[] }>(`/api/images/bulk`, {
        params: {
          ids,
          token: effectiveToken,
          connection: getConnectionHint(),
          saveData: getSaveData(),
        },
      });
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === 'object' && Array.isArray((raw as { images?: AlbumImage[] }).images)) return (raw as { images: AlbumImage[] }).images;
      return [];
    },
    initialPageParam: 0,
    getNextPageParam: (_lastPage, allPages) => {
      const loadedCount = allPages.reduce((acc, p) => acc + (Array.isArray(p) ? p.length : 0), 0);
      return loadedCount < bulkImageIds.length ? allPages.length : undefined;
    },
    enabled: isBulkMode,
    retry: 1,
  });

  const bulkImages: AlbumImage[] = useMemo(() => {
    if (!bulkImagesData?.pages) return [];
    return bulkImagesData.pages.flatMap((p) => (Array.isArray(p) ? p : []));
  }, [bulkImagesData]);

  const bulkPhotoImages = useMemo(
    () => bulkImages.filter(isPhotoAlbumImage),
    [bulkImages]
  );

  // Preload bulk thumbnails into browser cache when list grows
  useEffect(() => {
    if (!bulkImages.length) return;
    for (const img of bulkImages) {
      const url = getAlbumThumbnailUrl(img, img.fileType || 'jpg') || img.thumbnailUrl || img.previewUrl;
      if (url) {
        const el = new Image();
        el.src = url;
      }
    }
  }, [bulkImages]);

  // Infinite scroll: bulk images grid
  useEffect(() => {
    const sentinel = loadMoreBulkSentinelRef.current;
    if (!sentinel || !bulkHasNextPage || bulkFetchingNextPage || !isBulkMode) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) bulkFetchNextPage(); },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [bulkHasNextPage, bulkFetchingNextPage, bulkFetchNextPage, isBulkMode]);

  // Fetch albums: single album by ID when albumId in URL, otherwise paginated albums
  const {
    data: albumsData,
    isLoading,
    isError,
    isFetchingNextPage: albumsFetchingNextPage,
    hasNextPage: albumsHasNextPage,
    fetchNextPage: albumsFetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['publicSelectionAlbums', isPortalMode ? 'portal' : effectiveToken, effectiveHasValidAlbumId ? effectiveAlbumId : null],
    enabled: !!effectiveToken && (isPortalMode || ((!sid || !!resolvedFromSid || sidError) && !isBulkMode)),
    queryFn: async ({ pageParam }) => {
      const headers = isPortalMode ? {} : (effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {});
      const params: Record<string, string | number> = isPortalMode ? {} : (effectiveToken ? { token: effectiveToken } : {});
      if (effectiveHasValidAlbumId && effectiveAlbumId != null) {
        const response = await api.get(`/api/albums/${effectiveAlbumId}`, { headers, params });
        const album = response.data as Album;
        return { albums: album ? [album] : [], page: 0, totalPages: 1 };
      }
      const response = await api.get('/api/albums', {
        headers,
        params: { ...params, page: pageParam, size: ALBUMS_PAGE_SIZE },
      });
      const data = response.data;
      if (data == null) return { albums: [], page: Number(pageParam), totalPages: 1 };
      if (Array.isArray(data)) return { albums: data, page: Number(pageParam), totalPages: 1 };
      const typed = data as { albums?: Album[]; page?: number; totalPages?: number };
      return {
        albums: typed.albums ?? [],
        page: typed.page ?? Number(pageParam),
        totalPages: typed.totalPages ?? 1,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const page = Number((lastPage as { page?: number }).page ?? 0);
      const totalPages = Number((lastPage as { totalPages?: number }).totalPages ?? 1);
      return page + 1 < totalPages ? page + 1 : undefined;
    },
    retry: 1,
  });

  const albums = useMemo(() => {
    if (!albumsData?.pages?.length) return [];
    return albumsData.pages.flatMap((p) => (p && (p as { albums?: Album[] }).albums) ?? []);
  }, [albumsData]);

  const fetchAllAlbumImages = useCallback(
    async (albumId: number) => {
      if (!effectiveToken || albumImagesInflightRef.current.has(albumId)) return;
      if (albumImagesById.get(albumId)?.length) return;
      albumImagesInflightRef.current.add(albumId);
      setAlbumImagesLoadingIds((prev) => new Set(prev).add(albumId));
      try {
        const headers = isPortalMode ? {} : (effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {});
        const merged: AlbumImage[] = [];
        let page = 0;
        let totalPages = 1;
        while (page < totalPages) {
          const res = await api.get<{
            images?: AlbumImage[];
            page?: number;
            totalPages?: number;
          }>(`/api/albums/${albumId}/images`, {
            headers,
            params: {
              ...(isPortalMode ? {} : { token: effectiveToken }),
              page,
              size: ALBUM_IMAGES_FETCH_SIZE,
              variantDetail: 'full',
              connection: getConnectionHint(),
              saveData: getSaveData(),
            },
          });
          const batch = Array.isArray(res.data?.images) ? res.data.images : [];
          merged.push(...batch);
          totalPages = Number(res.data?.totalPages ?? 1);
          page += 1;
        }
        setAlbumImagesById((prev) => {
          const next = new Map(prev);
          next.set(albumId, merged);
          return next;
        });
      } catch {
        toast.error(t('publicSelectionPage.toastFailedLoadPhotos') || 'Failed to load photos');
      } finally {
        albumImagesInflightRef.current.delete(albumId);
        setAlbumImagesLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(albumId);
          return next;
        });
      }
    },
    [effectiveToken, isPortalMode, albumImagesById, t]
  );

  const getImagesForAlbum = useCallback(
    (albumId: number): AlbumImage[] => {
      const cached = albumImagesById.get(albumId);
      if (cached && cached.length > 0) return cached;
      return albums.find((a) => a.id === albumId)?.images ?? [];
    },
    [albumImagesById, albums]
  );

  const closeFullscreenImage = useCallback(() => {
    setFullscreenImage(null);
    setFullscreenContext(null);
  }, []);

  const openFullscreenFromBulk = useCallback((index: number) => {
    if (bulkPhotoImages.length === 0) return;
    const normalizedIndex =
      ((index % bulkPhotoImages.length) + bulkPhotoImages.length) % bulkPhotoImages.length;
    setFullscreenContext({ mode: 'bulk', index: normalizedIndex });
    setFullscreenImage(bulkPhotoImages[normalizedIndex] || null);
  }, [bulkPhotoImages]);

  const getPhotoImagesForAlbum = useCallback(
    (albumId: number) => getImagesForAlbum(albumId).filter(isPhotoAlbumImage),
    [getImagesForAlbum]
  );

  const openFullscreenFromAlbum = useCallback((albumId: number, imageId: number) => {
    const photoList = getPhotoImagesForAlbum(albumId);
    if (photoList.length === 0) return;
    const foundIndex = photoList.findIndex((img) => img.id === imageId);
    const normalizedIndex = foundIndex >= 0 ? foundIndex : 0;
    setFullscreenContext({ mode: 'album', albumId, index: normalizedIndex });
    setFullscreenImage(photoList[normalizedIndex] || null);
  }, [getPhotoImagesForAlbum]);

  // Infinite scroll: albums list
  useEffect(() => {
    const el = loadMoreAlbumsRef.current;
    if (!el || !albumsHasNextPage || albumsFetchingNextPage || isBulkMode) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) albumsFetchNextPage(); },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [albumsHasNextPage, albumsFetchingNextPage, albumsFetchNextPage, isBulkMode]);

  // Feature flags: show/hide download (GET /api/flags)
  const { data: flagsData } = useQuery({
    queryKey: ['flags', effectiveToken],
    queryFn: async () => {
      const res = await api.get<FlagsResponse>('/api/flags', {
        headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {},
      });
      return res.data;
    },
    retry: 1,
    staleTime: 60_000,
  });
  const showDownload = useMemo(() => {
    const flags = flagsData?.flags;
    if (!Array.isArray(flags)) return true;
    const isDownload = flags.find((f) => f.name === 'isDownload');
    return isDownload?.value ?? true;
  }, [flagsData]);

  const getImageFilename = (image: AlbumImage): string => {
    return image.originalFilename || image.filename || t('publicSelectionPage.unknownFile');
  };

  // Auto-select albums and images based on image IDs or filenames from URL
  useEffect(() => {
    if (albums.length === 0) return;

    const matchedAlbums = new Set<number>();
    const matchedImages = new Map<number, Set<number>>();

    // Method 1: Use image IDs if provided (preferred - shorter URLs)
    if (targetImageIds.length > 0) {
      albums.forEach((album) => {
        const images = getImagesForAlbum(album.id);
        if (images.length === 0) return;

        const albumImageIds = new Set<number>();
        let hasMatch = false;

        images.forEach((image) => {
          if (targetImageIds.includes(image.id)) {
            albumImageIds.add(image.id);
            hasMatch = true;
          }
        });

        if (hasMatch) {
          matchedAlbums.add(album.id);
          matchedImages.set(album.id, albumImageIds);
          // Auto-expand albums with matches
          setExpandedAlbums(prev => new Set(prev).add(album.id));
        }
      });
    }
    // Method 2: Fallback to filename matching (legacy support)
    else if (targetFilenames.length > 0) {
      albums.forEach((album) => {
        const images = getImagesForAlbum(album.id);
        if (images.length === 0) return;

        const albumImageIds = new Set<number>();
        let hasMatch = false;

        images.forEach((image) => {
          const imageFilename = image.originalFilename || image.filename || t('publicSelectionPage.unknownFile');
          // Check if this image's filename matches any target filename
          const isMatch = targetFilenames.some(targetFilename => {
            // Exact match or filename contains target (for partial matches)
            return imageFilename === targetFilename || 
                   imageFilename.includes(targetFilename) ||
                   targetFilename.includes(imageFilename);
          });

          if (isMatch) {
            albumImageIds.add(image.id);
            hasMatch = true;
          }
        });

        if (hasMatch) {
          matchedAlbums.add(album.id);
          matchedImages.set(album.id, albumImageIds);
          // Auto-expand albums with matches
          setExpandedAlbums(prev => new Set(prev).add(album.id));
        }
      });
    } else {
      return; // No parameters provided
    }

    if (matchedAlbums.size > 0) {
      setSelectedAlbums(matchedAlbums);
      setUserSelectedImages(matchedImages);
      // Automatically show only selected albums when imageIds or files are provided
      setShowOnlySelected(true);
      toast.success(t('publicSelectionPage.foundAlbumsMatch', { count: matchedAlbums.size }));
    }
  }, [albums, albumImagesById, targetImageIds, targetFilenames, getImagesForAlbum, t]);

  // Get all selected images (only those with checkboxes checked – for Submit Selection)
  const allSelectedImages = useMemo(() => {
    const images: AlbumImage[] = [];
    selectedAlbums.forEach((albumId) => {
      const imageIds = userSelectedImages.get(albumId);
      if (!imageIds || imageIds.size === 0) return;
      getImagesForAlbum(albumId).forEach((img) => {
        if (imageIds.has(img.id)) images.push(img);
      });
    });
    return images;
  }, [selectedAlbums, userSelectedImages, getImagesForAlbum]);

  // Full album display: all images from every selected album (one grid when album is selected)
  const fullAlbumImages = useMemo(() => {
    const images: AlbumImage[] = [];
    selectedAlbums.forEach((albumId) => {
      getImagesForAlbum(albumId).forEach((img) => images.push(img));
    });
    return images;
  }, [selectedAlbums, getImagesForAlbum]);

  const toggleAlbum = (albumId: number) => {
    setSelectedAlbums(prev => {
      const next = new Set(prev);
      
      if (next.has(albumId)) {
        // Deselect album
        next.delete(albumId);
        setUserSelectedImages(prevImgs => {
          const nextImgs = new Map(prevImgs);
          nextImgs.delete(albumId);
          return nextImgs;
        });
      } else {
        // Select album - but don't auto-select images, user must explicitly select them
        next.add(albumId);
      }
      return next;
    });
  };

  const toggleAlbumExpand = (albumId: number) => {
    setExpandedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
        void fetchAllAlbumImages(albumId);
      }
      return next;
    });
  };

  // Single-album share link: load all photos and expand immediately
  useEffect(() => {
    if (!effectiveHasValidAlbumId || effectiveAlbumId == null || !effectiveToken) return;
    setExpandedAlbums((prev) => new Set(prev).add(effectiveAlbumId));
    void fetchAllAlbumImages(effectiveAlbumId);
  }, [effectiveHasValidAlbumId, effectiveAlbumId, effectiveToken, fetchAllAlbumImages]);

  // Auto-expanded albums (from URL imageIds/files) need their full image lists
  useEffect(() => {
    expandedAlbums.forEach((albumId) => {
      if (!albumImagesById.get(albumId)?.length) {
        void fetchAllAlbumImages(albumId);
      }
    });
  }, [expandedAlbums, albumImagesById, fetchAllAlbumImages]);

  const toggleImageSelection = (albumId: number, imageId: number) => {
    setUserSelectedImages(prev => {
      const next = new Map(prev);
      // Get current image set for this album, or create empty set if doesn't exist
      const imageSet = next.get(albumId) || new Set<number>();
      const newImageSet = new Set(imageSet);
      
      // Toggle the image selection
      if (newImageSet.has(imageId)) {
        // Remove image from selection
        newImageSet.delete(imageId);
      } else {
        // Add image to selection
        newImageSet.add(imageId);
      }
      
      // If no images are selected, remove the album entry (empty set means no images selected)
      if (newImageSet.size === 0) {
        next.delete(albumId);
      } else {
        // Update with the new set
        next.set(albumId, newImageSet);
      }
      
      return next;
    });
  };

  const selectAllImagesInAlbum = (albumId: number) => {
    const images = getImagesForAlbum(albumId);
    if (images.length === 0) return;

    setUserSelectedImages((prev) => {
      const next = new Map(prev);
      next.set(albumId, new Set(images.map((img) => img.id)));
      return next;
    });
  };

  const getImageUrl = (image: AlbumImage): string | null => {
    if (image.previewUrl) return image.previewUrl;
    if (image.downloadUrl) return image.downloadUrl;
    return null;
  };

  const getFileType = (image: AlbumImage): string => {
    const filename = getImageFilename(image);
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return extension || image.fileType || 'unknown';
  };

  const getThumbnailUrl = (image: AlbumImage): string | null => {
    const fromVariants = getAlbumThumbnailUrl(image, getFileType(image));
    if (fromVariants) return fromVariants;
    if (image.thumbnailUrl) return image.thumbnailUrl;
    if (image.previewUrl) return image.previewUrl;
    if (image.downloadUrl) return image.downloadUrl;
    return null;
  };

  const lightboxSourceImages = useMemo((): AlbumImage[] => {
    if (!fullscreenContext) return [];
    if (fullscreenContext.mode === 'bulk') return bulkPhotoImages;
    return getPhotoImagesForAlbum(fullscreenContext.albumId);
  }, [fullscreenContext, bulkPhotoImages, getPhotoImagesForAlbum]);

  const lightboxItems = useMemo((): LightboxItem[] => {
    return lightboxSourceImages.map((img) => {
      const fileType = getFileType(img);
      const thumb = getThumbnailUrl(img);
      return {
        id: img.id,
        src: thumb || img.previewUrl || getImageUrl(img) || null,
        thumbnailSrc: thumb,
        alt: getImageFilename(img),
        filename: getImageFilename(img),
        progressiveImage: isPhotoAlbumImage(img)
          ? toProgressiveImage(img, fileType)
          : undefined,
      };
    });
  }, [lightboxSourceImages]);

  const handleLightboxIndexChange = useCallback(
    (index: number) => {
      if (!fullscreenContext) return;
      const img = lightboxSourceImages[index];
      if (!img) return;
      if (fullscreenContext.mode === 'bulk') {
        setFullscreenContext({ mode: 'bulk', index });
      } else {
        setFullscreenContext({
          mode: 'album',
          albumId: fullscreenContext.albumId,
          index,
        });
      }
      setFullscreenImage(img);
    },
    [fullscreenContext, lightboxSourceImages]
  );

  const handleDownload = (image: AlbumImage) => {
    const imageUrl = getImageUrl(image);
    if (!imageUrl) {
      toast.error(t('publicSelectionPage.downloadUrlUnavailable'));
      return;
    }

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = getImageFilename(image);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentUrl = useMemo(() => {
    return window.location.href;
  }, [location]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl).then(() => {
      toast.success(t('publicSelectionPage.toastUrlCopied'));
    }).catch(() => {
      toast.error(t('publicSelectionPage.toastCopyUrlFailed'));
    });
  };

  const handleViewSelectedImagesOnly = () => {
    if (allSelectedImages.length === 0) return;
    const ids = allSelectedImages.map((img) => img.id).join(',');
    const params = new URLSearchParams();
    params.set('token', effectiveToken);
    params.set('imageIds', ids);
    if (validShareId != null) params.set('shareId', String(validShareId));
    navigate(`/public/images-display?${params.toString()}`);
  };

  const handleSubmitSelection = async () => {
    if (allSelectedImages.length === 0) {
      toast.error(t('publicSelectionPage.toastSelectOneImage'));
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedImageIds = allSelectedImages.map(img => img.id);

      // Determine which studio album these images belong to.
      const targetAlbumId =
        effectiveHasValidAlbumId && effectiveAlbumId != null
          ? effectiveAlbumId
          : selectedAlbums.size === 1
            ? Array.from(selectedAlbums)[0] ?? null
            : null;

      if (!targetAlbumId) {
        toast.error(t('publicSelectionPage.toastSubmitFailed') || 'Please select a single album to update.');
        return;
      }

      const headers = isPortalMode ? {} : (effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {});

      // Look up the public-share album record for this studio album so we can use
      // the correct update endpoint: PUT /api/public-share/albums/:shareAlbumId/images
      // This replaces the album's shared image list with only the selected images.
      let shareAlbumId: number | null = resolvedFromSid?.shareAlbumId ?? null;
      try {
        // If we already have shareAlbumId from the sid record, prefer it.
        if (!shareAlbumId) {
          const shareListRes = await api.get<{ albums?: { shareAlbumId: number; token: string; status?: string | null }[] }>(
            '/api/public-share/albums/source/list',
            { headers, params: { albumId: targetAlbumId } }
          );
          const shareAlbums = Array.isArray(shareListRes.data?.albums) ? shareListRes.data.albums : [];
          const active = shareAlbums.find(a => String(a.status ?? '').toUpperCase() === 'ACTIVE') ?? shareAlbums[0] ?? null;
          shareAlbumId = active?.shareAlbumId ?? null;
        }
      } catch {
        // /api/public-share/albums/source/list not available for guests — fall through
      }

      if (shareAlbumId) {
        // Updates the shared link AND (after backend restart) the studio album.
        await api.put(
          `/api/public-share/albums/${shareAlbumId}/images`,
          { imageIds: selectedImageIds },
          { headers }
        );
      }

      // Replace the studio album with only the selected images so
      // /studio/albums, checkout, and every other album view hide unselected photos.
      try {
        await api.put(`/api/albums/${targetAlbumId}/images`, { imageIds: selectedImageIds }, { headers });
      } catch (putErr: unknown) {
        const status = (putErr as { response?: { status?: number } })?.response?.status;
        if (status !== 404 && status !== 405) throw putErr;
        const current = albumImagesById.get(targetAlbumId) ?? [];
        const selectedSet = new Set(selectedImageIds);
        const toRemove = current.map((img) => img.id).filter((id) => !selectedSet.has(id));
        if (toRemove.length > 0) {
          await api.delete(`/api/albums/${targetAlbumId}/images`, { headers, data: { imageIds: toRemove } });
        }
      }

      setAlbumImagesById((prev) => {
        const next = new Map(prev);
        next.delete(targetAlbumId);
        return next;
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['publicSelectionAlbums'] }),
        queryClient.invalidateQueries({ queryKey: ['albums'] }),
        queryClient.invalidateQueries({ queryKey: ['albumImages'] }),
      ]);

      toast.success(
        t('publicSelectionPage.toastSubmitSuccess', { count: allSelectedImages.length }),
        { duration: 5000 }
      );

      // After saving, immediately show the shared album view with ONLY the selected images.
      // This avoids relying on any potentially-stale `sid`-resolved image list.
      try {
        if (effectiveToken?.slice) {
          sessionStorage.setItem(`public_images_display_verified_${effectiveToken.slice(0, 24)}`, '1');
        }
      } catch {
        // sessionStorage can fail in some embedded browsers; ignore.
      }

      const params = new URLSearchParams();
      params.set('token', effectiveToken);
      params.set('imageIds', selectedImageIds.join(','));
      if (validShareId != null) params.set('shareId', String(validShareId));
      navigate(`/public/images-display?${params.toString()}`);

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || t('publicSelectionPage.toastSubmitFailed');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Incomplete URL – no sid, q, or token (guests only). Portal users can open albums.
  if (!hasShareIdentifier && !isPortalMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicSelectionPage.incompleteLinkTitle')}</h1>
          <p className="text-gray-600 text-sm mb-4">
            {t('publicSelectionPage.incompleteLinkBody')}
          </p>
          <a href="/" className="inline-block px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900">
            {t('publicSelectionPage.goHome')}
          </a>
        </div>
      </div>
    );
  }

  if (sid && sidLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (sid && sidError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicSelectionPage.invalidShortLinkTitle')}</h1>
          <p className="text-gray-600 text-sm">
            {t('publicSelectionPage.invalidShortLinkBody')}
          </p>
        </div>
      </div>
    );
  }

  if (qInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicSelectionPage.invalidLinkTitle')}</h1>
          <p className="text-gray-600 text-sm">
            {t('publicSelectionPage.invalidLinkBody')}
          </p>
        </div>
      </div>
    );
  }

  if (!effectiveToken && !isPortalMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicSelectionPage.invalidTokenTitle')}</h1>
          <p className="text-gray-600 text-sm mb-4">
            {t('publicSelectionPage.invalidTokenBody')}
          </p>
          <a href="/" className="inline-block px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900">
            {t('publicSelectionPage.goHome')}
          </a>
        </div>
      </div>
    );
  }

  if (verifyStatus === 'idle' || verifyStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <LoadingSpinner size="lg" text={t('publicSelectionPage.verifyingAccess')} />
      </div>
    );
  }

  if (verifyStatus === 'show_message') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('publicSelectionPage.noticeTitle')}</h2>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">{verifyInfoMessage || t('publicSelectionPage.noMessage')}</p>
          <p className="text-xs text-gray-500">{t('publicSelectionPage.notMovedToAnotherPage')}</p>
        </div>
      </div>
    );
  }

  if (verifyStatus === 'needs_input' || verifyStatus === 'otp_sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('publicSelectionPage.verifyToContinue')}</h2>
          {verifyStatus === 'needs_input' && verifyInfoMessage ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">{verifyInfoMessage}</p>
          ) : verifyStatus === 'needs_input' ? (
            <p className="text-sm text-gray-600 mb-4">{t('publicSelectionPage.enterEmailToView')}</p>
          ) : null}
          {verifyStatus === 'needs_input' ? (
            <>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('publicSelectionPage.emailLabel')}</label>
                  <input type="email" value={verifyEmail} onChange={(e) => setVerifyEmail(e.target.value)} placeholder={t('publicSelectionPage.emailPlaceholder')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              {verifyError && <p className="text-sm text-red-600 mb-2">{verifyError}</p>}
              <button onClick={handleVerifySubmit} disabled={verifySending} className="w-full py-2 rounded-lg bg-[#2731db] text-white font-medium disabled:opacity-50">{verifySending ? t('publicSelectionPage.sending') : t('publicSelectionPage.continue')}</button>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('publicSelectionPage.enterOtpLabel')}</label>
                <input type="text" inputMode="numeric" maxLength={6} value={verifyOtp} onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ''))} placeholder={t('publicSelectionPage.otpPlaceholder')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              {verifyError && <p className="text-sm text-red-600 mb-2">{verifyError}</p>}
              <button onClick={handleVerifyOtpSubmit} disabled={verifySending} className="w-full py-2 rounded-lg bg-[#2731db] text-white font-medium disabled:opacity-50 mb-2">{verifySending ? t('publicSelectionPage.verifying') : t('publicSelectionPage.verify')}</button>
              <button type="button" onClick={handleResendOtp} disabled={verifySending} className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">{t('publicSelectionPage.resendOtp')}</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const contentLoading = isBulkMode ? bulkImagesLoading : isLoading;
  const contentError = isBulkMode ? bulkImagesError : isError;

  if (contentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text={isBulkMode ? t('publicSelectionPage.loadingImages') : t('publicSelectionPage.loadingAlbums')} />
      </div>
    );
  }

  if (contentError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {isBulkMode ? t('publicSelectionPage.unableLoadImages') : t('publicSelectionPage.unableLoadAlbums')}
          </h1>
          <p className="text-gray-600 text-sm">{t('publicSelectionPage.unableLoadBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaImages className="mr-3 text-[#2731db]" />
              {isBulkMode ? t('publicSelectionPage.titleSharedPhotos') : t('publicSelectionPage.titleSelectPhotos')}
            </h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              {isBulkMode
                ? t('publicSelectionPage.subtitleBulk', { count: bulkImages.length })
                : t('publicSelectionPage.subtitleAlbums')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t('publicSelectionPage.securePublicLink')}</p>
            <p className="text-sm font-medium text-gray-800">
              {isBulkMode
                ? t('publicSelectionPage.bulkHeaderCount', { count: bulkImages.length })
                : t('publicSelectionPage.albumsModeStats', { albumCount: albums.length, photoCount: allSelectedImages.length })}
            </p>
          </div>
        </header>

        {/* Public URL Display */}
        {/* <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FaShare className="text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-900">Public Share URL</h4>
            </div>
            <button
              onClick={handleCopyUrl}
              className="flex items-center px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              title="Copy URL"
            >
              <FaCopy className="mr-1" /> Copy URL
            </button>
          </div>
          <p className="text-xs text-gray-600 break-all bg-white p-2 rounded border border-blue-200 font-mono">
            {currentUrl}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Share this URL with others to view and select from these albums
          </p>
        </div> */}

        {/* Selection Summary Bar (albums mode only) */}
        {!isBulkMode && allSelectedImages.length > 0 ? (
          <div className="mb-6 bg-gradient-to-r from-[#2731db] to-blue-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FaCheckCircle className="text-2xl" />
                <div>
                  <p className="font-semibold text-lg">
                    {t('publicSelectionPage.photosSelectedBar', { count: allSelectedImages.length })}
                  </p>
                  <p className="text-sm text-blue-100">
                    {t('publicSelectionPage.fromAlbums', { count: selectedAlbums.size })}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleViewSelectedImagesOnly}
                  className="px-5 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold transition-colors flex items-center gap-2 border border-white/40"
                >
                  <FaImages className="mr-1" />
                  {t('publicSelectionPage.viewSelectedOnly')}
                </button>
                <button
                  onClick={handleSubmitSelection}
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded-lg bg-white text-[#2731db] hover:bg-gray-100 font-semibold transition-colors flex items-center space-x-2 ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#2731db] border-t-transparent"></div>
                      <span>{t('publicSelectionPage.submitting')}</span>
                    </>
                  ) : (
                    <>
                      <FaCheck className="mr-1" />
                      <span>{t('publicSelectionPage.submitSelection')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : !isBulkMode ? (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {t('publicSelectionPage.selectHintEmpty')}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Full album display: when at least one album is selected, show all its images in one grid */}
        {/* {!isBulkMode && fullAlbumImages.length > 0 && (
          <section className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
              <h2 className="text-xl font-semibold text-gray-900 mb-1 flex items-center">
                <FaImages className="mr-2 text-[#2731db]" />
                Full album display
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {fullAlbumImages.length} photo{fullAlbumImages.length !== 1 ? 's' : ''} from {selectedAlbums.size} selected album{selectedAlbums.size !== 1 ? 's' : ''}. Expand albums below to select which photos to submit.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {fullAlbumImages.map((image, index) => {
                  const imageUrl = getImageUrl(image);
                  const thumbUrl = getThumbnailUrl(image);
                  const filename = getImageFilename(image);
                  const fileType = getFileType(image);
                  const canView = (thumbUrl || imageUrl) && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);
                  const isImageSelected = Array.from(selectedAlbums).some(
                    (albumId) => userSelectedImages.get(albumId)?.has(image.id)
                  );
                  return (
                    <div
                      key={`full-${image.id}-${index}`}
                      className={`rounded-xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-all relative ${
                        isImageSelected ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="h-48 bg-gray-100 overflow-hidden relative">
                        <button
                          type="button"
                          onClick={() => setFullscreenImage(image)}
                          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                          title="View full screen"
                        >
                          <FaExpandArrowsAlt className="text-sm" />
                        </button>
                        {canView ? (
                          <img
                            src={(thumbUrl || imageUrl)!}
                            alt={filename}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                            onClick={() => setFullscreenImage(image)}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                            {fileType.toUpperCase()}
                          </div>
                        )}
                        {showSelectionMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isImageSelected ? 'bg-[#2731db] text-white' : 'bg-white/90 text-gray-600'}`}>
                              {isImageSelected ? 'Selected' : '—'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white">
                        <p className="text-sm font-medium text-gray-900 truncate" title={filename}>
                          {filename}
                        </p>
                        {image.uploadTime && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(image.uploadTime).toLocaleString()}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-gray-500">{fileType.toUpperCase()}</span>
                          {showDownload && (
                            <button
                              type="button"
                              onClick={() => handleDownload(image)}
                              className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-[#2731db] text-white hover:bg-blue-800"
                            >
                              <FaDownload className="mr-1" /> Download
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )} */}

        {/* Bulk mode: grid of selected images only (from GET /api/images/bulk) */}
        {isBulkMode && (
          <main className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
            {bulkImages.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <FaImages className="mx-auto mb-3 text-4xl" />
                <p className="text-lg font-medium mb-2">{t('publicSelectionPage.noImagesFound')}</p>
                <p className="text-sm">{t('publicSelectionPage.noImagesFoundBody')}</p>
              </div>
            ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {bulkPhotoImages.map((image, index) => {
                const imageUrl = getImageUrl(image);
                const thumbUrl = getThumbnailUrl(image);
                const filename = getImageFilename(image);
                const fileType = getFileType(image);
                const canView = (thumbUrl || imageUrl) && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);
                return (
                  <div
                    key={image.id}
                    className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all relative"
                  >
                    <div className="h-48 bg-gray-100 overflow-hidden relative">
                      <button
                        type="button"
                        onClick={() => openFullscreenFromBulk(index)}
                        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                        title={t('publicSelectionPage.viewFullScreen')}
                      >
                        <FaExpandArrowsAlt className="text-sm" />
                      </button>
                      {canView ? (
                        <div
                          className="absolute inset-0 cursor-pointer"
                          onClick={() => openFullscreenFromBulk(index)}
                        >
                          <AlbumGalleryThumb
                            image={image}
                            fileType={fileType}
                            alt={filename}
                            eager={index < 12}
                            className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                          {fileType.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white">
                      <p className="text-sm font-medium text-gray-900 truncate" title={filename}>
                        {filename}
                      </p>
                      {image.uploadTime && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(image.uploadTime).toLocaleString()}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-500">{fileType.toUpperCase()}</span>
                        {showDownload && (
                          <button
                            type="button"
                            onClick={() => handleDownload(image)}
                            className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-[#2731db] text-white hover:bg-blue-800"
                          >
                            <FaDownload className="mr-1" /> {t('publicSelectionPage.download')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={loadMoreBulkSentinelRef} className="h-4" aria-hidden />
            {bulkFetchingNextPage && (
              <div className="mt-4 flex justify-center py-4">
                <LoadingSpinner size="md" text={t('publicSelectionPage.loadingMore')} />
              </div>
            )}
            </>
            )}
          </main>
        )}

        {/* Albums List (when not bulk mode) */}
        {!isBulkMode && (
        <main className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          {albums.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FaImages className="mx-auto mb-3 text-4xl" />
              <p className="text-lg font-medium mb-2">
                {effectiveHasValidAlbumId && !isLoading ? t('publicSelectionPage.albumNotFound') : t('publicSelectionPage.noAlbumsAvailable')}
              </p>
              <p className="text-sm">
                {effectiveHasValidAlbumId && !isLoading
                  ? t('publicSelectionPage.albumInvalidHint')
                  : t('publicSelectionPage.albumsEmptyHint')}
              </p>
            </div>
          ) : (
            <>
              {/* Select button: always visible, toggles checkboxes on/off */}
              <div className="mb-5 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  {showSelectionMode
                    ? t('publicSelectionPage.selectionModeOn')
                    : t('publicSelectionPage.selectionModeOff')}
                </p>
                <button
                  type="button"
                  onClick={() => setShowSelectionMode((prev) => !prev)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm ${
                    showSelectionMode
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-[#2731db] text-white hover:bg-blue-700'
                  }`}
                >
                  <FaCheck className="text-sm" />
                  {showSelectionMode ? t('publicSelectionPage.doneSelecting') : t('publicSelectionPage.select')}
                </button>
              </div>
              {/* Filter Toggle */}
              {selectedAlbums.size > 0 && (
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowOnlySelected(!showOnlySelected)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        showOnlySelected
                          ? 'bg-[#2731db] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {showOnlySelected ? t('publicSelectionPage.showAllAlbums') : t('publicSelectionPage.showOnlySelected')}
                    </button>
                    {showOnlySelected && (
                      <span className="text-sm text-gray-600">
                        {t('publicSelectionPage.showingAlbums', { selected: selectedAlbums.size, total: albums.length })}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-4">
                {albums
                  .filter((album) => !showOnlySelected || selectedAlbums.has(album.id))
                  .map((album) => {
                const isSelected = selectedAlbums.has(album.id);
                const isExpanded = expandedAlbums.has(album.id);
                const albumImageIds = userSelectedImages.get(album.id) || new Set<number>();
                const albumImages = getImagesForAlbum(album.id);
                const albumPhotosLoading = albumImagesLoadingIds.has(album.id);
                const displayImageCount = album.imageCount ?? albumImages.length;
                // Album is fully selected only if all images are in the selected set
                const allSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;
                // If album is marked as selected but has no images selected, it means user deselected all images
                // In this case, we should keep the album selected but show no images as selected

                return (
                  <div
                    key={album.id}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      showSelectionMode && isSelected ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50' : 'border-gray-200'
                    }`}
                  >
                    {/* Album Header - responsive for mobile and web */}
                    <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-white min-h-[4rem]">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        {showSelectionMode ? (
                          <button
                            onClick={() => toggleAlbum(album.id)}
                            className={`w-7 h-7 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center flex-shrink-0 touch-manipulation ${
                              isSelected ? 'bg-[#2731db] border-[#2731db]' : 'border-gray-300'
                            }`}
                            aria-label={isSelected ? t('publicSelectionPage.deselectAlbum') : t('publicSelectionPage.selectAlbum')}
                          >
                            {isSelected && <FaCheck className="text-white text-xs" />}
                          </button>
                        ) : (
                          <div className="w-7 h-7 sm:w-6 sm:h-6 flex-shrink-0" aria-hidden />
                        )}

                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {album.previewUrl ? (
                            <img
                              src={album.previewUrl}
                              alt={album.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <FaFolder className="text-xl sm:text-2xl text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate" title={album.name}>
                            {album.name}
                          </h3>
                          {album.description && (
                            <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5" title={album.description}>
                              {album.description}
                            </p>
                          )}
                          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs sm:text-sm text-gray-500 mt-1">
                            <span>{t('publicSelectionPage.imagesCount', { n: displayImageCount })}</span>
                            {showSelectionMode && albumImageIds.size > 0 && (
                              <span className="text-[#2731db] font-medium">
                                {t('publicSelectionPage.selectedCount', { n: albumImageIds.size })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleAlbumExpand(album.id)}
                        className="flex-shrink-0 min-w-[2.75rem] min-h-[2.75rem] sm:min-w-0 sm:min-h-0 ml-1 sm:ml-4 px-3 py-2.5 sm:py-2 rounded-lg border border-gray-300 hover:bg-gray-50 active:bg-gray-100 touch-manipulation flex items-center justify-center gap-1 sm:gap-2"
                        aria-label={isExpanded ? t('publicSelectionPage.collapseAlbum') : t('publicSelectionPage.expandAlbum')}
                      >
                        {isExpanded ? (
                          <FaFolderOpen className="text-[#2731db] text-lg sm:text-xl" />
                        ) : (
                          <FaFolder className="text-gray-400 text-lg sm:text-xl" />
                        )}
                        <FaChevronRight
                          className={`text-gray-400 transition-transform duration-200 text-sm sm:text-base ${
                            isExpanded ? 'transform rotate-90' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Album Images (shown when expanded) - show 20 at a time, then "Load more" */}
                    {isExpanded && albumPhotosLoading && albumImages.length <= 1 && (
                      <div className="border-t border-gray-200 p-8 flex justify-center bg-gray-50">
                        <LoadingSpinner size="md" text={t('publicSelectionPage.loadingPhotos') || 'Loading photos…'} />
                      </div>
                    )}
                    {isExpanded && !albumPhotosLoading && albumImages.length === 0 && (
                      <div className="border-t border-gray-200 p-6 text-center text-sm text-gray-500 bg-gray-50">
                        {t('publicSelectionPage.noPhotosInAlbum') || 'No photos in this album.'}
                      </div>
                    )}
                    {isExpanded && albumImages.length > 0 && (() => {
                      const showCount = albumImagesShownCount.get(album.id) ?? ALBUM_IMAGES_PAGE_SIZE;
                      const visibleImages = albumImages.slice(0, showCount);
                      const hasMore = albumImages.length > showCount;
                      return (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {showSelectionMode
                              ? (isSelected ? t('publicSelectionPage.selectedImages') : t('publicSelectionPage.selectImages'))
                              : t('publicSelectionPage.imagesHeading')}
                            {showSelectionMode && isSelected && albumImageIds.size > 0 && (
                              <span className="ml-2 text-[#2731db] font-medium">
                                {t('publicSelectionPage.countOf', { selected: albumImageIds.size, total: albumImages.length })}
                              </span>
                            )}
                          </h4>
                          {showSelectionMode && isSelected && (
                            <button
                              onClick={() => selectAllImagesInAlbum(album.id)}
                              className="text-xs text-[#2731db] hover:underline"
                            >
                              {allSelected ? t('publicSelectionPage.deselectAll') : t('publicSelectionPage.selectAll')}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                          {visibleImages.map((image) => {
                              const isImageSelected = isSelected && albumImageIds.has(image.id);
                              const imageUrl = getImageUrl(image);
                              const thumbUrl = getThumbnailUrl(image);
                              const filename = getImageFilename(image);
                              const fileType = getFileType(image);
                              const canView = (thumbUrl || imageUrl) && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);

                              return (
                                <div
                                  key={image.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!showSelectionMode) return;
                                    if (!isSelected) toggleAlbum(album.id);
                                    toggleImageSelection(album.id, image.id);
                                  }}
                                  className={`group relative rounded-xl overflow-hidden border transition-all duration-200 ${
                                    showSelectionMode ? 'cursor-pointer' : ''
                                  } ${
                                    isImageSelected
                                      ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50 shadow-lg'
                                      : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
                                  } ${showSelectionMode ? 'hover:shadow-md' : ''}`}
                                >
                                  {showSelectionMode && (
                                    <div className="absolute top-2 left-2 z-10">
                                      <div
                                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                                          isImageSelected
                                            ? 'bg-[#2731db] border-[#2731db] text-white'
                                            : isSelected
                                            ? 'bg-white/90 border-gray-400'
                                            : 'bg-white/60 border-gray-200'
                                        }`}
                                      >
                                        {isImageSelected && <FaCheck className="text-xs" />}
                                      </div>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openFullscreenFromAlbum(album.id, image.id);
                                    }}
                                    className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                                    title={t('publicSelectionPage.viewFullScreen')}
                                  >
                                    <FaExpandArrowsAlt className="text-sm" />
                                  </button>

                                  <div
                                    className="h-48 bg-gray-100 overflow-hidden relative"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (canView) openFullscreenFromAlbum(album.id, image.id);
                                    }}
                                  >
                                    {canView ? (
                                      <AlbumGalleryThumb
                                        image={image}
                                        fileType={fileType}
                                        alt={filename}
                                        eager={visibleImages.indexOf(image) < 12}
                                        className={`h-full w-full object-cover transition-transform duration-300 ${
                                          isImageSelected ? 'opacity-90' : 'group-hover:scale-105'
                                        }`}
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                                        {fileType.toUpperCase()}
                                      </div>
                                    )}
                                  </div>

                                  <div className="p-3 bg-white">
                                    <p className="text-sm font-medium text-gray-900 truncate" title={filename}>
                                      {filename}
                                    </p>
                                    {image.uploadTime && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {new Date(image.uploadTime).toLocaleString()}
                                      </p>
                                    )}
                                    <div className="mt-3 flex items-center justify-between">
                                      <span className="text-xs text-gray-500">{fileType.toUpperCase()}</span>
                                      {showDownload && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(image);
                                          }}
                                          className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-[#2731db] text-white hover:bg-blue-800"
                                        >
                                          <FaDownload className="mr-1" /> {t('publicSelectionPage.download')}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                        {hasMore && (
                          <div className="mt-4 flex justify-center">
                            <button
                              type="button"
                              onClick={() => setAlbumImagesShownCount((prev) => {
                                const next = new Map(prev);
                                next.set(album.id, (prev.get(album.id) ?? ALBUM_IMAGES_PAGE_SIZE) + ALBUM_IMAGES_PAGE_SIZE);
                                return next;
                              })}
                              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              {t('publicSelectionPage.loadMoreRemaining', { remaining: albumImages.length - showCount })}
                            </button>
                          </div>
                        )}
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
              </div>
              <div ref={loadMoreAlbumsRef} className="h-4" aria-hidden />
              {albumsFetchingNextPage && (
                <div className="mt-4 flex justify-center py-4">
                  <LoadingSpinner size="md" text={t('publicSelectionPage.loadingMore')} />
                </div>
              )}
            </>
          )}
        </main>
        )}

        {/* Full-screen lightbox with progressive variants */}
        {fullscreenContext && lightboxItems.length > 0 && (
          <Lightbox
            items={lightboxItems}
            initialIndex={fullscreenContext.index}
            isOpen
            onClose={closeFullscreenImage}
            onIndexChange={handleLightboxIndexChange}
            loop
          />
        )}
      </div>
    </div>
  );
};

export default PublicSelectionPage;
