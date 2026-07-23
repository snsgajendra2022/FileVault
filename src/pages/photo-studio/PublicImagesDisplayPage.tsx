import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, Link } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { FaImages, FaDownload, FaExclamationTriangle, FaTimes, FaExpandArrowsAlt, FaChevronLeft, FaChevronRight, FaSpinner } from 'react-icons/fa';
import api from '../../api/client/axiosInstance';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { downloadSingleImage, downloadImagesAsZip } from '../../utils/downloadUtils';
import HlsVideoPlayer from '../../components/video/HlsVideoPlayer';
import { isVideoMediaItem, resolveVideoPlayback } from '../../utils/videoPlayback';

interface DisplayImage {
  id: number;
  originalFilename?: string;
  filename?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  uploadTime?: string;
  fileType?: string;
  [key: string]: unknown;
}

const IMAGES_PAGE_SIZE = 20;

const PublicImagesDisplayPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const queryClient = useQueryClient();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const tokenParam = searchParams.get('token') || '';
  const imageIdsParam = searchParams.get('imageIds') || '';
  const albumTokenParam = searchParams.get('albumToken') || '';
  const viewerTokenParam = searchParams.get('t') || '';
  const shareIdParam = searchParams.get('shareId') || '';
  const sidParam = searchParams.get('sid') || '';
  const shareId = shareIdParam ? parseInt(shareIdParam, 10) : undefined;
  const validShareId = shareId != null && !isNaN(shareId) && shareId > 0 ? shareId : undefined;

  // Prevent flicker: only show spinner while async params (sid/albumToken) are resolving.
  // For direct token+imageIds links the params are synchronously available — no delay needed.
  const needsAsyncResolution = !!(sidParam.trim() || albumTokenParam.trim());
  const [isCheckingParams, setIsCheckingParams] = useState(needsAsyncResolution);
  useEffect(() => {
    if (!needsAsyncResolution) return;
    // Will be cleared once sidLoading / albumTokenLoading settle (see below)
  }, [needsAsyncResolution]);

  type ResolvedFromSid = { token: string; imageIds: number[] };
  const [resolvedFromSid, setResolvedFromSid] = useState<ResolvedFromSid | null>(null);
  const [sidLoading, setSidLoading] = useState(false);
  const [sidError, setSidError] = useState(false);

  type ResolvedFromAlbumToken = { imageIds: number[] };
  const [resolvedFromAlbumToken, setResolvedFromAlbumToken] = useState<ResolvedFromAlbumToken | null>(null);
  const [albumTokenLoading, setAlbumTokenLoading] = useState(false);
  const [albumTokenError, setAlbumTokenError] = useState(false);
  const [albumTokenForbidden, setAlbumTokenForbidden] = useState(false);

  type VerifyStatus = 'idle' | 'checking' | 'show_message' | 'needs_input' | 'otp_sent' | 'verified';
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyInfoMessage, setVerifyInfoMessage] = useState('');
  const [verifyUserId, setVerifyUserId] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!sidParam.trim()) {
      setResolvedFromSid(null);
      setSidError(false);
      return;
    }
    let cancelled = false;
    setSidLoading(true);
    setSidError(false);
    api
      .get<{ token?: string; imageIds?: number[] }>(`/api/public/share-link/${encodeURIComponent(sidParam)}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        const tokenVal = data?.token ?? '';
        const imageIdsVal = Array.isArray(data?.imageIds)
          ? data.imageIds
              .map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
              .filter((id) => !isNaN(id))
          : [];
        setResolvedFromSid({ token: tokenVal, imageIds: imageIdsVal });
      })
      .catch(() => {
        if (!cancelled) {
          setSidError(true);
          setResolvedFromSid(null);
        }
      })
      .finally(() => {
        if (!cancelled) { setSidLoading(false); setIsCheckingParams(false); }
      });
    return () => {
      cancelled = true;
    };
  }, [sidParam]);

  useEffect(() => {
    if (!albumTokenParam.trim()) {
      setResolvedFromAlbumToken(null);
      setAlbumTokenError(false);
      setAlbumTokenForbidden(false);
      return;
    }
    // If this is an albumToken link without viewer token `t`,
    // we require OTP confirmation (shareId) before resolving.
    if (!viewerTokenParam.trim() && verifyStatus !== 'verified') {
      setResolvedFromAlbumToken(null);
      setAlbumTokenError(false);
      setAlbumTokenForbidden(false);
      return;
    }
    let cancelled = false;
    setAlbumTokenLoading(true);
    setAlbumTokenError(false);
    setAlbumTokenForbidden(false);
    api
      .get<{ imageIds?: number[] }>(`/api/public/albums/resolve`, {
        params: {
          albumToken: albumTokenParam.trim(),
          t: viewerTokenParam.trim() || undefined,
          shareId: !viewerTokenParam.trim() && validShareId != null ? validShareId : undefined,
        },
      })
      .then((res) => {
        if (cancelled) return;
        const ids = Array.isArray(res.data?.imageIds)
          ? res.data.imageIds
              .map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
              .filter((id) => !isNaN(id))
          : [];
        setResolvedFromAlbumToken({ imageIds: ids });
      })
      .catch((err: any) => {
        if (!cancelled) {
          const status = err?.response?.status;
          if (status === 403) setAlbumTokenForbidden(true);
          setAlbumTokenError(true);
          setResolvedFromAlbumToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) { setAlbumTokenLoading(false); setIsCheckingParams(false); }
      });
    return () => {
      cancelled = true;
    };
  }, [albumTokenParam, viewerTokenParam, validShareId, verifyStatus]);

  const effectiveToken = resolvedFromSid?.token ?? tokenParam;
  const effectiveImageIds = useMemo(() => {
    const fromAlbumToken = resolvedFromAlbumToken?.imageIds?.length ? resolvedFromAlbumToken.imageIds : [];
    const fromSid = resolvedFromSid?.imageIds?.length ? resolvedFromSid.imageIds : [];
    const fromUrl = imageIdsParam.trim()
      ? imageIdsParam
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id))
      : [];
    if (fromAlbumToken.length > 0) return fromAlbumToken;
    return fromSid.length > 0 ? fromSid : fromUrl;
  }, [resolvedFromAlbumToken?.imageIds, resolvedFromSid?.imageIds, imageIdsParam]);

  const idsFromUrl = useMemo(() => {
    const param = searchParams.get('imageIds') || '';
    if (!param.trim()) return [];
    return param
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));
  }, [searchParams]);

  const bulkIds = idsFromUrl.length > 0 ? idsFromUrl : effectiveImageIds;
  const bulkIdsQuery = bulkIds.join(',');

  const hasValidInput = !!(effectiveToken.trim() && (effectiveImageIds.length > 0 || idsFromUrl.length > 0));

  const verifyStorageKey = useMemo(
    () => `public_images_display_verified_${effectiveToken.slice(0, 24)}`,
    [effectiveToken]
  );
  const [fullscreenImage, setFullscreenImage] = useState<DisplayImage | null>(null);
  const [sliderIndex, setSliderIndex] = useState<number>(0);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!effectiveToken) return;
    if (sidParam && resolvedFromSid == null && !sidError) return;
    if (albumTokenParam && resolvedFromAlbumToken == null && !albumTokenError) return;
    // Don’t overwrite the UI step while user is in OTP flow.
    if (verifyStatus === 'otp_sent' || verifyStatus === 'show_message' || verifyStatus === 'verified') return;
    const stored = sessionStorage.getItem(verifyStorageKey);
    if (stored === '1') {
      setVerifyStatus('verified');
      queryClient.invalidateQueries({ queryKey: ['publicImagesDisplayBulk'] });
      return;
    }
    if (validShareId == null) {
      setVerifyStatus('verified');
      queryClient.invalidateQueries({ queryKey: ['publicImagesDisplayBulk'] });
      return;
    }
    setVerifyStatus('needs_input');
  }, [effectiveToken, verifyStorageKey, validShareId, sidParam, resolvedFromSid, sidError, albumTokenParam, resolvedFromAlbumToken, albumTokenError, queryClient, verifyStatus]);

  const handleVerifySubmit = async () => {
    const email = verifyEmail.trim();
    if (!email) {
      setVerifyError(t('publicImagesDisplay.enterEmail'));
      return;
    }
    setVerifyError('');
    setVerifySending(true);
    try {
      const checkRes = await api.post<{
        isExistingUser?: boolean;
        existingUser?: boolean;
        sendNotification?: boolean;
        message?: string;
      }>('/api/public-verify/check-user', {
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
        toast.success(t('publicImagesDisplay.otpSentCheckEmail'));
        return;
      }
      await api.post('/api/public-verify/send-otp', {
        email: email || undefined,
        channel: 'email',
        linkId: effectiveToken,
        ...(validShareId != null ? { id: validShareId } : {}),
      });
      setVerifyStatus('otp_sent');
      setVerifyOtp('');
      toast.success(t('publicImagesDisplay.otpSentCheckEmail'));
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number } };
      if (ax.response?.status === 404 || ax.response?.status === 501) {
        sessionStorage.setItem(verifyStorageKey, '1');
        setVerifyStatus('verified');
        toast.success(t('publicImagesDisplay.verificationSkipped'));
      } else {
        setVerifyError(t('publicImagesDisplay.genericError'));
      }
    } finally {
      setVerifySending(false);
    }
  };

  // UX: when OTP is sent, jump to OTP confirmation step.
  useEffect(() => {
    if (verifyStatus !== 'otp_sent') return;
    // Let the OTP input render first, then focus.
    const id = window.setTimeout(() => {
      try {
        otpInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        otpInputRef.current?.focus();
      } catch {}
    }, 50);
    return () => window.clearTimeout(id);
  }, [verifyStatus]);

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
        toast.success(t('publicImagesDisplay.otpSentAgain'));
      } catch {
        setVerifyError(t('publicImagesDisplay.failedResendOtp'));
      } finally {
        setVerifySending(false);
      }
    } else {
      handleVerifySubmit();
    }
  };

  const handleVerifyOtpSubmit = async () => {
    if (!verifyOtp.trim()) {
      setVerifyError(t('publicImagesDisplay.enterOtpError'));
      return;
    }
    setVerifyError('');
    setVerifySending(true);
    try {
      const email = verifyEmail.trim();
      const res = await api.post<{ success?: boolean }>('/api/public-verify/verify-otp', {
        ...(verifyUserId
          ? { userId: verifyUserId }
          : { email: email || undefined }),
        otp: verifyOtp.trim(),
        linkId: effectiveToken,
        ...(validShareId != null ? { id: validShareId } : {}),
      });
      if (res.data?.success) {
        sessionStorage.setItem(verifyStorageKey, '1');
        setVerifyStatus('verified');
        toast.success(t('publicImagesDisplay.verifiedLoading'));
        queryClient.invalidateQueries({ queryKey: ['publicImagesDisplayBulk'] });
      } else {
        setVerifyError(t('publicImagesDisplay.invalidOtp'));
      }
    } catch {
      setVerifyError(t('publicImagesDisplay.invalidOtp'));
    } finally {
      setVerifySending(false);
    }
  };

  const hasToken = effectiveToken.trim().length > 0;
  const hasIds = bulkIds.length > 0 && bulkIdsQuery.length > 0;
  const allOkToCallBulk = verifyStatus === 'verified' && hasToken && hasIds;

  const {
    data: bulkData,
    isLoading: bulkLoading,
    isError: bulkError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['publicImagesDisplayBulk', effectiveToken, bulkIdsQuery, verifyStatus],
    queryFn: async ({ pageParam }) => {
      const start = pageParam * IMAGES_PAGE_SIZE;
      const chunk = bulkIds.slice(start, start + IMAGES_PAGE_SIZE);
      if (chunk.length === 0) return [];
      const ids = chunk.join(',');
      const res = await api.get<DisplayImage[] | { images?: DisplayImage[] }>('/api/images/bulk', {
        params: { ids, token: effectiveToken },
      });
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === 'object' && Array.isArray((raw as { images?: DisplayImage[] }).images)) {
        return (raw as { images: DisplayImage[] }).images;
      }
      return [];
    },
    initialPageParam: 0,
    getNextPageParam: (_lastPage, allPages) => {
      const loadedCount = allPages.reduce((acc, p) => acc + (Array.isArray(p) ? p.length : 0), 0);
      return loadedCount < bulkIds.length ? allPages.length : undefined;
    },
    enabled: allOkToCallBulk,
    retry: 1,
  });

  const images = useMemo(() => {
    if (!bulkData?.pages) return [];
    return bulkData.pages.flatMap((p) => (Array.isArray(p) ? p : []));
  }, [bulkData]);

  // Infinite scroll: load more when sentinel is visible
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage || !allOkToCallBulk) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, allOkToCallBulk]);

  const getImageFilename = (img: DisplayImage) =>
    img.originalFilename || img.filename || t('publicImagesDisplay.defaultImageName');
  const getThumbnailUrl = (img: DisplayImage) =>
    img.thumbnailUrl || img.previewUrl || img.downloadUrl || null;
  const getImageUrl = (img: DisplayImage) => img.previewUrl || img.downloadUrl || null;
  const getFileType = (img: DisplayImage) => {
    const name = getImageFilename(img);
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return ext || (img.fileType as string) || 'unknown';
  };

  const handleDownload = (img: DisplayImage) => {
    const url = getImageUrl(img);
    if (!url) {
      toast.error(t('publicImagesDisplay.downloadNotAvailable'));
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = getImageFilename(img);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open slider at a specific index
  const openSlider = useCallback((img: DisplayImage) => {
    const idx = images.findIndex((i) => i.id === img.id);
    setSliderIndex(idx >= 0 ? idx : 0);
    setFullscreenImage(img);
  }, [images]);

  const sliderPrev = useCallback(() => {
    if (images.length === 0) return;
    const newIdx = (sliderIndex - 1 + images.length) % images.length;
    setSliderIndex(newIdx);
    setFullscreenImage(images[newIdx]);
  }, [images, sliderIndex]);

  const sliderNext = useCallback(() => {
    if (images.length === 0) return;
    const newIdx = (sliderIndex + 1) % images.length;
    setSliderIndex(newIdx);
    setFullscreenImage(images[newIdx]);
  }, [images, sliderIndex]);

  // Keyboard navigation for slider
  useEffect(() => {
    if (!fullscreenImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') sliderPrev();
      else if (e.key === 'ArrowRight') sliderNext();
      else if (e.key === 'Escape') setFullscreenImage(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [fullscreenImage, sliderPrev, sliderNext]);

  // Force-download a single image as blob
  const handleForceDownload = useCallback(async (img: DisplayImage) => {
    const url = img.downloadUrl || img.previewUrl || null;
    if (!url) { toast.error(t('publicImagesDisplay.downloadNotAvailable')); return; }
    setDownloadingId(img.id);
    try {
      await downloadSingleImage(url, getImageFilename(img));
    } catch {
      toast.error(t('publicImagesDisplay.downloadNotAvailable'));
    } finally {
      setDownloadingId(null);
    }
  }, [t]);

  // Download all images as ZIP
  const handleDownloadAll = useCallback(async () => {
    if (images.length === 0) return;
    setIsDownloadingAll(true);
    try {
      await downloadImagesAsZip(images, 'shared-photos');
      toast.success(`Downloaded ${images.length} photos`);
    } catch {
      toast.error('Failed to download photos');
    } finally {
      setIsDownloadingAll(false);
    }
  }, [images]);

  if (isCheckingParams) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-[#2731db] animate-spin" />
        <p className="text-sm text-gray-500 font-medium">{t('publicImagesDisplay.loading')}</p>
      </div>
    );
  }

  if (!hasValidInput && !sidParam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicImagesDisplay.incompleteLink')}</h1>
          <p className="text-gray-600 text-sm mb-4">
            {t('publicImagesDisplay.incompleteHint')}
          </p>
          <Link to="/" className="inline-block px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900">
            {t('publicImagesDisplay.goHome')}
          </Link>
        </div>
      </div>
    );
  }

  if (sidParam && sidLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (albumTokenParam && albumTokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (sidParam && sidError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicImagesDisplay.invalidExpired')}</h1>
          <p className="text-gray-600 text-sm">{t('publicImagesDisplay.linkNotLoaded')}</p>
        </div>
      </div>
    );
  }

  if (albumTokenParam && albumTokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicImagesDisplay.invalidExpired')}</h1>
          <p className="text-gray-600 text-sm">
            {albumTokenForbidden ? 'Access denied for this link.' : t('publicImagesDisplay.linkNotLoaded')}
          </p>
        </div>
      </div>
    );
  }

  if (verifyStatus === 'idle' || verifyStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text={t('publicImagesDisplay.loading')} />
      </div>
    );
  }

  if (verifyStatus === 'show_message') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('publicImagesDisplay.notice')}</h2>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            {verifyInfoMessage?.trim() ? verifyInfoMessage : t('publicImagesDisplay.noMessage')}
          </p>
        </div>
      </div>
    );
  }

  if (verifyStatus === 'needs_input' || verifyStatus === 'otp_sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('publicImagesDisplay.verifyToContinue')}</h2>
          {verifyStatus === 'needs_input' ? (
            <>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('publicImagesDisplay.email')}</label>
                  <input
                    type="email"
                    value={verifyEmail}
                    onChange={(e) => setVerifyEmail(e.target.value)}
                    placeholder={t('publicImagesDisplay.emailPlaceholder')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {verifyError && <p className="text-sm text-red-600 mb-2">{verifyError}</p>}
              <button
                onClick={handleVerifySubmit}
                disabled={verifySending}
                className="w-full py-2 rounded-lg bg-[#2731db] text-white font-medium disabled:opacity-50"
              >
                {verifySending ? t('publicImagesDisplay.sending') : t('publicImagesDisplay.continue')}
              </button>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('publicImagesDisplay.enterOtp')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyOtp}
                  onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('publicImagesDisplay.otpPlaceholder')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  ref={otpInputRef}
                />
              </div>
              {verifyError && <p className="text-sm text-red-600 mb-2">{verifyError}</p>}
              <button
                onClick={handleVerifyOtpSubmit}
                disabled={verifySending}
                className="w-full py-2 rounded-lg bg-[#2731db] text-white font-medium disabled:opacity-50 mb-2"
              >
                {verifySending ? t('publicImagesDisplay.verifying') : t('publicImagesDisplay.verify')}
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={verifySending}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                {t('publicImagesDisplay.resendOtp')}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (verifyStatus === 'verified' && bulkLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text={t('publicImagesDisplay.loadingImages')} />
      </div>
    );
  }

  if (verifyStatus === 'verified' && bulkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
          <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-red-500" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('publicImagesDisplay.unableLoad')}</h1>
          <p className="text-gray-600 text-sm">{t('publicImagesDisplay.linkInvalidExpired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FaImages className="mr-3 text-[#2731db]" />
                {t('publicImagesDisplay.titleSelected')}
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">
                {t('publicImagesDisplay.photoCount', { count: images.length })}
              </p>
            </div>
            {images.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={isDownloadingAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2731db] text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {isDownloadingAll ? (
                  <FaSpinner className="h-4 w-4 animate-spin" />
                ) : (
                  <FaDownload className="h-4 w-4" />
                )}
                {isDownloadingAll ? 'Downloading...' : `Download All (${images.length})`}
              </button>
            )}
          </div>
        </header>

        <main className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          {!allOkToCallBulk && bulkIds.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FaImages className="mx-auto mb-3 text-4xl" />
              <p className="text-lg font-medium mb-2">{t('publicImagesDisplay.noImageIds')}</p>
              <p className="text-sm">{t('publicImagesDisplay.noImageIdsHint')}</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FaImages className="mx-auto mb-3 text-4xl" />
              <p className="text-lg font-medium mb-2">{t('publicImagesDisplay.noImagesFound')}</p>
              <p className="text-sm">{t('publicImagesDisplay.bulkCalledWith', { count: bulkIds.length })}</p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {images.map((img: DisplayImage) => {
                const imageUrl = getImageUrl(img);
                const thumbUrl = getThumbnailUrl(img);
                const filename = getImageFilename(img);
                const fileType = getFileType(img);
                const isVideo = isVideoMediaItem(img);
                const canView = (thumbUrl || imageUrl) && (/^(png|jpg|jpeg|gif|webp)$/i.test(fileType) || isVideo);
                const isDownloadingThis = downloadingId === img.id;
                return (
                  <div
                    key={img.id}
                    className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all relative group"
                  >
                    <div className="h-48 bg-gray-100 overflow-hidden relative">
                      {/* Expand / slide button */}
                      <button
                        type="button"
                        onClick={() => openSlider(img)}
                        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                        title={t('publicImagesDisplay.viewFullScreen')}
                      >
                        <FaExpandArrowsAlt className="text-sm" />
                      </button>
                      {canView ? (
                        isVideo ? (
                          <HlsVideoPlayer
                            source={resolveVideoPlayback(img)}
                            className="w-full h-full object-cover cursor-pointer"
                            controls
                            muted
                            waitForReady={false}
                          />
                        ) : (
                          <img
                            src={(thumbUrl || imageUrl)!}
                            alt={filename}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                            onClick={() => openSlider(img)}
                          />
                        )
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
                      {img.uploadTime && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(img.uploadTime).toLocaleString()}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleForceDownload(img)}
                          disabled={isDownloadingThis}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#2731db] text-white hover:bg-blue-800 disabled:opacity-60"
                        >
                          {isDownloadingThis ? (
                            <FaSpinner className="h-3 w-3 animate-spin" />
                          ) : (
                            <FaDownload className="h-3 w-3" />
                          )}
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={loadMoreSentinelRef} className="h-4" aria-hidden />
            {isFetchingNextPage && (
              <div className="mt-4 flex justify-center py-4">
                <LoadingSpinner size="md" text={t('publicImagesDisplay.loadingMore')} />
              </div>
            )}
            </>
          )}
        </main>

        {/* Image Slider / Lightbox */}
        {fullscreenImage && (
          <div
            className="fixed inset-0 z-[10050] bg-black/95 flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
              <p className="text-white/70 text-sm">
                {sliderIndex + 1} / {images.length}
              </p>
              <p className="text-white text-sm font-medium truncate max-w-[50vw]">
                {getImageFilename(fullscreenImage)}
              </p>
              <div className="flex items-center gap-2">
                {/* Download current image */}
                <button
                  type="button"
                  onClick={() => handleForceDownload(fullscreenImage)}
                  disabled={downloadingId === fullscreenImage.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm disabled:opacity-50"
                  title="Download this photo"
                >
                  {downloadingId === fullscreenImage.id ? (
                    <FaSpinner className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FaDownload className="h-3.5 w-3.5" />
                  )}
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreenImage(null)}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
                  aria-label={t('publicImagesDisplay.close')}
                >
                  <FaTimes className="text-lg" />
                </button>
              </div>
            </div>

            {/* Main image area */}
            <div className="flex-1 flex items-center justify-center relative min-h-0 px-14">
              {/* Prev */}
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={sliderPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center z-10"
                  aria-label="Previous"
                >
                  <FaChevronLeft className="text-lg" />
                </button>
              )}

              <div className="max-w-[85vw] max-h-[80vh] flex items-center justify-center">
                {getImageUrl(fullscreenImage) || fullscreenImage.streamUrl ? (
                  isVideoMediaItem(fullscreenImage) ? (
                    <HlsVideoPlayer
                      key={fullscreenImage.id}
                      source={resolveVideoPlayback(fullscreenImage)}
                      className="max-w-full max-h-[80vh] rounded-lg object-contain"
                      autoPlay
                      controls
                      waitForReady={fullscreenImage.mediaType === 'VIDEO'}
                    />
                  ) : (
                    <img
                      key={fullscreenImage.id}
                      src={getImageUrl(fullscreenImage)!}
                      alt={getImageFilename(fullscreenImage)}
                      className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-lg"
                    />
                  )
                ) : (
                  <p className="text-white">{t('publicImagesDisplay.imageNotAvailable')}</p>
                )}
              </div>

              {/* Next */}
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={sliderNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center z-10"
                  aria-label="Next"
                >
                  <FaChevronRight className="text-lg" />
                </button>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex-shrink-0 flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
                {images.map((img, idx) => {
                  const thumb = getThumbnailUrl(img) || getImageUrl(img);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => { setSliderIndex(idx); setFullscreenImage(img); }}
                      className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === sliderIndex ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                      }`}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/20 flex items-center justify-center text-white text-xs">
                          {idx + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicImagesDisplayPage;
