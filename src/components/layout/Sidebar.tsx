import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/context/AuthContext';
import { FaCog, FaCrown, FaSignOutAlt, FaHeart } from 'react-icons/fa';
import { studioNavigation, adminNavigation } from './navConfig';

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
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
        transition-colors duration-150 select-none
        ${isActive ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
    >
      <Icon className={`h-4 w-4 shrink-0 transition-colors duration-150
        ${isActive ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
      <span className="truncate">{t(item.labelKey)}</span>
    </NavLink>
  );
}

const Sidebar = () => {
  const { user, isAdmin, logout } = useAuth() as any;
  const location = useLocation();

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
      <div className="h-full bg-white border-r border-slate-100 overflow-y-auto
        scrollbar-thin scrollbar-thumb-slate-100 scrollbar-track-transparent">

        {/* ── Brand ── */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-sm shrink-0">
              <FaHeart className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 leading-none mb-0.5">
                Memories Platform
              </p>
              <p className="text-[15px] font-bold text-slate-800 leading-tight">
                {isAdmin ? 'Admin Panel' : 'Our Memories'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="px-4 pt-5 pb-3">
          {!isAdmin && menuFlags.studio && studioNavigation.active &&
            STUDIO_GROUPS.map((group) => {
              const items = group.keys.map((k) => studioItems.find((i) => i.labelKey === k)).filter(Boolean) as typeof studioItems;
              if (!items.length) return null;
              return (
                <div key={group.label} className="mb-6 last:mb-0">
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
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
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-100">
                <FaCrown className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-purple-600">Admin Panel</p>
              </div>
              <div className="space-y-1">
                {adminItems.map((item) => (
                  <NavItem key={item.href} item={item} isActive={isAdminActive(item.href)} />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* ── Bottom ── */}
        <div className="border-t border-slate-100 px-4 py-3 space-y-1">
          <button
            type="button"
            className="group w-full flex items-center gap-3 rounded-lg px-3 py-2.5
              text-sm font-medium text-slate-500
              hover:bg-slate-50 hover:text-slate-800 transition-colors duration-150"
          >
            <FaCog className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-500" />
            <span>Help Center</span>
          </button>
          {typeof logout === 'function' && (
            <button
              type="button"
              onClick={logout}
              className="group w-full flex items-center gap-3 rounded-lg px-3 py-2.5
                text-sm font-medium text-slate-500
                hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
            >
              <FaSignOutAlt className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-red-500" />
              <span>Logout</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Sidebar;
