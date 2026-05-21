import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoleMenuPermission, RoleType } from '../../types/permissions';
import type { PortalConfigResponse, PortalConfigUpdateBody, PortalGeneralSettings } from '../../types/portalApi';
import {
  buildDefaultPortalConfig,
  fetchPortalConfig,
  generalSettingsToAiTool,
  persistPortalConfigLocally,
  resetPortalConfig,
  savePortalConfig,
} from '../../api/services/portalSettingsService';
import {
  normalizeRoleMenuPermissions,
  setPortalConfigCache,
  subscribePortalSettings,
  PORTAL_SETTINGS_CHANGED_EVENT,
} from '../../utils/portalSettings';
import { useAuth } from './AuthContext';

type PortalSettingsContextValue = {
  config: PortalConfigResponse;
  loading: boolean;
  saving: boolean;
  refresh: () => Promise<void>;
  saveConfig: (body: PortalConfigUpdateBody) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  updateSettings: (patch: Partial<PortalGeneralSettings>) => void;
  updateRolePermissions: (role: RoleType, permissions: RoleMenuPermission[]) => void;
  setRolePermissions: (all: Record<RoleType, RoleMenuPermission[]>) => void;
};

const PortalSettingsContext = createContext<PortalSettingsContextValue | null>(null);

function applyThemeMode(mode: PortalGeneralSettings['themeMode']) {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else if (mode === 'light') {
    root.classList.remove('dark');
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function PortalSettingsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { i18n } = useTranslation();
  const [config, setConfig] = useState<PortalConfigResponse>(() => buildDefaultPortalConfig());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const applyConfig = useCallback(
    (next: PortalConfigResponse) => {
      const normalized: PortalConfigResponse = {
        ...next,
        roleMenuPermissions: normalizeRoleMenuPermissions(next.roleMenuPermissions),
      };
      setConfig(normalized);
      setPortalConfigCache(normalized);
      persistPortalConfigLocally(normalized);
      if (normalized.settings?.language && i18n.language !== normalized.settings.language) {
        void i18n.changeLanguage(normalized.settings.language);
      }
      if (normalized.settings?.themeMode) applyThemeMode(normalized.settings.themeMode);
      if (normalized.settings?.compactMode) {
        document.documentElement.dataset.portalCompact = normalized.settings.compactMode ? '1' : '0';
      }
    },
    [i18n]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPortalConfig();
      applyConfig(data);
    } finally {
      setLoading(false);
    }
  }, [applyConfig]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refresh();
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    return subscribePortalSettings((c) => setConfig(c));
  }, []);

  const saveConfig = useCallback(
    async (body: PortalConfigUpdateBody) => {
      setSaving(true);
      try {
        const aiPatch = body.settings ? { aiToolSettings: generalSettingsToAiTool({ ...config.settings, ...body.settings }) } : {};
        const merged = await savePortalConfig({
          ...body,
          ...aiPatch,
          settings: body.settings ? { ...config.settings, ...body.settings } : config.settings,
          roleMenuPermissions: body.roleMenuPermissions ?? config.roleMenuPermissions,
        });
        applyConfig(merged);
      } finally {
        setSaving(false);
      }
    },
    [applyConfig, config]
  );

  const resetToDefaults = useCallback(async () => {
    setSaving(true);
    try {
      const defaults = await resetPortalConfig();
      applyConfig(defaults);
    } finally {
      setSaving(false);
    }
  }, [applyConfig]);

  const updateSettings = useCallback((patch: Partial<PortalGeneralSettings>) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        settings: { ...prev.settings, ...patch },
        aiToolSettings: generalSettingsToAiTool({ ...prev.settings, ...patch }),
      };
      setPortalConfigCache(next);
      return next;
    });
  }, []);

  const updateRolePermissions = useCallback((role: RoleType, permissions: RoleMenuPermission[]) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        roleMenuPermissions: { ...prev.roleMenuPermissions, [role]: permissions },
      };
      setPortalConfigCache(next);
      return next;
    });
  }, []);

  const setRolePermissions = useCallback((all: Record<RoleType, RoleMenuPermission[]>) => {
    setConfig((prev) => {
      const next = { ...prev, roleMenuPermissions: all };
      setPortalConfigCache(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      config,
      loading,
      saving,
      refresh,
      saveConfig,
      resetToDefaults,
      updateSettings,
      updateRolePermissions,
      setRolePermissions,
    }),
    [config, loading, saving, refresh, saveConfig, resetToDefaults, updateSettings, updateRolePermissions, setRolePermissions]
  );

  return <PortalSettingsContext.Provider value={value}>{children}</PortalSettingsContext.Provider>;
}

export function usePortalSettings(): PortalSettingsContextValue {
  const ctx = useContext(PortalSettingsContext);
  if (!ctx) {
    throw new Error('usePortalSettings must be used within PortalSettingsProvider');
  }
  return ctx;
}

/** Optional hook — safe outside provider (uses defaults). */
export function usePortalSettingsOptional(): PortalSettingsContextValue | null {
  return useContext(PortalSettingsContext);
}

export { PORTAL_SETTINGS_CHANGED_EVENT };
