import React from 'react';
import type { ComponentType } from 'react';
import { fetchPortalConfig } from '../../api/services/portalSettingsService';
import { getPortalConfigCache, setPortalConfigCache } from '../../utils/portalSettings';
import { usePortalSettingsOptional } from '../../state/context/PortalSettingsContext';
import {
  FaHome,
  FaUpload,
  FaUsers,
  FaCloud,
  FaChartBar,
  FaShieldAlt,
  FaPlus,
  FaUser,
  FaCamera,
  FaImages,
  FaSitemap,
  FaUserPlus,
  FaFolder,
  FaRupeeSign,
  FaPalette,
  FaBook,
  FaHeart,
  FaFlag,
  FaCog,
} from 'react-icons/fa';
import type { RoleMenuPermission, RoleType } from '../../types/permissions';
import type { PortalConfigResponse, PortalMenuFlags, PortalNavigationOverride } from '../../types/portalApi';

const ROLE_MENU_STORAGE_KEY = 'portal_role_menu_permissions';

/** Single nav row (labelKey → en.json / hi.json `nav.*`) */
export type NavItem = {
  labelKey: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  enabled?: boolean;
};

export type NavGroup = {
  items: NavItem[];
  active: boolean;
};

/** Icons only — menu list comes from GET /api/portal/config */
const NAV_ICON_BY_LABEL_KEY: Record<string, ComponentType<{ className?: string }>> = {
  'nav.regular.dashboard': FaHome,
  'nav.regular.upload': FaUpload,
  'nav.regular.services': FaCloud,
  'nav.regular.plans': FaPlus,
  'nav.regular.usage': FaChartBar,
  'nav.regular.invitations': FaUsers,
  'nav.regular.familyTree': FaSitemap,
  'nav.regular.dummyTree': FaUsers,
  'nav.regular.profile': FaUser,
  'nav.studio.dashboard': FaCamera,
  'nav.studio.uploadFamily': FaUpload,
  'nav.studio.myImages': FaImages,
  'nav.studio.filterImages': FaUsers,
  'nav.studio.album': FaFolder,
  'nav.studio.ourMemories': FaHeart,
  'nav.studio.phoneBook': FaBook,
  'nav.studio.photoThemes': FaPalette,
  'nav.studio.createMembers': FaUserPlus,
  'nav.studio.membersTree': FaSitemap,
  'nav.studio.settings': FaCog,
  'nav.studio.services': FaCloud,
  'nav.admin.adminDashboard': FaShieldAlt,
  'nav.admin.userManagement': FaUsers,
  'nav.admin.serviceConfig': FaCloud,
  'nav.admin.planManagement': FaPlus,
  'nav.admin.paymentManagement': FaRupeeSign,
  'nav.admin.featureFlags': FaFlag,
  'nav.admin.usageAnalytics': FaChartBar,
  'nav.admin.systemHealth': FaShieldAlt,
  'nav.admin.adminSettings': FaCog,
};

const NAV_ICON_BY_HREF: Record<string, ComponentType<{ className?: string }>> = {
  '/studio/dashboard': FaCamera,
  '/upload-family-images': FaUpload,
  '/client-images': FaImages,
  '/filter-images': FaUsers,
  '/studio/albums': FaFolder,
  '/memories/events': FaHeart,
  '/phonebook': FaBook,
  '/photo-themes': FaPalette,
  '/invitations': FaUserPlus,
  '/family-tree': FaSitemap,
  '/portal-settings': FaCog,
  '/services': FaCloud,
  '/profile': FaUser,
  '/treePage': FaUsers,
  '/admin?tab=dashboard': FaShieldAlt,
  '/admin?tab=users': FaUsers,
  '/admin?tab=services': FaCloud,
  '/admin?tab=plans': FaPlus,
  '/admin?tab=payments': FaRupeeSign,
  '/admin?tab=flags': FaFlag,
  '/admin?tab=analytics': FaChartBar,
  '/admin?tab=health': FaShieldAlt,
  '/admin?tab=settings': FaCog,
};

/** Sidebar section groupings (UI only; items still from API). */
export const STUDIO_SIDEBAR_GROUPS = [
  {
    label: 'Main',
    keys: [
      'nav.studio.dashboard',
      'nav.studio.uploadFamily',
      'nav.studio.myImages',
      'nav.studio.album',
      'nav.studio.filterImages',
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
] as const;

export const USERS_SIDEBAR_GROUPS = [
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
] as const;

export type SidebarGroupDef = { label: string; keys: readonly string[] };

export function assignItemsToSidebarGroups(
  items: NavItem[],
  groups: readonly SidebarGroupDef[],
): { grouped: Map<string, NavItem[]>; ungrouped: NavItem[]; groupOrder: string[] } {
  const keyToGroup = new Map<string, string>();
  for (const g of groups) {
    for (const k of g.keys) keyToGroup.set(k, g.label);
  }
  const grouped = new Map<string, NavItem[]>();
  const ungrouped: NavItem[] = [];
  for (const item of items) {
    const section = keyToGroup.get(item.labelKey);
    if (section) {
      const list = grouped.get(section) ?? [];
      list.push(item);
      grouped.set(section, list);
    } else {
      ungrouped.push(item);
    }
  }
  return { grouped, ungrouped, groupOrder: groups.map((g) => g.label) };
}

function readPermissionsFromStorage(role: RoleType): RoleMenuPermission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ROLE_MENU_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Record<RoleType, RoleMenuPermission[]>>;
    const list = parsed[role];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Raw menu rows from GET /api/portal/config → roleMenuPermissions[role]
 * (e.g. roleMenuPermissions.studio for STUDIO users).
 */
export function getRoleMenuPermissionsFromApi(
  role: RoleType,
  config?: Pick<PortalConfigResponse, 'roleMenuPermissions'> | null,
): RoleMenuPermission[] {
  const resolved =
    config ?? getPortalConfigCache() ?? null;
  const fromConfig = resolved?.roleMenuPermissions?.[role];
  if (Array.isArray(fromConfig) && fromConfig.length > 0) return fromConfig;
  return readPermissionsFromStorage(role);
}

/** Load /api/portal/config once and cache for sidebar (used if context not ready). */
let portalNavLoadPromise: Promise<PortalConfigResponse> | null = null;

export async function loadPortalNavConfig(): Promise<PortalConfigResponse> {
  const cached = getPortalConfigCache();
  if (cached?.roleMenuPermissions) return cached;
  if (!portalNavLoadPromise) {
    portalNavLoadPromise = fetchPortalConfig().then((data) => {
      setPortalConfigCache(data);
      if (process.env.NODE_ENV === 'development') {
        console.debug('[navConfig] loadPortalNavConfig', {
          source: data.source,
          roles: Object.keys(data.roleMenuPermissions ?? {}),
          studioCount: data.roleMenuPermissions?.studio?.length,
          adminCount: data.roleMenuPermissions?.admin?.length,
        });
      }
      return data;
    });
  }
  return portalNavLoadPromise;
}

/**
 * React hook: sidebar menu for current role from API roleMenuPermissions.
 * Uses PortalSettingsContext when available, else fetches /api/portal/config.
 */
export function useRoleNavigation(role: RoleType): {
  nav: NavGroup;
  config: PortalConfigResponse | null;
  loading: boolean;
  permissions: RoleMenuPermission[];
} {
  const portalCtx = usePortalSettingsOptional();
  const [fetchedConfig, setFetchedConfig] = React.useState<PortalConfigResponse | null>(null);
  const [loading, setLoading] = React.useState(!portalCtx?.config?.roleMenuPermissions);

  React.useEffect(() => {
    if (portalCtx?.config?.roleMenuPermissions) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadPortalNavConfig()
      .then((data) => {
        if (!cancelled) setFetchedConfig(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [portalCtx?.config?.roleMenuPermissions, portalCtx?.config?.updatedAt]);

  const config = portalCtx?.config ?? fetchedConfig ?? getPortalConfigCache();
  const permissions = React.useMemo(
    () => getRoleMenuPermissionsFromApi(role, config),
    [role, config?.roleMenuPermissions, config?.updatedAt],
  );
  const nav = React.useMemo(
    () => getNavigationForRole(role, config),
    [role, config?.roleMenuPermissions, config?.navigationOverrides, config?.menuFlags, config?.updatedAt],
  );

  return { nav, config: config ?? null, loading, permissions };
}

export function getMenuFlagsFromApi(
  config?: Pick<PortalConfigResponse, 'menuFlags'> | null,
): PortalMenuFlags {
  const defaults: PortalMenuFlags = { regular: true, studio: true, users: true, admin: true };
  return { ...defaults, ...config?.menuFlags };
}

export function isRoleMenuVisible(
  role: RoleType,
  config?: Pick<PortalConfigResponse, 'menuFlags'> | null,
): boolean {
  const flags = getMenuFlagsFromApi(config);
  return flags[role] !== false;
}

function applyNavOverrides(items: NavItem[], overrides?: PortalNavigationOverride[]): NavItem[] {
  if (!overrides?.length) return items;
  const map = new Map(overrides.map((o) => [o.href, o]));
  return items.map((item) => {
    const o = map.get(item.href);
    if (!o) return item;
    return {
      ...item,
      enabled: o.enabled,
      ...(o.labelKey ? { labelKey: o.labelKey } : {}),
    };
  });
}

/** Map one API permission row → NavItem (icon from registry). */
export function navItemFromPermission(permission: {
  labelKey: string;
  href: string;
  enabled?: boolean;
}): NavItem {
  const icon =
    NAV_ICON_BY_LABEL_KEY[permission.labelKey] ??
    NAV_ICON_BY_HREF[permission.href] ??
    FaHome;
  return {
    labelKey: permission.labelKey,
    href: permission.href,
    icon,
    enabled: permission.enabled ?? true,
  };
}

/**
 * Build sidebar nav for a role from GET /api/portal/config → roleMenuPermissions[role].
 * Order, enabled, and view come from the API only.
 */
export function getNavigationForRole(
  role: RoleType,
  config?: Pick<PortalConfigResponse, 'roleMenuPermissions' | 'navigationOverrides' | 'menuFlags'> | null,
): NavGroup {
  const permissions = getRoleMenuPermissionsFromApi(role, config);
  const seen = new Set<string>();
  const items: NavItem[] = [];

  for (const p of permissions) {
    if (!p.enabled || !p.actions?.view) continue;
    if (seen.has(p.href)) continue;
    seen.add(p.href);
    items.push(navItemFromPermission(p));
  }

  if (process.env.NODE_ENV === 'development') {
    console.debug('[navConfig] getNavigationForRole', {
      role,
      source: config?.roleMenuPermissions?.[role]?.length ? 'api' : 'cache',
      permissionCount: permissions.length,
      visibleCount: items.length,
      items: items.map((i) => ({ labelKey: i.labelKey, href: i.href })),
    });
  }

  return {
    active: isRoleMenuVisible(role, config),
    items: applyNavOverrides(items, config?.navigationOverrides),
  };
}

/** All href → labelKey from API cache (all roles). */
export function findLabelKeyForHref(
  href: string,
  config?: Pick<PortalConfigResponse, 'roleMenuPermissions'> | null,
): string | undefined {
  const roles: RoleType[] = ['admin', 'studio', 'regular', 'users'];
  for (const role of roles) {
    const hit = getRoleMenuPermissionsFromApi(role, config).find((p) => p.href === href);
    if (hit) return hit.labelKey;
  }
  return undefined;
}

/** Suggested i18n label keys for admin menu editor. */
export const KNOWN_NAV_LABEL_KEYS = Object.keys(NAV_ICON_BY_LABEL_KEY).sort();
