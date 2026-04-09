import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaCalendarAlt, FaImages, FaHeart, FaEye } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { listMemoriesEvents } from '../../services/memoriesService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const MemoriesDashboardPage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const { data, isLoading } = useQuery({
    queryKey: ['memoriesEvents'],
    queryFn: listMemoriesEvents,
    staleTime: 15_000,
  });
  const events = Array.isArray(data) ? data : [];

  const totalImages = events.reduce((acc, e) => acc + e.images.length, 0);
  const totalLikes = events.reduce(
    (acc, e) => acc + e.images.reduce((a, i) => a + i.likes, 0),
    0
  );
  const totalViews = events.reduce((acc, e) => acc + e.views, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{t('dashboardTitle')}</h1>
          <p className="mt-1 text-slate-500 text-sm">{t('dashboardSubtitle')}</p>
        </div>
        <Link
          to="/memories/events/new"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 hover:opacity-95 transition-opacity"
        >
          <FaPlus className="h-4 w-4" />
          {t('newEvent')}
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <LoadingSpinner size="lg" text={t('refresh')} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
        {[
          { label: t('statEvents'), value: events.length, icon: FaCalendarAlt, tone: 'from-violet-500 to-indigo-600' },
          { label: t('statPhotos'), value: totalImages, icon: FaImages, tone: 'from-fuchsia-500 to-pink-600' },
          { label: t('statLikes'), value: totalLikes, icon: FaHeart, tone: 'from-rose-500 to-orange-500' },
          { label: t('statViews'), value: totalViews, icon: FaEye, tone: 'from-cyan-500 to-blue-600' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
          >
            <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${tone} text-white mb-3`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
            <div className="text-xs font-medium text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">{t('quickLinks')}</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/memories/events" className="text-violet-600 font-semibold text-sm hover:underline">
            {t('allEvents')} →
          </Link>
          <Link to="/photo-book" className="text-slate-600 font-medium text-sm hover:text-violet-600">
            {t('openPhotoBooks')} →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MemoriesDashboardPage;
