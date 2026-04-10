import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import { FaArrowLeft, FaCopy, FaShare, FaUserFriends } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import PublicShareModal from '../../components/modals/PublicShareModal';
import api from '../../services/api';
import { fetchInvitableUsers, type InvitableUser } from '../../services/memoriesShareService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ensureMemoriesEventAccessTokenForShare, getMemoriesEventById } from '../../services/memoriesService';

const MemoriesEventManagePage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const { user } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const qc = useQueryClient();
  const qrWrapRef = React.useRef<HTMLDivElement | null>(null);
  const {
    data: ev,
    isLoading: loadingEvent,
    isError: eventError,
    refetch: refetchEvent,
  } = useQuery({
    queryKey: ['memoriesEvent', eventId],
    queryFn: async () => (eventId ? getMemoriesEventById(eventId) : null),
    enabled: !!eventId,
    staleTime: 10_000,
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
    email: true,
    sms: true,
  });
  const [shareAlreadySent, setShareAlreadySent] = React.useState<{
    email?: string;
    mobile?: string;
    alreadySent: boolean;
  } | null>(null);
  const [shareSending, setShareSending] = React.useState(false);

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
    const u = new URL(`${window.location.origin}/memories/e/${ev.slug}`);
    if (ev.accessToken) u.searchParams.set('t', ev.accessToken);
    return u.toString();
  }, [ev]);

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

    const channels: Array<'email' | 'sms'> = [];
    if (shareChannels.email && showEmailShare) channels.push('email');
    if (shareChannels.sms && showPhoneShare) channels.push('sms');
    if (channels.length === 0) {
      toast.error(t('shareFail'));
      return;
    }

    setShareSending(true);
    try {
      const ready = await ensureMemoriesEventAccessTokenForShare(ev);
      const publicUrl = (() => {
        const u = new URL(`${window.location.origin}/memories/e/${ready.slug}`);
        if (ready.accessToken) u.searchParams.set('t', ready.accessToken);
        return u.toString();
      })();

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
      });
      if (res.data?.success === false) throw new Error(res.data?.message ?? 'send failed');
      toast.success(t('copied'));
      setShareInvitedModalOpen(false);
      setShareAlreadySent(null);
      setShareNewEmails('');
      setShareNewMobiles('');
      setShareMessage('');
      setShareContactIds(new Set());
      setSelectedIds(new Set());
      await qc.invalidateQueries({ queryKey: ['memoriesEvent', eventId] });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      const msg = ax?.response?.data?.message;
      toast.error(typeof msg === 'string' && msg.trim() ? msg : t('shareFail'));
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
    shareMessage,
    showEmailShare,
    showPhoneShare,
    t,
    qc,
    eventId,
  ]);

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error(t('copyFail'));
    }
  };

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
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        {loadingEvent ? (
          <LoadingSpinner size="lg" text={t('refresh')} />
        ) : eventError ? (
          <>
            <p className="text-slate-600">{t('eventNotFound')}</p>
            <button
              type="button"
              onClick={() => refetchEvent()}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-bold hover:bg-slate-800"
            >
              {t('refresh')}
            </button>
          </>
        ) : (
        <p className="text-slate-600">{t('eventNotFound')}</p>
        )}
        <Link to="/memories/events" className="mt-4 inline-block text-violet-600 font-semibold">
          {t('backToEvents')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
      <Link
        to="/memories/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 mb-6"
      >
        <FaArrowLeft className="h-3 w-3" />
        {t('backToEvents')}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{ev.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date(ev.dateTime).toLocaleString()} · {ev.location}
          </p>
        </div>
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          {t('openGallery')} <FaShare className="h-3 w-3" />
        </a>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
          <FaUserFriends className="h-4 w-4 text-violet-500" />
          {t('shareWithInvitedTitle')}
        </h2>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">{t('shareWithInvitedHint')}</p>
        <button
          type="button"
          onClick={() => setShareInvitedModalOpen(true)}
          className="w-full rounded-2xl bg-slate-900 text-white py-3 text-sm font-bold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          disabled={loadingInvitable || invitable.length === 0}
        >
          {invitable.length === 0 ? t('shareNoInvitedUsers') : t('shareWithSelected')}
        </button>
        {ev.sharedWithUserIds && ev.sharedWithUserIds.length > 0 && (
          <p className="text-[11px] text-slate-500 mt-2">
            {t('shareLastCount', { count: ev.sharedWithUserIds.length })}
          </p>
        )}
      </div>


      <PublicShareModal
        isOpen={shareInvitedModalOpen}
        onClose={() => setShareInvitedModalOpen(false)}
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
        onCheckRecipient={checkRecipient}
        onSend={handleShareSend}
        sending={shareSending}
      />

      <div className="grid gap-6 lg:grid-cols-1">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{t('photos')}</h2>
            <span className="text-xs text-slate-500">
              {(ev.images?.length ?? 0).toString()}
            </span>
          </div>

          {loadingEvent ? (
            <div className="py-10 flex justify-center">
              <LoadingSpinner size="md" text={t('refresh')} />
            </div>
          ) : (ev.images?.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500 text-sm">
              {t('galleryEmpty')}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ev.images.map((img: any) => (
                <a
                  key={img.id}
                  href={img.hdUrl || img.thumbUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                  title={t('openGallery')}
                >
                  <img
                    src={img.thumbUrl || img.hdUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{t('qrTitle')}</h2>
            <button
              type="button"
              onClick={downloadQr}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              disabled={!shareUrl}
            >
              Download QR
            </button>
          </div>
          <div ref={qrWrapRef} className="flex justify-center p-4 bg-white rounded-2xl">
            <QRCode value={shareUrl || ' '} size={200} level="M" />
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center leading-relaxed">{t('qrHint')}</p>
        </div>

        {/* <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{t('shareLink')}</h2>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-xs bg-slate-50 font-mono"
            />
            <button
              type="button"
              onClick={() => copy(shareUrl, t('copied'))}
              className="shrink-0 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
            >
              <FaCopy className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="shrink-0 rounded-xl bg-violet-600 text-white px-4 py-2 text-sm font-semibold hover:bg-violet-700"
              disabled={!shareUrl}
            >
              <FaShare className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('fieldPrivacy')}</label>
            <select
              className="input-modern w-full"
              value={ev.privacy}
              onChange={(e) =>
                updateEvent(ev.id, { privacy: e.target.value as typeof ev.privacy })
              }
            >
              <option value="public">{t('privacy.public')}</option>
             <option value="private">{t('privacy.private')}</option>
              <option value="invite">{t('privacy.invite')}</option> 
            </select>
          </div>
        </div> */}
      </div>

      {/* Demo-only sample photos section removed (event images now expected from backend uploads). */}
    </div>
  );
};

export default MemoriesEventManagePage;
