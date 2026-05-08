import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaImages,
  FaMapMarkerAlt,
  FaQrcode,
  FaUserFriends,
} from 'react-icons/fa';
import { useAuth } from '../../state/context/AuthContext';
import api from '../../api/client/axiosInstance';
import {
  fetchInvitableUsers,
  shareMemoriesEventWithClients,
  type InvitableUser,
} from '../../api/services/memoriesShareService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  ensureMemoriesEventAccessTokenForShare,
  getMemoriesEventById,
  updateMemoriesEvent,
} from '../../api/services/memoriesService';
import { listPhotobookTemplates } from '../../api/services/photobookTemplatesService';
import EventPublicShareModal from '../../components/EventShareModals/PublicShareModal';
import type { MemoriesEvent } from '../../features/memories/types';
import {
  normalizeMemoriesEventType,
  type MemoriesEventTypeId,
} from '../../config/memoriesEventTypes';
import { buildMemoriesGuestGalleryUrl, pickTokenForMemoriesGuestLinkUrl } from '../../utils/memoriesGuestShareQuery';
import { MemoriesLightbox } from './components/MemoriesLightbox';
import MemoriesPhotobookSettingsModal, {
  type MemoriesPhotobookFormValues,
} from './components/MemoriesPhotobookSettingsModal';

const GALLERY_PAGE_SIZE = 5;

const EVENT_TYPE_I18N: Record<MemoriesEventTypeId, string> = {
  wedding: 'eventTypeWedding',
  birthday: 'eventTypeBirthday',
  corporate: 'eventTypeCorporate',
  family: 'eventTypeFamily',
  other: 'eventTypeOther',
};

function managePhotobookInitial(ev: MemoriesEvent): MemoriesPhotobookFormValues {
  return {
    photobookNeeded: Boolean(ev.photobookNeeded),
    photobookTemplateId:
      ev.photobookTemplateId != null && Number.isFinite(Number(ev.photobookTemplateId))
        ? Number(ev.photobookTemplateId)
        : null,
    photobookThankYouMessage: ev.photobookThankYouMessage ?? '',
  };
}

const MemoriesEventManagePage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const { user } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();
  const qc = useQueryClient();
  const qrWrapRef = React.useRef<HTMLDivElement | null>(null);
  const seedFromList = React.useMemo(() => {
    const raw = (location.state as { memoriesSeedEvent?: MemoriesEvent } | undefined)?.memoriesSeedEvent;
    return raw && eventId && raw.id === eventId ? raw : undefined;
  }, [location.state, eventId]);

  const {
    data: ev,
    isLoading: loadingEvent,
    isError: eventError,
    isFetching: eventFetching,
    isPlaceholderData: eventIsPlaceholder,
    refetch: refetchEvent,
  } = useQuery({
    queryKey: ['memoriesEvent', eventId],
    queryFn: async () => (eventId ? getMemoriesEventById(eventId) : null),
    enabled: !!eventId,
    staleTime: 10_000,
    placeholderData: seedFromList,
  });

  const [invitable, setInvitable] = React.useState<InvitableUser[]>([]);
  const [loadingInvitable, setLoadingInvitable] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [shareInvitedModalOpen, setShareInvitedModalOpen] = React.useState(false);
  const [shareInvitedContactSearch, setShareInvitedContactSearch] = React.useState('');
  const [showEmailShare, setShowEmailShare] = React.useState(false);
  const [showPhoneShare, setShowPhoneShare] = React.useState(false);

  // Public share-url modal (send link via email/SMS)
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [shareContacts, setShareContacts] = React.useState<
    Array<{ id: string; email?: string; mobile?: string; countryCode?: string; displayName?: string }>
  >([]);
  const [shareContactSearch, setShareContactSearch] = React.useState('');
  const [shareContactIds, setShareContactIds] = React.useState<Set<string>>(new Set());
  const [shareNewEmails, setShareNewEmails] = React.useState('');
  const [shareNewMobileCountryCode, setShareNewMobileCountryCode] = React.useState('+91');
  const [shareNewMobiles, setShareNewMobiles] = React.useState('');
  const [shareMessage, setShareMessage] = React.useState('');
  const [shareChannels, setShareChannels] = React.useState<{ email: boolean; sms: boolean }>({
    email: false,
    sms: false,
  });
  const [shareGuestPermissions, setShareGuestPermissions] = React.useState({
    allowImageUpload: true,
    allowViewEventImages: true,
  });
  const [shareAlreadySent, setShareAlreadySent] = React.useState<{
    email?: string;
    mobile?: string;
    alreadySent: boolean;
  } | null>(null);
  const [shareSending, setShareSending] = React.useState(false);
  const [photobookModalOpen, setPhotobookModalOpen] = React.useState(false);

  const { data: photobookTemplates = [], isLoading: photobookTemplatesLoading } = useQuery({
    queryKey: ['photobookTemplates'],
    queryFn: listPhotobookTemplates,
    staleTime: 300_000,
    enabled: photobookModalOpen,
  });

  const photobookSaveMutation = useMutation({
    mutationFn: async (values: MemoriesPhotobookFormValues) => {
      if (!eventId) throw new Error('missing event');
      await updateMemoriesEvent(eventId, {
        photobookNeeded: values.photobookNeeded,
        ...(values.photobookNeeded && values.photobookTemplateId != null
          ? { photobookTemplateId: values.photobookTemplateId }
          : {}),
        photobookThankYouMessage: values.photobookNeeded ? values.photobookThankYouMessage : '',
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['memoriesEvent', eventId] });
      await qc.invalidateQueries({ queryKey: ['memoriesEvents'] });
      setPhotobookModalOpen(false);
      toast.success(t('photobookSaveSuccess'));
    },
    onError: () => toast.error(t('photobookUpdateError')),
  });

  const [galleryVisibleCount, setGalleryVisibleCount] = React.useState(GALLERY_PAGE_SIZE);
  const [lightbox, setLightbox] = React.useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });
  const galleryScrollRef = React.useRef<HTMLDivElement | null>(null);
  const loadMoreSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const galleryLoadCooldownRef = React.useRef<number>(0);

  React.useEffect(() => {
    const fetchFlags = async () => {
      try {
        const res = await api.get<{ flags?: Array<{ name: string; value: boolean }> }>('/api/flags');
        const flags = Array.isArray(res.data?.flags) ? res.data.flags : [];
        const emailFlag = flags.find((x) => x.name === 'isEmail');
        const phoneFlag = flags.find((x) => x.name === 'isPhone');
        setShowEmailShare(emailFlag?.value ?? true);
        setShowPhoneShare(phoneFlag?.value ?? true);
      } catch {
        setShowEmailShare(false);
        setShowPhoneShare(false);
      }
    };
    fetchFlags();
  }, []);

  React.useEffect(() => {
    setShareChannels((c) => {
      const next = { ...c };
      if (!showEmailShare && c.email) next.email = false;
      if (!showPhoneShare && c.sms) next.sms = false;
      return next.email === c.email && next.sms === c.sms ? c : next;
    });
  }, [showEmailShare, showPhoneShare]);

  React.useEffect(() => {
    if (!showShareModal) return;
    let cancelled = false;
    const run = async () => {
      try {
        const params = new URLSearchParams();
        if (shareContactSearch.trim()) params.set('search', shareContactSearch.trim());
        params.set('limit', '50');
        params.set('offset', '0');
        const res = await api.get<{
          contacts?: Array<{
            id: string;
            email?: string;
            mobile?: string;
            countryCode?: string;
            displayName?: string;
          }>;
        }>(`/api/public-share/contacts?${params.toString()}`);
        if (cancelled) return;
        setShareContacts(Array.isArray(res.data?.contacts) ? res.data.contacts : []);
      } catch {
        if (!cancelled) setShareContacts([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [showShareModal, shareContactSearch]);

  React.useEffect(() => {
    let cancelled = false;
    setLoadingInvitable(true);
    fetchInvitableUsers()
      .then((list) => {
        if (cancelled) return;
        const me = user?.id;
        setInvitable(me != null ? list.filter((u) => u.id !== me) : list);
      })
      .catch(() => {
        if (!cancelled) setInvitable([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingInvitable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  React.useEffect(() => {
    if (!ev?.sharedWithUserIds?.length) return;
    setSelectedIds(new Set(ev.sharedWithUserIds));
  }, [ev?.id, ev?.sharedWithUserIds]);

  const shareUrl = React.useMemo(() => {
    if (!ev || typeof window === 'undefined') return '';
    const at = ev.accessToken?.trim();
    if (!at) return '';
    const linkToken = pickTokenForMemoriesGuestLinkUrl(at);
    return buildMemoriesGuestGalleryUrl(window.location.origin, ev.slug, linkToken, shareGuestPermissions);
  }, [ev, shareGuestPermissions]);

  const accessTokenMintInFlightRef = React.useRef(false);
  const accessTokenMintFailedEventIdRef = React.useRef<string | null>(null);
  const eventAccessTokenKey = ev?.accessToken?.trim() ?? '';

  React.useEffect(() => {
    if (!eventId) return;
    if (eventAccessTokenKey) {
      accessTokenMintFailedEventIdRef.current = null;
      return;
    }
    const snap = qc.getQueryData<MemoriesEvent | null>(['memoriesEvent', eventId]);
    if (!snap?.id) return;
    if (accessTokenMintFailedEventIdRef.current === eventId) return;
    if (accessTokenMintInFlightRef.current) return;
    accessTokenMintInFlightRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const updated = await ensureMemoriesEventAccessTokenForShare(snap);
        if (cancelled) return;
        qc.setQueryData(['memoriesEvent', eventId], updated);
      } catch {
        accessTokenMintFailedEventIdRef.current = eventId;
      } finally {
        if (!cancelled) accessTokenMintInFlightRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
      accessTokenMintInFlightRef.current = false;
    };
  }, [eventId, qc, ev?.id, eventAccessTokenKey]);

  const checkRecipient = React.useCallback(
    async (emailInput: string, mobileInput: string) => {
      const email = emailInput.trim();
      const firstMobilePart = mobileInput.split(/[\s,]+/).map((m) => m.trim()).filter(Boolean)?.[0] ?? '';
      const mobile = firstMobilePart
        ? firstMobilePart.startsWith('+')
          ? firstMobilePart
          : `${shareNewMobileCountryCode.replace(/\s/g, '')}${firstMobilePart}`
        : '';

      if (!shareUrl || (!email && !mobile)) {
        setShareAlreadySent(null);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (email) params.set('email', email);
        if (mobile) params.set('mobile', mobile);
        params.set('publicUrl', shareUrl);
        const res = await api.get<{ alreadySent?: boolean; email?: string | null; mobile?: string | null }>(
          `/api/public-share/check-recipient?${params.toString()}`
        );
        setShareAlreadySent({
          alreadySent: Boolean(res.data?.alreadySent),
          email: res.data?.email ?? (email || undefined),
          mobile: res.data?.mobile ?? (mobile || undefined),
        });
      } catch {
        setShareAlreadySent(null);
      }
    },
    [shareUrl, shareNewMobileCountryCode]
  );

  const handleShareSend = React.useCallback(async () => {
    if (!ev) return;

    const emails = shareNewEmails.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean);
    const mobileParts = shareNewMobiles.split(/[\s,]+/).map((m) => m.trim()).filter(Boolean);
    const mobiles = mobileParts.map((part) =>
      part.startsWith('+') ? part : `${shareNewMobileCountryCode.replace(/\s/g, '')}${part}`
    );

    const mergedContactIds = [
      ...Array.from(selectedIds).map(String),
      ...Array.from(shareContactIds),
    ];
    const contactIds = Array.from(new Set(mergedContactIds));

    if (contactIds.length === 0 && emails.length === 0 && mobiles.length === 0) {
      toast.error(t('sharePickUsers'));
      return;
    }

    const canEmail = Boolean(showEmailShare && shareChannels.email);
    const canSms = Boolean(showPhoneShare && shareChannels.sms);
    const wantsEmailOrSms = canEmail || canSms;
    const hasFreeformRecipients = emails.length > 0 || mobiles.length > 0;
    /** Selected family/connection users only — no typed email/SMS fields. */
    const inviteOnlyInApp =
      selectedIds.size > 0 && !hasFreeformRecipients && shareContactIds.size === 0 && !wantsEmailOrSms;

    const channels: Array<'email' | 'sms'> = [];
    if (canEmail) channels.push('email');
    if (canSms) channels.push('sms');

    if (!inviteOnlyInApp && !wantsEmailOrSms) {
      toast.error(t('sharePickChannel'));
      return;
    }

    setShareSending(true);
    try {
      const ready = await ensureMemoriesEventAccessTokenForShare(ev);
      const at = ready.accessToken?.trim();
      if (!at) {
        toast.error(t('shareMissingAccessToken'));
        return;
      }

      if (inviteOnlyInApp) {
        const clientIds = Array.from(selectedIds).filter((n) => Number.isFinite(n));
        if (clientIds.length === 0) {
          toast.error(t('sharePickUsers'));
          return;
        }
        await shareMemoriesEventWithClients({
          eventId: ready.id,
          slug: ready.slug,
          accessToken: at,
          clientIds,
        });
        toast.success(t('shareSuccess', { count: clientIds.length }));
      } else {
        const linkToken = pickTokenForMemoriesGuestLinkUrl(at);
        const publicUrl = buildMemoriesGuestGalleryUrl(
          window.location.origin,
          ready.slug,
          linkToken,
          shareGuestPermissions
        );
        const idNum = Number(ready.id);
        const res = await api.post<{
          success?: boolean;
          sent?: { email?: number; sms?: number };
          message?: string;
        }>('/api/public-share/send', {
          publicUrl,
          message: shareMessage.trim() || undefined,
          sendTo: {
            contactIds,
            emails,
            mobiles,
          },
          channels,
          eventId: Number.isFinite(idNum) ? idNum : ready.id,
          slug: ready.slug,
          accessToken: ready.accessToken,
          eventName: ready.name,
          allowImageUpload: shareGuestPermissions.allowImageUpload,
          allowViewEventImages: shareGuestPermissions.allowViewEventImages,
        });
        if (res.data?.success === false) throw new Error(res.data?.message ?? 'send failed');
        toast.success(t('sharePublicSendSuccess'));
      }

      setShareInvitedModalOpen(false);
      setShareAlreadySent(null);
      setShareNewEmails('');
      setShareNewMobiles('');
      setShareMessage('');
      setShareGuestPermissions({ allowImageUpload: true, allowViewEventImages: true });
      setShareChannels({ email: false, sms: false });
      setShareContactIds(new Set());
      setSelectedIds(new Set());
      await qc.invalidateQueries({ queryKey: ['memoriesEvent', eventId] });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const d = ax?.response?.data;
      const msg =
        (typeof d?.message === 'string' && d.message.trim()) ||
        (typeof d?.error === 'string' && d.error.trim()) ||
        (typeof ax?.message === 'string' && ax.message.trim()) ||
        '';
      const isInvitePathErr = inviteOnlyInApp;
      const fallback = isInvitePathErr ? t('shareInviteApiFail') : t('sharePublicSendFail');
      toast.error(msg || fallback);
    } finally {
      setShareSending(false);
    }
  }, [
    ev,
    shareNewEmails,
    shareNewMobiles,
    shareNewMobileCountryCode,
    shareContactIds,
    selectedIds,
    shareChannels,
    shareGuestPermissions,
    shareMessage,
    showEmailShare,
    showPhoneShare,
    t,
    qc,
    eventId,
  ]);


  const privacy = (ev as { privacy?: string } | null | undefined)?.privacy ?? 'invite';
  const photoCount = ev?.images?.length ?? 0;
  const prettyWhen = React.useMemo(() => {
    if (!ev?.dateTime) return '';
    try {
      return new Date(ev.dateTime).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return String(ev.dateTime);
    }
  }, [ev?.dateTime]);

  const galleryDisplayed = React.useMemo(() => {
    if (!ev?.images?.length) return [];
    return ev.images.slice(0, galleryVisibleCount);
  }, [ev, galleryVisibleCount]);

  React.useEffect(() => {
    setGalleryVisibleCount(GALLERY_PAGE_SIZE);
  }, [ev?.id, ev?.images?.length]);

  React.useEffect(() => {
    const root = galleryScrollRef.current;
    const sentinel = loadMoreSentinelRef.current;
    const total = ev?.images?.length ?? 0;
    if (!root || !sentinel || !ev || total === 0) return;
    if (galleryVisibleCount >= total) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        const now = Date.now();
        if (now - galleryLoadCooldownRef.current < 280) return;
        galleryLoadCooldownRef.current = now;
        setGalleryVisibleCount((c) => Math.min(c + GALLERY_PAGE_SIZE, total));
      },
      { root, rootMargin: '0px 0px 160px 0px', threshold: 0 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [ev, galleryVisibleCount, ev?.images?.length]);

  const downloadQr = React.useCallback(async () => {
    try {
      const wrap = qrWrapRef.current;
      const svg = wrap?.querySelector('svg');
      if (!svg) throw new Error('qr-not-found');

      // Serialize the SVG and render to canvas for PNG download.
      const serializer = new XMLSerializer();
      const svgText = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();

      const size = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');

      // White background so scanners work in dark UIs.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `our-memories-qr-${ev?.id ?? 'event'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error(t('shareFail'));
    }
  }, [ev?.id, t]);

  if (!ev) {
    return (
      <div className="min-h-[70vh] font-memories-body flex flex-col items-center justify-center px-4 bg-gradient-to-b from-[#f8f7fc] to-white">
        {loadingEvent ? (
          <div className="rounded-3xl border border-violet-200/60 bg-white/90 px-10 py-14 shadow-[0_20px_60px_rgba(91,33,182,0.08)]">
            <LoadingSpinner size="lg" text={t('refresh')} />
          </div>
        ) : eventError ? (
          <div className="max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl">
            <p className="text-slate-600">{t('eventNotFound')}</p>
            <button
              type="button"
              onClick={() => refetchEvent()}
              className="mt-5 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 text-sm font-bold shadow-lg shadow-violet-500/25 hover:opacity-95"
            >
              {t('refresh')}
            </button>
          </div>
        ) : (
          <p className="text-slate-600">{t('eventNotFound')}</p>
        )}
        <Link
          to="/memories/events"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700"
        >
          <FaArrowLeft className="h-3 w-3" />
          {t('backToEvents')}
        </Link>
      </div>
    );
  }

  const manageDetailDescription = ev.description?.trim() ?? '';
  const manageDetailPhotobookMsg =
    ev.photobookNeeded && ev.photobookThankYouMessage?.trim()
      ? String(ev.photobookThankYouMessage).trim()
      : '';
  const showManageEventDetails = Boolean(manageDetailDescription || manageDetailPhotobookMsg);

  return (
    <div className="min-h-screen bg-[#f6f4fb] font-memories-body text-slate-800">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 right-[10%] h-[min(480px,50vw)] w-[min(480px,50vw)] rounded-full bg-violet-500/[0.12] blur-[100px]" />
        <div className="absolute bottom-[-80px] left-[-40px] h-[360px] w-[360px] rounded-full bg-fuchsia-500/[0.10] blur-[90px]" />
        <div className="absolute top-1/2 left-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/[0.06] blur-[60px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 pb-20">
        <Link
          to="/memories/events"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors mb-8 group"
        >
          <FaArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
          {t('backToEvents')}
        </Link>

        <header className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/75 backdrop-blur-xl shadow-[0_24px_80px_rgba(15,23,42,0.08)] mb-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 blur-2xl" />
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-6 sm:flex-row sm:items-start">
                {ev.coverImageUrl ? (
                  <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-sm sm:max-w-[200px] sm:basis-[200px]">
                    <img
                      src={ev.coverImageUrl}
                      alt=""
                      className="aspect-[4/3] h-40 w-full object-cover sm:aspect-square sm:h-44"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600/90">
                    {t('dashboardTitle')}
                  </p>
                  <h1 className="font-memories-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-slate-900 tracking-tight leading-[1.15]">
                    {ev.name}
                  </h1>
                  {eventIsPlaceholder && eventFetching ? (
                    <p className="text-xs font-medium text-violet-600/90">{t('manageSyncingHint')}</p>
                  ) : null}
                  {ev.summary ? (
                    <p className="text-base text-slate-600 max-w-2xl leading-relaxed">{ev.summary}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                      <FaCalendarAlt className="h-3 w-3 text-violet-500 shrink-0" />
                      {prettyWhen}
                    </span>
                    {ev.location ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm max-w-full">
                        <FaMapMarkerAlt className="h-3 w-3 text-fuchsia-500 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </span>
                    ) : null}
                    {ev.eventType ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 capitalize">
                        {t(EVENT_TYPE_I18N[normalizeMemoriesEventType(ev.eventType)])}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/80 bg-violet-50/90 px-3 py-1.5 text-xs font-semibold text-violet-800 capitalize">
                      {privacy === 'public'
                        ? t('privacy.public')
                        : privacy === 'private'
                          ? t('privacy.private')
                          : t('privacy.invite')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1.5 text-xs font-medium text-slate-600">
                      <FaImages className="h-3 w-3 text-slate-400" />
                      {photoCount} {t('photos')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                {shareUrl ? (
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-600/25 hover:opacity-95 transition-opacity whitespace-nowrap"
                  >
                    {t('openGallery')}
                    <FaArrowRight className="h-3.5 w-3.5 opacity-90 shrink-0" aria-hidden />
                  </a>
                ) : (
                  <span
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-300 bg-violet-50/80 px-6 py-3.5 text-sm font-bold text-violet-800/80 whitespace-nowrap"
                    title={t('manageShareLinkPreparing')}
                  >
                    {t('manageShareLinkPreparing')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {showManageEventDetails ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-[0_16px_48px_rgba(15,23,42,0.06)] mb-8">
            <h2 className="font-memories-display text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
              {t('guestBackIntro')}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{t('manageSavedDetailsHint')}</p>
            <div className="mt-5 space-y-5 text-sm text-slate-700">
              {manageDetailDescription ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">
                    {t('fieldDescription')}
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-600">{manageDetailDescription}</p>
                </div>
              ) : null}
              {manageDetailPhotobookMsg ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">
                    {t('photobookThankYouLabel')}
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-600">{manageDetailPhotobookMsg}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-[0_16px_48px_rgba(15,23,42,0.06)] mb-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/25">
              <FaUserFriends className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-memories-display text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
                {t('shareWithInvitedTitle')}
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{t('shareWithInvitedHint')}</p>
              <button
                type="button"
                onClick={() => setShareInvitedModalOpen(true)}
                className="mt-5 w-full sm:w-auto rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={loadingInvitable || invitable.length === 0}
              >
                {invitable.length === 0 ? t('shareNoInvitedUsers') : t('shareWithSelected')}
              </button>
              {ev.sharedWithUserIds && ev.sharedWithUserIds.length > 0 ? (
                <p className="text-xs text-slate-500 mt-3">
                  {t('shareLastCount', { count: ev.sharedWithUserIds.length })}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-[0_16px_48px_rgba(15,23,42,0.06)] mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/20">
                <FaImages className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-memories-display text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
                  {t('managePhotobookTitle')}
                </h2>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{t('managePhotobookHint')}</p>
                <p className="text-xs font-medium text-slate-700 mt-3">
                  {ev.photobookNeeded && ev.photobookTemplateId != null
                    ? t('photobookSummaryOn', { id: ev.photobookTemplateId })
                    : ev.photobookNeeded
                      ? t('photobookTemplateRequired')
                      : t('photobookSummaryOff')}
                </p>
              </div>
            </div>
            <button
              type="button"
              title={t('photobookListTooltip')}
              onClick={() => setPhotobookModalOpen(true)}
              className="shrink-0 inline-flex items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-bold text-violet-900 hover:bg-violet-100"
            >
              {t('photobookConfigure')}
            </button>
          </div>
        </div>

        <MemoriesPhotobookSettingsModal
          open={photobookModalOpen}
          onClose={() => setPhotobookModalOpen(false)}
          initial={managePhotobookInitial(ev)}
          templates={photobookTemplates}
          loadingTemplates={photobookTemplatesLoading}
          saving={photobookSaveMutation.isPending}
          onSave={async (values) => {
            await photobookSaveMutation.mutateAsync(values);
          }}
        />

      <EventPublicShareModal
        isOpen={shareInvitedModalOpen}
        onClose={() => setShareInvitedModalOpen(false)}
        dialogTitle={t('memoriesShareModalTitle')}
        contacts={invitable.map((u) => ({ id: String(u.id), displayName: u.fullName, email: u.email }))}
        contactSearch={shareInvitedContactSearch}
        onContactSearchChange={setShareInvitedContactSearch}
        selectedContactIds={new Set(Array.from(selectedIds).map(String))}
        onSelectedContactIdsChange={(next) => {
          setSelectedIds(
            new Set(
              Array.from(next)
                .map((id) => Number(id))
                .filter((n) => Number.isFinite(n))
            )
          );
        }}
        showEmail={showEmailShare}
        showPhone={showPhoneShare}
        newEmails={shareNewEmails}
        onNewEmailsChange={setShareNewEmails}
        mobileCountryCode={shareNewMobileCountryCode}
        onMobileCountryCodeChange={setShareNewMobileCountryCode}
        newMobiles={shareNewMobiles}
        onNewMobilesChange={setShareNewMobiles}
        alreadySent={shareAlreadySent}
        onAlreadySentChange={setShareAlreadySent}
        message={shareMessage}
        onMessageChange={setShareMessage}
        channels={shareChannels}
        onChannelsChange={setShareChannels}
        guestPermissions={shareGuestPermissions}
        onGuestPermissionsChange={setShareGuestPermissions}
        onCheckRecipient={checkRecipient}
        onSend={handleShareSend}
        sending={shareSending}
      />

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 border border-violet-200/60">
                  <FaImages className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="font-memories-display text-lg font-semibold text-slate-900 tracking-tight">
                    {t('managePhotosTitle')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {photoCount} {t('photos')}
                  </p>
                </div>
              </div>
            </div>

            {loadingEvent ? (
              <div className="py-14 flex justify-center rounded-2xl border border-dashed border-violet-200/60 bg-violet-50/30">
                <LoadingSpinner size="md" text={t('refresh')} />
              </div>
            ) : photoCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-6 py-14 text-center">
                <FaImages className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 text-sm font-medium">{t('galleryEmpty')}</p>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-medium text-slate-500 mb-3">
                  {t('manageGalleryShowing', {
                    visible: Math.min(galleryVisibleCount, photoCount),
                    total: photoCount,
                  })}
                </p>
                <div
                  ref={galleryScrollRef}
                  className="max-h-[min(360px,45vh)] overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-100 bg-slate-50/60 p-2 scroll-smooth"
                >
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {galleryDisplayed.map((img) => {
                      const fullIndex = ev.images.findIndex((i) => i.id === img.id);
                      const srcUrl = img.thumbUrl || img.hdUrl;
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() =>
                            setLightbox({
                              open: true,
                              index: fullIndex >= 0 ? fullIndex : 0,
                            })
                          }
                          className="group relative aspect-square max-h-[5.25rem] sm:max-h-24 w-full overflow-hidden rounded-xl border border-slate-200/90 bg-slate-100 shadow-sm transition-all duration-200 hover:ring-2 hover:ring-violet-400/45 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                          title={t('openGallery')}
                        >
                          {srcUrl ? (
                            <img
                              src={srcUrl}
                              alt=""
                              loading="lazy"
                              draggable={false}
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                const el = e.currentTarget;
                                // Try hdUrl as fallback if thumbUrl failed
                                if (img.hdUrl && el.src !== img.hdUrl) {
                                  el.src = img.hdUrl;
                                } else {
                                  el.style.display = 'none';
                                }
                              }}
                            />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-slate-300">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {galleryVisibleCount < photoCount ? (
                    <div
                      ref={loadMoreSentinelRef}
                      className="flex h-9 items-center justify-center gap-2 py-1 text-[10px] text-slate-400"
                    >
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400/70 animate-pulse" />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400/50 animate-pulse [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400/30 animate-pulse [animation-delay:300ms]" />
                      </span>
                      {t('manageGalleryLoadingMore')}
                    </div>
                  ) : null}
                </div>
                {galleryVisibleCount < photoCount ? (
                  <p className="text-[10px] text-slate-400 text-center mt-2">{t('manageGalleryScrollHint')}</p>
                ) : null}
              </>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-inner">
                  <FaQrcode className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-memories-display text-lg font-semibold text-slate-900 tracking-tight">
                    {t('qrTitle')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{t('featQrTitle')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={downloadQr}
                className="shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-violet-200 transition-colors"
                disabled={!shareUrl}
              >
                {t('manageDownloadQr')}
              </button>
            </div>
            <div
              ref={qrWrapRef}
              className="flex justify-center rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50/80 p-6 sm:p-8 shadow-inner"
            >
              <div className="rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]  ring-slate-100">
                <QRCode value={shareUrl || ' '} size={200} level="M" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-5 text-center leading-relaxed max-w-sm mx-auto">
              {t('qrHint')}
            </p>
          </div>
        </div>

        <MemoriesLightbox
          open={lightbox.open}
          initialIndex={lightbox.index}
          images={ev.images}
          title={ev.name}
          readOnly
          eventId={String(ev.id)}
          onClose={() => setLightbox((s) => ({ ...s, open: false }))}
          onLike={() => {}}
          onComment={() => {}}
        />
      </div>
    </div>
  );
};

export default MemoriesEventManagePage;
