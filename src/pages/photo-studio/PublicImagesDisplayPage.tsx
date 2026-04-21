import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, Link } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { FaImages, FaDownload, FaExclamationTriangle, FaTimes, FaExpandArrowsAlt } from 'react-icons/fa';
import api from '../../api/client/axiosInstance';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

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
  const shareIdParam = searchParams.get('shareId') || '';
  const sidParam = searchParams.get('sid') || '';
  const shareId = shareIdParam ? parseInt(shareIdParam, 10) : undefined;
  const validShareId = shareId != null && !isNaN(shareId) && shareId > 0 ? shareId : undefined;

  type ResolvedFromSid = { token: string; imageIds: number[] };
  const [resolvedFromSid, setResolvedFromSid] = useState<ResolvedFromSid | null>(null);
  const [sidLoading, setSidLoading] = useState(false);
  const [sidError, setSidError] = useState(false);

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
        if (!cancelled) setSidLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sidParam]);

  const effectiveToken = resolvedFromSid?.token ?? tokenParam;
  const effectiveImageIds = useMemo(() => {
    const fromSid = resolvedFromSid?.imageIds?.length ? resolvedFromSid.imageIds : [];
    const fromUrl = imageIdsParam.trim()
      ? imageIdsParam
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id))
      : [];
    return fromSid.length > 0 ? fromSid : fromUrl;
  }, [resolvedFromSid?.imageIds, imageIdsParam]);

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
  type VerifyStatus = 'idle' | 'checking' | 'show_message' | 'needs_input' | 'otp_sent' | 'verified';
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyInfoMessage, setVerifyInfoMessage] = useState('');
  const [verifyUserId, setVerifyUserId] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<DisplayImage | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!effectiveToken) return;
    if (sidParam && resolvedFromSid == null && !sidError) return;
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
  }, [effectiveToken, verifyStorageKey, validShareId, sidParam, resolvedFromSid, sidError, queryClient]);

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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FaImages className="mr-3 text-[#2731db]" />
            {t('publicImagesDisplay.titleSelected')}
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {t('publicImagesDisplay.photoCount', { count: images.length })}
          </p>
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
                const canView = (thumbUrl || imageUrl) && /^(png|jpg|jpeg|gif|webp|MP4|mp4)$/i.test(fileType);
                return (
                  <div
                    key={img.id}
                    className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all relative"
                  >
                    <div className="h-48 bg-gray-100 overflow-hidden relative">
                      <button
                        type="button"
                        onClick={() => setFullscreenImage(img)}
                        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center"
                        title={t('publicImagesDisplay.viewFullScreen')}
                      >
                        <FaExpandArrowsAlt className="text-sm" />
                      </button>
                      {canView ? (
                        <>
                       {fileType == 'mp4' && <video src={imageUrl}   
                       className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                       controls
                       muted
                       playsInline
                       preload="auto"
                       onClick={() => setFullscreenImage(img)} />}

                       {fileType !== 'mp4' && <img
                        src={(thumbUrl || imageUrl)!}
                        alt={filename}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => setFullscreenImage(img)}
                      />}
                        {/* <img
                          src={(thumbUrl || imageUrl)!}
                          alt={filename}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => setFullscreenImage(img)}
                        /> */}
                        </>
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
                      {/* <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-500">{fileType.toUpperCase()}</span>
                        <button
                          type="button"
                          onClick={() => handleDownload(img)}
                          className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-[#2731db] text-white hover:bg-blue-800"
                        >
                          <FaDownload className="mr-1" /> Download
                        </button>
                      </div> */}
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

        {fullscreenImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t('publicImagesDisplay.fullscreenDialogLabel')}
          >
            <button
              type="button"
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
              aria-label={t('publicImagesDisplay.close')}
            >
              <FaTimes className="text-xl" />
            </button>
            <div
              className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {getImageUrl(fullscreenImage) ? (
                <>
                 <img
                   src={getImageUrl(fullscreenImage)!}
                   alt={getImageFilename(fullscreenImage)}
                   className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
                   onClick={(e) => e.stopPropagation()}
                 />
                </>
              ) : (
                <p className="text-white">{t('publicImagesDisplay.imageNotAvailable')}</p>
              )}
            </div>
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm truncate max-w-[90vw]">
              {getImageFilename(fullscreenImage)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicImagesDisplayPage;
