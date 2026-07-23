import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaImages, FaQrcode, FaCheckCircle, FaDownload, FaExclamationTriangle, FaFolder, FaFolderOpen, FaChevronRight, FaChevronLeft, FaCheck, FaRedoAlt, FaTimes, FaUpload, FaFileImage, FaExpandArrowsAlt } from 'react-icons/fa';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import api from '../../api/client/axiosInstance';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { decompressFileList } from '../../utils/checkoutUrlEncoding';
import { decryptCheckoutPayload } from '../../utils/encryption';

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
  perAlbumPrice?: number | null;
  perPhotoPrice?: number | null;
  isPublic?: boolean;
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
  [key: string]: any;
}

const PRICE_PER_IMAGE = 0;
const ALBUMS_PAGE_SIZE = 20;
const IMAGES_PAGE_SIZE = 20; // images to show per album (then "Load more")

const PublicCheckoutPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  
  const [selectedAlbums, setSelectedAlbums] = useState<Set<number>>(new Set());
  const [expandedAlbums, setExpandedAlbums] = useState<Set<number>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Map<number, Set<number>>>(new Map());
  const [showQr, setShowQr] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [email, setEmail] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [downloadCodeData, setDownloadCodeData] = useState<any>(null);
  const [loadingDownloadCode, setLoadingDownloadCode] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<AlbumImage | null>(null);
  const [fullscreenContext, setFullscreenContext] = useState<{ albumId: number; index: number } | null>(null);
  /** Per album: how many images to show (pagination). Key = albumId, value = count (default IMAGES_PAGE_SIZE). */
  const [albumImagesShownCount, setAlbumImagesShownCount] = useState<Map<number, number>>(new Map());
  const autoSelectedRef = useRef(false);
  const loadMoreAlbumsRef = useRef<HTMLDivElement | null>(null);

  const sid = searchParams.get('sid') || ''; // short share link id
  const shareIdParam = searchParams.get('shareId') || ''; // optional: when set, sendNotification only if email/mobile is recipient for this share
  const shareId = shareIdParam ? parseInt(shareIdParam, 10) : undefined;
  const validShareId = shareId != null && !isNaN(shareId) && shareId > 0 ? shareId : undefined;
  const qParam = searchParams.get('q') || ''; // encrypted token+albumId (minimal link)
  const token = searchParams.get('token') || '';
  const albumIdParam = searchParams.get('albumId') || ''; // optional: load single album by ID
  const filesParam = searchParams.get('files') || '';
  const fParam = searchParams.get('f') || ''; // compressed file list (short URL)
  const downloadCode = searchParams.get('code') || '';
  const albumId = albumIdParam ? parseInt(albumIdParam, 10) : null;
  const hasValidAlbumId = albumId != null && !isNaN(albumId) && albumId > 0;

  // Protect: do not open this page without a complete share URL (sid, q, or token)
  const hasShareIdentifier = !!(sid.trim() || qParam.trim() || token.trim());

  const payloadFromQ = useMemo(() => (qParam.trim() ? decryptCheckoutPayload(qParam.trim()) : null), [qParam]);
  const qInvalid = qParam.trim() !== '' && payloadFromQ === null;

  type ResolvedFromSid = { token: string; albumId: number | null; fileNames: string[] };
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
    api.get<{ token: string; albumId?: number | null; fileNames?: string[] }>(`/api/public/share-link/${encodeURIComponent(sid)}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        const tokenVal = data?.token ?? '';
        const raw = data?.albumId;
        const n = raw != null ? Number(raw) : NaN;
        const albumIdVal = Number.isFinite(n) ? n : null;
        const fileNamesVal = Array.isArray(data?.fileNames) ? data.fileNames : [];
        setResolvedFromSid({ token: tokenVal, albumId: albumIdVal, fileNames: fileNamesVal });
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

  const effectiveToken = resolvedFromSid?.token ?? payloadFromQ?.token ?? token;
  const effectiveAlbumId = resolvedFromSid != null ? resolvedFromSid.albumId : (payloadFromQ != null ? payloadFromQ.albumId : albumId);
  const effectiveHasValidAlbumId = effectiveAlbumId != null && !isNaN(effectiveAlbumId) && effectiveAlbumId > 0;

  // Verification gate (OTP / existing user) – session key so we don't ask again in same session
  const verifyStorageKey = useMemo(() => `public_checkout_verified_${effectiveToken.slice(0, 24)}`, [effectiveToken]);
  type VerifyStatus = 'idle' | 'checking' | 'skip' | 'existing_user' | 'show_message' | 'needs_input' | 'otp_sent' | 'verified';
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyMobile, setVerifyMobile] = useState('');
  const [verifyCountryCode, setVerifyCountryCode] = useState('+91');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyInfoMessage, setVerifyInfoMessage] = useState(''); // when sendNotification false, show message only (do not move)
  const [verifyUserId, setVerifyUserId] = useState<string | null>(null); // when sendNotification true (existing user), for send-otp/verify-otp

  useEffect(() => {
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
            toast.success(t('publicCheckoutPage.toastOtpSentEmailPhone'));
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
  }, [effectiveToken, verifyStorageKey, validShareId]);

  const handleVerifySubmit = async () => {
    const email = verifyEmail.trim();
    if (!email) {
      setVerifyError(t('publicCheckoutPage.verifyEnterEmail'));
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
        toast.success(t('publicCheckoutPage.toastOtpSentEmail'));
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
      toast.success(t('publicCheckoutPage.toastOtpSentEmail'));
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 501) {
        sessionStorage.setItem(verifyStorageKey, '1');
        setVerifyStatus('verified');
        toast.success(t('publicCheckoutPage.toastVerificationSkipped'));
      } else {
        setVerifyError(err.response?.data?.message || t('publicCheckoutPage.verifyGenericError'));
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
        toast.success(t('publicCheckoutPage.toastOtpSentAgain'));
      } catch (err: any) {
        setVerifyError(err.response?.data?.message || t('publicCheckoutPage.verifyFailedResendOtp'));
      } finally {
        setVerifySending(false);
      }
    } else {
      handleVerifySubmit();
    }
  };

  const handleVerifyOtpSubmit = async () => {
    if (!verifyOtp.trim()) {
      setVerifyError(t('publicCheckoutPage.verifyEnterOtp'));
      return;
    }
    setVerifyError('');
    setVerifySending(true);
    try {
      const email = verifyEmail.trim();
      const res = await api.post<{ success?: boolean; accessToken?: string }>('/api/public-verify/verify-otp', {
        ...(verifyUserId ? { userId: verifyUserId } : { email: email || undefined }),
        otp: verifyOtp.trim(),
        linkId: effectiveToken,
        ...(validShareId != null ? { id: validShareId } : {}),
      });
      if (res.data?.success) {
        sessionStorage.setItem(verifyStorageKey, '1');
        setVerifyStatus('verified');
        toast.success(t('publicCheckoutPage.verifyVerifiedLoading'));
      } else {
        setVerifyError(t('publicCheckoutPage.verifyInvalidOtp'));
      }
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || t('publicCheckoutPage.verifyInvalidOtp'));
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

  // Parse filenames: from sid payload, or decoded f= (short URL), or files= (long URL)
  const targetFilenames = useMemo(() => {
    if (resolvedFromSid?.fileNames?.length) return resolvedFromSid.fileNames;
    if (fParam) return decodedFilesFromF;
    if (!filesParam) return [];
    return filesParam.split(',').map(f => decodeURIComponent(f.trim())).filter(f => f);
  }, [resolvedFromSid, fParam, filesParam, decodedFilesFromF]);

  // Fetch albums: single album by ID when albumId in URL (or from sid), otherwise paginated albums
  const {
    data: albumsData,
    isLoading,
    isError,
    refetch,
    isFetchingNextPage: albumsFetchingNextPage,
    hasNextPage: albumsHasNextPage,
    fetchNextPage: albumsFetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['publicCheckoutAlbums', effectiveToken, effectiveHasValidAlbumId ? effectiveAlbumId : null],
    enabled: !!effectiveToken && (!sid || !!resolvedFromSid || sidError),
    queryFn: async ({ pageParam }) => {
      const headers = effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {};
      const params: Record<string, string | number> = effectiveToken ? { token: effectiveToken } : {};
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

  const albums: any = useMemo(() => {
    if (!albumsData?.pages?.length) return [];
    return albumsData.pages.flatMap((p) => (p && (p as { albums?: Album[] }).albums) ?? []);
  }, [albumsData]);

  const getAlbumImagesForFullscreen = useCallback((targetAlbumId: number) => {
    return albums.find((a: Album) => a.id === targetAlbumId)?.images || [];
  }, [albums]);

  const openFullscreenImage = useCallback((targetAlbumId: number, targetIndex: number) => {
    const albumImages = getAlbumImagesForFullscreen(targetAlbumId);
    if (albumImages.length === 0) return;
    const normalizedIndex = ((targetIndex % albumImages.length) + albumImages.length) % albumImages.length;
    setFullscreenContext({ albumId: targetAlbumId, index: normalizedIndex });
    setFullscreenImage(albumImages[normalizedIndex] || null);
  }, [getAlbumImagesForFullscreen]);

  const closeFullscreenImage = useCallback(() => {
    setFullscreenImage(null);
    setFullscreenContext(null);
  }, []);

  const goPrevFullscreenImage = useCallback(() => {
    if (!fullscreenContext) return;
    openFullscreenImage(fullscreenContext.albumId, fullscreenContext.index - 1);
  }, [fullscreenContext, openFullscreenImage]);

  const goNextFullscreenImage = useCallback(() => {
    if (!fullscreenContext) return;
    openFullscreenImage(fullscreenContext.albumId, fullscreenContext.index + 1);
  }, [fullscreenContext, openFullscreenImage]);

  useEffect(() => {
    if (!fullscreenImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreenImage();
      if (e.key === 'ArrowLeft') goPrevFullscreenImage();
      if (e.key === 'ArrowRight') goNextFullscreenImage();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreenImage, closeFullscreenImage, goPrevFullscreenImage, goNextFullscreenImage]);

  // Infinite scroll: albums list
  useEffect(() => {
    const el = loadMoreAlbumsRef.current;
    if (!el || !albumsHasNextPage || albumsFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) albumsFetchNextPage(); },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [albumsHasNextPage, albumsFetchingNextPage, albumsFetchNextPage]);

  // Get all explicitly selected images from all selected albums
  const allSelectedImages = useMemo(() => {
    const images: AlbumImage[] = [];
    selectedAlbums.forEach(albumId => {
      const album = albums.find(a => a.id === albumId);
      if (album && album.images) {
        const imageIds = selectedImages.get(albumId);
        // Only include explicitly selected images
        if (imageIds && imageIds.size > 0) {
          album.images.forEach(img => {
            if (imageIds.has(img.id)) {
              images.push(img);
            }
          });
        }
      }
    });
    return images;
  }, [selectedAlbums, selectedImages, albums]);

  // Fetch UPI settings (pass URL token for public access)
  const { data: upiSettings } = useQuery({
    queryKey: ['upiSettings', effectiveToken],
    enabled: !!effectiveToken,
    queryFn: async () => {
      try {
        const response = await api.get('/api/upi', {
          headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {},
          params: effectiveToken ? { token: effectiveToken } : {},
        });
        return response.data as { upiId: string; perPhotoPrice: number };
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: 1,
  });

  const defaultPerPhotoPrice = upiSettings?.perPhotoPrice || PRICE_PER_IMAGE;

  // Calculate total amount considering perAlbumPrice and perPhotoPrice
  const totalAmount = useMemo(() => {
    let total = 0;
    
    selectedAlbums.forEach(albumId => {
      const album = albums.find(a => a.id === albumId);
      if (!album) return;
      
      const albumImageIds = selectedImages.get(albumId) || new Set<number>();
      const albumImages = album.images || [];
      
      if (albumImageIds.size === 0) return;
      
      // Check if all images in album are selected
      const allImagesSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;
      
      // Priority 1: If all images selected and album has perAlbumPrice, use it
      if (allImagesSelected && album.perAlbumPrice && album.perAlbumPrice > 0) {
        total += album.perAlbumPrice;
      } else if (albumImageIds.size > 0) {
        // Individual images selected - use perPhotoPrice from album, or fallback to UPI settings, or default
        const imagePrice = album.perPhotoPrice && album.perPhotoPrice > 0 
          ? album.perPhotoPrice 
          : (defaultPerPhotoPrice > 0 ? defaultPerPhotoPrice : PRICE_PER_IMAGE);
        total += albumImageIds.size * imagePrice;
      }
    });
    
    return total;
  }, [selectedAlbums, selectedImages, albums, defaultPerPhotoPrice]);

  const toggleAlbum = (albumId: number) => {
    setIsPaid(false);
    setSelectedAlbums(prev => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        // Unselect album - remove album and all its images
        next.delete(albumId);
        setSelectedImages(prevImgs => {
          const nextImgs = new Map(prevImgs);
          nextImgs.delete(albumId);
          return nextImgs;
        });
      } else {
        // Select album - automatically select ALL images in the album
        next.add(albumId);
        const album = albums.find(a => a.id === albumId);
        if (album && album.images && album.images.length > 0) {
          setSelectedImages(prevImgs => {
            const nextImgs = new Map(prevImgs);
            const allImageIds = new Set<number>(album.images!.map(img => img.id));
            nextImgs.set(albumId, allImageIds);
            return nextImgs;
          });
        }
      }
      return next;
    });
  };

  const toggleAlbumExpand = (albumId: number) => {
    setExpandedAlbums(prev => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
      }
      return next;
    });
  };

  const toggleImageSelection = (albumId: number, imageId: number) => {
    setIsPaid(false);
    setSelectedImages(prev => {
      const next = new Map(prev);
      const imageSet = next.get(albumId) || new Set<number>();
      const newImageSet = new Set(imageSet);
      
      if (newImageSet.has(imageId)) {
        newImageSet.delete(imageId);
      } else {
        newImageSet.add(imageId);
      }
      
      if (newImageSet.size === 0) {
        next.delete(albumId);
      } else {
        next.set(albumId, newImageSet);
      }
      
      return next;
    });
  };

  const selectAllImagesInAlbum = (albumId: number) => {
    const album = albums.find(a => a.id === albumId);
    if (!album || !album.images) return;
    
    setSelectedImages(prev => {
      const next = new Map(prev);
      const allImageIds = new Set(album.images!.map(img => img.id));
      next.set(albumId, allImageIds as Set<number>);
      return next;
    });
  };

  const getThumbnailUrl = (image: AlbumImage): string | null => {
    if (image.thumbnailUrl) return image.thumbnailUrl;
    if (image.previewUrl) return image.previewUrl;
    if (image.downloadUrl) return image.downloadUrl;
    return null;
  };

  const getImageUrl = (image: AlbumImage): string | null => {
    if (image.previewUrl) return image.previewUrl;
    if (image.downloadUrl) return image.downloadUrl;
    return null;
  };

  const getImageFilename = (image: AlbumImage): string => {
    return image.originalFilename || image.filename || t('publicCheckoutPage.unknownFile');
  };

  const getFileType = (image: AlbumImage): string => {
    const filename = getImageFilename(image);
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return extension || image.fileType || 'unknown';
  };

  // Fetch download code data if code is present in URL
  const fetchDownloadCode = async () => {
    if (downloadCode && !downloadCodeData && !loadingDownloadCode) {
      setLoadingDownloadCode(true);
      setShowQr(false); // Hide QR immediately when download code is detected
      try {
        const response = await api.get(`/api/payments/download/${downloadCode}`, {
          headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {},
          params: effectiveToken ? { token: effectiveToken } : {},
        });
        console.log('Download code data:', response);
        setDownloadCodeData(response.data);
        setIsPaid(true);
        setShowQr(false); // Ensure QR is hidden when download code is verified
        toast.success(t('publicCheckoutPage.toastDownloadCodeVerified'));
      } catch (error: any) {
        console.error('Error fetching download code:', error);
        const errorMessage = error.response?.data?.message || t('publicCheckoutPage.invalidDownloadCode');
        toast.error(errorMessage);
        setDownloadCodeData(null);
        setIsPaid(false);
        // Don't show QR even if download code fails
        setShowQr(false);
      } finally {
        setLoadingDownloadCode(false);
      }
    }
  };

  useEffect(() => {
    if (downloadCode) {
      fetchDownloadCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadCode]);

  // Auto-select images from download code after albums are loaded
  useEffect(() => {
    if (downloadCodeData && albums.length > 0) {
      const imageIds = downloadCodeData.imageIds || downloadCodeData.images?.map((img: any) => img.id) || [];
      if (imageIds.length > 0) {
        const albumIds = new Set<number>();
        const selectedImagesMap = new Map<number, Set<number>>();
        
        // Find which albums contain these images
        albums.forEach(album => {
          if (album.images) {
            const albumImageIds = new Set<number>();
            album.images.forEach(image => {
              if (imageIds.includes(image.id)) {
                albumImageIds.add(image.id);
                albumIds.add(album.id);
              }
            });
            if (albumImageIds.size > 0) {
              selectedImagesMap.set(album.id, albumImageIds);
              setExpandedAlbums(prev => new Set(prev).add(album.id));
            }
          }
        });
        
        if (albumIds.size > 0) {
          setSelectedAlbums(albumIds);
          setSelectedImages(selectedImagesMap);
        }
      }
    }
  }, [downloadCodeData, albums]);

  // Auto-select albums and images based on filenames from URL (only once when albums load)
  useEffect(() => {
    if (albums.length === 0 || targetFilenames.length === 0) return;
    // Only auto-select once (prevents overriding user selections)
    if (autoSelectedRef.current) return;
    // Don't auto-select if download code is being processed
    if (downloadCode && loadingDownloadCode) return;

    const matchedAlbums = new Set<number>();
    const matchedImages = new Map<number, Set<number>>();

    albums.forEach(album => {
      if (!album.images || album.images.length === 0) return;

      const albumImageIds = new Set<number>();
      let hasMatch = false;

      album.images.forEach(image => {
        const imageFilename = getImageFilename(image);
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

    if (matchedAlbums.size > 0) {
      setSelectedAlbums(matchedAlbums);
      setSelectedImages(matchedImages);
      autoSelectedRef.current = true;
      toast.success(t('publicCheckoutPage.foundAlbumsMatch', { count: matchedAlbums.size }));
    }
  }, [albums, targetFilenames]);

  const qrData = useMemo(() => {
    if (!totalAmount || allSelectedImages.length === 0) return '';
    const params = new URLSearchParams({
      pa: 'rohitrawat9009@ybl',
      pn: 'Photo Book',
      am: String(totalAmount),
      cu: 'INR',
      tn: `Photo Book payment for ${allSelectedImages.length} photo(s)`,
    }).toString();
    const upiUrl = `upi://pay?${params.toString()}`;
    return encodeURIComponent(upiUrl);
  }, [allSelectedImages.length, totalAmount]);

  // Register payment and generate transaction ID when QR is created/shown
  useEffect(() => {
    if (showQr && qrData && allSelectedImages.length > 0 && totalAmount > 0 && !transactionId) {
      const registerPayment = async () => {
        try {
          const txId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setTransactionId(txId);
          
          const transactionData = {
            transactionId: txId,
            amount: totalAmount,
            imageCount: allSelectedImages.length,
            token: effectiveToken,
            timestamp: Date.now(),
            status: 'pending'
          };
          localStorage.setItem(`payment_${txId}`, JSON.stringify(transactionData));

          // Send API call to register/create payment transaction when QR is created
          try {
            console.log('Calling /api/payment/create with:', {
              transactionId: txId,
              amount: totalAmount,
              imageCount: allSelectedImages.length,
              imageIds: allSelectedImages.map(img => img.id),
              token: effectiveToken,
              timestamp: Date.now()
            });

          } catch (error: any) {
            console.error('Error registering payment:', error);
            console.error('Error details:', error.response?.data || error.message);
            toast.error(t('publicCheckoutPage.toastPaymentRegisterFailed'));
          }
        } catch (error) {
          console.error('Error creating transaction:', error);
        }
      };

      registerPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQr, qrData, allSelectedImages.length, totalAmount, transactionId]);

  // Auto-show QR when images are selected (but not if download code is present)
  useEffect(() => {
    // Don't show QR if download code is present or being processed
    if (downloadCode || loadingDownloadCode || downloadCodeData) {
      setShowQr(false);
      return;
    }
    
    if (allSelectedImages.length > 0 && totalAmount > 0) {
      setShowQr(true);
      setIsPaid(false);
    } else {
      setShowQr(false);
      setIsPaid(false);
      setTransactionId('');
    }
  }, [allSelectedImages.length, totalAmount, downloadCode, loadingDownloadCode, downloadCodeData]);

  // const checkPaymentStatus = async (amount: number, imageCount: number): Promise<boolean> => {
  //   try {
  //     if (!transactionId) return false;

  //     try {
  //       const verifyResponse = await api.post('/api/payment/verify', {
  //         amount,
  //         imageCount,
  //         token,
  //         transactionId
  //       });
        
  //       console.log('Payment verify response:', verifyResponse.data);
        
  //       if (verifyResponse.data && verifyResponse.data.paid === true) {
  //         const storedData = localStorage.getItem(`payment_${transactionId}`);
  //         if (storedData) {
  //           const transactionData = JSON.parse(storedData);
  //           transactionData.status = 'paid';
  //           transactionData.paidAt = Date.now();
  //           localStorage.setItem(`payment_${transactionId}`, JSON.stringify(transactionData));
  //         }
  //         return true;
  //       }
  //     } catch (apiError: any) {
  //       if (apiError.response?.status !== 404) {
  //         console.error('Payment verification API error:', apiError);
  //         console.error('Error details:', apiError.response?.data || apiError.message);
  //       }
  //     }

  //     const storedData = localStorage.getItem(`payment_${transactionId}`);
  //     if (storedData) {
  //       const transactionData = JSON.parse(storedData);
  //       if (transactionData.status === 'paid') {
  //         return true;
  //       }
  //     }

  //     const urlParams = new URLSearchParams(window.location.search);
  //     const paymentConfirmed = urlParams.get('payment_confirmed');
  //     if (paymentConfirmed === 'true' && urlParams.get('txn_id') === transactionId) {
  //       const storedData = localStorage.getItem(`payment_${transactionId}`);
  //       if (storedData) {
  //         const transactionData = JSON.parse(storedData);
  //         transactionData.status = 'paid';
  //         transactionData.paidAt = Date.now();
  //         localStorage.setItem(`payment_${transactionId}`, JSON.stringify(transactionData));
  //       }
  //       return true;
  //     }

  //     return false;
  //   } catch (error) {
  //     console.error('Payment verification error:', error);
  //     return false;
  //   }
  // };

  // Auto-detect payment success
  useEffect(() => {
    if (showQr && qrData && !isPaid && allSelectedImages.length > 0 && totalAmount > 0 && transactionId) {
      setPaymentChecking(true);
    }
  }, [showQr, qrData, isPaid, allSelectedImages.length, totalAmount, transactionId]);

  // Auto-unlock downloads when payment is confirmed
  useEffect(() => {
    if (isPaid && allSelectedImages.length > 0) {
      toast.success(t('publicCheckoutPage.toastPaymentConfirmedDownloads'));
      
      setTimeout(() => {
        allSelectedImages.forEach((image, index) => {
          setTimeout(() => {
            const imageUrl = getImageUrl(image);
            if (imageUrl) {
              const link = document.createElement('a');
              link.href = imageUrl;
              link.download = getImageFilename(image);
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }, index * 500);
        });
      }, 1000);
    }
  }, [isPaid, allSelectedImages]);

  const handleDownload = (image: AlbumImage) => {
    if (!isPaid) {
      toast.error(t('publicCheckoutPage.toastCompletePaymentFirst'));
      return;
    }

    const imageUrl = getImageUrl(image);
    if (!imageUrl) {
      toast.error(t('publicCheckoutPage.downloadUrlUnavailable'));
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

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t('publicCheckoutPage.toastUploadImageFile'));
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('publicCheckoutPage.toastImageSize5mb'));
        return;
      }
      setPaymentScreenshot(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPayment = async () => {
    if (!utrNumber.trim()) {
      toast.error(t('publicCheckoutPage.toastEnterUtr'));
      return;
    }

    if (!email) {
      toast.error(t('publicCheckoutPage.toastEnterEmail'));
      return;
    }

    if (allSelectedImages.length === 0) {
      toast.error(t('publicCheckoutPage.toastSelectOneImage'));
      return;
    }

    setSubmittingPayment(true);

    try {
      // Determine purchase type
      let purchaseType = 'INDIVIDUAL_IMAGES';
      let albumId: string | undefined;
      let imageIds: string | undefined;
      
      // Check if all images from one album are selected
      if (selectedAlbums.size === 1) {
        const albumIdNum = Array.from(selectedAlbums)[0];
        const album = albums.find(a => a.id === albumIdNum);
        if (album) {
          albumId = String(albumIdNum); // Always set albumId for single album selection
          const albumImageIds = selectedImages.get(albumIdNum) || new Set();
          
          // If all images in album are selected, use FULL_ALBUM
          if (album.images && albumImageIds.size === album.images.length) {
            purchaseType = 'FULL_ALBUM';
            console.log('FULL_ALBUM purchase - albumId:', albumId);
          } else {
            // Individual images from one album - send both albumId and imageIds
            purchaseType = 'INDIVIDUAL_IMAGES';
            imageIds = Array.from(albumImageIds).join(',');
            console.log('INDIVIDUAL_IMAGES purchase - albumId:', albumId, 'imageIds:', imageIds);
          }
        }
      } else if (selectedAlbums.size > 1) {
        // Multiple albums - collect all image IDs
        const allImageIds: number[] = [];
        selectedAlbums.forEach(albumIdNum => {
          const albumImageIds = selectedImages.get(albumIdNum) || new Set();
          allImageIds.push(...Array.from(albumImageIds));
        });
        imageIds = allImageIds.join(',');
        console.log('Multiple albums - imageIds:', imageIds);
        // For multiple albums, we could send the first albumId or leave it undefined
        // If you want to send the first album's ID:
        const firstAlbumId = Array.from(selectedAlbums)[0];
        albumId = String(firstAlbumId);
        console.log('Multiple albums - first albumId:', albumId);
      }

      // Create FormData for multipart/form-data
      const formData = new FormData();
      if (paymentScreenshot) {
        formData.append('paymentScreenshot', paymentScreenshot);
      }
      formData.append('utrNumber', utrNumber.trim());
      formData.append('purchaseType', purchaseType);
      formData.append('otpEmail', email.trim());
      
      // Always append albumId if it exists (send both albumId and imageIds when available)
      if (albumId) {
        formData.append('albumId', albumId);
        console.log('✅ albumId appended:', albumId);
      } else {
        // Fallback: try to get albumId from selectedAlbums
        if (selectedAlbums.size > 0) {
          const selectedAlbumId = Array.from(selectedAlbums)[0];
          if (selectedAlbumId) {
            albumId = String(selectedAlbumId);
            formData.append('albumId', albumId);
            console.log('✅ albumId appended (from selectedAlbums fallback):', albumId);
          }
        }
      }
      
      // Always append imageIds if they exist (send both for better tracking)
      if (imageIds) {
        formData.append('imageIds', imageIds);
        console.log('✅ imageIds appended:', imageIds);
      } else if (purchaseType === 'FULL_ALBUM' && albumId) {
        // For FULL_ALBUM, also include imageIds for reference
        const albumIdNum = parseInt(albumId);
        const album = albums.find(a => a.id === albumIdNum);
        if (album && album.images) {
          const allImageIds = album.images.map(img => img.id).join(',');
          formData.append('imageIds', allImageIds);
          console.log('✅ imageIds appended (all album images for FULL_ALBUM):', allImageIds);
        }
      }
      
      // Validation: FULL_ALBUM must have albumId
      if (purchaseType === 'FULL_ALBUM' && !albumId) {
        console.error('❌ FULL_ALBUM purchase but albumId is missing!');
        toast.error(t('publicCheckoutPage.toastFullAlbumIdRequired'));
        setSubmittingPayment(false);
        return;
      }
      
      // Validation: INDIVIDUAL_IMAGES should have imageIds
      if (purchaseType === 'INDIVIDUAL_IMAGES' && !imageIds) {
        console.error('❌ INDIVIDUAL_IMAGES purchase but imageIds is missing!');
        toast.error(t('publicCheckoutPage.toastImageIdsRequired'));
        setSubmittingPayment(false);
        return;
      }
      
      formData.append('totalAmount', String(totalAmount));
      formData.append('callbackUrl', window.location.href);
      
      // Debug: Log payment submission details
      console.log('📤 Payment submission details:', {
        purchaseType,
        albumId: albumId || 'none',
        imageIds: purchaseType === 'FULL_ALBUM' ? 'not sent (using albumId)' : (imageIds || 'none'),
        totalAmount,
        utrNumber: utrNumber.trim(),
        otpEmail: email.trim()
      });

      // Get auth token from localStorage or use token from URL (or resolved from sid)
      const authToken = localStorage.getItem('token') || effectiveToken;
      
      const response = await api.post('/api/payments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      console.log('Payment submitted for approval:', response.data);
      toast.success(t('publicCheckoutPage.toastPaymentSubmitted'));
      
      // Close modal and reset form
      setShowPaymentModal(false);
      setUtrNumber('');
      setPaymentScreenshot(null);
      setScreenshotPreview(null);
      
    } catch (error: any) {
      console.error('Error submitting payment:', error);
      const errorMessage = error.response?.data?.message || error.message || t('publicCheckoutPage.toastFailedSubmitPayment');
      toast.error(errorMessage);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCloseModal = () => {
    if (!submittingPayment) {
      setShowPaymentModal(false);
      setUtrNumber('');
      setPaymentScreenshot(null);
      setScreenshotPreview(null);
    }
  };

  // Incomplete URL – no sid, q, or token: do not show checkout, show error only
  if (!hasShareIdentifier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicCheckoutPage.incompleteLinkTitle')}</h1>
          <p className="text-gray-600 text-sm mb-4">
            {t('publicCheckoutPage.incompleteLinkBody')}
          </p>
          <a href="/" className="inline-block px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900">
            {t('publicCheckoutPage.goHome')}
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
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicCheckoutPage.invalidShortLinkTitle')}</h1>
          <p className="text-gray-600 text-sm">
            {t('publicCheckoutPage.invalidShortLinkBody')}
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
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicCheckoutPage.invalidLinkTitle')}</h1>
          <p className="text-gray-600 text-sm">
            {t('publicCheckoutPage.invalidLinkBody')}
          </p>
        </div>
      </div>
    );
  }

  if (!effectiveToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicCheckoutPage.invalidTokenTitle')}</h1>
          <p className="text-gray-600 text-sm mb-4">
            {t('publicCheckoutPage.invalidTokenBody')}
          </p>
          <a href="/" className="inline-block px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900">
            {t('publicCheckoutPage.goHome')}
          </a>
        </div>
      </div>
    );
  }

  // Verification gate: show popup until verified / existing user / skip
  if (verifyStatus === 'idle' || verifyStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <LoadingSpinner size="lg" text={t('publicCheckoutPage.verifyingAccess')} />
      </div>
    );
  }

  if (verifyStatus === 'show_message') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('publicCheckoutPage.noticeTitle')}</h2>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">{verifyInfoMessage || t('publicCheckoutPage.noMessage')}</p>
          <p className="text-xs text-gray-500">{t('publicCheckoutPage.notMovedToAnotherPage')}</p>
        </div>
      </div>
    );
  }

  if (verifyStatus === 'needs_input' || verifyStatus === 'otp_sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('publicCheckoutPage.verifyToContinue')}</h2>
          {verifyStatus === 'needs_input' && verifyInfoMessage ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">{verifyInfoMessage}</p>
          ) : verifyStatus === 'needs_input' ? (
            <p className="text-sm text-gray-600 mb-4">{t('publicCheckoutPage.enterEmailToView')}</p>
          ) : null}
          {verifyStatus === 'needs_input' ? (
            <>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('publicCheckoutPage.emailLabel')}</label>
                  <input
                    type="email"
                    value={verifyEmail}
                    onChange={(e) => setVerifyEmail(e.target.value)}
                    placeholder={t('publicCheckoutPage.emailPlaceholder')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {verifyError && <p className="text-sm text-red-600 mb-2">{verifyError}</p>}
              <button onClick={handleVerifySubmit} disabled={verifySending} className="w-full py-2 rounded-lg bg-[#2731db] text-white font-medium disabled:opacity-50">
                {verifySending ? t('publicCheckoutPage.sending') : t('publicCheckoutPage.continue')}
              </button>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('publicCheckoutPage.enterOtpLabel')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyOtp}
                  onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('publicCheckoutPage.otpPlaceholder')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {verifyError && <p className="text-sm text-red-600 mb-2">{verifyError}</p>}
              <button onClick={handleVerifyOtpSubmit} disabled={verifySending} className="w-full py-2 rounded-lg bg-[#2731db] text-white font-medium disabled:opacity-50 mb-2">
                {verifySending ? t('publicCheckoutPage.verifying') : t('publicCheckoutPage.verify')}
              </button>
              <button type="button" onClick={handleResendOtp} disabled={verifySending} className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">
                {t('publicCheckoutPage.resendOtp')}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text={t('publicCheckoutPage.loadingAlbums')} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicCheckoutPage.unableLoadAlbumsTitle')}</h1>
          <p className="text-gray-600 text-sm">{t('publicCheckoutPage.unableLoadAlbumsBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center">
            <FaImages className="mr-3 text-[#2731db]" />
            {t('publicCheckoutPage.pageTitle')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('publicCheckoutPage.pageSubtitle')}
          </p>
        </header>

        {/* Summary / Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('publicCheckoutPage.selectedImages')}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {allSelectedImages.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('publicCheckoutPage.totalAmount')}</p>
                <p className="text-2xl font-semibold text-green-600">
                  {totalAmount ? `₹${totalAmount}` : '₹0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('publicCheckoutPage.pricing')}</p>
                <p className="text-sm font-medium text-[#2731db]">
                  {(() => {
                    // Check if any album has all images selected with perAlbumPrice
                    let hasFullAlbum = false;
                    let albumPrice = 0;
                    
                    selectedAlbums.forEach(albumId => {
                      const album = albums.find(a => a.id === albumId);
                      if (album) {
                        const albumImageIds = selectedImages.get(albumId) || new Set();
                        const albumImages = album.images || [];
                        const allSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;
                        if (allSelected && album.perAlbumPrice && album.perAlbumPrice > 0) {
                          hasFullAlbum = true;
                          albumPrice = album.perAlbumPrice;
                        }
                      }
                    });
                    
                    if (hasFullAlbum) {
                      return t('publicCheckoutPage.perAlbum', { price: albumPrice });
                    }
                    
                    // Check for perPhotoPrice from albums
                    let photoPrice = 0;
                    selectedAlbums.forEach(albumId => {
                      const album = albums.find(a => a.id === albumId);
                      if (album && album.perPhotoPrice && album.perPhotoPrice > 0) {
                        photoPrice = album.perPhotoPrice;
                      }
                    });
                    
                    if (photoPrice > 0) {
                      return t('publicCheckoutPage.perImage', { price: photoPrice });
                    }
                    
                    // Fallback to UPI settings or default
                    const priceToShow = defaultPerPhotoPrice > 0 ? defaultPerPhotoPrice : PRICE_PER_IMAGE;
                    return priceToShow > 0 ? t('publicCheckoutPage.perImage', { price: priceToShow }) : t('publicCheckoutPage.free');
                  })()}
                </p>
              </div>
            </div>

            {allSelectedImages.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">{t('publicCheckoutPage.selectForQr')}</p>
              </div>
            )}
          </div>

          {/* QR / Payment Panel */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col items-center justify-center">
            {downloadCode || loadingDownloadCode || downloadCodeData ? (
              // Don't show QR when download code is present
              loadingDownloadCode ? (
                <div className="text-center text-gray-500">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2731db] border-t-transparent mx-auto mb-3"></div>
                  <p className="text-sm">{t('publicCheckoutPage.verifyingDownloadCode')}</p>
                </div>
              ) : downloadCodeData && isPaid ? (
              <div className="text-center w-full">
                <FaCheckCircle className="mx-auto mb-3 text-5xl text-green-600" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('publicCheckoutPage.paymentConfirmedTitle')}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('publicCheckoutPage.downloadCodeVerifiedBody')}
                </p>
                {downloadCodeData.downloadCode && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-500 mb-1">{t('publicCheckoutPage.downloadCodeLabel')}</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">{downloadCodeData.downloadCode}</p>
                  </div>
                )}
                <div className="w-full mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 flex items-center justify-center">
                    <FaCheckCircle className="mr-2" /> {t('publicCheckoutPage.downloadsUnlockedClick')}
                  </p>
                </div>
              </div>
              ) : (
                <div className="text-center text-gray-500">
                  <FaQrcode className="mx-auto mb-3 text-4xl" />
                  <p className="text-sm">{t('publicCheckoutPage.processingDownloadCode')}</p>
                </div>
              )
            ) : !showQr || !qrData ? (
              <div className="text-center text-gray-500">
                <FaQrcode className="mx-auto mb-3 text-4xl" />
                <p className="text-sm">{t('publicCheckoutPage.selectForQrShort')}</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <FaQrcode className="mr-2 text-[#2731db]" />
                  {t('publicCheckoutPage.scanToPay')}
                </h3>
                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 mb-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}`}
                    alt={t('publicCheckoutPage.paymentQrAlt')}
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-sm text-gray-600 text-center mb-3">
                  {t('publicCheckoutPage.amountForPhotos', { amount: totalAmount, count: allSelectedImages.length })}
                </p>
                {paymentChecking && !isPaid && (
                  <div className="w-full mt-3 space-y-2">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                        {t('publicCheckoutPage.waitingPaymentConfirmation')}
                      </p>
                    </div>
                  </div>
                )}
                {isPaid && (
                  <div className="w-full mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 flex items-center justify-center">
                      <FaCheckCircle className="mr-2" /> {t('publicCheckoutPage.paymentConfirmedUnlocked')}
                    </p>
                  </div>
                )}
                {!isPaid && allSelectedImages.length > 0 && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    {t('publicCheckoutPage.submitPaymentApproval')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Albums List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('publicCheckoutPage.selectAlbumsImagesTitle')}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {t('publicCheckoutPage.selectAlbumsImagesHint')}
              </p>
            </div>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2731db] text-white hover:bg-blue-700 transition-colors"
              title={t('publicCheckoutPage.reloadTitle')}
            >
              <FaRedoAlt className="text-sm" />
              <span className="text-sm font-medium">{t('publicCheckoutPage.reload')}</span>
            </button>
          </div>

          {albums.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaImages className="mx-auto mb-3 text-4xl" />
              <p className="text-lg font-medium mb-2">
                {effectiveHasValidAlbumId && !isLoading ? t('publicCheckoutPage.albumNotFound') : t('publicCheckoutPage.noAlbumsAvailable')}
              </p>
              <p className="text-sm">
                {effectiveHasValidAlbumId && !isLoading
                  ? t('publicCheckoutPage.albumInvalidHint')
                  : t('publicCheckoutPage.checkLinkOrPhotographer')}
              </p>
            </div>
          ) : (
            <>
            <div className="space-y-3">
              {albums.map((album) => {
                const isSelected = selectedAlbums.has(album.id);
                const isExpanded = expandedAlbums.has(album.id);
                const albumImageIds = selectedImages.get(album.id) || new Set<number>();
                const albumImages = album.images || [];
                const allSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;

                return (
                  isSelected && <div
                    key={album.id}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      isSelected ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50' : 'border-gray-200'
                    }`}
                  >
                    {/* Album Header */}
                     <div className="flex items-center justify-between p-4 bg-white">
                      <div className="flex items-center space-x-4 flex-1">
                        <button
                          onClick={() => toggleAlbum(album.id)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-[#2731db] border-[#2731db]' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <FaCheck className="text-white text-xs" />}
                        </button>
                        
                         <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {album.coverImageUrl ? (
                            <img
                              src={album.coverImageUrl}
                              alt={album.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <FaFolder className="text-2xl text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{album.name}</h3>
                          {album.description && (
                            <p className="text-sm text-gray-500">{album.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span>{t('publicCheckoutPage.imagesCount', { n: albumImages.length })}</span>
                            {albumImageIds.size > 0 && (
                              <span className="text-[#2731db] font-medium">
                                {t('publicCheckoutPage.selectedCount', { n: albumImageIds.size })}
                              </span>
                            )}
                            {album.perAlbumPrice && album.perAlbumPrice > 0 && (
                              <span className="text-green-600 font-semibold">
                                {t('publicCheckoutPage.perAlbumPrice', { price: album.perAlbumPrice })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleAlbumExpand(album.id)}
                        className="ml-4 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                      >
                        <FaChevronRight
                          className={`text-gray-400 transition-transform duration-200 ${
                            isExpanded ? 'transform rotate-90' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Album Images (shown when expanded) - Show 20 at a time, then "Load more" */}
                    {isExpanded && albumImages.length > 0 && (() => {
                      const showCount = albumImagesShownCount.get(album.id) ?? IMAGES_PAGE_SIZE;
                      const visibleImages = albumImages.slice(0, showCount);
                      const hasMore = albumImages.length > showCount;
                      return (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {isSelected ? t('publicCheckoutPage.selectedImagesFullAlbum') : t('publicCheckoutPage.albumImages')}
                            {isSelected && albumImageIds.size > 0 && (
                              <span className="ml-2 text-[#2731db] font-medium">
                                {t('publicCheckoutPage.selectedOfTotal', { selected: albumImageIds.size, total: albumImages.length })}
                              </span>
                            )}
                          </h4>
                          {  !isPaid && isSelected && !allSelected && (
                            <button
                              onClick={() => selectAllImagesInAlbum(album.id)}
                              className="text-xs text-[#2731db] hover:underline"
                            >
                              {t('publicCheckoutPage.selectAll')}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                          {visibleImages.map((image, imageIndex) => {
                              const isImageSelected = albumImageIds.has(image.id);
                              const imageUrl = getImageUrl(image);
                              const thumbUrl = getThumbnailUrl(image);
                              const filename = getImageFilename(image);
                              const fileType = getFileType(image);
                              const canView = (thumbUrl || imageUrl) && fileType.match(/^(png|jpg|jpeg|gif|webp)$/i);
                              
                              const imagePrice = album.perPhotoPrice && album.perPhotoPrice > 0
                                ? album.perPhotoPrice
                                : (defaultPerPhotoPrice > 0 ? defaultPerPhotoPrice : PRICE_PER_IMAGE);
                              const allImagesSelected = albumImages.length > 0 && albumImageIds.size === albumImages.length;

                              return (
                                <div
                                  key={image.id}
                                  className={`relative rounded-lg overflow-hidden border cursor-pointer transition-all ${
                                    isImageSelected
                                      ? 'border-[#2731db] ring-2 ring-[#2731db] ring-opacity-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                  onClick={() => {
                                    if (!isSelected) {
                                      toggleAlbum(album.id);
                                      setTimeout(() => toggleImageSelection(album.id, image.id), 0);
                                    } else {
                                      toggleImageSelection(album.id, image.id);
                                    }
                                  }}
                                >
                                  <div className="aspect-square bg-gray-100 overflow-hidden relative">
                                    {canView ? (
                                      <>
                                        <img
                                          src={(thumbUrl || imageUrl)!}
                                          alt={filename}
                                          className="w-full h-full object-cover"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openFullscreenImage(album.id, imageIndex);
                                          }}
                                        />
                                        <div className="absolute top-2 left-2">
                                          <div
                                            className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                              isImageSelected
                                                ? 'bg-[#2731db] border-[#2731db] text-white'
                                                : 'bg-white/90 border-gray-400'
                                            }`}
                                          >
                                            {isImageSelected && <FaCheck className="text-xs" />}
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openFullscreenImage(album.id, imageIndex);
                                          }}
                                          className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                                          title={t('publicCheckoutPage.viewFullScreen')}
                                        >
                                          <FaExpandArrowsAlt className="text-sm" />
                                        </button>
                                      </>
                                    ) : (
                                      <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                                        {fileType.toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-2 bg-white">
                                    <p className="text-xs text-gray-900 truncate" title={filename}>
                                      {filename}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">{fileType.toUpperCase()}</p>
                                    <div className="mt-2 flex items-center justify-between">
                                      <span className="text-xs text-gray-500">
                                        {allImagesSelected && album.perAlbumPrice && album.perAlbumPrice > 0
                                          ? t('publicCheckoutPage.albumPriceLabel', { price: album.perAlbumPrice })
                                          : imagePrice > 0 ? t('publicCheckoutPage.perImageRupee', { price: imagePrice }) : t('publicCheckoutPage.free')}
                                      </span>
                                      {(isPaid || downloadCodeData) && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(image);
                                          }}
                                          className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700"
                                        >
                                          <FaDownload className="mr-1" /> {t('publicCheckoutPage.download')}
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
                                next.set(album.id, (prev.get(album.id) ?? IMAGES_PAGE_SIZE) + IMAGES_PAGE_SIZE);
                                return next;
                              })}
                              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              {t('publicCheckoutPage.loadMoreRemaining', { remaining: albumImages.length - showCount })}
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
                <LoadingSpinner size="md" text={t('publicCheckoutPage.loadingMore')} />
              </div>
            )}
            </>
          )}
        </div>

        {/* Full-screen image view modal */}
        {fullscreenImage && (
          <div
            className="fixed inset-0 z-[10050] bg-black/95 flex items-center justify-center p-4"
            onClick={closeFullscreenImage}
            role="dialog"
            aria-modal="true"
            aria-label={t('publicCheckoutPage.fullscreenDialogLabel')}
          >
            <button
              type="button"
              onClick={closeFullscreenImage}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              aria-label={t('publicCheckoutPage.close')}
            >
              <FaTimes className="text-xl" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrevFullscreenImage();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white text-blue-600 shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center"
              aria-label={t('publicCheckoutPage.previousImage')}
            >
              <FaChevronLeft className="text-lg" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNextFullscreenImage();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white text-blue-600 shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center"
              aria-label={t('publicCheckoutPage.nextImage')}
            >
              <FaChevronRight className="text-lg" />
            </button>
            <div
              className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {getImageUrl(fullscreenImage) ? (
                <img
                  src={getImageUrl(fullscreenImage)!}
                  alt={getImageFilename(fullscreenImage)}
                  className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p className="text-white">{t('publicCheckoutPage.imageNotAvailable')}</p>
              )}
            </div>
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm truncate max-w-[90vw]">
              {getImageFilename(fullscreenImage)}
            </p>
          </div>
        )}

        {/* Payment Verification Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FaQrcode className="mr-2 text-[#2731db]" />
                  {t('publicCheckoutPage.modalSubmitPayment')}
                </h2>
                <button
                  onClick={handleCloseModal}
                  disabled={submittingPayment}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Payment Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">{t('publicCheckoutPage.paymentSummary')}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 font-medium">
                      {t('publicCheckoutPage.photoCount', { count: allSelectedImages.length })}
                    </span>
                    <span className="text-lg font-bold text-green-600">₹{totalAmount}</span>
                  </div>
                </div>

                {/* UTR Number Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('publicCheckoutPage.utrNumberLabel')} <span className="text-red-500">{t('publicCheckoutPage.required')}</span>
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder={t('publicCheckoutPage.utrPlaceholder')}
                    disabled={submittingPayment}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2731db] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('publicCheckoutPage.utrHint')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('publicCheckoutPage.emailAddressLabel')}<span className="text-red-500">{t('publicCheckoutPage.required')}</span>
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('publicCheckoutPage.emailModalPlaceholder')}
                    disabled={submittingPayment}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2731db] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('publicCheckoutPage.emailModalHint')}
                  </p>
                </div>

                {/* Payment Screenshot Upload */}
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Screenshot
                  </label>
                  <div className="space-y-3">
                    {screenshotPreview ? (
                      <div className="relative">
                        <img
                          src={screenshotPreview}
                          alt="Payment screenshot preview"
                          className="w-full h-48 object-contain border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentScreenshot(null);
                            setScreenshotPreview(null);
                          }}
                          disabled={submittingPayment}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <FaUpload className="text-3xl text-gray-400 mb-2" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          disabled={submittingPayment}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div> */}

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700 mb-2">
                    <strong>{t('publicCheckoutPage.noteApprovalEmail')}</strong> {t('publicCheckoutPage.noteApprovalBody')}
                  </p>
                  <p className="text-xs text-blue-700">
                    <strong>{t('publicCheckoutPage.approvalProcess')}</strong> {t('publicCheckoutPage.approvalProcessBody')}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={handleCloseModal}
                  disabled={submittingPayment}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {t('publicCheckoutPage.cancel')}
                </button>
                <button
                  onClick={handleSubmitPayment}
                  // disabled={submittingPayment || !utrNumber.trim() || !paymentScreenshot}
                  className="px-4 py-2 bg-[#2731db] text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submittingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      {t('publicCheckoutPage.submittingForApproval')}
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="mr-1" />
                      {t('publicCheckoutPage.submitForApproval')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicCheckoutPage;
