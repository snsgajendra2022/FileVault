import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/context/AuthContext';
import {
  regularNavigation,
  studioNavigation,
  adminNavigation,
  usersNavigation,
} from './navConfig';
import {
  getResolvedPortalRole,
  filterNavigationByRolePermissions,
  loadPortalGeneralSettings,
  loadMenuFlags,
  subscribePortalSettings,
} from '../../utils/portalSettings';
import { usePortalSettingsOptional } from '../../state/context/PortalSettingsContext';
import { FaCog, FaCrown, FaSignOutAlt, FaHeart } from 'react-icons/fa';

/** Grouped studio menu (matches Navigation.tsx + navConfig). */
const STUDIO_GROUPS = [
  {
    label: 'Main',
    keys: [
      'nav.studio.dashboard',
      'nav.studio.uploadFamily',
      'nav.studio.myImages',
      'nav.studio.filterImages',
      'nav.studio.album',
    ],
  },
  {
    label: 'Memories',
    keys: ['nav.studio.ourMemories', 'nav.studio.photoBooks', 'nav.studio.photoThemes'],
  },
  {
    label: 'People',
    keys: ['nav.studio.createMembers', 'nav.studio.membersTree', 'nav.studio.phoneBook'],
  },
  {
    label: 'Account',
    keys: [
      'nav.studio.settings',
      'nav.studio.selectPay',
      'nav.studio.paymentManagement',
      'nav.studio.services',
      'nav.studio.whatsapp',
    ],
  },
];

/** Subset for USERS role (usersNavigation in navConfig). */
const USERS_GROUPS = [
  {
    label: 'Main',
    keys: [
      'nav.studio.dashboard',
      'nav.studio.uploadFamily',
      'nav.studio.myImages',
      'nav.studio.filterImages',
      'nav.studio.album',
    ],
  },
  { label: 'Memories', keys: ['nav.studio.ourMemories'] },
  { label: 'People', keys: ['nav.studio.createMembers'] },
  { label: 'Account', keys: ['nav.studio.settings', 'nav.studio.services'] },
];

function NavItem({
  item,
  isActive,
}: {
  item: { labelKey: string; href: string; icon: React.ComponentType<{ className?: string }> };
  isActive: boolean;
}) {
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      title={t(item.labelKey)}
      data-ai-action={`open-route-${item.href.replace(/[/?=&]/g, '-').replace(/^-+/, '')}`}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
        transition-colors duration-150 select-none
        ${isActive ? 'bg-[#EFF6FF] text-[#3B82F6] font-semibold' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'}`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 transition-colors duration-150
        ${isActive ? 'text-[#3B82F6]' : 'text-slate-400 group-hover:text-slate-500'}`}
      />
      <span className="truncate">{t(item.labelKey)}</span>
    </NavLink>
  );
}

function NavGroups({
  groups,
  items,
  location,
}: {
  groups: typeof STUDIO_GROUPS;
  items: Array<{ labelKey: string; href: string; icon: React.ComponentType<{ className?: string }> }>;
  location: ReturnType<typeof useLocation>;
}) {
  return (
    <>
      {groups.map((group) => {
        const groupItems = group.keys
          .map((k) => items.find((i) => i.labelKey === k))
          .filter(Boolean) as typeof items;
        if (!groupItems.length) return null;
        return (
          <div key={group.label} className="mb-6 last:mb-0">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              {group.label}
            </p>
            <div className="space-y-1">
              {groupItems.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={
                    location.pathname === item.href ||
                    location.pathname + location.search === item.href
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

const Sidebar = () => {
  const { user, logout } = useAuth() as any;
  const location = useLocation();
  const route = useNavigate();
  const { t } = useTranslation();
  const portalCtx = usePortalSettingsOptional();
  const [navTick, setNavTick] = React.useState(0);

  const userRole = React.useMemo(
    () => getResolvedPortalRole(user),
    [user?.role, user?.accountType]
  );

  React.useEffect(() => subscribePortalSettings(() => setNavTick((n) => n + 1)), []);

  const filteredStudioNav = React.useMemo(
    () => filterNavigationByRolePermissions(studioNavigation, userRole),
    [userRole, navTick, portalCtx?.config.updatedAt]
  );

  const filteredUsersNav = React.useMemo(
    () => filterNavigationByRolePermissions(usersNavigation, userRole),
    [userRole, navTick, portalCtx?.config.updatedAt]
  );

  const filteredAdminNav = React.useMemo(
    () => filterNavigationByRolePermissions(adminNavigation, userRole),
    [userRole, navTick, portalCtx?.config.updatedAt]
  );

  const filteredRegularNav = React.useMemo(
    () => filterNavigationByRolePermissions(regularNavigation, userRole),
    [userRole, navTick, portalCtx?.config.updatedAt]
  );

  const menuFlags = React.useMemo(() => {
    const flags = loadMenuFlags();
    return { ...flags, admin: userRole === 'admin' ? flags.admin : false };
  }, [userRole, portalCtx?.config.updatedAt]);

  const portalName =
    portalCtx?.config.settings.portalName ?? loadPortalGeneralSettings().portalName;

  const studioItems = filteredStudioNav.items;
  const usersItems = filteredUsersNav.items;
  const adminItems = filteredAdminNav.items;
  const regularItems = filteredRegularNav.items;

  const showAdminNav = userRole === 'admin' && menuFlags.admin && adminNavigation.active;
  const showStudioNav = userRole === 'studio' && menuFlags.studio && studioNavigation.active;
  const showUsersNav = userRole === 'users' && menuFlags.users && usersNavigation.active;
  const showRegularNav =
    userRole === 'regular' && menuFlags.regular && regularNavigation.active;

  const isAdminActive = (href: string) =>
    location.pathname + location.search === href ||
    (href.includes('?') &&
      location.pathname === '/admin' &&
      location.search === '?' + href.split('?')[1]);

  return (
    <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:z-50 w-[240px]">
      <div
        className="h-full bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 overflow-y-auto
        scrollbar-thin scrollbar-thumb-slate-100 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent transition-colors duration-200"
      >
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
                {showAdminNav ? 'Admin Panel' : portalName}
              </p>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5 capitalize">{userRole}</p>
            </div>
          </div>
        </div>

        <nav className="px-4 pt-5 pb-3">
          {showStudioNav && (
            <NavGroups groups={STUDIO_GROUPS} items={studioItems} location={location} />
          )}

          {showUsersNav && (
            <NavGroups groups={USERS_GROUPS} items={usersItems} location={location} />
          )}

          {showRegularNav && (
            <div className="space-y-1">
              {regularItems.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={location.pathname === item.href}
                />
              ))}
            </div>
          )}

          {showAdminNav && (
            <div>
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900">
                <FaCrown className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-purple-600 dark:text-purple-400">
                  Admin Panel
                </p>
              </div>
              <div className="space-y-1">
                {adminItems.map((item) => (
                  <NavItem key={item.href} item={item} isActive={isAdminActive(item.href)} />
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 space-y-1">
          {!showAdminNav && (
            <button
              type="button"
              onClick={() => route('/portal-settings')}
              className="group w-full flex items-center gap-3 rounded-lg px-3 py-2.5
              text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors duration-150"
            >
              <FaCog className="h-[15px] w-[15px] shrink-0 text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300" />
              <span>{t('nav.studio.settings', 'Settings')}</span>
            </button>
          )}
          {typeof logout === 'function' && (
            <button
              type="button"
              onClick={logout}
              className="group w-full flex items-center gap-3 rounded-lg px-3 py-2.5
                text-sm font-medium text-slate-500 dark:text-slate-400
                hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-150"
            >
              <FaSignOutAlt className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-red-500 dark:group-hover:text-red-400" />
              <span>{t('nav.regular.signOut')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
