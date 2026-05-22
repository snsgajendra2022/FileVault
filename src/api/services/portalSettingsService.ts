import api from '../client/axiosInstance';
import type { AiToolSettings, RoleMenuPermission, RoleType } from '../../types/permissions';
import type {
  PortalConfigResponse,
  PortalConfigUpdateBody,
  PortalGeneralSettings,
} from '../../types/portalApi';
import {
  buildDefaultRolePermissions,
  getDefaultAiToolSettings,
  normalizeRoleMenuPermissions,
  STORAGE_KEYS,
  saveAiToolSettings,
  saveLanguageSetting,
  saveRoleMenuPermissions,
} from '../../utils/portalSettings';

const PORTAL_BASE = '/api/portal';

export function getDefaultPortalGeneralSettings(): PortalGeneralSettings {
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
    themeMode: 'light',
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

export function generalSettingsToAiTool(settings: PortalGeneralSettings): AiToolSettings {
  const base = getDefaultAiToolSettings();
  return {
    ...base,
    enabled: settings.aiAssistantEnabled,
    pageContextEnabled: settings.aiPageContextEnabled,
    chatHistoryEnabled: settings.aiChatHistoryEnabled,
    userWiseHistoryEnabled: settings.aiUserWiseHistoryEnabled,
    voiceEnabled: settings.aiVoiceEnabled,
    imageEnabled: settings.aiImageEnabled,
    uploadDebugEnabled: settings.aiUploadDebugEnabled,
    networkDebugEnabled: settings.aiNetworkDebugEnabled,
    uiErrorDebugEnabled: settings.aiUiErrorDebugEnabled,
    actionsEnabled: settings.aiSafeActionsEnabled,
    safeClicksEnabled: settings.aiSafeActionsEnabled,
    dangerousActionsRequireConfirmation: settings.aiDangerousConfirmation,
    showUsedModel: settings.aiShowUsedModel,
  };
}

export function buildDefaultPortalConfig(): PortalConfigResponse {
  return {
    settings: getDefaultPortalGeneralSettings(),
    roleMenuPermissions: normalizeRoleMenuPermissions(buildDefaultRolePermissions()),
    aiToolSettings: getDefaultAiToolSettings(),
    menuFlags: { regular: true, studio: true, users: true, admin: true },
    navigationOverrides: [],
    source: 'default',
  };
}

/** Persist to localStorage (offline / API fallback). */
export function persistPortalConfigLocally(config: PortalConfigResponse): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PORTAL_SETTINGS, JSON.stringify(config.settings));
    saveRoleMenuPermissions(config.roleMenuPermissions);
    saveAiToolSettings(config.aiToolSettings);
    saveLanguageSetting(config.settings.language);
    if (config.menuFlags) {
      localStorage.setItem('MENU_FLAGS', JSON.stringify(config.menuFlags));
    }
    if (config.navigationOverrides?.length) {
      localStorage.setItem('portal_navigation_overrides', JSON.stringify(config.navigationOverrides));
    }
  } catch (e) {
    console.warn('[portal] local persist failed', e);
  }
}

function loadPortalConfigFromLocal(): PortalConfigResponse | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PORTAL_SETTINGS);
    const settings = raw
      ? { ...getDefaultPortalGeneralSettings(), ...JSON.parse(raw) }
      : getDefaultPortalGeneralSettings();
    const menuRaw = localStorage.getItem('MENU_FLAGS');
    const navRaw = localStorage.getItem('portal_navigation_overrides');
    const permsRaw = localStorage.getItem(STORAGE_KEYS.ROLE_MENU_PERMISSIONS);
    const aiRaw = localStorage.getItem(STORAGE_KEYS.AI_TOOL_SETTINGS);
    return {
      settings,
      roleMenuPermissions: permsRaw
        ? normalizeRoleMenuPermissions(JSON.parse(permsRaw))
        : buildDefaultRolePermissions(),
      aiToolSettings: aiRaw
        ? { ...getDefaultAiToolSettings(), ...JSON.parse(aiRaw) }
        : getDefaultAiToolSettings(),
      menuFlags: menuRaw ? JSON.parse(menuRaw) : undefined,
      navigationOverrides: navRaw ? JSON.parse(navRaw) : [],
      source: 'cache',
    };
  } catch {
    return null;
  }
}

/** Load permissions from localStorage into config (skip when fresh API payload). */
export function mergeLocalPermissions(config: PortalConfigResponse): PortalConfigResponse {
  if (config.source === 'api') {
    return config;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROLE_MENU_PERMISSIONS);
    if (raw) {
      config.roleMenuPermissions = JSON.parse(raw);
    }
    const aiRaw = localStorage.getItem(STORAGE_KEYS.AI_TOOL_SETTINGS);
    if (aiRaw) {
      config.aiToolSettings = { ...getDefaultAiToolSettings(), ...JSON.parse(aiRaw) };
    }
  } catch {
    /* ignore */
  }
  return config;
}

export async function fetchPortalConfig(): Promise<PortalConfigResponse> {
  try {
    const res = await api.get<PortalConfigResponse>(`${PORTAL_BASE}/config`);
    const data = res.data;
    const merged: PortalConfigResponse = {
      ...buildDefaultPortalConfig(),
      ...data,
      settings: { ...getDefaultPortalGeneralSettings(), ...data.settings },
      roleMenuPermissions: normalizeRoleMenuPermissions(data.roleMenuPermissions),
      aiToolSettings: { ...getDefaultAiToolSettings(), ...data.aiToolSettings },
      source: 'api',
    };
    mergeLocalPermissions(merged);
    persistPortalConfigLocally(merged);
    return merged;
  } catch (e) {
    console.warn('[portal] API fetch failed, using local cache', e);
    const local = loadPortalConfigFromLocal();
    const base = local || buildDefaultPortalConfig();
    return mergeLocalPermissions(base);
  }
}

export async function savePortalConfig(body: PortalConfigUpdateBody): Promise<PortalConfigResponse> {
  try {
    const res = await api.put<PortalConfigResponse>(`${PORTAL_BASE}/config`, body);
    const data = res.data;
    const merged: PortalConfigResponse = {
      ...buildDefaultPortalConfig(),
      ...data,
      settings: { ...getDefaultPortalGeneralSettings(), ...data.settings },
      roleMenuPermissions: normalizeRoleMenuPermissions(data.roleMenuPermissions),
      source: 'api',
    };
    persistPortalConfigLocally(merged);
    return merged;
  } catch (e) {
    console.warn('[portal] API save failed, saving locally only', e);
    const current = mergeLocalPermissions(loadPortalConfigFromLocal() || buildDefaultPortalConfig());
    if (body.settings) current.settings = { ...current.settings, ...body.settings };
    if (body.roleMenuPermissions) current.roleMenuPermissions = body.roleMenuPermissions;
    if (body.aiToolSettings) {
      current.aiToolSettings = { ...current.aiToolSettings, ...body.aiToolSettings };
    }
    if (body.menuFlags) current.menuFlags = { ...current.menuFlags, ...body.menuFlags };
    if (body.navigationOverrides) current.navigationOverrides = body.navigationOverrides;
    persistPortalConfigLocally(current);
    return current;
  }
}

export async function resetPortalConfig(): Promise<PortalConfigResponse> {
  try {
    const res = await api.post<PortalConfigResponse>(`${PORTAL_BASE}/config/reset`, {});
    persistPortalConfigLocally(res.data);
    return res.data;
  } catch {
    const defaults = buildDefaultPortalConfig();
    persistPortalConfigLocally(defaults);
    return defaults;
  }
}

/** Granular endpoints (optional; config bundle is primary). */
export async function fetchPortalPermissions(): Promise<Record<RoleType, RoleMenuPermission[]>> {
  try {
    const res = await api.get<{ roleMenuPermissions: Record<RoleType, RoleMenuPermission[]> }>(
      `${PORTAL_BASE}/permissions`
    );
    return res.data.roleMenuPermissions;
  } catch {
    return buildDefaultRolePermissions();
  }
}

export async function savePortalPermissions(
  roleMenuPermissions: Record<RoleType, RoleMenuPermission[]>
): Promise<void> {
  try {
    await api.put(`${PORTAL_BASE}/permissions`, { roleMenuPermissions });
  } finally {
    saveRoleMenuPermissions(roleMenuPermissions);
  }
}
