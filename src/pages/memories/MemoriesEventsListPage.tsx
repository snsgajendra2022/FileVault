import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
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
<section
  className="relative overflow-hidden rounded-2xl mb-4 md:mb-6 border border-white/60"
  style={{
    background: "var(--header-background)",
    boxShadow:
      "0 1px 0 0 rgba(255,255,255,0.6) inset, 0 8px 24px -16px rgba(30,64,175,0.18)",
  }}
>
  {/* Soft corner glows */}
  <div className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-blue-300/25 blur-3xl" />
  <div className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-indigo-300/15 blur-3xl" />

  {/* Subtle dotted pattern */}
  <div
    className="pointer-events-none absolute inset-0 opacity-[0.10]"
    style={{
      backgroundImage:
        "radial-gradient(circle at 1px 1px, rgba(30,58,138,0.4) 1px, transparent 0)",
      backgroundSize: "20px 20px",
      maskImage:
        "radial-gradient(ellipse at center, black 30%, transparent 80%)",
      WebkitMaskImage:
        "radial-gradient(ellipse at center, black 30%, transparent 80%)",
    }}
  />

  <header className="relative px-5 py-5 sm:px-7 sm:py-6">
    <div className="relative max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Left — copy */}
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-0.5 mb-2 backdrop-blur-md border border-blue-200/70">
          <Sparkles className="h-3 w-3 text-blue-600" />
          <span className="text-[10px] font-semibold tracking-[0.16em] uppercase text-blue-700">
            {t('memories')}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-semibold leading-tight tracking-tight text-slate-900">
          {t('yourEvents')}
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          {t('captureOrganizeShare')}
        </p>
      </div>

      {/* Right — CTA */}
      <button
        onClick={() => navigate('/memories/events/new')}
        className="group shrink-0 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white whitespace-nowrap
          bg-gradient-to-r from-blue-600 to-indigo-500
          shadow-[0_6px_16px_-8px_rgba(37,99,235,0.55)]
          hover:shadow-[0_10px_20px_-8px_rgba(37,99,235,0.7)]
          hover:-translate-y-0.5 active:translate-y-0
          transition-all duration-200"
      >
        <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.5} />
        <span>{t('createFirst')}</span>
      </button>
    </div>
  </header>
</section>



      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10 sm:px-8 pt-6">
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


{/* sfsdg */}
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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
  {filteredEvents.map((event: any) => {
    const privacy = (event.privacy ?? 'invite') as MemoriesPrivacy;
    const config = privacyConfig[privacy];
    const PrivacyIcon = config.icon;
    const photoCount = Array.isArray(event.images) ? event.images.length : 0;
    const formattedDate = formatDate(event.dateTime);

    return (
      <div
        key={event.id}
        onClick={() => navigate(`/memories/events/${event.id}`)}
        className="group relative flex flex-col overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-20px_rgba(79,70,229,0.35)] hover:border-indigo-300/60 cursor-pointer"
      >
        {/* Cover */}
        <div className="relative h-48 overflow-hidden">
          {event.coverImageUrl ? (
            <img
              src={event.coverImageUrl}
              alt={event.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 via-blue-600 to-purple-600">
              <div className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.25) 0, transparent 40%)",
                }}
              />
              <Images className="relative h-12 w-12 text-white/90" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Top row: privacy + photos */}
          <div className="absolute inset-x-3 top-3 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm border border-white/60">
              <PrivacyIcon className={`h-3 w-3 ${config.iconColor}`} />
              {config.label}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/45 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white">
              <Images className="h-3 w-3" />
              {photoCount}
            </div>
          </div>

          {/* Bottom: title overlay */}
          <div className="absolute inset-x-4 bottom-3">
            <h3 className="text-lg font-semibold text-white leading-tight line-clamp-2 drop-shadow">
              {event.name}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-5">
          {event.summary && (
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
              {event.summary}
            </p>
          )}

          {/* Meta */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
            {formattedDate && (
              <div className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                <span className="font-medium text-slate-700">{formattedDate}</span>
              </div>
            )}
            {event.location && (
              <div className="inline-flex items-center gap-1.5 min-w-0">
                <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span className="truncate font-medium text-slate-700">{event.location}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Actions */}
          <div className="mt-auto flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/memories/events/${event.id}/edit`); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/memories/events/${event.id}/photobook`); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_-2px_rgba(79,70,229,0.5)] hover:shadow-[0_8px_18px_-4px_rgba(79,70,229,0.7)] hover:-translate-y-0.5 transition-all"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Photobook
            </button>
            <div className="ml-auto inline-flex items-center text-indigo-600 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5">
              <ChevronRight className="h-4 w-4" />
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
