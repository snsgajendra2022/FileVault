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
import {
  regularNavigation,
  studioNavigation,
  adminNavigation,
  NavItem,
  NavGroup,
} from '../components/layout/navConfig';

// ============================================================================
// LocalStorage Keys
// ============================================================================

export const STORAGE_KEYS = {
  ROLE_MENU_PERMISSIONS: 'portal_role_menu_permissions',
  AI_TOOL_SETTINGS: 'portal_ai_tool_settings',
  LANGUAGE: 'portal_language',
  PORTAL_SETTINGS: 'portal_settings',
} as const;

// ============================================================================
// Default Permissions
// ============================================================================

/**
 * Build default role permissions from navigation config
 * This is the fallback used if no custom permissions are saved
 */
export function buildDefaultRolePermissions(): Record<RoleType, RoleMenuPermission[]> {
  const adminPermissions = buildPermissionsFromNav(
    adminNavigation,
    'admin',
    'admin'
  );
  const studioPermissions = buildPermissionsFromNav(
    studioNavigation,
    'studio',
    'studio'
  );
  const regularPermissions = buildPermissionsFromNav(
    regularNavigation,
    'regular',
    'regular'
  );

  return {
    admin: [
      ...adminPermissions,
      ...studioPermissions,
      ...regularPermissions,
    ].map(p => ({
      ...p,
      enabled: true,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        upload: true,
        download: true,
        share: true,
        manage: true,
      },
    })),
    studio: [
      ...studioPermissions,
      ...regularPermissions.filter(p => isUsefulForStudio(p.href)),
    ].map(p => ({
      ...p,
      enabled: true,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: false,
        upload: true,
        download: true,
        share: true,
        manage: false,
      },
    })),
    regular: regularPermissions.map(p => ({
      ...p,
      enabled: true,
      actions: {
        view: true,
        create: p.labelKey.includes('upload') ? true : false,
        edit: false,
        delete: false,
        upload: p.labelKey.includes('upload') ? true : false,
        download: true,
        share: false,
        manage: false,
      },
    })),
  };
}

/**
 * Helper to build permissions from a nav group
 */
function buildPermissionsFromNav(
  navGroup: NavGroup,
  group: 'regular' | 'studio' | 'admin',
  role: RoleType
): Omit<RoleMenuPermission, 'actions'>[] {
  return navGroup.items.map(item => ({
    role,
    labelKey: item.labelKey,
    href: item.href,
    group,
    enabled: item.enabled ?? true,
  }));
}

/**
 * Determine if a menu item is useful for studio users
 */
function isUsefulForStudio(href: string): boolean {
  const usefulHrefs = [
    '/profile',
    '/studio/dashboard',
    '/upload',
    '/services',
    '/plans',
    '/usage',
    '/invitations',
    '/family-tree',
  ];
  return usefulHrefs.some(useful => href.includes(useful));
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
  const allNavs = [
    regularNavigation,
    studioNavigation,
    adminNavigation,
  ];

  for (const nav of allNavs) {
    const item = nav.items.find(i => i.href === href);
    if (item) {
      return item.enabled ?? true;
    }
  }
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

/**
 * Filter navigation group based on role permissions
 */
export function filterNavigationByRolePermissions(
  navGroup: NavGroup,
  role: RoleType
): NavGroup {
  const permissions = getRolePermissions(role);

  return {
    ...navGroup,
    items: navGroup.items.filter(item => {
      const permission = permissions.find(p => p.href === item.href);

      if (permission) {
        return permission.enabled && permission.actions.view;
      }

      // Fallback to original enabled state
      return item.enabled ?? true;
    }),
  };
}

/**
 * Get filtered navigation for a specific role
 * Includes all relevant navigation groups
 */
export function getFilteredNavigationForRole(role: RoleType) {
  const filtered = {
    regular: filterNavigationByRolePermissions(regularNavigation, role),
    studio: filterNavigationByRolePermissions(studioNavigation, role),
    admin: filterNavigationByRolePermissions(adminNavigation, role),
  };

  return filtered;
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
  if (!accountType) return 'regular';

  // Admin account type
  if (accountType === 'ADMIN') {
    return 'admin';
  }

  // Photographers / Studio users (FREE account = photographer)
  if (accountType === 'FREE') {
    return 'studio';
  }

  // All other account types (BASIC, PREMIUM, ENTERPRISE, CLIENT)
  return 'regular';
}

/**
 * Determine if user is admin
 */
export function isAdminRole(accountType?: string): boolean {
  return getRoleFromAccountType(accountType) === 'admin';
}
