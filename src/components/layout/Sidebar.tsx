import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/context/AuthContext';
import {
  STUDIO_SIDEBAR_GROUPS,
  USERS_SIDEBAR_GROUPS,
  assignItemsToSidebarGroups,
  isRoleMenuVisible,
  useRoleNavigation,
  type NavItem,
  type SidebarGroupDef,
} from './navConfig';
import { getResolvedPortalRole, loadPortalGeneralSettings } from '../../utils/portalSettings';
import { usePortalSettingsOptional } from '../../state/context/PortalSettingsContext';
import { FaCog, FaCrown, FaSignOutAlt, FaHeart } from 'react-icons/fa';

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
  groups: readonly SidebarGroupDef[];
  items: NavItem[];
  location: ReturnType<typeof useLocation>;
}) {
  const { grouped, ungrouped, groupOrder } = assignItemsToSidebarGroups(items, groups);

  return (
    <>
      {groupOrder.map((label) => {
        const groupItems = grouped.get(label);
        if (!groupItems?.length) return null;
        return (
          <div key={label} className="mb-6 last:mb-0">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              {label}
            </p>
            <div className="space-y-1">
              {groupItems.map((item) => (
                <NavItem
                  key={`${item.labelKey}-${item.href}`}
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
      {ungrouped.length > 0 ? (
        <div className="mb-6 last:mb-0 space-y-1">
          {ungrouped.map((item) => (
            <NavItem
              key={`${item.labelKey}-${item.href}`}
              item={item}
              isActive={
                location.pathname === item.href ||
                location.pathname + location.search === item.href
              }
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

const Sidebar = () => {
  const { user, logout } = useAuth() as any;
  const location = useLocation();
  const route = useNavigate();
  const { t } = useTranslation();
  const portalCtx = usePortalSettingsOptional();

  const userRole = React.useMemo(
    () => getResolvedPortalRole(user),
    [user?.role, user?.accountType]
  );

  const { nav: roleNav, config: portalConfig } = useRoleNavigation(userRole);

  const portalName =
    portalCtx?.config.settings.portalName ??
    portalConfig?.settings.portalName ??
    loadPortalGeneralSettings().portalName;

  const roleItems = roleNav.items;

  const showAdminNav = userRole === 'admin' && isRoleMenuVisible('admin', portalConfig) && roleNav.active;
  const showStudioNav = userRole === 'studio' && isRoleMenuVisible('studio', portalConfig) && roleNav.active;
  const showUsersNav = userRole === 'users' && isRoleMenuVisible('users', portalConfig) && roleNav.active;
  const showRegularNav = userRole === 'regular' && isRoleMenuVisible('regular', portalConfig) && roleNav.active;

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
            <NavGroups groups={STUDIO_SIDEBAR_GROUPS} items={roleItems} location={location} />
          )}

          {showUsersNav && (
            <NavGroups groups={USERS_SIDEBAR_GROUPS} items={roleItems} location={location} />
          )}

          {showRegularNav && (
            <div className="space-y-1">
              {roleItems.map((item) => (
                <NavItem
                  key={`${item.labelKey}-${item.href}`}
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
                {roleItems.map((item) => (
                  <NavItem key={`${item.labelKey}-${item.href}`} item={item} isActive={isAdminActive(item.href)} />
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 space-y-1">
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
