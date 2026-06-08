/**
 * Portal Settings Utilities
 * Handles permission storage, retrieval, and filtering logic
 */

import {
  RoleType,
  RoleMenuPermission,
  AiToolSettings,
  MenuRiskAssessment,
} from '../types/permissions';
import type {
  PortalConfigResponse,
  PortalGeneralSettings,
  PortalMenuFlags,
  PortalNavigationOverride,
} from '../types/portalApi';
import type { NavGroup } from '../components/layout/navConfig';
import { findLabelKeyForHref, getNavigationForRole } from '../components/layout/navConfig';

// ============================================================================
// LocalStorage Keys
// ============================================================================

export const STORAGE_KEYS = {
  ROLE_MENU_PERMISSIONS: 'portal_role_menu_permissions',
  AI_TOOL_SETTINGS: 'portal_ai_tool_settings',
  LANGUAGE: 'portal_language',
  MENU_FLAGS: 'menu_flags',
  PORTAL_SETTINGS: 'portal_settings',
} as const;

export const PORTAL_SETTINGS_CHANGED_EVENT = 'fv-portal-settings-changed';

let portalConfigCache: PortalConfigResponse | null = null;

/** In-memory config (API + live updates). Falls back to localStorage / defaults. */
export function getPortalConfigCache(): PortalConfigResponse | null {
  return portalConfigCache;
}

export function setPortalConfigCache(config: PortalConfigResponse): void {
  portalConfigCache = config;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PORTAL_SETTINGS_CHANGED_EVENT, { detail: config }));
  }
}

export function subscribePortalSettings(listener: (config: PortalConfigResponse) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<PortalConfigResponse>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(PORTAL_SETTINGS_CHANGED_EVENT, handler);
  return () => window.removeEventListener(PORTAL_SETTINGS_CHANGED_EVENT, handler);
}

function defaultPortalGeneralSettings(): PortalGeneralSettings {
  const ai = getDefaultAiToolSettings();
  return {
    portalName: 'Our Memories Portal',
    language: 'en',
    timezone: 'Asia/Kolkata',
    compactMode: false,
    emailNotifications: true,
    browserNotifications: false,
    requireDeleteConfirmation: true,
    requirePublicShareConfirmation: true,
    themeMode: 'system',
    sidebarCollapsedByDefault: false,
    aiAssistantEnabled: ai.enabled,
    aiPageContextEnabled: ai.pageContextEnabled,
    aiChatHistoryEnabled: ai.chatHistoryEnabled,
    aiUserWiseHistoryEnabled: ai.userWiseHistoryEnabled,
    aiVoiceEnabled: ai.voiceEnabled,
    aiImageEnabled: ai.imageEnabled,
    aiUploadDebugEnabled: ai.uploadDebugEnabled,
    aiNetworkDebugEnabled: ai.networkDebugEnabled,
    aiUiErrorDebugEnabled: ai.uiErrorDebugEnabled,
    aiSafeActionsEnabled: ai.actionsEnabled,
    aiDangerousConfirmation: ai.dangerousActionsRequireConfirmation,
    aiShowUsedModel: ai.showUsedModel,
  };
}

export function loadPortalGeneralSettings(): PortalGeneralSettings {
  if (portalConfigCache?.settings) return portalConfigCache.settings;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PORTAL_SETTINGS);
    if (raw) return { ...defaultPortalGeneralSettings(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultPortalGeneralSettings();
}

export function loadMenuFlags(): PortalMenuFlags {
  const defaults: PortalMenuFlags = { regular: true, studio: true, users: true, admin: true };
  if (portalConfigCache?.menuFlags) return { ...defaults, ...portalConfigCache.menuFlags };
  try {
    const raw = localStorage.getItem('MENU_FLAGS');
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaults;
}

export function loadNavigationOverrides(): PortalNavigationOverride[] {
  if (portalConfigCache?.navigationOverrides) return portalConfigCache.navigationOverrides;
  try {
    const raw = localStorage.getItem('portal_navigation_overrides');
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

// ============================================================================
// Default Permissions (offline fallback only — live menu is API-driven)
// ============================================================================

const studioActions = {
  view: true,
  create: true,
  edit: true,
  delete: false,
  upload: true,
  download: true,
  share: true,
  manage: false,
};
const regularActions = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  upload: false,
  download: true,
  share: false,
  manage: false,
};

/** Minimal seed when API returns no roleMenuPermissions (not used for sidebar rendering). */
function fallbackPermissionRows(): Record<RoleType, RoleMenuPermission[]> {
  const studio: RoleMenuPermission[] = [
    { role: 'studio', labelKey: 'nav.studio.dashboard', href: '/studio/dashboard', group: 'studio', enabled: true, actions: studioActions },
    { role: 'studio', labelKey: 'nav.studio.uploadFamily', href: '/upload-family-images', group: 'studio', enabled: true, actions: studioActions },
    { role: 'studio', labelKey: 'nav.studio.myImages', href: '/client-images', group: 'studio', enabled: true, actions: studioActions },
    { role: 'studio', labelKey: 'nav.studio.album', href: '/studio/albums', group: 'studio', enabled: true, actions: studioActions },
    { role: 'studio', labelKey: 'nav.studio.ourMemories', href: '/memories/events', group: 'studio', enabled: true, actions: studioActions },
    { role: 'studio', labelKey: 'nav.studio.guestBook', href: '/guest-book', group: 'studio', enabled: true, actions: studioActions },
    { role: 'studio', labelKey: 'nav.studio.services', href: '/services', group: 'studio', enabled: true, actions: studioActions },
    { role: 'users', labelKey: 'nav.studio.createMembers', href: '/invitations', group: 'studio', enabled: true, actions: studioActions },
    { role: 'users', labelKey: 'nav.studio.phoneBook', href: '/phonebook', group: 'studio', enabled: true, actions: studioActions },
    { role: 'users', labelKey: 'nav.studio.membersTree', href: '/family-tree', group: 'studio', enabled: true, actions: studioActions },
    { role: 'users', labelKey: 'nav.studio.photoThemes', href: '/photo-themes', group: 'studio', enabled: true, actions: studioActions },
    { role: 'admin', labelKey: 'nav.studio.settings', href: '/portal-settings', group: 'admin', enabled: true, actions: studioActions },
  ];
  const users: RoleMenuPermission[] = [
    { role: 'users', labelKey: 'nav.studio.dashboard', href: '/studio/dashboard', group: 'users', enabled: true, actions: regularActions },
    { role: 'users', labelKey: 'nav.studio.uploadFamily', href: '/upload-family-images', group: 'users', enabled: true, actions: regularActions },
    { role: 'users', labelKey: 'nav.studio.myImages', href: '/client-images', group: 'users', enabled: true, actions: regularActions },
    { role: 'users', labelKey: 'nav.studio.album', href: '/studio/albums', group: 'users', enabled: true, actions: regularActions },
    { role: 'users', labelKey: 'nav.studio.ourMemories', href: '/memories/events', group: 'users', enabled: true, actions: regularActions },
    { role: 'users', labelKey: 'nav.studio.guestBook', href: '/guest-book', group: 'users', enabled: true, actions: regularActions },
    { role: 'users', labelKey: 'nav.studio.createMembers', href: '/invitations', group: 'users', enabled: true, actions: regularActions },
    { role: 'users', labelKey: 'nav.studio.phoneBook', href: '/phonebook', group: 'users', enabled: true, actions: regularActions },
    { role: 'users', labelKey: 'nav.studio.membersTree', href: '/family-tree', group: 'users', enabled: true, actions: regularActions },
    { role: 'users', labelKey: 'nav.studio.photoThemes', href: '/photo-themes', group: 'users', enabled: true, actions: regularActions },
    { role: 'users', labelKey: 'nav.studio.services', href: '/services', group: 'users', enabled: true, actions: regularActions },
    { role: 'admin', labelKey: 'nav.studio.settings', href: '/portal-settings', group: 'admin', enabled: true, actions: regularActions },
  ];
  const regular: RoleMenuPermission[] = [];

  const admin: RoleMenuPermission[] = [
    { role: 'admin', labelKey: 'nav.admin.adminDashboard', href: '/admin?tab=dashboard', group: 'admin', enabled: true, actions: { view: true, create: true, edit: true, delete: true, manage: true } },
    { role: 'admin', labelKey: 'nav.admin.userManagement', href: '/admin?tab=users', group: 'admin', enabled: true, actions: { view: true, create: true, edit: true, delete: true, manage: true } },
    { role: 'admin', labelKey: 'nav.admin.services', href: '/admin?tab=services', group: 'admin', enabled: true, actions: { view: true, create: true, edit: true, delete: true, manage: true } },
    { role: 'admin', labelKey: 'nav.admin.planManagement', href: '/admin?tab=plans', group: 'admin', enabled: true, actions: { view: true, create: true, edit: true, delete: true, manage: true } },
    { role: 'admin', labelKey: 'nav.admin.paymentManagement', href: '/admin?tab=payments', group: 'admin', enabled: true, actions: { view: true, create: true, edit: true, delete: true, manage: true } },
    { role: 'admin', labelKey: 'nav.admin.featureFlags', href: '/admin?tab=flags', group: 'admin', enabled: true, actions: { view: true, create: true, edit: true, delete: true, manage: true } },
    { role: 'admin', labelKey: 'nav.admin.usageAnalytics', href: '/admin?tab=analytics', group: 'admin', enabled: true, actions: { view: true, create: true, edit: true, delete: true, manage: true } },
    { role: 'admin', labelKey: 'nav.admin.systemHealth', href: '/admin?tab=health', group: 'admin', enabled: true, actions: { view: true, create: true, edit: true, delete: true, manage: true } },
    { role: 'admin', labelKey: 'nav.admin.adminSettings', href: '/admin?tab=settings', group: 'admin', enabled: true, actions: { view: true, create: true, edit: true, delete: true, manage: true } },
    { role: 'admin', labelKey: 'nav.studio.settings', href: '/portal-settings', group: 'admin', enabled: true, actions: { view: true, create: true, edit: true, delete: true, manage: true } },
  ];
  return {
    admin: [...admin].map((p) => ({
      ...p,
      role: 'admin' as RoleType,
      group: 'admin' as const,
      enabled: true,
      actions: { view: true, create: true, edit: true, delete: true, upload: true, download: true, share: true, manage: true },
    })),
    studio,
    users,
    regular,
  };
}

export function buildDefaultRolePermissions(): Record<RoleType, RoleMenuPermission[]> {
  return fallbackPermissionRows();
}

const PORTAL_ROLE_KEYS: RoleType[] = ['admin', 'studio', 'regular', 'users'];

/**
 * Ensure every role has a menu list (API may return empty arrays or omit `users`).
 */
export function normalizeRoleMenuPermissions(
  raw?: Partial<Record<RoleType, RoleMenuPermission[]>> | null,
): Record<RoleType, RoleMenuPermission[]> {
  const defaults = buildDefaultRolePermissions();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const out = { ...defaults };
  for (const role of PORTAL_ROLE_KEYS) {
    const list = raw[role];
    if (Array.isArray(list) && list.length > 0) {
      out[role] = list;
    }
  }
  return out;
}

/** Display groups shown in Portal Settings permissions tab per role. */
export type MenuPermissionGroup = 'Regular' | 'Studio' | 'Admin' | 'Users';

export function getMenuGroupsForRole(role: RoleType): MenuPermissionGroup[] {
  switch (role) {
    case 'admin':
      return ['Admin'];
    case 'studio':
      return ['Studio'];
    case 'users':
      return ['Users'];
  }
}

/** Resolve portal role from DB `users.role` first, then accountType. */
export function getResolvedPortalRole(
  user?: { role?: string; accountType?: string } | null
): RoleType {
  if (!user) return 'users';
  const r = String(user.role || '').trim().toUpperCase();
  if (r === 'ADMIN') return 'admin';
  if (r === 'STUDIO') return 'studio';
  if (r === 'USERS' || r === 'USER') return 'users';
  return getRoleFromAccountType(user.accountType);
}

/** Roles this user may edit in Portal Settings → Permissions. */
export function getEditablePortalRoles(
  user?: { role?: string; accountType?: string } | null
): RoleType[] {
  const role = getResolvedPortalRole(user);
  if (role === 'admin') return ['admin'];
  if (role === 'studio') return ['studio', 'users'];
  return [];
}

export function canManagePortalPermissions(
  user?: { role?: string; accountType?: string } | null
): boolean {
  return getEditablePortalRoles(user).length > 0;
}

/** labelKey from API roleMenuPermissions for a route. */
export function findNavLabelKeyForHref(href: string): string | undefined {
  return findLabelKeyForHref(href, portalConfigCache ?? undefined);
}

// ============================================================================
// Default AI Settings
// ============================================================================

export function getDefaultAiToolSettings(): AiToolSettings {
  return {
    enabled: true,
    pageContextEnabled: true,
    chatHistoryEnabled: true,
    userWiseHistoryEnabled: false,
    voiceEnabled: false,
    imageEnabled: true,
    uploadDebugEnabled: false,
    networkDebugEnabled: false,
    uiErrorDebugEnabled: false,
    actionsEnabled: true,
    safeClicksEnabled: true,
    dangerousActionsRequireConfirmation: true,
    showUsedModel: false,
    fallbackModelsEnabled: false,
    maxTokens: 4096,
    modelTimeoutMs: 30000,
    primaryModel: 'gpt-4',
    fallbackModels: 'gpt-3.5-turbo',
  };
}

// ============================================================================
// Permission Storage & Retrieval
// ============================================================================

/**
 * Load role menu permissions from localStorage
 * Returns defaults if not found
 */
export function loadRoleMenuPermissions(): Record<RoleType, RoleMenuPermission[]> {
  if (portalConfigCache?.roleMenuPermissions) return portalConfigCache.roleMenuPermissions;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ROLE_MENU_PERMISSIONS);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed;
    }
  } catch (error) {
    console.error('Error loading role menu permissions:', error);
  }
  return buildDefaultRolePermissions();
}

/**
 * Save role menu permissions to localStorage
 */
export function saveRoleMenuPermissions(
  permissions: Record<RoleType, RoleMenuPermission[]>
): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.ROLE_MENU_PERMISSIONS,
      JSON.stringify(permissions)
    );
    if (portalConfigCache) {
      setPortalConfigCache({ ...portalConfigCache, roleMenuPermissions: permissions });
    }
  } catch (error) {
    console.error('Error saving role menu permissions:', error);
  }
}

/**
 * Reset role menu permissions to defaults
 */
export function resetRoleMenuPermissions(): Record<RoleType, RoleMenuPermission[]> {
  const defaults = buildDefaultRolePermissions();
  saveRoleMenuPermissions(defaults);
  return defaults;
}

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(
  role: RoleType
): RoleMenuPermission[] {
  const allPermissions = loadRoleMenuPermissions();
  return allPermissions[role] || [];
}

// ============================================================================
// AI Tool Settings Storage
// ============================================================================

/**
 * Load AI tool settings from localStorage
 */
export function loadAiToolSettings(): AiToolSettings {
  if (portalConfigCache?.aiToolSettings) return portalConfigCache.aiToolSettings;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AI_TOOL_SETTINGS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading AI tool settings:', error);
  }
  return getDefaultAiToolSettings();
}

/**
 * Save AI tool settings to localStorage
 */
export function saveAiToolSettings(settings: AiToolSettings): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.AI_TOOL_SETTINGS,
      JSON.stringify(settings)
    );
    if (portalConfigCache) {
      setPortalConfigCache({ ...portalConfigCache, aiToolSettings: settings });
    }
  } catch (error) {
    console.error('Error saving AI tool settings:', error);
  }
}

// ============================================================================
// Language Settings
// ============================================================================

/**
 * Load language setting from localStorage
 */
export function loadLanguageSetting(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE) || localStorage.getItem('fv_language');
    if (stored) {
      return stored;
    }
  } catch (error) {
    console.error('Error loading language setting:', error);
  }
  return 'en';
}

/**
 * Save language setting to localStorage
 */
export function saveLanguageSetting(language: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
    localStorage.setItem('fv_language', language);
  } catch (error) {
    console.error('Error saving language setting:', error);
  }
}

// ============================================================================
// Permission Validation
// ============================================================================

/**
 * Check if a menu item is allowed for a specific role
 */
export function isMenuAllowed(role: RoleType, href: string): boolean {
  const permissions = getRolePermissions(role);
  const permission = permissions.find(p => p.href === href);

  if (permission) {
    return permission.enabled && permission.actions.view;
  }

  // Fallback: check original navigation config
  return isMenuEnabledInConfig(href);
}

/**
 * Check if menu is enabled in original config (fallback)
 */
function isMenuEnabledInConfig(href: string): boolean {
  return true;
}

/**
 * Check if user can access a specific path
 * Handles query strings and partial path matching
 */
export function canAccessPath(role: RoleType, path: string): boolean {
  const permissions = getRolePermissions(role);

  const normalizedPath = normalizePath(path);

  // Exact match by full href (including query string if present)
  const exactPermission = permissions.find(p => normalizePath(p.href) === normalizedPath);
  if (exactPermission) {
    return exactPermission.enabled && exactPermission.actions.view;
  }

  // If path has no query string, allow matching against permission routes that contain query params
  const matchingPermission = permissions.find(p => {
    const permissionPath = normalizePath(p.href);
    return permissionPath === normalizedPath || permissionPath.startsWith(normalizedPath + '?');
  });
  if (matchingPermission) {
    return matchingPermission.enabled && matchingPermission.actions.view;
  }

  // If path has query string and no exact match, also try matching by pathname only
  const pathNameOnly = normalizedPath.split('?')[0];
  const fallbackPermission = permissions.find(p => normalizePath(p.href).split('?')[0] === pathNameOnly);
  if (fallbackPermission) {
    return fallbackPermission.enabled && fallbackPermission.actions.view;
  }

  return isMenuEnabledInConfig(pathNameOnly);
}

function normalizePath(path: string): string {
  if (!path) return path;
  const [pathname, search] = path.split('?');
  if (!search) return pathname;
  return `${pathname}?${search}`;
}

// ============================================================================
// Navigation Filtering
// ============================================================================

/** Sidebar nav from API (see navConfig.getNavigationForRole). */
export function buildNavigationFromRolePermissions(role: RoleType): NavGroup {
  return getNavigationForRole(role, portalConfigCache ?? undefined);
}

/** @deprecated Use buildNavigationFromRolePermissions — kept for callers. */
export function filterNavigationByRolePermissions(_navGroup: NavGroup, role: RoleType): NavGroup {
  return buildNavigationFromRolePermissions(role);
}

/** Whether OM assistant should show (portal settings override env). */
export function isPortalAssistantEnabled(): boolean {
  const general = loadPortalGeneralSettings();
  const ai = loadAiToolSettings();
  if (typeof general.aiAssistantEnabled === 'boolean') {
    return general.aiAssistantEnabled && ai.enabled;
  }
  return ai.enabled;
}

/**
 * Get filtered navigation for a specific role
 * Includes all relevant navigation groups
 */
export function getFilteredNavigationForRole(role: RoleType) {
  const config = portalConfigCache ?? undefined;
  return {
    regular: getNavigationForRole('regular', config),
    studio: getNavigationForRole('studio', config),
    users: getNavigationForRole('users', config),
    admin: getNavigationForRole('admin', config),
  };
}

// ============================================================================
// Risk Assessment
// ============================================================================

/**
 * Define menu items with high/medium risk
 */
const MENU_RISK_MAP: MenuRiskAssessment[] = [
  {
    href: '/admin?tab=users',
    riskLevel: 'high',
    reason: 'User Management - Can affect all users',
  },
  {
    href: '/admin?tab=payments',
    riskLevel: 'high',
    reason: 'Payment Management - Financial operations',
  },
  {
    href: '/admin?tab=flags',
    riskLevel: 'high',
    reason: 'Feature Flags - Controls system behavior',
  },
  {
    href: '/admin?tab=settings',
    riskLevel: 'high',
    reason: 'Admin Settings - System-wide configuration',
  },
  {
    href: '/studio/payment-management',
    riskLevel: 'medium',
    reason: 'Payment Management - Financial operations',
  },
  {
    href: '/admin?tab=services',
    riskLevel: 'medium',
    reason: 'Service Configuration',
  },
  {
    href: '/admin?tab=health',
    riskLevel: 'medium',
    reason: 'System Health - Infrastructure access',
  },
];

/**
 * Get risk level for a menu item
 */
export function getMenuRiskLevel(href: string): MenuRiskAssessment | null {
  return MENU_RISK_MAP.find(item => item.href === href) || null;
}

/**
 * Check if a menu item is considered high-risk
 */
export function isHighRiskMenuItem(href: string): boolean {
  const risk = getMenuRiskLevel(href);
  return risk?.riskLevel === 'high' || false;
}

// ============================================================================
// Current User Role Detection
// ============================================================================

/**
 * Determine role from user account type
 * Maps account types to simplified roles
 */
export function getRoleFromAccountType(accountType?: string): RoleType {
  if (!accountType) return 'users';

  // Admin account type
  if (accountType === 'ADMIN') {
    return 'admin';
  }

  // Photographers / Studio users (FREE account = photographer)
  if (accountType === 'FREE') {
    return 'studio';
  }
  if (accountType === 'STUDIO') {
    return 'studio';
  }
  if (accountType === 'USERS') {
    return 'users';
  }

  // All other account types (BASIC, PREMIUM, ENTERPRISE, CLIENT)
  return 'users';
}

/**
 * Determine if user is admin
 */
export function isAdminRole(accountType?: string): boolean {
  return getRoleFromAccountType(accountType) === 'admin';
}
