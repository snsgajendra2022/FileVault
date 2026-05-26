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
} from './navConfig';
import { getResolvedPortalRole, loadPortalGeneralSettings } from '../../utils/portalSettings';
import { FaTimes, FaCrown, FaCog, FaSignOutAlt, FaHeart, FaChevronRight } from 'react-icons/fa';
import { usePortalSettingsOptional } from 'src/state/context/PortalSettingsContext';

function getInitials(firstName?: string, lastName?: string, username?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (username) return username.slice(0, 2).toUpperCase();
  return 'OM';
}

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

const Navigation = ({ isOpen, onClose }: NavigationProps) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth() as any;
  const location = useLocation();
  const route = useNavigate();
  const portalCtx = usePortalSettingsOptional();
  const userRole = React.useMemo(
    () => getResolvedPortalRole(user),
    [user?.role, user?.accountType]
  );
  const { nav: roleNav, config: portalConfig } = useRoleNavigation(userRole);
  const showAdminNav = userRole === 'admin' && isRoleMenuVisible('admin', portalConfig) && roleNav.active;
  const showStudioNav = userRole === 'studio' && isRoleMenuVisible('studio', portalConfig) && roleNav.active;
  const showUsersNav = userRole === 'users' && isRoleMenuVisible('users', portalConfig) && roleNav.active;
  const showRegularNav = userRole === 'regular' && isRoleMenuVisible('regular', portalConfig) && roleNav.active;
  const portalName =
    portalCtx?.config.settings.portalName ??
    portalConfig?.settings.portalName ??
    loadPortalGeneralSettings().portalName;
  const roleItems = roleNav.items;
  const isAdmin = userRole === 'admin';
  const isStudio = userRole === 'studio';
  const isUsers = userRole === 'users';

  const isAdminActive = (href: string) =>
    location.pathname + location.search === href ||
    (href.includes('?') && location.pathname === '/admin' &&
      location.search === '?' + href.split('?')[1]);

  const initials    = getInitials(user?.firstName, user?.lastName, user?.username);
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'User';
  const accountType = user?.accountType ?? 'FREE';
  const badgeCls    = accountType === 'ADMIN'
    ? 'bg-purple-100 text-purple-600'
    : accountType === 'PREMIUM'
    ? 'bg-amber-100 text-amber-600'
    : 'bg-slate-100 text-slate-500';
  const badgeLabel  = accountType === 'ADMIN' ? 'Admin' : accountType === 'PREMIUM' ? 'Premium' : 'Free';

  return (
    <>
      {/* Soft overlay */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer — same premium style as desktop sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col border-r border-slate-100 bg-white shadow-[4px_0_32px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 dark:shadow-[4px_0_32px_rgba(0,0,0,0.45)] lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* ── Brand ──────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 pb-4 pt-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-300 shadow-sm">
              <FaHeart className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 leading-none mb-0.5">
              {portalName} Platform
              </p>
              <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {showAdminNav ? 'Admin Panel' : portalName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close menu"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <nav
          className="overflow-y-auto px-3 pt-4 pb-2 scrollbar-thin scrollbar-thumb-slate-100"
          style={{ flex: '1 1 0', minHeight: 0 }}
        >
          {isStudio && isRoleMenuVisible('studio', portalConfig) && roleNav.active && (() => {
            const { grouped, ungrouped, groupOrder } = assignItemsToSidebarGroups(roleItems, STUDIO_SIDEBAR_GROUPS);
            return (
              <>
                {groupOrder.map((label) => {
                  const items = grouped.get(label);
                  if (!items?.length) return null;
                  return (
                    <div key={label} className="mb-5 last:mb-0">
                      <p className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {label}
                      </p>
                      <div className="space-y-0.5">
                        {items.map((item) => {
                          const Icon = item.icon;
                          const active =
                            location.pathname === item.href ||
                            location.pathname + location.search === item.href;
                          return (
                            <NavLink
                              key={`${item.labelKey}-${item.href}`}
                              to={item.href}
                              onClick={onClose}
                              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors duration-150 select-none ${
                                active ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                              }`}
                            >
                              <Icon
                                className={`h-[15px] w-[15px] shrink-0 transition-colors duration-150 ${
                                  active ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-500'
                                }`}
                              />
                              <span className="truncate leading-none">{t(item.labelKey)}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {ungrouped.map((item) => {
                  const Icon = item.icon;
                  const active =
                    location.pathname === item.href ||
                    location.pathname + location.search === item.href;
                  return (
                    <NavLink
                      key={`${item.labelKey}-${item.href}`}
                      to={item.href}
                      onClick={onClose}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors duration-150 select-none ${
                        active ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <Icon className="h-[15px] w-[15px] shrink-0" />
                      <span className="truncate leading-none">{t(item.labelKey)}</span>
                    </NavLink>
                  );
                })}
              </>
            );
          })()}

          {isUsers && isRoleMenuVisible('users', portalConfig) && roleNav.active && (() => {
            const { grouped, ungrouped, groupOrder } = assignItemsToSidebarGroups(roleItems, USERS_SIDEBAR_GROUPS);
            return (
              <>
                {groupOrder.map((label) => {
                  const items = grouped.get(label);
                  if (!items?.length) return null;
                  return (
                    <div key={label} className="mb-5 last:mb-0">
                      <p className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {label}
                      </p>
                      <div className="space-y-0.5">
                        {items.map((item) => {
                          const Icon = item.icon;
                          const active =
                            location.pathname === item.href ||
                            location.pathname + location.search === item.href;
                          return (
                            <NavLink
                              key={`${item.labelKey}-${item.href}`}
                              to={item.href}
                              onClick={onClose}
                              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors duration-150 select-none ${
                                active ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                              }`}
                            >
                              <Icon className="h-[15px] w-[15px] shrink-0" />
                              <span className="truncate leading-none">{t(item.labelKey)}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {ungrouped.map((item) => {
                  const Icon = item.icon;
                  const active =
                    location.pathname === item.href ||
                    location.pathname + location.search === item.href;
                  return (
                    <NavLink
                      key={`${item.labelKey}-${item.href}`}
                      to={item.href}
                      onClick={onClose}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-500"
                    >
                      <Icon className="h-[15px] w-[15px] shrink-0" />
                      <span className="truncate leading-none">{t(item.labelKey)}</span>
                    </NavLink>
                  );
                })}
              </>
            );
          })()}

          {userRole === 'regular' && isRoleMenuVisible('regular', portalConfig) && roleNav.active && (
            <div className="space-y-0.5">
              {roleItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.href;
                return (
                  <NavLink
                    key={`${item.labelKey}-${item.href}`}
                    to={item.href}
                    onClick={onClose}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
                      active ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-[15px] w-[15px] shrink-0" />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                );
              })}
            </div>
          )}

          {isAdmin && isRoleMenuVisible('admin', portalConfig) && roleNav.active && (
              <div>
              <>
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-100">
                <FaCrown className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-purple-600">Admin Panel</p>
              </div>
              
              {roleNav.active === true && roleItems.filter(i=>i.enabled!==false).map((item) => {
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
              {/* <div className="space-y-1">
                {adminItems.map((item) => (
                  <NavItem key={item.href} item={item} isActive={isAdminActive(item.href)} />
                ))}
              </div> */}
            </div>
          )}
        </nav>

        {/* ── Bottom ─────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-slate-100 px-3 py-2.5 space-y-0.5">
          {typeof logout === 'function' && (
            <button
              type="button"
              onClick={() => { logout(); onClose(); }}
              className="group w-full flex items-center gap-3 rounded-lg px-3 py-2.5
                text-[13px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
            >
              <FaSignOutAlt className="h-[15px] w-[15px] shrink-0 text-slate-400 group-hover:text-red-500" />
              <span>{t('nav.regular.signOut')}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Navigation;
