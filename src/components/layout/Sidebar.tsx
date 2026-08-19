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
import { FaCrown, FaSignOutAlt } from 'react-icons/fa';
import { THEME } from '../../pages/photo-studio/studioDashboardTheme';

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
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
        transition-colors duration-150 select-none
        ${
          isActive
            ? 'bg-[#eff6ff] text-[#0f172a] font-semibold dark:bg-white/10 dark:text-[#ffffff]'
            : 'text-[#64748b] hover:bg-[#eff6ff] hover:text-[#0f172a] dark:text-[#a8a399] dark:hover:bg-white/5 dark:hover:text-[#ffffff]'
        }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 transition-colors duration-150
        ${isActive ? 'text-[#2563eb] dark:text-[#e2e8f0]' : 'text-[#94a3b8] group-hover:text-[#64748b]'}`}
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
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8] dark:text-[#78746c]">
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
        className="h-full overflow-y-auto border-r border-[rgba(20,18,16,0.1)] bg-[#ffffff]
        scrollbar-thin scrollbar-thumb-[#f1f5f9] scrollbar-track-transparent transition-colors duration-200
        dark:border-white/10 dark:bg-[#1c1a18] dark:scrollbar-thumb-white/10"
      >
        <div className="border-b border-[rgba(20,18,16,0.1)] px-5 pb-4 pt-5 dark:border-white/10">
          <div className="flex flex-col items-center gap-3">
            <div className="hidden items-end gap-2 opacity-90 select-none pointer-events-none sm:flex">
              <div className="relative">
                <div
                  className="flex h-14 w-20 items-center justify-center rounded-xl"
                  style={{
                    background: '#eff6ff',
                    border: '1px solid rgba(20,18,16,0.1)',
                    boxShadow: '0 8px 24px rgba(20,18,16,0.06)',
                  }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ border: '4px solid rgba(15, 23, 42, 0.75)' }}
                  >
                    <div className="h-4 w-4 rounded-full" style={{ background: 'rgba(15, 23, 42, 0.75)' }} />
                  </div>
                  <div
                    className="absolute right-2 top-1.5 h-1.5 w-2 rounded-sm"
                    style={{ background: 'rgba(31, 58, 52, 0.85)' }}
                  />
                </div>
                <div
                  className="absolute -top-1.5 left-3 h-2 w-5 rounded-sm"
                  style={{ background: '#f1f5f9', border: '1px solid rgba(20,18,16,0.1)' }}
                />
              </div>
              <div className="mb-1 flex flex-col items-center">
                <div className="text-lg">🌸</div>
                <div
                  className="h-6 w-5 rounded-b-lg"
                  style={{ background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryLight} 100%)` }}
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8] dark:text-[#78746c]">
                Our Memories
              </p>
              <p
                className="leading-tight text-[#0f172a] dark:text-[#ffffff]"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: '1.25rem', fontWeight: 600 }}
              >
                {showAdminNav ? 'Admin Panel' : portalName}
              </p>
            </div>
          </div>
        </div>

        <nav className="px-3 pb-3 pt-5">
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
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-[rgba(20,18,16,0.1)] bg-[#f1f5f9] px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <FaCrown className="h-3.5 w-3.5 shrink-0 text-[#2563eb] dark:text-[#e2e8f0]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748b] dark:text-[#a8a399]">
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

        <div className="border-t border-[rgba(20,18,16,0.1)] px-3 py-3 space-y-1 dark:border-white/10">
          {typeof logout === 'function' && (
            <button
              type="button"
              onClick={logout}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                text-sm font-medium text-[#64748b] transition-colors duration-150
                hover:bg-[#8a5a2b]/10 hover:text-[#0f172a]
                dark:text-[#a8a399] dark:hover:bg-white/5 dark:hover:text-[#ffffff]"
            >
              <FaSignOutAlt className="h-4 w-4 shrink-0 text-[#94a3b8]" />
              <span>{t('nav.regular.signOut')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
