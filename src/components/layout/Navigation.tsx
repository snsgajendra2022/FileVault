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
    ? 'bg-[#eff6ff] text-[#2563eb]'
    : accountType === 'PREMIUM'
    ? 'bg-[#f1f5f9] text-[#64748b]'
    : 'bg-[#ffffff] text-[#94a3b8]';
  const badgeLabel  = accountType === 'ADMIN' ? 'Admin' : accountType === 'PREMIUM' ? 'Premium' : 'Free';

  const navActive = 'bg-[#f1f5f9] text-[#0f172a]';
  const navIdle = 'text-[#64748b] hover:bg-[#eff6ff] hover:text-[#0f172a]';
  const iconActive = 'text-[#2563eb]';
  const iconIdle = 'text-[#94a3b8] group-hover:text-[#64748b]';

  return (
    <>
      {/* Soft overlay */}
      <div
        className={`fixed inset-0 z-40 bg-[#0f172a]/40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer — same premium style as desktop sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col border-r border-[rgba(20,18,16,0.1)] bg-[#ffffff] shadow-[4px_0_32px_rgba(20,18,16,0.08)] transition-transform duration-300 ease-in-out dark:border-white/10 dark:bg-[#1c1a18] lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* ── Brand ──────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-[rgba(20,18,16,0.1)] px-5 pb-4 pt-5 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f172a] shadow-sm">
              <FaHeart className="h-3.5 w-3.5 text-[#ffffff]" />
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] leading-none text-[#94a3b8]">
                Our Memories
              </p>
              <p
                className="leading-tight text-[#0f172a] dark:text-[#ffffff]"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '1.15rem', fontWeight: 600 }}
              >
                {showAdminNav ? 'Admin Panel' : portalName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:hover:bg-white/10 dark:hover:text-[#ffffff]"
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
                                active ? navActive : navIdle
                              }`}
                            >
                              <Icon
                                className={`h-[15px] w-[15px] shrink-0 transition-colors duration-150 ${
                                  active ? iconActive : iconIdle
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
                        active ? navActive : navIdle
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
                                active ? navActive : navIdle
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
                      active ? navActive : navIdle
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
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-[rgba(20,18,16,0.1)] bg-[#f1f5f9] px-3 py-2">
                <FaCrown className="h-3.5 w-3.5 shrink-0 text-[#2563eb]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748b]">Admin Panel</p>
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
                    `group relative flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-150 ${
                      isAdminItemActive
                        ? 'bg-[#0f172a] text-[#ffffff]'
                        : 'text-[#64748b] hover:bg-[#eff6ff] hover:text-[#0f172a]'
                    }`
                  }
                >
                  <>
                    <div className={`relative ${isAdminItemActive ? 'text-[#ffffff]' : 'text-[#94a3b8] group-hover:text-[#64748b]'}`}>
                      <item.icon className="mr-3 h-5 w-5" />
                    </div>
                    <span className="font-semibold">{t(item.labelKey)}</span>
                  </>
                </NavLink>
                );
              })}
            </>
            </div>
          )}
        </nav>

        {/* ── Bottom ─────────────────────────────────────────────────── */}
        <div className="shrink-0 space-y-0.5 border-t border-[rgba(20,18,16,0.1)] px-3 py-2.5 dark:border-white/10">
          {typeof logout === 'function' && (
            <button
              type="button"
              onClick={() => { logout(); onClose(); }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                text-[13px] font-medium text-[#64748b] transition-colors duration-150
                hover:bg-[#8a5a2b]/10 hover:text-[#0f172a]"
            >
              <FaSignOutAlt className="h-[15px] w-[15px] shrink-0 text-[#94a3b8]" />
              <span>{t('nav.regular.signOut')}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Navigation;
