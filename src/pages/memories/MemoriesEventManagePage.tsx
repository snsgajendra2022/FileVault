import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import { FaArrowLeft, FaCopy, FaImages, FaShare, FaUserFriends } from 'react-icons/fa';
import { useMemoriesStore } from '../../features/memories/memoriesStore';
import { useAuth } from '../../context/AuthContext';
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

  const handleShareWithInvited = async () => {
    if (!ev) return;
    if (selectedIds.size === 0) {
      toast.error(t('sharePickUsers'));
      return;
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
    } finally {
      setSharing(false);
    }
  };

  const shareUrl = React.useMemo(() => {
    if (!ev || typeof window === 'undefined') return '';
    const u = new URL(`${window.location.origin}/memories/e/${ev.slug}`);
    if (ev.privacy !== 'public') u.searchParams.set('t', ev.accessToken);
    return u.toString();
  }, [ev]);

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
        {loadingInvitable ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : invitable.length === 0 ? (
          <p className="text-sm text-slate-500">{t('shareNoInvitedUsers')}</p>
        ) : (
          <>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
              {invitable.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="rounded border-slate-300 accent-violet-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{u.fullName}</div>
                    {u.email && <div className="text-[11px] text-slate-500 truncate">{u.email}</div>}
                  </div>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={sharing || selectedIds.size === 0}
              onClick={handleShareWithInvited}
              className="mt-4 w-full rounded-2xl bg-slate-900 text-white py-3 text-sm font-bold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sharing ? t('shareSending') : t('shareWithSelected')}
            </button>
            {ev.sharedWithUserIds && ev.sharedWithUserIds.length > 0 && (
              <p className="text-[11px] text-slate-500 mt-2">
                {t('shareLastCount', { count: ev.sharedWithUserIds.length })}
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">{t('qrTitle')}</h2>
          <div className="flex justify-center p-4 bg-white rounded-2xl">
            <QRCode value={shareUrl || ' '} size={200} level="M" />
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center leading-relaxed">{t('qrHint')}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
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
        </div>
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
