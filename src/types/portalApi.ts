/**
 * Portal settings API types — aligned with backend.md and portalSettings utils.
 */

import type { AiToolSettings, RoleMenuPermission, RoleType } from './permissions';

/** General + appearance + notifications + security (Portal Settings UI) */
export type PortalGeneralSettings = {
  portalName: string;
  language: string;
  timezone: string;
  compactMode: boolean;
  emailNotifications: boolean;
  browserNotifications: boolean;
  requireDeleteConfirmation: boolean;
  requirePublicShareConfirmation: boolean;
  themeMode: 'light' | 'dark' | 'system';
  sidebarCollapsedByDefault: boolean;
  aiAssistantEnabled: boolean;
  aiPageContextEnabled: boolean;
  aiChatHistoryEnabled: boolean;
  aiUserWiseHistoryEnabled: boolean;
  aiVoiceEnabled: boolean;
  aiImageEnabled: boolean;
  aiUploadDebugEnabled: boolean;
  aiNetworkDebugEnabled: boolean;
  aiUiErrorDebugEnabled: boolean;
  aiSafeActionsEnabled: boolean;
  aiDangerousConfirmation: boolean;
  aiShowUsedModel: boolean;
};

export type PortalMenuFlags = {
  regular: boolean;
  studio: boolean;
  users: boolean;
  admin: boolean;
};

export type PortalNavigationOverride = {
  href: string;
  enabled: boolean;
  labelKey?: string;
};

/** Full config bundle from GET /api/portal/config */
export type PortalConfigResponse = {
  settings: PortalGeneralSettings;
  roleMenuPermissions: Record<RoleType, RoleMenuPermission[]>;
  aiToolSettings: AiToolSettings;
  menuFlags?: PortalMenuFlags;
  navigationOverrides?: PortalNavigationOverride[];
  updatedAt?: string;
  source?: 'api' | 'default' | 'cache';
};

export type PortalConfigUpdateBody = Partial<{
  settings: Partial<PortalGeneralSettings>;
  roleMenuPermissions: Record<RoleType, RoleMenuPermission[]>;
  aiToolSettings: Partial<AiToolSettings>;
  menuFlags: Partial<PortalMenuFlags>;
  navigationOverrides: PortalNavigationOverride[];
}>;
