import React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../state/context/AuthContext";
import { usePortalSettings } from "../../state/context/PortalSettingsContext";
import { savePortalPermissions } from "../../api/services/portalSettingsService";
import {
  buildDefaultRolePermissions,
  canManagePortalPermissions,
  findNavLabelKeyForHref,
  getEditablePortalRoles,
  getMenuGroupsForRole,
  getResolvedPortalRole,
  normalizeRoleMenuPermissions,
} from "../../utils/portalSettings";
import type { MenuPermissionAction, RoleMenuPermission } from "../../types/permissions";
import {
  FaBell,
  FaCheck,
  FaCog,
  FaGlobe,
  FaLock,
  FaPalette,
  FaRobot,
  FaSave,
  FaShieldAlt,
  FaSlidersH,
  FaUndo,
  FaUserCog,
} from "react-icons/fa";

type SettingsTab =
  | "general"
  | "language"
  | "permissions"
  | "ai"
  | "notifications"
  | "security"
  | "appearance";

type RoleType = "admin" | "studio" | "regular" | "users";

type PermissionAction = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  upload: boolean;
  download: boolean;
  share: boolean;
  manage: boolean;
};

type MenuPermission = {
  id: string;
  role: RoleType;
  group: "Regular" | "Studio" | "Admin" | "Users";
  label: string;
  path: string;
  enabled: boolean;
  actions: PermissionAction;
};

type PortalSettings = {
  portalName: string;
  language: string;
  timezone: string;
  compactMode: boolean;
  emailNotifications: boolean;
  browserNotifications: boolean;
  requireDeleteConfirmation: boolean;
  requirePublicShareConfirmation: boolean;
  themeMode: "light" | "dark" | "system";
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

const SETTINGS_STORAGE_KEY = "portal_settings";
const ROLE_PERMISSIONS_STORAGE_KEY = "portal_role_menu_permissions";

/** Shared field styles — follow html.dark (system / light / dark via filevault-theme). */
const SETTINGS_LABEL_CLASS = "text-sm font-semibold text-slate-700 dark:text-slate-300";
const SETTINGS_INPUT_CLASS =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400 dark:focus:ring-violet-500/20";
const SETTINGS_CARD_CLASS =
  "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80";

const defaultSettings: PortalSettings = {
  portalName: "Our Memories Portal",
  language: "en",
  timezone: "Asia/Kolkata",
  compactMode: false,
  emailNotifications: true,
  browserNotifications: false,
  requireDeleteConfirmation: true,
  requirePublicShareConfirmation: true,
  themeMode: "light",
  sidebarCollapsedByDefault: false,
  aiAssistantEnabled: false,
  aiPageContextEnabled: true,
  aiChatHistoryEnabled: true,
  aiUserWiseHistoryEnabled: true,
  aiVoiceEnabled: true,
  aiImageEnabled: true,
  aiUploadDebugEnabled: true,
  aiNetworkDebugEnabled: false,
  aiUiErrorDebugEnabled: false,
  aiSafeActionsEnabled: true,
  aiDangerousConfirmation: true,
  aiShowUsedModel: false,
};

const TAB_DEFS: Array<{
  id: SettingsTab;
  labelKey: string;
  descKey: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "general", labelKey: "portalSettingsPage.tabs.general", descKey: "portalSettingsPage.tabs.generalDesc", icon: FaCog },
  { id: "language", labelKey: "portalSettingsPage.tabs.language", descKey: "portalSettingsPage.tabs.languageDesc", icon: FaGlobe },
  { id: "permissions", labelKey: "portalSettingsPage.tabs.permissions", descKey: "portalSettingsPage.tabs.permissionsDesc", icon: FaUserCog },
  { id: "ai", labelKey: "portalSettingsPage.tabs.omAssistant", descKey: "portalSettingsPage.tabs.omAssistantDesc", icon: FaRobot },
  { id: "notifications", labelKey: "portalSettingsPage.tabs.notifications", descKey: "portalSettingsPage.tabs.notificationsDesc", icon: FaBell },
  { id: "security", labelKey: "portalSettingsPage.tabs.security", descKey: "portalSettingsPage.tabs.securityDesc", icon: FaLock },
  { id: "appearance", labelKey: "portalSettingsPage.tabs.appearance", descKey: "portalSettingsPage.tabs.appearanceDesc", icon: FaPalette },
];

const menuSeed: Array<{ group: MenuPermission["group"]; label: string; path: string }> = [
  { group: "Regular", label: "Dashboard", path: "/studio/dashboard" },
  { group: "Regular", label: "Upload", path: "/upload" },
  { group: "Regular", label: "Services", path: "/services" },
  { group: "Regular", label: "Plans", path: "/plans" },
  { group: "Regular", label: "Usage", path: "/usage" },
  { group: "Regular", label: "Invitations", path: "/invitations" },
  { group: "Regular", label: "Family Tree", path: "/family-tree" },
  { group: "Regular", label: "Profile", path: "/profile" },
  { group: "Studio", label: "Studio Dashboard", path: "/studio/dashboard" },
  { group: "Studio", label: "Upload Family Images", path: "/upload-family-images" },
  { group: "Studio", label: "My Images", path: "/client-images" },
  { group: "Studio", label: "Our Memories", path: "/memories/events" },
  { group: "Studio", label: "Albums", path: "/studio/albums" },
  { group: "Studio", label: "Photo Books", path: "/photo-book" },
  { group: "Studio", label: "Photo Themes", path: "/photo-themes" },
  { group: "Studio", label: "Phone Book", path: "/phonebook" },
  { group: "Studio", label: "Shared Albums", path: "/studio/shared-albums" },
  { group: "Studio", label: "Payments", path: "/studio/payments" },
  { group: "Studio", label: "Payment Management", path: "/studio/payment-management" },
  { group: "Admin", label: "Admin Dashboard", path: "/admin?tab=dashboard" },
  { group: "Admin", label: "User Management", path: "/admin?tab=users" },
  { group: "Admin", label: "Service Config", path: "/admin?tab=services" },
  { group: "Admin", label: "Plan Management", path: "/admin?tab=plans" },
  { group: "Admin", label: "Payment Management", path: "/admin?tab=payments" },
  { group: "Admin", label: "Feature Flags", path: "/admin?tab=flags" },
  { group: "Admin", label: "Usage Analytics", path: "/admin?tab=analytics" },
  { group: "Admin", label: "System Health", path: "/admin?tab=health" },
  { group: "Admin", label: "Admin Settings", path: "/admin?tab=settings" },
];

const defaultActions: PermissionAction = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  upload: false,
  download: false,
  share: false,
  manage: false,
};

function buildDefaultPermissions(): Record<RoleType, MenuPermission[]> {
  const roles: RoleType[] = ["admin", "studio", "regular"];

  return roles.reduce((acc, role) => {
    acc[role] = menuSeed.map((item) => {
      const adminEnabled = role === "admin";
      const studioEnabled = role === "studio" && item.group !== "Admin";
      const regularEnabled = role === "regular" && item.group === "Regular";
      const enabled = adminEnabled || studioEnabled || regularEnabled;

      return {
        id: `${role}_${item.group.toLowerCase()}_${item.path.replace(/[^a-zA-Z0-9]/g, "_")}`,
        role,
        group: item.group,
        label: item.label,
        path: item.path,
        enabled,
        actions: {
          ...defaultActions,
          view: enabled,
          create: role !== "regular" && enabled,
          edit: role !== "regular" && enabled,
          delete: role === "admin" && enabled,
          upload: item.path.includes("upload") || item.label.toLowerCase().includes("image"),
          download: enabled,
          share: role !== "regular" && enabled,
          manage: role === "admin" && enabled,
        },
      };
    });
    return acc;
  }, {} as Record<RoleType, MenuPermission[]>);
}

function loadPortalSettings(): PortalSettings {
  if (typeof window === "undefined") return defaultSettings;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<PortalSettings>) };
  } catch {
    return defaultSettings;
  }
}

function savePortalSettings(settings: PortalSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function loadRolePermissions(): Record<RoleType, MenuPermission[]> {
  const defaults = buildDefaultPermissions();
  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(ROLE_PERMISSIONS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<RoleType, MenuPermission[]>>;
    return {
      admin: parsed.admin?.length ? parsed.admin : defaults.admin,
      studio: parsed.studio?.length ? parsed.studio : defaults.studio,
      regular: parsed.regular?.length ? parsed.regular : defaults.regular,
      users: parsed.users?.length ? parsed.users : defaults.users,
    };
  } catch {
    return defaults;
  }
}

function saveRolePermissions(permissions: Record<RoleType, MenuPermission[]>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROLE_PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
}

function SettingSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-violet-600 dark:bg-violet-500" : "bg-slate-300 dark:bg-slate-600"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function roleGroupToDisplay(group: RoleMenuPermission["group"]): MenuPermission["group"] {
  if (group === "admin") return "Admin";
  if (group === "studio") return "Studio";
  if (group === "users") return "Users";
  return "Regular";
}

function rolePermissionsToMenuPermissions(
  perms: RoleMenuPermission[] | undefined,
  t: (key: string) => string,
): MenuPermission[] {
  return (perms ?? []).map((p) => {
    const actions: MenuPermissionAction = p.actions ?? { view: false };
    return {
      id: `${p.role}_${p.group}_${p.href.replace(/[^a-zA-Z0-9]/g, "_")}`,
      role: p.role,
      group: roleGroupToDisplay(p.group),
      label: t(p.labelKey),
      path: p.href,
      enabled: p.enabled ?? true,
      actions: {
        view: actions.view ?? false,
        create: actions.create ?? false,
        edit: actions.edit ?? false,
        delete: actions.delete ?? false,
        upload: actions.upload ?? false,
        download: actions.download ?? false,
        share: actions.share ?? false,
        manage: actions.manage ?? false,
      },
    };
  });
}

function configToLocalRolePermissions(
  roleMenuPermissions: Partial<Record<RoleType, RoleMenuPermission[]>> | undefined,
  t: (key: string) => string,
): Record<RoleType, MenuPermission[]> {
  const normalized = normalizeRoleMenuPermissions(roleMenuPermissions);
  return {
    admin: rolePermissionsToMenuPermissions(normalized.admin, t),
    studio: rolePermissionsToMenuPermissions(normalized.studio, t),
    regular: rolePermissionsToMenuPermissions(normalized.regular, t),
    users: rolePermissionsToMenuPermissions(normalized.users, t),
  };
}

function menuPermissionsToRolePermissions(
  rows: MenuPermission[],
  existing: RoleMenuPermission[],
): RoleMenuPermission[] {
  return rows.map((row) => {
    const prev = existing.find((p) => p.href === row.path);
    return {
      role: row.role,
      labelKey: prev?.labelKey ?? findNavLabelKeyForHref(row.path) ?? `nav.${row.group.toLowerCase()}.custom`,
      href: row.path,
      group: (row.group === 'Admin'
        ? 'admin'
        : row.group === 'Studio'
          ? 'studio'
          : row.group === 'Users'
            ? 'users'
            : 'regular') as RoleMenuPermission['group'],
      enabled: row.enabled,
      actions: { ...row.actions },
    };
  });
}

export default function PortalSettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { config, saving, saveConfig, resetToDefaults, updateSettings, setRolePermissions } = usePortalSettings();
  const portalRole = React.useMemo(() => getResolvedPortalRole(user), [user?.role, user?.accountType]);
  const editableRoles = React.useMemo(() => getEditablePortalRoles(user), [user?.role, user?.accountType]);
  const canEditPermissions = canManagePortalPermissions(user);
  const tabs = React.useMemo(
    () =>
      TAB_DEFS.map((tab) => ({
        id: tab.id,
        icon: tab.icon,
        label: t(tab.labelKey),
        description: t(tab.descKey),
      })),
    [t],
  );
  const visibleTabs = React.useMemo(
    () => (canEditPermissions ? tabs : tabs.filter((tab) => tab.id !== "permissions")),
    [canEditPermissions, tabs],
  );
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("general");
  const [selectedRole, setSelectedRole] = React.useState<RoleType>(portalRole);
  const [permissionSearch, setPermissionSearch] = React.useState("");
  const settings = config.settings as PortalSettings;
  const [rolePermissions, setRolePermissionsLocal] = React.useState<Record<RoleType, MenuPermission[]>>(
    () => configToLocalRolePermissions(config.roleMenuPermissions, t),
  );
  const [savedMessage, setSavedMessage] = React.useState("");

  React.useEffect(() => {
    setRolePermissionsLocal(configToLocalRolePermissions(config.roleMenuPermissions, t));
  }, [config.roleMenuPermissions, t]);

  React.useEffect(() => {
    if (editableRoles.includes(portalRole)) {
      setSelectedRole(portalRole);
    } else if (editableRoles.length > 0) {
      setSelectedRole(editableRoles[0]);
    }
  }, [portalRole, editableRoles]);

  React.useEffect(() => {
    const lang = settings.language === "hi" ? "hi" : "en";
    if (i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }
  }, [settings.language, i18n]);

  const selectedRolePermissions = React.useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    const rows = rolePermissions[selectedRole] || [];

    if (!query) return rows;

    return rows.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.path.toLowerCase().includes(query) ||
        item.group.toLowerCase().includes(query),
    );
  }, [permissionSearch, rolePermissions, selectedRole]);

  const permissionGroups = React.useMemo(() => getMenuGroupsForRole(selectedRole), [selectedRole]);

  const groupedPermissions = React.useMemo(() => {
    return selectedRolePermissions.reduce((acc, item) => {
      if (!permissionGroups.includes(item.group)) return acc;
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {} as Record<MenuPermission["group"], MenuPermission[]>);
  }, [selectedRolePermissions, permissionGroups]);

  const updateSetting = <K extends keyof PortalSettings>(key: K, value: PortalSettings[K]) => {
    updateSettings({ [key]: value } as Partial<PortalSettings>);
  };

  const updatePermission = (
    role: RoleType,
    permissionId: string,
    updater: (item: MenuPermission) => MenuPermission,
  ) => {
    setRolePermissionsLocal((prev) => ({
      ...prev,
      [role]: prev[role].map((item) => (item.id === permissionId ? updater(item) : item)),
    }));
  };

  const handleSave = async () => {
    const normalized = normalizeRoleMenuPermissions(config.roleMenuPermissions);
    const roleMenuPermissions = {
      admin: menuPermissionsToRolePermissions(rolePermissions.admin, normalized.admin),
      studio: menuPermissionsToRolePermissions(rolePermissions.studio, normalized.studio),
      regular: menuPermissionsToRolePermissions(rolePermissions.regular, normalized.regular),
      users: menuPermissionsToRolePermissions(rolePermissions.users, normalized.users),
    };
    await saveConfig({
      settings,
      roleMenuPermissions: canEditPermissions ? roleMenuPermissions : undefined,
      aiToolSettings: config.aiToolSettings,
      menuFlags: config.menuFlags,
    });
    if (canEditPermissions) {
      await savePortalPermissions(roleMenuPermissions);
      setRolePermissions(roleMenuPermissions);
    }
    setSavedMessage(t("portalSettingsPage.savedSuccess"));
    window.setTimeout(() => setSavedMessage(""), 2500);
  };

  const handleReset = async () => {
    const ok = window.confirm(t("portalSettingsPage.resetConfirm"));
    if (!ok) return;
    await resetToDefaults();
    const defaults = buildDefaultRolePermissions();
    setRolePermissionsLocal({
      admin: rolePermissionsToMenuPermissions(defaults.admin, t),
      studio: rolePermissionsToMenuPermissions(defaults.studio, t),
      regular: rolePermissionsToMenuPermissions(defaults.regular, t),
      users: rolePermissionsToMenuPermissions(defaults.users, t),
    });
    setSavedMessage(t("portalSettingsPage.resetSuccess"));
    window.setTimeout(() => setSavedMessage(""), 2500);
  };

  const roleLabel = (role: RoleType) =>
    t(`portalSettingsPage.permissions.roles.${role}`, { defaultValue: role });

  const handleRoleReset = () => {
    const defaults = buildDefaultRolePermissions();
    setRolePermissionsLocal((prev) => ({
      ...prev,
      [selectedRole]: rolePermissionsToMenuPermissions(defaults[selectedRole], t),
    }));
  };

  const handleRoleBulkEnable = (enabled: boolean) => {
    setRolePermissionsLocal((prev) => ({
      ...prev,
      [selectedRole]: prev[selectedRole].map((item) => ({
        ...item,
        enabled,
        actions: {
          ...item.actions,
          view: enabled,
        },
      })),
    }));
  };

  const renderGeneral = () => (
    <section className="space-y-5">
      <SectionHeader title={t("portalSettingsPage.general.title")} description={t("portalSettingsPage.general.description")} />

      <div className={SETTINGS_CARD_CLASS}>
        <label className={SETTINGS_LABEL_CLASS}>{t("portalSettingsPage.general.portalName")}</label>
        <input
          value={settings.portalName}
          onChange={(e) => updateSetting("portalName", e.target.value)}
          className={SETTINGS_INPUT_CLASS}
          placeholder={defaultSettings.portalName}
        />
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            {t("portalSettingsPage.general.portalNamePreview", { defaultValue: "Sidebar preview" })}
          </p>
          <p className="mt-1 text-[15px] font-bold leading-tight text-slate-800 dark:text-slate-100">
            {settings.portalName.trim() || defaultSettings.portalName}
          </p>
        </div>
      </div>

      <SettingSwitch
        label={t("portalSettingsPage.general.compactMode")}
        description={t("portalSettingsPage.general.compactModeDesc")}
        checked={settings.compactMode}
        onChange={(v) => updateSetting("compactMode", v)}
      />
    </section>
  );

  const renderLanguage = () => (
    <section className="space-y-5">
      <SectionHeader title={t("portalSettingsPage.language.title")} description={t("portalSettingsPage.language.description")} />

      <div className="grid gap-5 md:grid-cols-2">
        <div className={SETTINGS_CARD_CLASS}>
          <label className={SETTINGS_LABEL_CLASS}>{t("portalSettingsPage.language.languageLabel")}</label>
          <select
            value={settings.language === "hi" ? "hi" : "en"}
            onChange={(e) => {
              const lang = e.target.value;
              updateSetting("language", lang);
              void i18n.changeLanguage(lang);
            }}
            className={SETTINGS_INPUT_CLASS}
          >
            <option value="en">{t("portalSettingsPage.language.langEn")}</option>
            <option value="hi">{t("portalSettingsPage.language.langHi")}</option>
          </select>
        </div>

        <div className={SETTINGS_CARD_CLASS}>
          <label className={SETTINGS_LABEL_CLASS}>{t("portalSettingsPage.language.timezone")}</label>
          <select
            value={settings.timezone}
            onChange={(e) => updateSetting("timezone", e.target.value)}
            className={SETTINGS_INPUT_CLASS}
          >
            <option value="Asia/Kolkata">Asia/Kolkata</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York</option>
            <option value="Europe/London">Europe/London</option>
          </select>
        </div>
      </div>
    </section>
  );

  const renderPermissions = () => (
    <section className="space-y-5">
      <SectionHeader
        title={t("portalSettingsPage.permissions.title")}
        description={t("portalSettingsPage.permissions.description", { role: roleLabel(selectedRole) })}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div>
            <label className="text-sm font-semibold text-slate-700">{t("portalSettingsPage.permissions.role")}</label>
            <div
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            >
              {roleLabel(portalRole)}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">{t("portalSettingsPage.permissions.searchMenu")}</label>
            <input
              value={permissionSearch}
              onChange={(e) => setPermissionSearch(e.target.value)}
              placeholder={t("portalSettingsPage.permissions.searchPlaceholder")}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleRoleBulkEnable(true)}
            className="rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
          >
            {t("portalSettingsPage.permissions.enableAll")}
          </button>
          <button
            type="button"
            onClick={() => handleRoleBulkEnable(false)}
            className="rounded-2xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
          >
            {t("portalSettingsPage.permissions.disableAll")}
          </button>
          <button
            type="button"
            onClick={handleRoleReset}
            className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
          >
            {t("portalSettingsPage.permissions.resetRole")}
          </button>
        </div>
      </div>

      {permissionGroups.map((group) => {
        const rows = groupedPermissions[group] || [];
        if (!rows.length) return null;
        const groupLabel = t(`portalSettingsPage.permissions.groups.${group}`, { defaultValue: group });

        return (
          <div key={group} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-950">
                  {t("portalSettingsPage.permissions.menuTitle", { group: groupLabel })}
                </h3>
                <p className="text-xs text-slate-500">
                  {t("portalSettingsPage.permissions.menuCount", { count: rows.length })}
                </p>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                {roleLabel(selectedRole)}
              </span>
            </div>

            <div className="space-y-3">
              {rows.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-950">{item.label}</p>
                        {item.path.includes("payment") || item.path.includes("admin") ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                            {t("portalSettingsPage.permissions.sensitive")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">{item.path}</p>
                    </div>

                    <SettingMiniSwitch
                      label={t("portalSettingsPage.permissions.menuAccess")}
                      checked={item.enabled}
                      onChange={(checked) =>
                        updatePermission(selectedRole, item.id, (old) => ({
                          ...old,
                          enabled: checked,
                          actions: { ...old.actions, view: checked },
                        }))
                      }
                    />
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {(
                      ["view", "create", "edit", "delete", "upload", "download", "share", "manage"] as Array<
                        keyof PermissionAction
                      >
                    ).map((action) => (
                      <SettingMiniSwitch
                        key={action}
                        label={t(`portalSettingsPage.actions.${action}`)}
                        checked={Boolean(item.actions[action])}
                        onChange={(checked) =>
                          updatePermission(selectedRole, item.id, (old) => ({
                            ...old,
                            actions: { ...old.actions, [action]: checked },
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );

  const renderAi = () => (
    <section className="space-y-5">
      <SectionHeader
        title={t("portalSettingsPage.omAssistant.title")}
        description={t("portalSettingsPage.omAssistant.description")}
      />

      <div className="grid gap-4">
        <SettingSwitch label={t("portalSettingsPage.omAssistant.enable")} checked={settings.aiAssistantEnabled} onChange={(v) => updateSetting("aiAssistantEnabled", v)} />
        <SettingSwitch label={t("portalSettingsPage.omAssistant.pageContext")} description={t("portalSettingsPage.omAssistant.pageContextDesc")} checked={settings.aiPageContextEnabled} onChange={(v) => updateSetting("aiPageContextEnabled", v)} />
        <SettingSwitch label={t("portalSettingsPage.omAssistant.chatHistory")} checked={settings.aiChatHistoryEnabled} onChange={(v) => updateSetting("aiChatHistoryEnabled", v)} />
        <SettingSwitch label={t("portalSettingsPage.omAssistant.userChatHistory")} checked={settings.aiUserWiseHistoryEnabled} onChange={(v) => updateSetting("aiUserWiseHistoryEnabled", v)} />
        <SettingSwitch label={t("portalSettingsPage.omAssistant.voice")} checked={settings.aiVoiceEnabled} onChange={(v) => updateSetting("aiVoiceEnabled", v)} />
        <SettingSwitch label={t("portalSettingsPage.omAssistant.image")} checked={settings.aiImageEnabled} onChange={(v) => updateSetting("aiImageEnabled", v)} />
        <SettingSwitch label={t("portalSettingsPage.omAssistant.uploadDebug")} checked={settings.aiUploadDebugEnabled} onChange={(v) => updateSetting("aiUploadDebugEnabled", v)} />
        <SettingSwitch label={t("portalSettingsPage.omAssistant.networkDebug")} checked={settings.aiNetworkDebugEnabled} onChange={(v) => updateSetting("aiNetworkDebugEnabled", v)} />
        <SettingSwitch label={t("portalSettingsPage.omAssistant.uiErrorDebug")} checked={settings.aiUiErrorDebugEnabled} onChange={(v) => updateSetting("aiUiErrorDebugEnabled", v)} />
        <SettingSwitch label={t("portalSettingsPage.omAssistant.safeActions")} checked={settings.aiSafeActionsEnabled} onChange={(v) => updateSetting("aiSafeActionsEnabled", v)} />
        <SettingSwitch label={t("portalSettingsPage.omAssistant.dangerConfirm")} checked={settings.aiDangerousConfirmation} onChange={(v) => updateSetting("aiDangerousConfirmation", v)} />
        <SettingSwitch label={t("portalSettingsPage.omAssistant.showModel")} checked={settings.aiShowUsedModel} onChange={(v) => updateSetting("aiShowUsedModel", v)} />
      </div>
    </section>
  );

  const renderNotifications = () => (
    <section className="space-y-5">
      <SectionHeader title={t("portalSettingsPage.notifications.title")} description={t("portalSettingsPage.notifications.description")} />
      <SettingSwitch label={t("portalSettingsPage.notifications.email")} checked={settings.emailNotifications} onChange={(v) => updateSetting("emailNotifications", v)} />
      <SettingSwitch label={t("portalSettingsPage.notifications.browser")} checked={settings.browserNotifications} onChange={(v) => updateSetting("browserNotifications", v)} />
    </section>
  );

  const renderSecurity = () => (
    <section className="space-y-5">
      <SectionHeader title={t("portalSettingsPage.security.title")} description={t("portalSettingsPage.security.description")} />
      <SettingSwitch label={t("portalSettingsPage.security.deleteConfirm")} checked={settings.requireDeleteConfirmation} onChange={(v) => updateSetting("requireDeleteConfirmation", v)} />
      <SettingSwitch label={t("portalSettingsPage.security.shareConfirm")} checked={settings.requirePublicShareConfirmation} onChange={(v) => updateSetting("requirePublicShareConfirmation", v)} />
    </section>
  );

  const renderAppearance = () => (
    <section className="space-y-5">
      <SectionHeader title={t("portalSettingsPage.appearance.title")} description={t("portalSettingsPage.appearance.description")} />

      <div className={SETTINGS_CARD_CLASS}>
        <label className={SETTINGS_LABEL_CLASS}>{t("portalSettingsPage.appearance.theme")}</label>
        <select
          value={settings.themeMode}
          onChange={(e) => updateSetting("themeMode", e.target.value as PortalSettings["themeMode"])}
          className={SETTINGS_INPUT_CLASS}
        >
          <option value="system">{t("portalSettingsPage.appearance.themeSystem")}</option>
          <option value="light">{t("portalSettingsPage.appearance.themeLight")}</option>
          <option value="dark">{t("portalSettingsPage.appearance.themeDark")}</option>
        </select>
      </div>

      <SettingSwitch
        label={t("portalSettingsPage.appearance.sidebarCollapsed")}
        checked={settings.sidebarCollapsedByDefault}
        onChange={(v) => updateSetting("sidebarCollapsedByDefault", v)}
      />
    </section>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "general":
        return renderGeneral();
      case "language":
        return renderLanguage();
      case "permissions":
        return renderPermissions();
      case "ai":
        return renderAi();
      case "notifications":
        return renderNotifications();
      case "security":
        return renderSecurity();
      case "appearance":
        return renderAppearance();
      default:
        return renderGeneral();
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f4fb] dark:bg-slate-950 px-4 py-6 text-slate-900 dark:text-slate-100 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
                <FaSlidersH className="h-3 w-3" />
                {t("portalSettingsPage.badge")}
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-4xl">{t("portalSettingsPage.title")}</h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{t("portalSettingsPage.subtitle")}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <FaUndo className="h-4 w-4" />
                {t("portalSettingsPage.reset")}
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60 dark:bg-violet-600 dark:shadow-violet-900/30 dark:hover:bg-violet-500"
              >
                <FaSave className="h-4 w-4" />
                {saving ? t("portalSettingsPage.saving") : t("portalSettingsPage.save")}
              </button>
            </div>
          </div>

          {savedMessage ? (
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <FaCheck className="h-4 w-4" />
              {savedMessage}
            </div>
          ) : null}
        </header>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-[2rem] border border-white/80 bg-white/80 p-3 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
            <nav className="space-y-2">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                      active
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                        : "text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-violet-300"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{tab.label}</span>
                      <span
                        className={`block truncate text-xs ${active ? "text-white/75" : "text-slate-400 dark:text-slate-500"}`}
                      >
                        {tab.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/70 dark:shadow-[0_20px_70px_rgba(0,0,0,0.35)] sm:p-7">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function SettingMiniSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-bold transition ${
        checked
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
    >
      <span>{label}</span>
      <span className={`h-2.5 w-2.5 rounded-full ${checked ? "bg-violet-600" : "bg-slate-300"}`} />
    </button>
  );
}
