import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { MemoriesEvent, MemoriesPrivacy } from '../../features/memories/types';
import { listMemoriesEvents, updateMemoriesEvent } from '../../api/services/memoriesService';
import { listPhotobookTemplates } from '../../api/services/photobookTemplatesService';
import MemoriesPhotobookSettingsModal, {
  type MemoriesPhotobookFormValues,
} from './components/MemoriesPhotobookSettingsModal';
import {
  Plus,
  ChevronRight,
  Lock,
  Globe,
  Users,
  MapPin,
  Images,
  Calendar,
  CreditCard as Edit2,
  BookOpen,
  Search,
  X,
  Sparkles,
  AlertCircle,
  Loader2,
  Filter,
} from 'lucide-react';
import './memories-events-page.css';

const privacyConfig = {
  public: {
    icon: Globe,
    labelKey: 'privacy.public' as const,
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  invite: {
    icon: Users,
    labelKey: 'privacy.invite' as const,
    badgeClass:
      'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  private: {
    icon: Lock,
    labelKey: 'privacy.private' as const,
    badgeClass:
      'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200',
    iconClass: 'text-slate-500 dark:text-slate-400',
  },
};

function parseEventDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function formatCardDate(iso: string): string {
  const d = parseEventDate(iso);
  if (!d) return '';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function monthGroupKey(iso: string | undefined): string {
  const d = parseEventDate(iso);
  if (!d) return 'undated';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthGroupLabel(key: string, undatedLabel: string): string {
  if (key === 'undated') return undatedLabel;
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return undatedLabel;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
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

type EventGroup = {
  key: string;
  label: string;
  events: MemoriesEvent[];
};

type MemoriesEventCardProps = {
  event: MemoriesEvent;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onPhotobook: (event: MemoriesEvent) => void;
  t: (key: string) => string;
};

const MemoriesEventCard: React.FC<MemoriesEventCardProps> = ({
  event,
  onOpen,
  onEdit,
  onPhotobook,
  t,
}) => {
  const privacy = (event.privacy ?? 'invite') as MemoriesPrivacy;
  const config = privacyConfig[privacy];
  const PrivacyIcon = config.icon;
  const photoCount = Array.isArray(event.images) ? event.images.length : 0;
  const formattedDate = formatCardDate(event.dateTime);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(event.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(event.id);
        }
      }}
      className="me-event-card group relative flex h-full w-full min-w-0 flex-col overflow-hidden border shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 sm:hover:-translate-y-1 hover:shadow-[0_24px_50px_-20px_rgba(79,70,229,0.35)] hover:border-indigo-300/60 dark:hover:border-indigo-500/50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-[0.99]"
    >
      <div className="me-card-cover relative overflow-hidden">
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt={event.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 via-blue-600 to-purple-600">
            <Images className="relative h-12 w-12 text-white/90" aria-hidden />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
          <div
            className={`inline-flex max-w-[58%] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur-md sm:max-w-none sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px] ${config.badgeClass}`}
          >
            <PrivacyIcon className={`h-3 w-3 shrink-0 ${config.iconClass}`} aria-hidden />
            <span className="truncate">{t(config.labelKey)}</span>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/45 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-white sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px]">
            <Images className="h-3 w-3" aria-hidden />
            {photoCount}
          </div>
        </div>
        <div className="absolute inset-x-3 bottom-2 sm:inset-x-4 sm:bottom-3">
          <h3 className="text-base font-semibold text-white leading-snug line-clamp-2 drop-shadow sm:text-lg">
            {event.name}
          </h3>
        </div>
      </div>

      <div className="me-card-body flex flex-1 flex-col min-h-0">
        {event.summary ? (
          <p className="me-card-body-muted text-sm leading-relaxed line-clamp-2">{event.summary}</p>
        ) : null}

        <div className="me-card-meta mt-2 sm:mt-3 flex flex-col gap-1.5 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1.5">
          {formattedDate ? (
            <div className="inline-flex min-w-0 items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" aria-hidden />
              <strong className="font-medium truncate">{formattedDate}</strong>
            </div>
          ) : null}
          {event.location ? (
            <div className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" aria-hidden />
              <strong className="truncate font-medium">{event.location}</strong>
            </div>
          ) : null}
        </div>

        <div className="my-3 sm:my-4 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-600 to-transparent" />

        <div className="me-card-actions mt-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(event.id);
            }}
            className="me-btn inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all sm:px-3.5"
          >
            <Edit2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{t('edit')}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPhotobook(event);
            }}
            className="me-btn inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_-2px_rgba(79,70,229,0.5)] hover:shadow-[0_8px_18px_-4px_rgba(79,70,229,0.7)] sm:px-3.5 sm:hover:-translate-y-0.5 transition-all"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{t('photobook')}</span>
          </button>
          <div
            className="ml-auto hidden items-center text-indigo-600 dark:text-indigo-400 sm:inline-flex opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5"
            aria-hidden
          >
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </article>
  );
};

const MemoriesEventsListPage: React.FC = () => {
  const { t, i18n } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [photobookForEvent, setPhotobookForEvent] = React.useState<MemoriesEvent | null>(null);
  const [nameFilter, setNameFilter] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['memoriesEvents'],
    queryFn: listMemoriesEvents,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const events = Array.isArray(data) ? (data as MemoriesEvent[]) : [];
  const hasActiveFilters = Boolean(nameFilter.trim() || dateFrom || dateTo);

  const filteredEvents = React.useMemo(() => {
    let list = [...events];
    const q = nameFilter.trim().toLowerCase();
    if (q) {
      list = list.filter((ev) => ev.name?.toLowerCase().includes(q));
    }
    if (dateFrom) {
      const from = startOfDay(new Date(`${dateFrom}T00:00:00`));
      list = list.filter((ev) => {
        const d = parseEventDate(ev.dateTime);
        return d != null && d >= from;
      });
    }
    if (dateTo) {
      const to = endOfDay(new Date(`${dateTo}T00:00:00`));
      list = list.filter((ev) => {
        const d = parseEventDate(ev.dateTime);
        return d != null && d <= to;
      });
    }
    list.sort((a, b) => {
      const da = parseEventDate(a.dateTime)?.getTime() ?? 0;
      const db = parseEventDate(b.dateTime)?.getTime() ?? 0;
      return db - da;
    });
    return list;
  }, [events, nameFilter, dateFrom, dateTo]);

  const groupedEvents = React.useMemo((): EventGroup[] => {
    const map = new Map<string, MemoriesEvent[]>();
    for (const ev of filteredEvents) {
      const key = monthGroupKey(ev.dateTime);
      const bucket = map.get(key) ?? [];
      bucket.push(ev);
      map.set(key, bucket);
    }
    const undatedLabel = t('undatedEvents');
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === 'undated') return 1;
        if (b === 'undated') return -1;
        return b.localeCompare(a);
      })
      .map(([key, groupEvents]) => ({
        key,
        label: formatMonthGroupLabel(key, undatedLabel),
        events: groupEvents,
      }));
  }, [filteredEvents, t, i18n.language]);

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

  const clearFilters = () => {
    setNameFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const filterInputClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 py-2.5 px-3 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition-all';

  return (
    <div className="memories-events-page w-full">
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

      <div className="me-page-inner flex flex-1 flex-col w-full min-w-0">
      <section
        className="me-hero relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/60"
        style={{
          background: 'var(--header-background, linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%))',
          boxShadow: '0 1px 0 0 rgba(255,255,255,0.6) inset, 0 8px 24px -16px rgba(30,64,175,0.18)',
        }}
      >
        <div className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-blue-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-indigo-300/15 blur-3xl" />
        <header className="relative px-4 py-4 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-slate-800/70 px-2.5 py-0.5 mb-2 backdrop-blur-md border border-blue-200/70 dark:border-blue-500/30">
                <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" aria-hidden />
                <span className="text-[10px] font-semibold tracking-[0.16em] uppercase text-blue-700 dark:text-blue-300">
                  {t('memories')}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                {t('yourEvents')}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('captureOrganizeShare')}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/memories/events/new')}
              className="group w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 sm:py-2 text-sm font-medium text-white whitespace-nowrap bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_6px_16px_-8px_rgba(37,99,235,0.55)] hover:shadow-[0_10px_20px_-8px_rgba(37,99,235,0.7)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 min-h-[2.75rem]"
            >
              <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.5} />
              <span>{t('createFirst')}</span>
            </button>
          </div>
        </header>
      </section>

        <div className="me-filter-panel w-full rounded-xl border p-3 sm:p-4 shadow-sm mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-200">
            <Filter className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" aria-hidden />
            <span className="text-sm font-semibold">{t('eventsTitle')}</span>
          </div>
          <div className="me-filter-grid">
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t('filterByName')}
              </span>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder={t('filterNamePlaceholder')}
                  className={`${filterInputClass} pl-9 pr-9`}
                />
                {nameFilter ? (
                  <button
                    type="button"
                    onClick={() => setNameFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    aria-label={t('clearSearchAria')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t('filterDateFrom')}
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={filterInputClass}
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {t('filterDateTo')}
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
                className={filterInputClass}
              />
            </label>
          </div>
          {hasActiveFilters ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('eventsFound', { count: filteredEvents.length })}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                {t('clearFilters')}
              </button>
            </div>
          ) : null}
        </div>

      <main className="w-full min-w-0 flex-1 py-4 sm:py-6">
        {isLoading ? (
          <div className="me-state-card rounded-2xl border px-8 py-20 text-center">
            <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-spin" />
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{t('loadingEvents')}</p>
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-8 py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">{t('failedToLoadEvents')}</p>
            <p className="text-red-700 dark:text-red-300 mb-6">{t('errorOccurredWhileFetchingEvents')}</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 text-white px-6 py-3 font-bold hover:bg-red-700 disabled:opacity-60 transition-colors disabled:cursor-not-allowed"
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('retry')}
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 px-8 py-20 text-center">
            <Images className="h-16 w-16 text-blue-300 dark:text-blue-600 mx-auto mb-4" />
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('emptyEvents')}</p>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">{t('emptyEventsSubtitle')}</p>
            <button
              type="button"
              onClick={() => navigate('/memories/events/new')}
              className="inline-flex items-center gap-2 rounded-full bg-[#141210] px-6 py-3 font-bold text-[#fffcf8] transition-colors hover:bg-[#1f3a34] dark:bg-[#fffcf8] dark:text-[#141210] dark:hover:bg-white"
            >
              <Plus className="h-5 w-5" />
              {t('createFirst')}
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="me-state-card rounded-2xl border-2 border-dashed px-8 py-16 text-center">
            <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">
              {nameFilter.trim() ? t('noEventsMatch', { searchQuery: nameFilter.trim() }) : t('noEventsFound')}
            </p>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{t('tryDifferentSearchTerm')}</p>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-blue-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all"
            >
              <X className="h-4 w-4" />
              {t('clearFilters')}
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {groupedEvents.map((group) => (
              <section key={group.key} aria-labelledby={`event-group-${group.key}`}>
                <div className="mb-4 flex flex-wrap items-baseline gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h2
                    id={`event-group-${group.key}`}
                    className="me-group-heading text-lg font-semibold inline-flex items-center gap-2"
                  >
                    <Calendar className="h-5 w-5 text-indigo-500 dark:text-indigo-400" aria-hidden />
                    {group.label}
                  </h2>
                  <span className="me-group-count text-sm">
                    {t('groupEventCount', { count: group.events.length })}
                  </span>
                </div>
                <div className="me-events-grid">
                  {group.events.map((event) => (
                    <MemoriesEventCard
                      key={event.id}
                      event={event}
                      t={t}
                      onOpen={(id) => navigate(`/memories/events/${id}`)}
                      onEdit={(id) => navigate(`/memories/events/${id}/edit`)}
                      onPhotobook={setPhotobookForEvent}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      </div>
    </div>
  );
};

export default MemoriesEventsListPage;
