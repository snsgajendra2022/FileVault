import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/context/AuthContext';
import {
  regularNavigation,
  studioNavigation,
  adminNavigation,
} from './navConfig';
import {
  getRoleFromAccountType,
  filterNavigationByRolePermissions,
} from '../../utils/portalSettings';
import { FaCog, FaCrown, FaSignOutAlt, FaHeart } from 'react-icons/fa';


const STUDIO_GROUPS = [
  { label: 'Main',     keys: ['nav.studio.dashboard','nav.studio.myImages','nav.studio.album','nav.studio.uploadFamily'] },
  { label: 'Memories', keys: ['nav.studio.ourMemories','nav.studio.photoBooks','nav.studio.photoThemes','nav.studio.sharedAlbums'] },
  { label: 'People',   keys: ['nav.studio.createMembers','nav.studio.membersTree','nav.studio.phoneBook'] },
  { label: 'Account',  keys: ['nav.studio.selectPay','nav.studio.paymentManagement','nav.studio.services'] },
];

function getInitials(firstName?: string, lastName?: string, username?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (username) return username.slice(0, 2).toUpperCase();
  return 'OM';
}

function NavItem({ item, isActive }: {
  item: { labelKey: string; href: string; icon: React.ComponentType<{ className?: string }> };
  isActive: boolean;
}) {
  const { t }:any = useTranslation();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      title={t(item.labelKey)}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
        transition-colors duration-150 select-none
        ${isActive ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100'}`}
    >
      <Icon className={`h-4 w-4 shrink-0 transition-colors duration-150
        ${isActive ? 'text-violet-600 dark:text-violet-300' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
      <span className="truncate">{t(item.labelKey)}</span>
    </NavLink>
  );
}

const Sidebar = () => {
  const { user, isAdmin, logout } = useAuth() as any;
  const location = useLocation();
  const { t }:any = useTranslation();
  const navigationItems = regularNavigation;
  const studioNavigationItems = studioNavigation;
  const adminNavigationItems = adminNavigation;
  const route = useNavigate();
  // Get user role from account type
  const userRole = React.useMemo(() => getRoleFromAccountType(user?.accountType), [user?.accountType]);

  // Apply permission-based filtering to navigation
  const filteredRegularNav = React.useMemo(
    () => filterNavigationByRolePermissions(navigationItems, userRole),
    [userRole]
  );

  const filteredStudioNav = React.useMemo(
    () => filterNavigationByRolePermissions(studioNavigationItems, userRole),
    [userRole]
  );

  const filteredAdminNav = React.useMemo(
    () => filterNavigationByRolePermissions(adminNavigationItems, userRole),
    [userRole]
  );

  // Runtime menu visibility flags
  // Priority order: window.__MENU_FLAGS__ > localStorage('MENU_FLAGS') > defaults
  const menuFlags = React.useMemo(() => {
    const defaults = { regular: true, studio: true, admin: isAdmin } as { regular: boolean; studio: boolean; admin: boolean };
    try {
      // @ts-ignore
      const winFlags = typeof window !== 'undefined' ? (window.__MENU_FLAGS__ as any) : undefined;
      if (winFlags && typeof winFlags === 'object') return { ...defaults, ...winFlags };
      const raw = typeof window !== 'undefined' ? localStorage.getItem('MENU_FLAGS') : null;
      if (raw) { const p = JSON.parse(raw); if (p && typeof p === 'object') return { ...defaults, ...p }; }
    } catch (_) {}
    return defaults;
  }, [isAdmin]);

  const studioItems = studioNavigation.items.filter((i) => i.enabled !== false);
  const adminItems  = adminNavigation.items.filter((i) => i.enabled !== false);

  const isAdminActive = (href: string) =>
    location.pathname + location.search === href ||
    (href.includes('?') && location.pathname === '/admin' && location.search === '?' + href.split('?')[1]);

  const initials    = getInitials(user?.firstName, user?.lastName, user?.username);
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'User';
  const accountType = user?.accountType ?? 'FREE';
  const badgeLabel  = accountType === 'ADMIN' ? 'Admin' : accountType === 'PREMIUM' ? 'Premium' : 'Free';
  const badgeCls    = accountType === 'ADMIN' ? 'text-purple-600' : accountType === 'PREMIUM' ? 'text-amber-600' : 'text-slate-500';

  return (
    <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:z-50 w-[240px]">
      <div className="h-full bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 overflow-y-auto
        scrollbar-thin scrollbar-thumb-slate-100 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent transition-colors duration-200">

        {/* ── Brand ── */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-sm shrink-0">
              <FaHeart className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 leading-none mb-0.5">
                Memories Platform
              </p>
              <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {isAdmin ? 'Admin Panel' : 'Our Memories'}
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation */}
        {/* <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
             {!isAdmin && menuFlags.regular  && (
            <>
              {filteredRegularNav.active === true && filteredRegularNav.items.filter(i=>i.enabled!==false).map((item) => (
                <NavLink
                key={item.href}
                to={item.href}
                data-ai-action={`open-route-${item.href.replace(/\//g, '-').replace(/^-+/, '')}`}
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
                    {isActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
                    )}
                    
                    <div className={`relative ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      <item.icon className="h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <span className="font-semibold">{t(item.labelKey)}</span>
                    
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                  </>
                )}
              </NavLink>
                ))}
              {menuFlags.studio === true && filteredStudioNav.active === true
               && 
               filteredStudioNav.items.filter(i=>i.enabled!==false).map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  data-ai-action={`open-route-${item.href.replace(/\//g, '-').replace(/^-+/, '')}`}
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
                      {isActive && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
                      )}
                      
                      <div className={`relative ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-[#2731db]'}`}>
                        <item.icon className="h-5 w-5 mr-3 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <span className="font-semibold">{t(item.labelKey)}</span>
                      
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-400 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav> */}
        {/* ── Navigation ── */}
        <nav className="px-4 pt-5 pb-3">
          {!isAdmin && menuFlags.studio && studioNavigation.active &&
            STUDIO_GROUPS.map((group) => {
              const items = group.keys.map((k) => studioItems.find((i) => i.labelKey === k)).filter(Boolean) as typeof studioItems;
              if (!items.length) return null;
              return (
                <div key={group.label} className="mb-6 last:mb-0">
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <NavItem
                        key={item.href}
                        item={item}
                        isActive={location.pathname === item.href || location.pathname + location.search === item.href}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          }

          {isAdmin && menuFlags.admin && adminNavigation.active && (
            <div>
              <>
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-100">
                <FaCrown className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-purple-600">Admin Panel</p>
              </div>
              
              {filteredAdminNav.active === true && filteredAdminNav.items.filter(i=>i.enabled!==false).map((item) => {
                // For admin items with query params, check both pathname and search
                const isAdminItemActive = location.pathname + location.search === item.href ||
                  (item.href.includes('?') && location.pathname === '/admin' && location.search === '?' + item.href.split('?')[1]);
                return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  data-ai-action={`open-route-${item.href.replace(/[/?=&]/g, '-').replace(/^-+/, '')}`}
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
              <div className="space-y-1">
                {adminItems.map((item) => (
                  <NavItem key={item.href} item={item} isActive={isAdminActive(item.href)} />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* ── Bottom ── */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={()=>route('portal-settings')}
            className="group w-full flex items-center gap-3 rounded-lg px-3 py-2.5
              text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors duration-150"
          >
            <FaCog className="h-[15px] w-[15px] shrink-0 text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300" />
            <span>Settings</span>
          </button>
          {typeof logout === 'function' && (
            <button
              type="button"
              onClick={logout}
              className="group w-full flex items-center gap-3 rounded-lg px-3 py-2.5
                text-sm font-medium text-slate-500 dark:text-slate-400
                hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-150"
            >
              <FaSignOutAlt className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-red-500 dark:group-hover:text-red-400" />
              <span>Logout</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Sidebar;
