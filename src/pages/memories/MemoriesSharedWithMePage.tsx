import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { FaArrowLeft, FaChevronRight, FaImages, FaUser } from 'react-icons/fa';
import {
  fetchSharedMemoriesEventsForMe,
  type SharedMemoriesEventRow,
} from '../../services/memoriesShareService';

const MemoriesSharedWithMePage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sharedMemoriesEvents'],
    queryFn: fetchSharedMemoriesEventsForMe,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  const rows: SharedMemoriesEventRow[] = data ?? [];

  const openUrl = (r: SharedMemoriesEventRow) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const u = new URL(`${origin}/memories/e/${r.slug}`);
    if (r.accessToken) u.searchParams.set('token', r.accessToken);
    return u.toString();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
      <Link
        to="/memories/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-600 mb-6"
      >
        <FaArrowLeft className="h-3 w-3" />
        {t('backToEvents')}
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('sharedWithMeTitle')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('sharedWithMeSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm font-semibold text-violet-600 hover:underline shrink-0"
        >
          {t('refresh')}
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('sharedLoadError')}
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-16 text-center">
          <FaImages className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">{t('sharedEmpty')}</p>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={`${r.eventId}-${r.slug}`}>
              <a
                href={openUrl(r)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm hover:border-violet-200 hover:shadow-md transition-all group"
              >
                <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
                  <FaImages className="h-6 w-6 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate group-hover:text-violet-700">
                    {r.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <FaUser className="h-3 w-3 shrink-0" />
                    {r.sharedByUsername || r.sharedByEmail || t('sharedByUnknown')}
                    {r.sharedAt && (
                      <>
                        <span className="text-slate-300">·</span>
                        {new Date(r.sharedAt).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
                <FaChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MemoriesSharedWithMePage;
