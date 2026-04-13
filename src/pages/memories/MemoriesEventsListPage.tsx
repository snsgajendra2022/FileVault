import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaPlus,
  FaChevronRight,
  FaLock,
  FaGlobe,
  FaUserFriends,
  FaMapMarkerAlt,
  FaImages,
} from 'react-icons/fa';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { MemoriesEvent, MemoriesPrivacy } from '../../features/memories/types';
import { listMemoriesEvents, updateMemoriesEvent } from '../../services/memoriesService';
import { listPhotobookTemplates } from '../../services/photobookTemplatesService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import MemoriesPhotobookSettingsModal, {
  type MemoriesPhotobookFormValues,
} from './components/MemoriesPhotobookSettingsModal';

const privacyIcon = (p: MemoriesPrivacy | undefined) => {
  if (p === 'public') return FaGlobe;
  if (p === 'invite') return FaUserFriends;
  return FaLock;
};

const privacyLabelKey = (p: MemoriesPrivacy | undefined): `privacy.${MemoriesPrivacy}` => {
  if (p === 'public') return 'privacy.public';
  if (p === 'private') return 'privacy.private';
  return 'privacy.invite';
};

function formatListDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function eventToPhotobookInitial(ev: MemoriesEvent): MemoriesPhotobookFormValues {
  return {
    photobookNeeded: Boolean(ev.photobookNeeded),
    photobookTemplateId:
      ev.photobookTemplateId != null && Number.isFinite(Number(ev.photobookTemplateId))
        ? Number(ev.photobookTemplateId)
        : null,
    photobookThankYouMessage: ev.photobookThankYouMessage ?? '',
  };
}

const closedPhotobookInitial: MemoriesPhotobookFormValues = {
  photobookNeeded: false,
  photobookTemplateId: null,
  photobookThankYouMessage: '',
};

const MemoriesEventsListPage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [photobookForEvent, setPhotobookForEvent] = React.useState<MemoriesEvent | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['memoriesEvents'],
    queryFn: listMemoriesEvents,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
  const events = Array.isArray(data) ? data : [];

  const { data: photobookTemplates = [], isLoading: photobookTemplatesLoading } = useQuery({
    queryKey: ['photobookTemplates'],
    queryFn: listPhotobookTemplates,
    staleTime: 300_000,
    enabled: Boolean(photobookForEvent),
  });

  const photobookSaveMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: MemoriesPhotobookFormValues }) => {
      await updateMemoriesEvent(id, {
        photobookNeeded: values.photobookNeeded,
        ...(values.photobookNeeded && values.photobookTemplateId != null
          ? { photobookTemplateId: values.photobookTemplateId }
          : {}),
        photobookThankYouMessage: values.photobookNeeded
          ? values.photobookThankYouMessage
          : '',
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['memoriesEvents'] });
      setPhotobookForEvent(null);
      toast.success(t('photobookSaveSuccess'));
    },
    onError: () => toast.error(t('photobookUpdateError')),
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
      <MemoriesPhotobookSettingsModal
        open={Boolean(photobookForEvent)}
        onClose={() => setPhotobookForEvent(null)}
        initial={photobookForEvent ? eventToPhotobookInitial(photobookForEvent) : closedPhotobookInitial}
        templates={photobookTemplates}
        loadingTemplates={photobookTemplatesLoading}
        saving={photobookSaveMutation.isPending}
        onSave={async (values) => {
          if (!photobookForEvent) return;
          await photobookSaveMutation.mutateAsync({ id: photobookForEvent.id, values });
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('eventsTitle')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('eventsSubtitle')}</p>
          <Link
            to="/memories/shared"
            className="inline-block mt-2 text-sm font-semibold text-violet-600 hover:underline"
          >
            {t('sharedWithMeTitle')} →
          </Link>
        </div>
        <Link
          to="/memories/events/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-bold hover:bg-slate-800 transition-colors shrink-0"
        >
          <FaPlus className="h-4 w-4" />
          {t('newEvent')}
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white px-6 py-12 text-center">
          <LoadingSpinner size="lg" text={t('refresh')} />
        </div>
      ) : isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
          <p className="text-rose-800 font-semibold">{t('eventsLoadError')}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-bold hover:bg-slate-800"
            disabled={isFetching}
          >
            {t('refresh')}
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-16 text-center">
          <p className="text-slate-600 font-medium">{t('emptyEvents')}</p>
          <Link
            to="/memories/events/new"
            className="mt-4 inline-flex items-center gap-2 text-violet-600 font-bold hover:underline"
          >
            {t('createFirst')} <FaChevronRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-4 sm:space-y-5">
          {(events as MemoriesEvent[]).map((ev) => {
            const privacy = (ev as MemoriesEvent & { privacy?: MemoriesPrivacy }).privacy ?? 'invite';
            const Icon = privacyIcon(privacy);
            const photoCount = Array.isArray(ev.images) ? ev.images.length : 0;
            const listDate = formatListDate(ev.dateTime);
            const manageHref = `/memories/events/${ev.id}`;
            const editHref = `/memories/events/${ev.id}/edit`;
            const manageState = { memoriesSeedEvent: ev } as const;
            const goToEditEvent = () => navigate(editHref, { state: manageState });
            return (
              <li key={ev.id}>
                <div className="group relative flex flex-col sm:flex-row sm:items-stretch gap-0 overflow-hidden rounded-[1.35rem] border border-slate-200/70 bg-gradient-to-br from-white via-white to-violet-50/40 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.08)] ring-slate-900/[0.04] transition-all duration-300 hover:border-violet-300/50 hover:shadow-[0_16px_48px_-12px_rgba(124,58,237,0.18)] hover:ring-violet-500/10">
                  <Link
                    to={manageHref}
                    state={manageState}
                    className="relative flex min-h-0 flex-1 flex-col sm:flex-row sm:items-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
                  >
                    <div className="relative h-40 sm:h-auto sm:w-[min(38%,280px)] shrink-0 overflow-hidden sm:rounded-l-[1.35rem]">
                      {ev.coverImageUrl ? (
                        <img
                          src={ev.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full min-h-[160px] w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-violet-800 p-4 sm:min-h-[140px]">
                          <span className="text-[11px] font-black tracking-[0.35em] text-white/90">OM</span>
                          <span className="text-[10px] font-medium text-white/70">Our Memories</span>
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-white/10" />
                    </div>

                    <div className="flex flex-1 flex-col justify-center gap-3 p-5 sm:py-6 sm:pl-6 sm:pr-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h2 className="line-clamp-2 text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-violet-800 sm:text-xl">
                            {ev.name}
                          </h2>
                          {ev.summary ? (
                            <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-slate-600">{ev.summary}</p>
                          ) : null}
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-violet-200/80 bg-violet-50/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-800">
                          <Icon className="h-3 w-3 text-violet-600" aria-hidden />
                          {t(privacyLabelKey(privacy))}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                        {listDate ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                            <span className="h-1 w-1 rounded-full bg-violet-400" aria-hidden />
                            {listDate}
                          </span>
                        ) : null}
                        {ev.location ? (
                          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                            <FaMapMarkerAlt className="h-3 w-3 shrink-0 text-violet-400" aria-hidden />
                            <span className="truncate">{ev.location}</span>
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <FaImages className="h-3 w-3 shrink-0 text-violet-400" aria-hidden />
                          <span className="tabular-nums">
                            {photoCount} {t('photos')}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100/80 pt-3 sm:border-0 sm:pt-0">
                        <span className="text-xs font-semibold text-violet-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          {t('openGallery')} →
                        </span>
                        <span className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-400 shadow-sm transition-all duration-300 group-hover:border-violet-300 group-hover:bg-violet-50 group-hover:text-violet-600 group-hover:shadow-md">
                          <FaChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="relative z-20 flex flex-row sm:flex-col justify-center gap-2 border-t border-slate-100 bg-slate-50/90 px-4 py-3 sm:w-[9.5rem] sm:border-t-0 sm:border-l sm:border-slate-100 sm:py-4 shrink-0">
                    <button
                      type="button"
                      onClick={goToEditEvent}
                      className="inline-flex flex-1 sm:flex-none items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm hover:border-violet-300 hover:text-violet-700"
                    >
                      {t('editEvent')}
                    </button>
                    <button
                      type="button"
                      title={t('photobookListTooltip')}
                      onClick={() => setPhotobookForEvent(ev)}
                      className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900 shadow-sm hover:bg-violet-100"
                    >
                      <FaImages className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                      {t('photobookSettings')}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MemoriesEventsListPage;
