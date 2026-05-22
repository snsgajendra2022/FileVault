import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './faceSync.css';

const NAV = [
  { segment: 'photos', labelKey: 'faceSync.navPhotos' },
  { segment: 'people', labelKey: 'faceSync.navPeople' },
  { segment: 'suggestions', labelKey: 'faceSync.navSuggestions' },
  // { segment: 'upload', labelKey: 'faceSync.navUpload' },
] as const;

const FaceSyncShell: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [globalSearch, setGlobalSearch] = React.useState('');

  const onGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = globalSearch.trim();
    navigate(q ? `/filter-images/people?q=${encodeURIComponent(q)}` : '/filter-images/people');
  };

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-[#EFF6FF] text-[#2563EB] shadow-sm'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <div className="face-sync-in-layout min-w-0 text-slate-900">
      <div className="mb-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 sm:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {t('faceSync.menu')}
          </button>
          <nav
            className={`${mobileOpen ? 'flex' : 'hidden'} w-full flex-wrap gap-1 sm:flex sm:w-auto`}
            aria-label={t('faceSync.navAria')}
          >
            {NAV.map(({ segment, labelKey }) => (
              <NavLink key={segment} to={segment} className={tabClass} onClick={() => setMobileOpen(false)}>
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>
          </div>
          <div className="hidden min-w-0 flex-1 sm:block sm:max-w-md">
            <input
              type="search"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={onGlobalSearch}
              autoComplete="off"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition focus:border-[#2563EB]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              placeholder={t('faceSync.searchPlaceholder')}
            />
          </div>
        </div>

        <div className="mt-3 sm:hidden">
          <input
            type="search"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onKeyDown={onGlobalSearch}
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"
            placeholder={t('faceSync.searchPlaceholder')}
          />
        </div>
      </div>

      <div id="filter-images-main" className="page-enter min-w-0">
        <Outlet />
      </div>
    </div>
  );
};

export default FaceSyncShell;
