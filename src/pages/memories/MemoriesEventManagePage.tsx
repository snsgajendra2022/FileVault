import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import { FaArrowLeft, FaCopy, FaImages, FaShare, FaUserFriends } from 'react-icons/fa';
import { useMemoriesStore } from '../../features/memories/memoriesStore';
import { useAuth } from '../../context/AuthContext';
import PublicShareModal from '../../components/modals/PublicShareModal';
import api from '../../services/api';
import {
  fetchInvitableUsers,
  shareMemoriesEventWithClients,
  type InvitableUser,
} from '../../services/memoriesShareService';

const MemoriesEventManagePage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const { user } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const ev = useMemoriesStore((s) => (eventId ? s.getById(eventId) : undefined));
  const updateEvent = useMemoriesStore((s) => s.updateEvent);
  const addSamplePhotos = useMemoriesStore((s) => s.addSamplePhotos);
  const setSharedWithUsers = useMemoriesStore((s) => s.setSharedWithUsers);

  const [invitable, setInvitable] = React.useState<InvitableUser[]>([]);
  const [loadingInvitable, setLoadingInvitable] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [sharing, setSharing] = React.useState(false);
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

  const toggleUser = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShareWithInvited = async (): Promise<boolean> => {
    if (!ev) return;
    if (selectedIds.size === 0) {
      toast.error(t('sharePickUsers'));
      return false;
    }
    setSharing(true);
    try {
      await shareMemoriesEventWithClients({
        eventId: ev.id,
        slug: ev.slug,
        accessToken: ev.accessToken,
        clientIds: Array.from(selectedIds),
      });
      setSharedWithUsers(ev.id, Array.from(selectedIds));
      toast.success(t('shareSuccess', { count: selectedIds.size }));
      return true;
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; invalidClientIds?: number[] } } };
      const msg = ax?.response?.data?.message;
      const invalid = ax?.response?.data?.invalidClientIds;
      if (Array.isArray(invalid) && invalid.length > 0) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          invalid.forEach((id: number) => next.delete(id));
          return next;
        });
      }
      toast.error(typeof msg === 'string' && msg.trim() ? msg : t('shareFail'));
      return false;
    } finally {
      setSharing(false);
    }
  };

  const shareUrl = React.useMemo(() => {
    if (!ev || typeof window === 'undefined') return '';
    const u = new URL(`${window.location.origin}/memories/e/${ev.slug}`);
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
    if (!shareUrl) return;

    const emails = shareNewEmails.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean);
    const mobileParts = shareNewMobiles.split(/[\s,]+/).map((m) => m.trim()).filter(Boolean);
    const mobiles = mobileParts.map((part) =>
      part.startsWith('+') ? part : `${shareNewMobileCountryCode.replace(/\s/g, '')}${part}`
    );

    if (shareContactIds.size === 0 && emails.length === 0 && mobiles.length === 0) {
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
      const res = await api.post<{ success?: boolean; sent?: { email?: number; sms?: number } }>('/api/public-share/send', {
        publicUrl: shareUrl,
        message: shareMessage.trim() || undefined,
        recipients: {
          contactIds: Array.from(shareContactIds),
          emails,
          mobiles,
        },
        channels,
      });
      if (res.data?.success === false) throw new Error('send failed');
      toast.success(t('copied'));
      setShowShareModal(false);
      setShareAlreadySent(null);
    } catch {
      toast.error(t('shareFail'));
    } finally {
      setShareSending(false);
    }
  }, [
    shareUrl,
    shareNewEmails,
    shareNewMobiles,
    shareNewMobileCountryCode,
    shareContactIds,
    shareChannels,
    shareMessage,
    showEmailShare,
    showPhoneShare,
    t,
  ]);

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error(t('copyFail'));
    }
  };

  if (!ev) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-slate-600">{t('eventNotFound')}</p>
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
        showEmail={false}
        showPhone={false}
        newEmails=""
        onNewEmailsChange={() => {}}
        mobileCountryCode="+91"
        onMobileCountryCodeChange={() => {}}
        newMobiles=""
        onNewMobilesChange={() => {}}
        alreadySent={null}
        onAlreadySentChange={() => {}}
        message=""
        onMessageChange={() => {}}
        channels={{ email: false, sms: false }}
        onChannelsChange={() => {}}
        onCheckRecipient={() => {}}
        onSend={async () => {
          const ok = await handleShareWithInvited();
          if (ok) setShareInvitedModalOpen(false);
        }}
        sending={sharing}
        showMessage={false}
        showChannels={false}
        labels={{
          title: t('shareWithInvitedTitle'),
          existingContactsLabel: t('shareWithInvitedHint'),
          searchContactsPlaceholder: 'Search',
          noContactsYet: t('shareNoInvitedUsers'),
          newRecipientsEmailLabel: '',
          emailPlaceholder: '',
          newRecipientsMobileLabel: '',
          mobilePlaceholder: '',
          optionalMessageLabel: '',
          messagePlaceholder: '',
          sendViaEmailLabel: '',
          sendViaSmsLabel: '',
          cancelLabel: 'Close',
          sendingLabel: t('shareSending'),
          sendLabel: t('shareWithSelected'),
          alreadySentWarning: () => '',
          emailTypeLabel: '',
          mobileTypeLabel: '',
        }}
      />

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
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">{t('qrTitle')}</h2>
          <div className="flex justify-center p-4 bg-white rounded-2xl">
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

      <div className="mt-8 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FaImages className="h-5 w-5 text-violet-600" />
              {t('demoPhotosTitle')}
            </h2>
            <p className="text-sm text-slate-600 mt-1">{t('demoPhotosBody')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              addSamplePhotos(ev.id, 12);
              toast.success(t('demoPhotosAdded'));
            }}
            className="rounded-2xl bg-violet-600 text-white px-5 py-3 text-sm font-bold hover:bg-violet-700 transition-colors shrink-0"
          >
            {t('addDemoPhotos')}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-4">{t('demoPhotosNote')}</p>
      </div>
    </div>
  );
};

export default MemoriesEventManagePage;
