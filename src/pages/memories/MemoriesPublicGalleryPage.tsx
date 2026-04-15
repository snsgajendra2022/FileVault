import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaCloudUploadAlt, FaHeart, FaImages } from 'react-icons/fa';
import { useMemoriesStore } from '../../features/memories/memoriesStore';
import { loadRemoteMemoriesForPublicGallery } from '../../services/memoriesShareService';
import {
  addMemoriesEventImageComment,
  flattenImagesFromGroups,
  guestUploadToMemoriesEvent,
  likeMemoriesEventImage,
} from '../../services/memoriesService';
import { MemoriesSkeletonGrid } from './components/MemoriesSkeletonGrid';
import { MemoriesLightbox } from './components/MemoriesLightbox';
import type { MemoriesEvent, MemoriesImage } from '../../features/memories/types';
import {
  getMemoriesShareAccessTokenFromSearchParams,
  parseMemoriesGuestShareSearchParams,
} from '../../utils/memoriesGuestShareQuery';
import {
  getMemoriesEventTypePreviewUrls,
  normalizeMemoriesEventType,
  type MemoriesEventTypeId,
} from '../../config/memoriesEventTypes';

const GUEST_EVENT_TYPE_I18N: Record<MemoriesEventTypeId, string> = {
  wedding: 'eventTypeWedding',
  birthday: 'eventTypeBirthday',
  corporate: 'eventTypeCorporate',
  family: 'eventTypeFamily',
  other: 'eventTypeOther',
};

function patchEventImage(
  prev: MemoriesEvent,
  eventId: string,
  imageId: string,
  mapImg: (img: MemoriesImage) => MemoriesImage
): MemoriesEvent {
  if (String(prev.id) !== String(eventId)) return prev;
  if (prev.imageGroups?.length) {
    const imageGroups = prev.imageGroups.map((g) => ({
      ...g,
      images: g.images.map((img) => (img.id === imageId ? mapImg(img) : img)),
    }));
    return {
      ...prev,
      imageGroups,
      images: flattenImagesFromGroups(imageGroups),
    };
  }
  return {
    ...prev,
    images: prev.images.map((img) => (img.id === imageId ? mapImg(img) : img)),
  };
}

/** Public guest gallery — QR / share link. Token required when event is not public. */
const MemoriesPublicGalleryPage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = React.useMemo(
    () => getMemoriesShareAccessTokenFromSearchParams(searchParams),
    [searchParams]
  );
  const shareId = searchParams.get('shareId')?.trim() || searchParams.get('sid')?.trim() || '';

  const guestQuery = React.useMemo(
    () => parseMemoriesGuestShareSearchParams(searchParams),
    [searchParams]
  );

  const [guestStep, setGuestStep] = React.useState<'intro' | 'hub' | 'gallery'>('gallery');
  const [guestUploadFiles, setGuestUploadFiles] = React.useState<File[]>([]);
  const [guestUploadNote, setGuestUploadNote] = React.useState('');
  const [guestUploading, setGuestUploading] = React.useState(false);
  const guestFileInputRef = React.useRef<HTMLInputElement>(null);

  const getBySlug = useMemoriesStore((s) => s.getBySlug);
  const toggleLike = useMemoriesStore((s) => s.toggleLike);
  const addComment = useMemoriesStore((s) => s.addComment);
  const incrementViews = useMemoriesStore((s) => s.incrementViews);

  const slug = eventSlug || '';
  React.useEffect(() => {
    if (!guestQuery.useGuestFlow) setGuestStep('gallery');
    else setGuestStep('intro');
  }, [slug, guestQuery.useGuestFlow, searchParams]);

  const local = slug ? getBySlug(slug) : undefined;
  const [remote, setRemote] = React.useState<MemoriesEvent | null>(null);
  const [fetchingRemote, setFetchingRemote] = React.useState(false);
  const viewedRef = React.useRef(false);

  const [introDelay, setIntroDelay] = React.useState(true);
  React.useEffect(() => {
    const tmr = window.setTimeout(() => setIntroDelay(false), 400);
    return () => window.clearTimeout(tmr);
  }, [slug]);

  React.useEffect(() => {
    // getLike()
    if (local || !slug) {
      setRemote(null);
      return;
    }
    let cancelled = false;
    setFetchingRemote(true);
    const run = async () => {
      try {
        const loaded = await loadRemoteMemoriesForPublicGallery(slug, token, shareId);
        if (!cancelled) setRemote(loaded);
      } finally {
        if (!cancelled) setFetchingRemote(false);
      }
    };
    
    run();
    return () => {
      cancelled = true;
    };
  }, [slug, token, shareId, local]);

  const ev = local || remote;

  /** If the loaded event includes `accessToken` but the address bar omitted it, add `token=` + `t=` (keeps guest/shareId params). */
  React.useEffect(() => {
    if (getMemoriesShareAccessTokenFromSearchParams(searchParams)) return;
    if (!ev) return;
    // Signed-in users load via localStorage JWT; don't rewrite the URL with `ev.accessToken` (wrong for share links).
    if (typeof localStorage !== 'undefined' && localStorage.getItem('token')?.trim()) return;
    const at = String(ev.accessToken ?? '').trim();
    if (!at) return;
    const next = new URLSearchParams(searchParams);
    next.set('token', at);
    next.set('t', at);
    setSearchParams(next, { replace: true });
  }, [ev, searchParams, setSearchParams]);

  const isRemoteOnly = !!remote && !local;
  const guestCommentsAuth = React.useMemo(
    () =>
      isRemoteOnly
        ? { bearerToken: token || undefined, shareId: shareId || undefined }
        : undefined,
    [isRemoteOnly, token, shareId]
  );
  const [likedImageIds, setLikedImageIds] = React.useState<Set<string>>(new Set());

  const [lightbox, setLightbox] = React.useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  const loading =
    (!!local && introDelay) || (!local && fetchingRemote);

  const isLiked = React.useCallback((imageId: string) => likedImageIds.has(imageId), [likedImageIds]);

  const handleLike = React.useCallback(
    (imageId: string) => {
      if (!ev) return;

      const has = likedImageIds.has(imageId);
      const delta = (has ? -1 : 1) as 1 | -1;

      // Track local UI state for "liked" styling.
      setLikedImageIds((prev) => {
        const next = new Set(prev);
        if (has) next.delete(imageId);
        else next.add(imageId);
        return next;
      });

      if (!isRemoteOnly) {
        // Demo/local events: keep existing behavior and also keep heart filled state.
        toggleLike(ev.id, imageId);
        return;
      }

      // Remote/guest events: optimistic update + backend persistence.
      setRemote((prev) => {
        if (!prev) return prev;
        return patchEventImage(prev, String(ev.id), imageId, (img) => ({
          ...img,
          likes: Math.max(0, (img.likes ?? 0) + delta),
        }));
      });

      likeMemoriesEventImage(
        String(ev.id),
        imageId,
        delta,
        shareId || undefined,
        token || undefined
      ).catch(() => {
        // rollback on failure
        setLikedImageIds((prev) => {
          const next = new Set(prev);
          if (has) next.add(imageId);
          else next.delete(imageId);
          return next;
        });
        setRemote((prev) => {
          if (!prev) return prev;
          return patchEventImage(prev, String(ev.id), imageId, (img) => ({
            ...img,
            likes: Math.max(0, (img.likes ?? 0) - delta),
          }));
        });
      });
    },
    [ev, isRemoteOnly, likedImageIds, toggleLike, shareId, token]
  );

  React.useEffect(() => {
    if (!ev || isRemoteOnly || viewedRef.current) return;
    viewedRef.current = true;
    incrementViews(ev.id);
  }, [ev, incrementViews, isRemoteOnly]);

  const accessOk = React.useMemo(() => {
    if (!ev) return false;
    const privacy = (ev as any)?.privacy as string | undefined;
    if (privacy === 'public') return true;
    const accessToken = String((ev as any)?.accessToken ?? '').trim();
    if (!accessToken) return true;
    return Boolean(token) && token === accessToken;
  }, [ev, token]);

  const prettyDate = React.useMemo(() => {
    if (!ev?.dateTime) return '';
    try {
      return new Date(ev.dateTime).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [ev?.dateTime]);

  const heroSubtitle = React.useMemo(() => {
    const parts = [prettyDate, ev?.location].filter((x) => typeof x === 'string' && x.trim());
    return parts.join(' · ');
  }, [prettyDate, ev?.location]);

  const [albumView, setAlbumView] = React.useState<'albums' | 'photos'>('albums');
  const [selectedAlbumIndex, setSelectedAlbumIndex] = React.useState(0);

  const filteredAlbumGroups = React.useMemo(() => {
    if (!ev?.imageGroups?.length) return null;
    let groups = ev.imageGroups;
    if (shareId.trim()) {
      const n = Number(shareId);
      if (Number.isFinite(n)) {
        const matched = groups.filter((g) => g.shareId === n);
        if (matched.length > 0) groups = matched;
      }
    }
    return groups;
  }, [ev?.imageGroups, shareId]);

  React.useEffect(() => {
    if (!filteredAlbumGroups?.length) return;
    const sid = shareId.trim();
    if (!sid) return;
    const n = Number(sid);
    if (!Number.isFinite(n)) return;
    const idx = filteredAlbumGroups.findIndex((g) => g.shareId === n);
    if (idx >= 0) {
      setSelectedAlbumIndex(idx);
      setAlbumView('photos');
    }
  }, [filteredAlbumGroups, shareId]);

  const galleryImages = React.useMemo(() => {
    if (!ev) return [];
    if (filteredAlbumGroups?.length) {
      if (albumView === 'photos' && filteredAlbumGroups[selectedAlbumIndex]) {
        return filteredAlbumGroups[selectedAlbumIndex].images;
      }
      return [];
    }
    return ev.images;
  }, [ev, filteredAlbumGroups, albumView, selectedAlbumIndex]);

  const refetchRemoteEvent = React.useCallback(async () => {
    if (!slug || local) return;
    setFetchingRemote(true);
    try {
      const loaded = await loadRemoteMemoriesForPublicGallery(slug, token, shareId);
      setRemote(loaded);
    } finally {
      setFetchingRemote(false);
    }
  }, [slug, token, shareId, local]);

  const isEventDateExpired = React.useMemo(() => {
    if (!ev?.dateTime) return false;
    const dt = new Date(ev.dateTime);
    if (Number.isNaN(dt.getTime())) return false;
    // Expire by calendar date (local): if event date is before today, treat as expired.
    const today = new Date();
    const eventYmd = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
    const todayYmd = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return eventYmd < todayYmd;
  }, [ev?.dateTime]);

  const [showGuestExpiredThanks, setShowGuestExpiredThanks] = React.useState(false);

  const canGuestUpload = guestQuery.allowImageUpload && !isEventDateExpired;

  const handleGuestIntroNext = React.useCallback(() => {
    if (!guestQuery.allowImageUpload && !guestQuery.allowViewEventImages) return;

    if (isEventDateExpired) {
      setShowGuestExpiredThanks(true);
      return;
    }

    if (guestQuery.allowViewEventImages) {
      setGuestStep('gallery');
      return;
    }
    if (guestQuery.allowImageUpload) {
      setGuestStep('hub');
      return;
    }
  }, [guestQuery.allowImageUpload, guestQuery.allowViewEventImages, isEventDateExpired]);

  const handleGuestUploadSubmit = React.useCallback(async () => {
    if (isEventDateExpired) {
      toast.error('Uploads are closed for this event.');
      return;
    }
    if (!ev || guestUploadFiles.length === 0) {
      toast.error(t('guestUploadPickFiles'));
      return;
    }
    setGuestUploading(true);
    try {
      await guestUploadToMemoriesEvent({
        eventId: String(ev.id),
        files: guestUploadFiles,
        note: guestUploadNote,
        token: token || undefined,
        shareId: shareId || undefined,
      });
      toast.success(t('guestUploadSuccess'));
      setGuestUploadFiles([]);
      setGuestUploadNote('');
      if (guestFileInputRef.current) guestFileInputRef.current.value = '';
      await refetchRemoteEvent();
      if (guestQuery.allowViewEventImages) setGuestStep('gallery');
    } catch {
      toast.error(t('guestUploadError'));
    } finally {
      setGuestUploading(false);
    }
  }, [
    ev,
    guestUploadFiles,
    guestUploadNote,
    token,
    shareId,
    guestQuery.allowViewEventImages,
    isEventDateExpired,
    refetchRemoteEvent,
    t,
  ]);

  if (!loading && !ev) {
    return (
      <div className="min-h-screen bg-[#07070a] text-slate-100 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute -bottom-28 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/15 blur-[140px]" />
        </div>
        <div className="relative min-h-screen flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] px-6 py-10 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
              <FaImages className="h-7 w-7 text-slate-200/80" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">{t('galleryNotFoundTitle')}</h1>
            <p className="mt-2 text-sm text-slate-300/80 leading-relaxed">{t('galleryNotFoundBody')}</p>
            <Link
              to="/memories"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {t('backToMemoriesHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && ev && !accessOk) {
    return (
      <div className="min-h-screen bg-[#07070a] text-slate-100 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute -bottom-28 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/15 blur-[140px]" />
        </div>
        <div className="relative min-h-screen flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] px-6 py-10 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight">{t('galleryLockedTitle')}</h1>
            <p className="mt-2 text-sm text-slate-300/80 leading-relaxed">{t('galleryLockedBody')}</p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-slate-300">
              <span className="text-slate-400">Hint:</span> open the exact link from the message (it includes a token).
            </div>
            <Link
              to="/memories"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              {t('backToMemoriesHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !ev) {
    return (
      <div className="min-h-screen bg-[#07070a] text-slate-100 pb-24 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute -bottom-28 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/15 blur-[140px]" />
        </div>
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/50 backdrop-blur-2xl supports-[backdrop-filter]:bg-black/35">
          <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 animate-pulse" />
              <div>
                <div className="h-4 w-44 rounded bg-white/10 animate-pulse" />
                <div className="mt-2 h-3 w-56 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
            <div className="h-9 w-28 rounded-xl bg-white/10 animate-pulse" />
          </div>
        </header>
        <main className="relative mx-auto max-w-4xl px-3 sm:px-4 pt-5">
          <MemoriesSkeletonGrid count={12} />
        </main>
      </div>
    );
  }

  if (
    !loading &&
    ev &&
    accessOk &&
    guestQuery.useGuestFlow &&
    guestStep === 'intro'
  ) {
    const cover = ev.coverImageUrl?.trim();
    const typeId = normalizeMemoriesEventType(ev.eventType);
    const typeImages = getMemoriesEventTypePreviewUrls(typeId);
    const summaryText = ev.summary?.trim() || t('guestIntroSummaryFallback');
    const descriptionText = ev.description?.trim() || t('guestIntroDescriptionFallback');

    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#050508] font-memories-body text-slate-100">
        <div className="absolute inset-0">
          {cover ? (
            <>
              <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover scale-105" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-[#050508]/94 to-[#050508]" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-[#050508]" />
              {typeImages.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="absolute h-[55%] w-[38%] max-w-[220px] rounded-3xl object-cover opacity-[0.12] blur-[0.5px] ring-1 ring-white/10 shadow-2xl"
                  style={{
                    top: i === 0 ? '8%' : i === 1 ? '22%' : '12%',
                    left: i === 0 ? '-4%' : i === 1 ? '58%' : '32%',
                    transform: `rotate(${i === 0 ? -8 : i === 1 ? 6 : -3}deg)`,
                  }}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-[#050508]/92 to-[#050508]" />
              <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
              <div className="absolute -bottom-28 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/15 blur-[140px]" />
            </>
          )}
        </div>

        <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-y-auto">
          <div className="flex justify-end p-4 shrink-0">
            <Link
              to="/memories"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/35 backdrop-blur-md px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10 transition-colors"
            >
              {t('backToMemoriesHome')}
            </Link>
          </div>

          <div className="flex-1 px-6 pb-14 sm:px-10 sm:pb-20 max-w-xl mx-auto w-full">
            <div className="flex gap-2 sm:gap-3 mb-8">
              {typeImages.map((url) => (
                <div
                  key={url}
                  className="flex-1 min-w-0 aspect-[3/4] max-h-44 rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-300/90 font-memories-body">
              {t('dashboardTitle')}
            </p>
            <h1 className="mt-3 font-memories-display text-[2rem] sm:text-5xl font-semibold tracking-tight text-white leading-[1.1]">
              {ev.name}
            </h1>
            {heroSubtitle ? (
              <p className="mt-4 text-sm text-slate-400 leading-relaxed">{heroSubtitle}</p>
            ) : null}

            <span className="mt-4 inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-200/95">
              {t(GUEST_EVENT_TYPE_I18N[typeId])}
            </span>

            <div className="mt-10 space-y-5">
              <section className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl px-5 py-5 shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/85 mb-3">
                  {t('guestIntroSummaryLabel')}
                </h2>
                <p className="font-memories-display text-xl sm:text-2xl text-slate-50 leading-snug font-medium">
                  {summaryText}
                </p>
              </section>
              <section className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-xl px-5 py-5">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
                  {t('guestIntroDescriptionLabel')}
                </h2>
                <p className="text-sm sm:text-[15px] text-slate-300/95 leading-relaxed whitespace-pre-wrap">
                  {descriptionText}
                </p>
              </section>
            </div>

            {!guestQuery.allowImageUpload && !guestQuery.allowViewEventImages ? (
              <p className="mt-10 text-amber-200/90 text-sm rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                {t('guestNoAccessBothDisabled')}
              </p>
            ) : isEventDateExpired ? (
              <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-2xl px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                <p className="text-lg font-extrabold tracking-tight text-white">Thank you for uploading</p>
                <p className="mt-2 text-sm text-slate-300/90 leading-relaxed">
                  {guestQuery.allowViewEventImages
                    ? 'You can still view the gallery images.'
                    : 'The gallery is no longer available.'}
                </p>

                {guestQuery.allowViewEventImages ? (
                  <button
                    type="button"
                    onClick={() => setGuestStep('gallery')}
                    className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white hover:opacity-95 transition-opacity"
                  >
                    <FaImages className="h-4 w-4" />
                    View gallery images
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleGuestIntroNext}
                  className="mt-10 w-full sm:w-auto min-w-[200px] rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-4 text-sm font-bold text-white shadow-lg shadow-violet-900/40 hover:opacity-95 transition-opacity"
                >
                  {t('guestIntroNext')}
                </button>

                {showGuestExpiredThanks ? (
                  <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setShowGuestExpiredThanks(false)}
                      className="absolute inset-0 bg-black/70"
                    />
                    <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0b12]/95 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.65)] px-6 py-6">
                      <p className="text-lg font-extrabold tracking-tight text-white">Thank you for uploading</p>
                      <p className="mt-2 text-sm text-slate-300/90 leading-relaxed">
                        You can still view the gallery images.
                      </p>

                      <div className="mt-5 flex flex-row flex-wrap gap-2">
                        {guestQuery.allowViewEventImages ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowGuestExpiredThanks(false);
                              setGuestStep('gallery');
                            }}
                            className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-bold text-white hover:opacity-95 transition-opacity"
                          >
                            <FaImages className="h-4 w-4" />
                            View gallery images
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setShowGuestExpiredThanks(false)}
                          className="flex-1 min-w-[140px] inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/[0.1] transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (
    !loading &&
    ev &&
    accessOk &&
    guestQuery.useGuestFlow &&
    guestStep === 'hub' &&
    canGuestUpload
  ) {
    return (
      <div className="min-h-screen bg-[#07070a] text-slate-100 relative overflow-hidden pb-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute -bottom-28 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/15 blur-[140px]" />
        </div>

        <header className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-2xl">
          <div className="mx-auto max-w-lg px-4 py-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setGuestStep('intro')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]"
            >
              <FaArrowLeft className="h-3 w-3" />
              {t('guestBackIntro')}
            </button>
            <Link
              to="/memories"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              {t('backToMemoriesHome')}
            </Link>
          </div>
        </header>

        <main className="relative z-10 max-w-lg mx-auto px-4 py-8 space-y-6">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">{t('guestHubTitle')}</h2>
            <p className="mt-1 text-xs text-slate-400">{t('guestHubSubtitle')}</p>
          </div>

          <input
            ref={guestFileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setGuestUploadFiles(Array.from(e.target.files || []))}
          />
          <button
            type="button"
            onClick={() => guestFileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.04] px-6 py-12 hover:border-violet-500/50 hover:bg-white/[0.06] transition-colors"
          >
            <FaCloudUploadAlt className="h-10 w-10 text-violet-400/90" />
            <span className="text-sm font-semibold text-slate-200">{t('guestUploadPickButton')}</span>
            {guestUploadFiles.length > 0 ? (
              <span className="text-xs text-slate-400">
                {t('guestUploadFileCount', { count: guestUploadFiles.length })}
              </span>
            ) : null}
          </button>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              {t('guestUploadNoteLabel')}
            </label>
            <textarea
              value={guestUploadNote}
              onChange={(e) => setGuestUploadNote(e.target.value)}
              rows={4}
              placeholder={t('guestUploadNotePlaceholder')}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>

          <button
            type="button"
            onClick={handleGuestUploadSubmit}
            disabled={guestUploading || guestUploadFiles.length === 0}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 transition-opacity"
          >
            {guestUploading ? t('guestUploading') : t('guestUploadSubmit')}
          </button>

          {guestQuery.allowViewEventImages ? (
            <button
              type="button"
              onClick={() => setGuestStep('gallery')}
              className="w-full rounded-2xl border border-white/15 bg-white/[0.06] py-3 text-sm font-semibold text-slate-100 hover:bg-white/[0.1] transition-colors"
            >
              {t('guestViewEventImagesCta')}
            </button>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 pb-24 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -bottom-28 right-[-120px] h-[520px] w-[520px] rounded-full bg-fuchsia-500/15 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/50 backdrop-blur-2xl supports-[backdrop-filter]:bg-black/35">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-2xl border border-white/10 bg-white/[0.07] flex items-center justify-center">
              <span className="text-xs font-extrabold tracking-wider bg-gradient-to-r from-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                OM
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight truncate">{ev.name}</h1>
              <p className="text-[11px] sm:text-xs text-slate-400/80 truncate">{heroSubtitle}</p>
            </div>
          </div>

          <Link
            to="/memories"
            className="shrink-0 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/[0.1] transition-colors"
          >
            {t('backToMemoriesHome')}
          </Link>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
      </header>

      <main className="relative mx-auto max-w-4xl px-3 sm:px-4 pt-5">
        {guestQuery.useGuestFlow && guestStep === 'gallery' ? (
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              type="button"
              onClick={() => setGuestStep('intro')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]"
            >
              <FaArrowLeft className="h-3 w-3" />
              {t('guestBackIntro')}
            </button>
            {canGuestUpload ? (
              <button
                type="button"
                onClick={() => setGuestStep('hub')}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/20 px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-600/30"
              >
                <FaCloudUploadAlt className="h-3 w-3" />
                {t('guestAddPhotos')}
              </button>
            ) : null}
          </div>
        ) : null}

        {filteredAlbumGroups?.length && albumView === 'albums' ? (
          <div className="space-y-4 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">{t('memoriesAlbumsTitle')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredAlbumGroups.map((group, gi) => {
                const cover = group.images[0];
                if (!cover) return null;
                return (
                  <button
                    key={`${group.shareId ?? 'gen'}-${gi}`}
                    type="button"
                    onClick={() => {
                      setSelectedAlbumIndex(gi);
                      setAlbumView('photos');
                      setLightbox({ open: false, index: 0 });
                    }}
                    className="group text-left rounded-3xl border border-white/10 bg-white/[0.04] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] hover:border-violet-500/40 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#07070a]"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                      <img
                        src={cover.thumbUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/25 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-lg font-bold text-white drop-shadow-md">
                          {group.recipientName?.trim() || t('memoriesAlbumGeneral')}
                        </p>
                        <p className="text-xs text-white/85 mt-0.5">
                          {t('memoriesAlbumPhotos', { count: group.images.length })}
                        </p>
                      </div>
                    </div>
                    {group.comment ? (
                      <div className="px-4 py-3 border-t border-white/10 bg-black/35">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300/90 mb-1.5">
                          {t('memoriesAlbumNote')}
                        </p>
                        <p className="text-sm text-slate-100 leading-snug line-clamp-4">{group.comment.text}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {Array.from(
                            new Set(
                              [group.comment.displayName, group.comment.userName].filter(
                                (x): x is string => Boolean(x && String(x).trim())
                              )
                            )
                          ).join(' · ')}
                          {group.comment.createdAt
                            ? ` · ${new Date(group.comment.createdAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}`
                            : ''}
                        </p>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {filteredAlbumGroups?.length && albumView === 'photos' ? (
          <div className="mb-5">
            <button
              type="button"
              onClick={() => {
                setAlbumView('albums');
                setLightbox({ open: false, index: 0 });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]"
            >
              <FaArrowLeft className="h-3 w-3" />
              {t('memoriesAlbumBack')}
            </button>
            <p className="mt-3 text-base font-semibold text-slate-100">
              {filteredAlbumGroups[selectedAlbumIndex]?.recipientName?.trim() || t('memoriesAlbumGeneral')}
            </p>
            <p className="text-xs text-slate-500">
              {t('memoriesAlbumPhotos', {
                count: filteredAlbumGroups[selectedAlbumIndex]?.images.length ?? 0,
              })}
            </p>
          </div>
        ) : null}

        {(!filteredAlbumGroups?.length || albumView === 'photos') &&
        (galleryImages.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl px-6 py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-4">
              <FaImages className="h-6 w-6 text-slate-200/70" />
            </div>
            <p className="text-slate-200/80 font-semibold">{t('galleryEmpty')}</p>
            <p className="mt-1 text-xs text-slate-400/80">Ask the photographer to upload images to this event.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {galleryImages.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightbox({ open: true, index: idx })}
                className="group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_18px_60px_rgba(0,0,0,0.45)] focus:outline-none focus:ring-2 focus:ring-violet-500 ring-offset-2 ring-offset-[#07070a]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <img
                  src={img.thumbUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] group-active:scale-[0.98]"
                />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/50 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
                    Our Memories
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(img.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-black/50 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm hover:bg-black/60 transition-colors"
                    aria-label="Like"
                  >
                    <FaHeart
                      className={`h-3 w-3 ${isLiked(img.id) ? 'text-rose-300' : 'text-white/50'}`}
                    />
                    {img.likes}
                  </button>
                </div>
              </button>
            ))}
          </div>
        ))}
      </main>

      <MemoriesLightbox
        open={lightbox.open}
        initialIndex={lightbox.index}
        images={galleryImages}
        title={ev.name}
        readOnly={false}
        isLiked={isLiked}
        eventId={String(ev.id)}
        commentsFetchAuth={guestCommentsAuth}
        onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        onLike={(imageId) => {
          handleLike(imageId);
        }}
        onComment={(imageId, text) => {
          if (!ev) return;
          if (!isRemoteOnly) {
            addComment(ev.id, imageId, text);
            return;
          }

          const tmpId = `tmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
          const optimistic = { id: tmpId, text, createdAt: new Date().toISOString() };
          setRemote((prev) => {
            if (!prev) return prev;
            return patchEventImage(prev, String(ev.id), imageId, (img) => ({
              ...img,
              comments: [...(img.comments ?? []), optimistic],
            }));
          });
          addMemoriesEventImageComment(
            String(ev.id),
            imageId,
            text,
            isRemoteOnly && (token || shareId)
              ? { bearerToken: token || undefined, shareId: shareId || undefined }
              : undefined
          )
            .then((saved) => {
              setRemote((prev) => {
                if (!prev) return prev;
                return patchEventImage(prev, String(ev.id), imageId, (img) => ({
                  ...img,
                  comments: (img.comments ?? []).map((c) => (c.id === tmpId ? saved : c)),
                }));
              });
            })
            .catch(() => {
              setRemote((prev) => {
                if (!prev) return prev;
                return patchEventImage(prev, String(ev.id), imageId, (img) => ({
                  ...img,
                  comments: (img.comments ?? []).filter((c) => c.id !== tmpId),
                }));
              });
            });
        }}
      />
    </div>
  );
};

export default MemoriesPublicGalleryPage;
