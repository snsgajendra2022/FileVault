import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaChevronRight, FaLock, FaGlobe, FaUserFriends } from 'react-icons/fa';
import { useMemoriesStore } from '../../features/memories/memoriesStore';
import type { MemoriesPrivacy } from '../../features/memories/types';

const privacyIcon = (p: MemoriesPrivacy) => {
  if (p === 'public') return FaGlobe;
  if (p === 'invite') return FaUserFriends;
  return FaLock;
};

const MemoriesEventsListPage: React.FC = () => {
  const { t } = useTranslation(undefined, { keyPrefix: 'memoriesPlatform' });
  const events = useMemoriesStore((s) => s.events);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
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

      {events.length === 0 ? (
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
        <ul className="space-y-3">
          {events.map((ev) => {
            const Icon = privacyIcon(ev.privacy);
            return (
              <li key={ev.id}>
                <Link
                  to={`/memories/events/${ev.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm hover:border-violet-200 hover:shadow-md transition-all group"
                >
                  <div className="h-16 w-16 shrink-0 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 overflow-hidden">
                    {ev.coverImageUrl ? (
                      <img src={ev.coverImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-violet-400 text-xs font-bold">
                        OM
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate group-hover:text-violet-700 transition-colors">
                      {ev.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <Icon className="h-3 w-3" />
                      {t(`privacy.${ev.privacy}`)}
                      <span className="text-slate-300">·</span>
                      {ev.images.length} {t('photos')}
                    </div>
                  </div>
                  <FaChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MemoriesEventsListPage;
