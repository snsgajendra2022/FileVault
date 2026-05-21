/**
 * Role-Based Permission System Types
 * Defines the data structures for managing role-based menu access and permissions
 */

/** Supported user roles */
export type RoleType = 'admin' | 'studio' | 'regular' | 'users';

/** Action-level permissions for menu items */
export interface MenuPermissionAction {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  upload?: boolean;
  download?: boolean;
  share?: boolean;
  manage?: boolean;
}

/** Permission structure for a single menu item per role */
export interface RoleMenuPermission {
  role: RoleType;
  labelKey: string;
  href: string;
  group: 'regular' | 'studio' | 'admin' | 'users';
  enabled: boolean;
  actions: MenuPermissionAction;
}

/** AI Tool Settings Configuration */
export interface AiToolSettings {
  enabled: boolean;
  pageContextEnabled: boolean;
  chatHistoryEnabled: boolean;
  userWiseHistoryEnabled: boolean;
  voiceEnabled: boolean;
  imageEnabled: boolean;
  uploadDebugEnabled: boolean;
  networkDebugEnabled: boolean;
  uiErrorDebugEnabled: boolean;
  actionsEnabled: boolean;
  safeClicksEnabled: boolean;
  dangerousActionsRequireConfirmation: boolean;
  showUsedModel: boolean;
  fallbackModelsEnabled: boolean;
  maxTokens: number;
  modelTimeoutMs: number;
  primaryModel: string;
  fallbackModels: string;
}

/** Portal-wide settings structure */
export interface PortalSettings {
  roleMenuPermissions: Record<RoleType, RoleMenuPermission[]>;
  aiToolSettings: AiToolSettings;
  language: 'en' | 'hi' | 'es' | 'fr' | 'de' | 'ar';
}

/** Risk level for menu items (for visual indicators) */
export type RiskLevel = 'low' | 'medium' | 'high';

/** Menu item risk classification */
export interface MenuRiskAssessment {
  href: string;
  riskLevel: RiskLevel;
  reason: string;
}
