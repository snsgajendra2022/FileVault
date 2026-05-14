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
import { Plus, ChevronRight, Lock, Globe, Users, MapPin, Images, Calendar, CreditCard as Edit2, BookOpen, Search, X, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

const privacyConfig = {
  public: {
    icon: Globe,
    label: 'Public',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    iconColor: 'text-emerald-600',
  },
  invite: {
    icon: Users,
    label: 'Invite Only',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    iconColor: 'text-blue-600',
  },
  private: {
    icon: Lock,
    label: 'Private',
    color: 'bg-slate-100 border-slate-200 text-slate-700',
    iconColor: 'text-slate-500',
  },
};

function formatDate(iso: string): string {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
    <section className="relative overflow-hidden rounded-2xl mb-6 md:mb-[2.5rem]"
          style={{
          background: "var(--header-background)",
          border: "var(--header-border)",
          boxShadow: "var(--header-box-shadow)"
        }} >
        <header  
        className={`relative overflow-hidden
        px-4 py-4 sm:px-8 sm:py-8`}>
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 mb-4 backdrop-blur-sm border border-white/20">
              <Sparkles className="h-4 w-4 text-white/90" />
              <span className="text-xs font-semibold text-white/80">{t('memories')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
              {t('yourEvents')}
            </h1>
            <p className="mt-2 text-base sm:text-lg text-blue-100/90 font-medium">
              {t('captureOrganizeShare')}
            </p>
          </div>

          <button
            onClick={() => navigate('/memories/events/new')}
            className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-white text-blue-700 px-6 py-3.5 text-base font-bold shadow-lg hover:bg-blue-50 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            {t('createFirst')}
          </button>
        </div>
        </header>
      </section>
      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10 sm:px-8">
        <div className="relative bottom-[16]">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your memories…"
            className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-10 text-base font-medium text-slate-800 shadow-lg placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-3 text-sm text-slate-600 pl-1">
            {filteredEvents.length === 0
              ? 'No events found'
              : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} found`}
          </p>
        )}
      </div>

      <main className="max-w-6xl mx-auto px-4 py-12 sm:px-8">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-8 py-20 text-center">
            <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-lg font-semibold text-slate-700">{t('loadingEvents')}</p>
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-bold text-red-800 mb-2">{t('failedToLoadEvents')}</p>
            <p className="text-red-700 mb-6">{t('errorOccurredWhileFetchingEvents')}</p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 text-white px-6 py-3 font-bold hover:bg-red-700 disabled:opacity-60 transition-colors disabled:cursor-not-allowed"
            >
              {isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-8 py-20 text-center">
            <Images className="h-16 w-16 text-blue-300 mx-auto mb-4" />
            <p className="text-2xl font-bold text-slate-700 mb-2">
              {searchQuery ? 'No events found' : 'No events yet'}
            </p>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              {searchQuery
                ? 'Try searching with different keywords'
                : 'Create your first memory event to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/memories/events/new')}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-6 py-3 font-bold hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                {t('createFirst')}
              </button>
            )}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-8 py-16 text-center">
            <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-700 mb-2">{t('noEventsMatch', { searchQuery })}</p>
            <p className="text-slate-600 mb-6">{t('tryDifferentSearchTerm')}</p>
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"
            >
              <X className="h-4 w-4" />
              {t('clearSearch')}
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredEvents.map((event:any) => {
              const privacy = (event.privacy ?? 'invite') as MemoriesPrivacy;
              const config = privacyConfig[privacy];
              const PrivacyIcon = config.icon;
              const photoCount = Array.isArray(event.images) ? event.images.length : 0;
              const formattedDate = formatDate(event.dateTime);

              return (
                <div
                  key={event.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:border-blue-300/60 hover:shadow-[0_16px_40px_-8px_rgba(37,99,235,0.15)] cursor-pointer"
                  onClick={() => navigate(`/memories/events/${event.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-stretch">
                    <div className="relative block h-56 sm:h-auto sm:w-72 shrink-0 overflow-hidden">
                      {event.coverImageUrl ? (
                        <img
                          src={event.coverImageUrl}
                          alt={event.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue-600 to-indigo-600">
                          <Images className="h-12 w-12 text-white/80" />
                          <span className="text-sm font-semibold text-white/70">{t('noCoverImage')}</span>
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-white/5" />
                      <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur-md">
                        <Images className="h-4 w-4 text-white/80" />
                        <span className="text-sm font-bold text-white">{photoCount} photos</span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col min-w-0">
                      <div className="flex flex-1 flex-col justify-between gap-4 p-6 sm:p-7">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
                                {event.name}
                              </h2>
                              {event.summary && (
                                <p className="mt-2 text-base text-slate-600 leading-relaxed line-clamp-2">
                                  {event.summary}
                                </p>
                              )}
                            </div>
                            <div className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold ${config.color}`}>
                              <PrivacyIcon className={`h-4 w-4 ${config.iconColor}`} />
                              {config.label}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4">
                            {formattedDate && (
                              <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                {formattedDate}
                              </div>
                            )}
                            {event.location && (
                              <div className="inline-flex items-center gap-2 text-sm text-slate-600 min-w-0">
                                <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                          <span className="text-sm font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            View gallery
                          </span>
                          <ChevronRight className="h-4 w-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-1" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-7">
                        <button
                          onClick={(e) => navigate(`/memories/events/${event.id}/edit`)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => navigate(`/memories/events/${event.id}/photobook`)}
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-100 hover:border-blue-300 transition-all"
                        >
                          <BookOpen className="h-4 w-4" />
                          Photobook
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
    </div>
  );
};

export default MemoriesEventsListPage;
