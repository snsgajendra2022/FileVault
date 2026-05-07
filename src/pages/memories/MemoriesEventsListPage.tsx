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
  FaCalendarAlt,
  FaEdit,
  FaBook,
  FaSearch,
  FaTimes,
} from 'react-icons/fa';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { MemoriesEvent, MemoriesPrivacy } from '../../features/memories/types';
import { listMemoriesEvents, updateMemoriesEvent } from '../../api/services/memoriesService';
import { listPhotobookTemplates } from '../../api/services/photobookTemplatesService';
import { MemoriesEventCardSkeleton } from '../../components/common/skeletons';
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

const privacyColor = (p: MemoriesPrivacy | undefined) => {
  if (p === 'public') return 'bg-emerald-50 border-emerald-200 text-emerald-800';
  if (p === 'invite') return 'bg-blue-50 border-blue-200 text-blue-800';
  return 'bg-slate-100 border-slate-200 text-slate-700';
};

const privacyIconColor = (p: MemoriesPrivacy | undefined) => {
  if (p === 'public') return 'text-emerald-500';
  if (p === 'invite') return 'text-blue-500';
  return 'text-slate-400';
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
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['memoriesEvents'],
    queryFn: listMemoriesEvents,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
  const events = Array.isArray(data) ? data : [];
  const filteredEvents = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return events as MemoriesEvent[];
    return (events as MemoriesEvent[]).filter((ev) =>
      ev.name?.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

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
        photobookThankYouMessage: values.photobookNeeded ? values.photobookThankYouMessage : '',
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
    <div className="min-h-screen bg-gradient-to-b from-violet-50/60 via-white to-white">
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

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 px-4 py-8 sm:px-8 sm:py-12">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-2xl" />

        <div className="relative max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            {/* Brand label */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 mb-4">
              <span className="text-xs font-black tracking-[0.3em] text-white/90 uppercase">OM</span>
              <span className="text-xs font-semibold text-white/70">Our Memories</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
              {t('eventsTitle')}
            </h1>
            <p className="mt-2 text-base sm:text-lg text-violet-100/90 font-medium">
              {t('eventsSubtitle')}
            </p>
            <Link
              to="/memories/shared"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-white/80 hover:text-white transition-colors"
            >
              {t('sharedWithMeTitle')}
              <FaChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <Link
            to="/memories/events/new"
            className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white text-violet-700 px-6 py-3.5 text-base font-extrabold shadow-lg hover:bg-violet-50 transition-all duration-200 shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <FaPlus className="h-4 w-4" />
            {t('newEvent')}
          </Link>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="max-w-6xl mx-auto px-2 pt-5 sm:px-4">
        <div className="relative">
          <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by name…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm font-medium text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              aria-label="Clear search"
            >
              <FaTimes className="h-3 w-3" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-xs text-slate-500 pl-1">
            {filteredEvents.length === 0
              ? 'No events match your search'
              : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} found`}
          </p>
        )}
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-2 py-6 sm:px-4 sm:py-8">

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white px-6 py-8 shadow-sm">
            <MemoriesEventCardSkeleton count={4} />
          </div>

        ) : isError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-12 text-center shadow-sm">
            <div className="text-4xl mb-3">😕</div>
            <p className="text-lg font-bold text-rose-800">{t('eventsLoadError')}</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-rose-700 disabled:opacity-60 transition-colors"
            >
              {t('refresh')}
            </button>
          </div>

        ) : events.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-6 py-20 text-center">
            <div className="text-5xl mb-4">📸</div>
            <p className="text-xl font-bold text-slate-700">{t('emptyEvents')}</p>
            <p className="text-sm text-slate-500 mt-1 mb-6">Start by creating your first memory event</p>
            <Link
              to="/memories/events/new"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 text-white px-6 py-3 text-base font-bold hover:bg-violet-700 transition-colors"
            >
              <FaPlus className="h-4 w-4" />
              {t('createFirst')}
            </Link>
          </div>

        ) : (
          <ul className="space-y-5">
            {filteredEvents.length === 0 ? (
              <li>
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-16 text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-base font-bold text-slate-700">No events found for "{searchQuery}"</p>
                  <p className="text-sm text-slate-500 mt-1">Try a different name or clear the search</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-violet-300 hover:text-violet-700 transition-all shadow-sm"
                  >
                    <FaTimes className="h-3.5 w-3.5" />
                    Clear search
                  </button>
                </div>
              </li>
            ) : filteredEvents.map((ev) => {
              const privacy = (ev as MemoriesEvent & { privacy?: MemoriesPrivacy }).privacy ?? 'invite';
              const Icon = privacyIcon(privacy);
              const photoCount = Array.isArray(ev.images) ? ev.images.length : 0;
              const listDate = formatListDate(ev.dateTime);
              const manageHref = `/memories/events/${ev.id}`;
              const editHref = `/memories/events/${ev.id}/edit`;
              const manageState = { memoriesSeedEvent: ev } as const;
              const goToEditEvent = () => navigate(editHref, { state: manageState });

              // No highlight — show name as-is

              return (
                <li key={ev.id}>
                  <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:border-violet-300/60 hover:shadow-[0_12px_40px_-8px_rgba(124,58,237,0.15)]">
                    <div className="flex flex-col sm:flex-row sm:items-stretch">

                      {/* ── Cover image ── */}
                      <Link
                        to={manageHref}
                        state={manageState}
                        className="relative block h-52 sm:h-auto sm:w-64 shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
                      >
                        {ev.coverImageUrl ? (
                          <img
                            src={ev.coverImageUrl}
                            alt={ev.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex h-full min-h-[208px] sm:min-h-0 w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-violet-800">
                            <span className="text-2xl font-black tracking-[0.3em] text-white/90">OM</span>
                            <span className="text-sm font-semibold text-white/60">Our Memories</span>
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-white/5" />
                        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-sm">
                          <FaImages className="h-3 w-3 text-white/80" />
                          <span className="text-xs font-bold text-white tabular-nums">{photoCount}</span>
                        </div>
                      </Link>

                      {/* ── Main content ── */}
                      <div className="flex flex-1 flex-col min-w-0">
                        <Link
                          to={manageHref}
                          state={manageState}
                          className="flex flex-1 flex-col justify-between gap-4 p-5 sm:p-6 focus-visible:outline-none"
                        >
                          {/* top row */}
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-snug group-hover:text-violet-800 transition-colors line-clamp-2">
                                {ev.name}
                              </h2>
                              {ev.summary && (
                                <p className="mt-2 text-sm sm:text-base text-slate-500 leading-relaxed line-clamp-2">
                                  {ev.summary}
                                </p>
                              )}
                            </div>
                            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${privacyColor(privacy)}`}>
                              <Icon className={`h-3 w-3 ${privacyIconColor(privacy)}`} aria-hidden />
                              {t(privacyLabelKey(privacy))}
                            </span>
                          </div>

                          {/* meta row */}
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                            {listDate && (
                              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                                <FaCalendarAlt className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                                {listDate}
                              </span>
                            )}
                            {ev.location && (
                              <span className="inline-flex items-center gap-2 text-sm text-slate-500 min-w-0">
                                <FaMapMarkerAlt className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                                <span className="truncate">{ev.location}</span>
                              </span>
                            )}
                          </div>

                          {/* open gallery hint */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <span className="text-sm font-bold text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {t('openGallery')} →
                            </span>
                            <span className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 transition-all duration-200 group-hover:border-violet-300 group-hover:bg-violet-50 group-hover:text-violet-600">
                              <FaChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </Link>

                        {/* ── Action buttons ── */}
                        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6">
                          <button
                            type="button"
                            onClick={goToEditEvent}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-700 transition-all"
                          >
                            <FaEdit className="h-3.5 w-3.5" />
                            {t('editEvent')}
                          </button>
                          <button
                            type="button"
                            title={t('photobookListTooltip')}
                            onClick={() => setPhotobookForEvent(ev)}
                            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-800 shadow-sm hover:bg-violet-100 hover:border-violet-300 transition-all"
                          >
                            <FaBook className="h-3.5 w-3.5" />
                            {t('photobookSettings')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MemoriesEventsListPage;
