import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { FaCog, FaCrown } from 'react-icons/fa';
import {
  regularNavigation,
  studioNavigation,
  adminNavigation,
} from './navConfig';

const Sidebar = () => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  const navigationItems = regularNavigation;
  const studioNavigationItems = studioNavigation;
  const adminNavigationItems = adminNavigation;

  // Runtime menu visibility flags
  // Priority order: window.__MENU_FLAGS__ > localStorage('MENU_FLAGS') > defaults
  const menuFlags = React.useMemo(() => {
    const defaults = { regular: true, studio: true, admin: isAdmin } as {
      regular: boolean; studio: boolean; admin: boolean;
    };
    try {
      // @ts-ignore - allow external runtime flags
      const winFlags = typeof window !== 'undefined' ? (window.__MENU_FLAGS__ as any) : undefined;
      if (winFlags && typeof winFlags === 'object') {
        return { ...defaults, ...winFlags };
      }
      const raw = typeof window !== 'undefined' ? localStorage.getItem('MENU_FLAGS') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return { ...defaults, ...parsed };
      }
    } catch (_) {
      // ignore parsing errors and fall back to defaults
    }
    return defaults;
  }, [isAdmin]);

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50">
      <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-white via-gray-50 to-gray-100 border-r border-gray-200 shadow-2xl">
        {/* Brand header — dark glass + violet accent (matches app shell) */}
        <div className="relative h-[4.05rem] shrink-0 overflow-hidden border-b border-white/[0.08] bg-[#0c0c0f]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/45 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_0%_0%,rgba(124,58,237,0.22),transparent_55%),radial-gradient(ellipse_100%_70%_at_100%_100%,rgba(217,70,239,0.12),transparent_50%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-6 h-28 w-28 rounded-full bg-fuchsia-500/10 blur-2xl"
            aria-hidden
          />

          <div className="relative z-10 flex h-full items-center gap-3 px-4">
            <div className="relative shrink-0">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-violet-500/50 to-fuchsia-600/40 opacity-60 blur-[2px]" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-lg shadow-violet-950/40 backdrop-blur-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-inner shadow-black/20">
                  <span className="text-[11px] font-bold tracking-wide text-white">OM</span>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {menuFlags.regular === true && navigationItems.active === true && (
                <h1 className="truncate text-[1.05rem] font-bold leading-tight tracking-tight text-white">
                  {t('brand.imageSecurity')}
                </h1>
              )}
              {user?.accountType == 'FREE' && menuFlags.studio === true && studioNavigationItems.active === true && (
                <h1 className="truncate text-[1.05rem] font-bold leading-tight tracking-tight text-white">
                  {t('brand.ourMemories')}
                </h1>
              )}
              {user?.accountType == 'ADMIN' && menuFlags.admin === true && adminNavigationItems.active === true && (
                <h1 className="truncate text-[1.05rem] font-bold leading-tight tracking-tight text-white">
                  {t('brand.adminPanel')}
                </h1>
              )}
              {/* <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.18em] text-violet-200/80">
                {t('header.workspaceHint', { defaultValue: 'Workspace' })}
              </p> */}
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {/* Regular Navigation - Show for non-admin users (controlled by flags) */}
             {!isAdmin && menuFlags.regular  && (
            <>
              {navigationItems.active === true && navigationItems.items.filter(i=>i.enabled!==false).map((item) => (
                <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                    isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl border-r-4 border-blue-400'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-r-4 border-transparent hover:border-gray-200'
                  }`
                }
                >
                {({ isActive }) => (
                  <>
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
                    )}
                    
                    <div className={`relative ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      <item.icon className="h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <span className="font-semibold">{t(item.labelKey)}</span>
                    
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                  </>
                )}
              </NavLink>
                ))}
              
              {/* Photo Book Section */}
              {/* {menuFlags.studio === true && studioNavigationItems.active === true
               &&  
              <div className=" pb-3">
                <div className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-[#2731db]">
                  <FaCamera className="h-4 w-4 text-[#2731db] mr-2" />
                  <h3 className="text-xs font-bold text-[#2731db] uppercase tracking-wider">
                  Our Memories Pro
                  </h3>
                </div>
              </div>
              } */}
              
              {menuFlags.studio === true && studioNavigationItems.active === true
               && 
               studioNavigationItems.items.filter(i=>i.enabled!==false).map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                      isActive
                        ? 'bg-gradient-to-r from-[#2731db] to-[#2731db] text-white shadow-xl border-r-4 border-[#2731db]'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 border-r-4 border-transparent hover:border-[#2731db]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
                      )}
                      
                      <div className={`relative ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-[#2731db]'}`}>
                        <item.icon className="h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <span className="font-semibold">{t(item.labelKey)}</span>
                      
                      {/* Hover glow effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-400 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}

          {/* Admin Navigation - Only show for ADMIN users (controlled by flags) */}
          { isAdmin && menuFlags.admin && (
            <>
              <div className="pt-4 pb-3">
                <div className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <FaCrown className="h-4 w-4 text-purple-600 mr-2" />
                  <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                    {t('brand.adminSection')}
                  </h3>
                </div>
              </div>
              {adminNavigationItems.active === true && adminNavigationItems.items.filter(i=>i.enabled!==false).map((item) => {
                // For admin items with query params, check both pathname and search
                const isAdminItemActive = location.pathname + location.search === item.href ||
                  (item.href.includes('?') && location.pathname === '/admin' && location.search === '?' + item.href.split('?')[1]);
                return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={
                    `group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                      isAdminItemActive
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl border-r-4 border-purple-400'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 border-r-4 border-transparent hover:border-purple-200'
                    }`
                  }
                >
                  <>
                    {/* Active indicator */}
                    {isAdminItemActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
                    )}
                    
                    <div className={`relative ${isAdminItemActive ? 'text-white' : 'text-gray-600 group-hover:text-purple-700'}`}>
                      <item.icon className="h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <span className="font-semibold">{t(item.labelKey)}</span>
                    
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400 to-pink-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                  </>
                </NavLink>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer removed (user chip at bottom of desktop sidebar) */}
      </div>
    </div>
  );
};

export default Sidebar;
