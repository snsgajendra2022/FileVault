import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { FaPlus, FaSearch, FaStar, FaUser } from 'react-icons/fa';
import { listPhoneBookContacts, type PhoneBookContact, type PhoneBookContactType } from '../../api/services/phoneBookService';
import { usePhoneBookPrefsStore } from '../../state/stores/phoneBookPrefsStore';

const CONTACT_TYPES: PhoneBookContactType[] = [
  'Client',
  'Family',
  'Bride/Groom',
  'Event Organizer',
  'Photographer',
  'Staff',
  'VIP Customer',
  'Other',
];

const CONTACT_TYPE_I18N_KEY: Record<PhoneBookContactType, string> = {
  Client: 'Client',
  Family: 'Family',
  'Bride/Groom': 'BrideGroom',
  'Event Organizer': 'EventOrganizer',
  Photographer: 'Photographer',
  Staff: 'Staff',
  'VIP Customer': 'VipCustomer',
  Other: 'Other',
};

const PhoneBookListPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<PhoneBookContactType | 'all'>('all');

  const favoriteContactIds = usePhoneBookPrefsStore((s) => s.favoriteContactIds);
  const toggleFavorite = usePhoneBookPrefsStore((s) => s.toggleFavorite);

  const contactTypeLabel = React.useCallback(
    (type: string) => {
      const key = CONTACT_TYPE_I18N_KEY[type as PhoneBookContactType] ?? 'Other';
      return t(`phoneBookListPage.contactTypes.${key}`);
    },
    [t]
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['phoneBookContacts', search],
    queryFn: async () => listPhoneBookContacts({ search, limit: 50, offset: 0 }),
    staleTime: 30_000,
  });

  const contacts = React.useMemo(() => {
    const all = data?.contacts ?? [];
    if (typeFilter === 'all') return all;
    return all.filter((c) => (c.meta?.contactType || 'Other') === typeFilter);
  }, [data?.contacts, typeFilter]);

  const favorites = React.useMemo(
    () => contacts.filter((c) => favoriteContactIds.has(c.id)),
    [contacts, favoriteContactIds]
  );

  const grouped = React.useMemo(() => {
    const groups = new Map<string, PhoneBookContact[]>();
    contacts.forEach((c) => {
      const ch = (c.displayName || '?').trim().slice(0, 1).toUpperCase();
      const key = /[A-Z]/.test(ch) ? ch : '#';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });
    const keys = Array.from(groups.keys()).sort((a, b) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
    return keys.map((k) => ({
      letter: k,
      items: (groups.get(k) ?? []).sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }));
  }, [contacts]);

  const TypePill = ({ label, active }: { label: string; active: boolean }) => (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
        active
          ? 'border-violet-300 bg-violet-50 text-violet-800 shadow-sm'
          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
      }`}
    >
      {label}
    </span>
  );

  const ContactCard = ({ c }: { c: PhoneBookContact }) => {
    const phone = c.mobile ? (c.mobile.startsWith('+') ? c.mobile : `${(c.countryCode || '').replace(/\s/g, '')}${c.mobile}`) : '';
    const type = c.meta?.contactType || 'Other';
    const isFav = favoriteContactIds.has(c.id);
    return (
      <div className="portal-card group relative overflow-hidden rounded-3xl p-4 transition-all hover:border-violet-200 dark:hover:border-violet-700 hover:shadow-md">
        <Link
          to={`/phonebook/${encodeURIComponent(c.id)}`}
          className="absolute inset-0"
          aria-label={t('phoneBookListPage.openContact', { name: c.displayName })}
        />
        <div className="relative flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/80">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-600">
                {c.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">{c.displayName}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(c.id);
                }}
                className={`relative z-10 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                  isFav
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <FaStar className={`h-3 w-3 ${isFav ? 'text-amber-500' : 'text-slate-400'}`} />
                  {isFav ? t('phoneBookListPage.fav') : t('phoneBookListPage.star')}
                </span>
              </button>
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">{[phone, c.email].filter(Boolean).join(' · ') || '—'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                {contactTypeLabel(type)}
              </span>
              {c.meta?.inviteStatus ? (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {c.meta.inviteStatus}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="portal-page-surface min-h-[calc(100dvh-4rem)] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">{t('phoneBookListPage.eyebrow')}</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              {t('phoneBookListPage.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{t('phoneBookListPage.subtitle')}</p>
          </div>
          <Link
            to="/phonebook/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--header-background)] from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold shadow-lg shadow-violet-500/25 hover:opacity-95"
          >
            <FaPlus className="h-4 w-4" />
            {t('phoneBookListPage.addContact')}
          </Link>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="portal-card flex items-center gap-3 rounded-3xl px-4 py-3">
            <FaSearch className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('phoneBookListPage.searchPlaceholder')}
              className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto rounded-3xl border border-slate-200/90 bg-white px-3 py-2 shadow-sm">
            <button type="button" onClick={() => setTypeFilter('all')} className="shrink-0">
              <TypePill label={t('phoneBookListPage.filterAll')} active={typeFilter === 'all'} />
            </button>
            {CONTACT_TYPES.map((contactType) => (
              <button key={contactType} type="button" onClick={() => setTypeFilter(contactType)} className="shrink-0">
                <TypePill label={contactTypeLabel(contactType)} active={typeFilter === contactType} />
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-[92px] animate-pulse rounded-3xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : isError ? (
          <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
            {t('phoneBookListPage.loadFailed')}
            <button type="button" className="ml-2 font-semibold underline underline-offset-4" onClick={() => refetch()}>
              {t('common.retry')}
            </button>
          </div>
        ) : contacts.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-slate-200/90 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
              <FaUser className="h-5 w-5" />
            </div>
            <p className="text-base font-bold text-slate-900">{t('phoneBookListPage.emptyTitle')}</p>
            <p className="mt-2 text-sm text-slate-600">{t('phoneBookListPage.emptyBody')}</p>
            <Link
              to="/phonebook/new"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--header-background)] from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold  shadow-md shadow-violet-500/20 hover:opacity-95"
            >
              <FaPlus className="h-4 w-4" />
              {t('phoneBookListPage.addContact')}
            </Link>
          </div>
        ) : (
          <div className="mt-7 space-y-8">
            {favorites.length > 0 && (
              <section>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">{t('phoneBookListPage.favorites')}</h2>
                  <p className="text-xs text-slate-400">{favorites.length}</p>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {favorites.slice(0, 6).map((c) => (
                    <ContactCard key={c.id} c={c} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">{t('phoneBookListPage.allContacts')}</h2>
                <p className="text-xs text-slate-400">{contacts.length}</p>
              </div>

              <div className="mt-4 space-y-6">
                {grouped.map((g) => (
                  <div key={g.letter}>
                    <div className="sticky top-[72px] z-10 -mx-1 mb-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
                        {g.letter}
                        <span className="text-[10px] font-semibold text-slate-400">{g.items.length}</span>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {g.items.map((c) => (
                        <ContactCard key={c.id} c={c} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneBookListPage;
