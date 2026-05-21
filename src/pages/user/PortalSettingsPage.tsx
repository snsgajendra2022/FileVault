import React from "react";
import { useTranslation } from "react-i18next";
import { usePortalSettings } from "../../state/context/PortalSettingsContext";
import { buildDefaultRolePermissions, normalizeRoleMenuPermissions } from "../../utils/portalSettings";
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

const defaultSettings: PortalSettings = {
  portalName: "Our Memories Portal",
  language: "en",
  timezone: "Asia/Kolkata",
  compactMode: false,
  emailNotifications: true,
  browserNotifications: false,
  requireDeleteConfirmation: true,
  requirePublicShareConfirmation: true,
  themeMode: "system",
  sidebarCollapsedByDefault: false,
  aiAssistantEnabled: true,
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

const tabs: Array<{
  id: SettingsTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "general", label: "General", description: "Basic portal settings", icon: FaCog },
  { id: "language", label: "Language", description: "Language and region", icon: FaGlobe },
  { id: "permissions", label: "Permissions", description: "Role and menu access", icon: FaUserCog },
  { id: "ai", label: "AI Tools", description: "OpenClaw assistant settings", icon: FaRobot },
  { id: "notifications", label: "Notifications", description: "Email and browser alerts", icon: FaBell },
  { id: "security", label: "Security", description: "Confirmation and safety", icon: FaLock },
  { id: "appearance", label: "Appearance", description: "Theme and display", icon: FaPalette },
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-violet-600" : "bg-slate-300"
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

function rolePermissionsToMenuPermissions(
  perms: RoleMenuPermission[] | undefined,
  t: (key: string) => string,
): MenuPermission[] {
  return (perms ?? []).map((p) => {
    const actions: MenuPermissionAction = p.actions ?? { view: false };
    return {
      id: `${p.role}_${p.group}_${p.href.replace(/[^a-zA-Z0-9]/g, "_")}`,
      role: p.role,
      group: (p.group.charAt(0).toUpperCase() + p.group.slice(1)) as MenuPermission["group"],
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
      labelKey: prev?.labelKey ?? `nav.${row.group.toLowerCase()}.${row.path.replace(/\//g, '.')}`,
      href: row.path,
      group: (row.group.toLowerCase() === 'admin' ? 'admin' : row.group.toLowerCase() === 'studio' ? 'studio' : 'regular') as RoleMenuPermission['group'],
      enabled: row.enabled,
      actions: { ...row.actions },
    };
  });
}

export default function PortalSettingsPage() {
  const { t } = useTranslation();
  const { config, saving, saveConfig, resetToDefaults, updateSettings, setRolePermissions } = usePortalSettings();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("general");
  const [selectedRole, setSelectedRole] = React.useState<RoleType>("admin");
  const [permissionSearch, setPermissionSearch] = React.useState("");
  const settings = config.settings as PortalSettings;
  const [rolePermissions, setRolePermissionsLocal] = React.useState<Record<RoleType, MenuPermission[]>>(
    () => configToLocalRolePermissions(config.roleMenuPermissions, t),
  );
  const [savedMessage, setSavedMessage] = React.useState("");

  React.useEffect(() => {
    setRolePermissionsLocal(configToLocalRolePermissions(config.roleMenuPermissions, t));
  }, [config.roleMenuPermissions, t]);

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

  const groupedPermissions = React.useMemo(() => {
    return selectedRolePermissions.reduce((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {} as Record<MenuPermission["group"], MenuPermission[]>);
  }, [selectedRolePermissions]);

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
      roleMenuPermissions,
      aiToolSettings: config.aiToolSettings,
      menuFlags: config.menuFlags,
    });
    setRolePermissions(roleMenuPermissions);
    setSavedMessage("Settings saved successfully.");
    window.setTimeout(() => setSavedMessage(""), 2500);
  };

  const handleReset = async () => {
    const ok = window.confirm("Reset all settings and permissions to default?");
    if (!ok) return;
    await resetToDefaults();
    const defaults = buildDefaultRolePermissions();
    setRolePermissionsLocal({
      admin: rolePermissionsToMenuPermissions(defaults.admin, t),
      studio: rolePermissionsToMenuPermissions(defaults.studio, t),
      regular: rolePermissionsToMenuPermissions(defaults.regular, t),
      users: rolePermissionsToMenuPermissions(defaults.users, t),
    });
    setSavedMessage("Settings reset to default.");
    window.setTimeout(() => setSavedMessage(""), 2500);
  };

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
      <SectionHeader title="General Settings" description="Manage basic portal preferences." />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-slate-700">Portal Name</label>
        <input
          value={settings.portalName}
          onChange={(e) => updateSetting("portalName", e.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
      </div>

      <SettingSwitch
        label="Compact Mode"
        description="Reduce spacing and make portal pages more compact."
        checked={settings.compactMode}
        onChange={(v) => updateSetting("compactMode", v)}
      />
    </section>
  );

  const renderLanguage = () => (
    <section className="space-y-5">
      <SectionHeader title="Language Settings" description="Choose default language and timezone." />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-sm font-semibold text-slate-700">Language</label>
          <select
            value={settings.language}
            onChange={(e) => updateSetting("language", e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ar">Arabic</option>
          </select>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-sm font-semibold text-slate-700">Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => updateSetting("timezone", e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
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
        title="Role & Menu Permissions"
        description="Control which role can view and access each portal menu."
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div>
            <label className="text-sm font-semibold text-slate-700">Select Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as RoleType)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            >
              <option value="admin">Admin</option>
              <option value="studio">Studio</option>
              <option value="regular">Regular User</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Search Menu</label>
            <input
              value={permissionSearch}
              onChange={(e) => setPermissionSearch(e.target.value)}
              placeholder="Search by menu, path, or group..."
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
            Enable All
          </button>
          <button
            type="button"
            onClick={() => handleRoleBulkEnable(false)}
            className="rounded-2xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
          >
            Disable All
          </button>
          <button
            type="button"
            onClick={handleRoleReset}
            className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
          >
            Reset Role Defaults
          </button>
        </div>
      </div>

      {(["Regular", "Studio", "Admin"] as MenuPermission["group"][]).map((group) => {
        const rows = groupedPermissions[group] || [];
        if (!rows.length) return null;

        return (
          <div key={group} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-950">{group} Menu</h3>
                <p className="text-xs text-slate-500">{rows.length} permissions</p>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{selectedRole}</span>
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
                            Sensitive
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">{item.path}</p>
                    </div>

                    <SettingMiniSwitch
                      label="Menu Access"
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
                        label={action.charAt(0).toUpperCase() + action.slice(1)}
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
      <SectionHeader title="AI Tools Settings" description="Manage OpenClaw assistant features and permissions." />

      <div className="grid gap-4">
        <SettingSwitch label="Enable AI Assistant" checked={settings.aiAssistantEnabled} onChange={(v) => updateSetting("aiAssistantEnabled", v)} />
        <SettingSwitch label="Enable Page Context" description="Allow assistant to understand current page UI context." checked={settings.aiPageContextEnabled} onChange={(v) => updateSetting("aiPageContextEnabled", v)} />
        <SettingSwitch label="Enable Chat History" checked={settings.aiChatHistoryEnabled} onChange={(v) => updateSetting("aiChatHistoryEnabled", v)} />
        <SettingSwitch label="Enable User-wise Chat History" checked={settings.aiUserWiseHistoryEnabled} onChange={(v) => updateSetting("aiUserWiseHistoryEnabled", v)} />
        <SettingSwitch label="Enable Voice Input" checked={settings.aiVoiceEnabled} onChange={(v) => updateSetting("aiVoiceEnabled", v)} />
        <SettingSwitch label="Enable Image Input" checked={settings.aiImageEnabled} onChange={(v) => updateSetting("aiImageEnabled", v)} />
        <SettingSwitch label="Enable Upload Debug" checked={settings.aiUploadDebugEnabled} onChange={(v) => updateSetting("aiUploadDebugEnabled", v)} />
        <SettingSwitch label="Enable Network Debug" checked={settings.aiNetworkDebugEnabled} onChange={(v) => updateSetting("aiNetworkDebugEnabled", v)} />
        <SettingSwitch label="Enable UI Error Debug" checked={settings.aiUiErrorDebugEnabled} onChange={(v) => updateSetting("aiUiErrorDebugEnabled", v)} />
        <SettingSwitch label="Enable Safe Actions" checked={settings.aiSafeActionsEnabled} onChange={(v) => updateSetting("aiSafeActionsEnabled", v)} />
        <SettingSwitch label="Require Confirmation for Dangerous Actions" checked={settings.aiDangerousConfirmation} onChange={(v) => updateSetting("aiDangerousConfirmation", v)} />
        <SettingSwitch label="Show Used Model" checked={settings.aiShowUsedModel} onChange={(v) => updateSetting("aiShowUsedModel", v)} />
      </div>
    </section>
  );

  const renderNotifications = () => (
    <section className="space-y-5">
      <SectionHeader title="Notification Settings" description="Manage email and browser notifications." />
      <SettingSwitch label="Email Notifications" checked={settings.emailNotifications} onChange={(v) => updateSetting("emailNotifications", v)} />
      <SettingSwitch label="Browser Notifications" checked={settings.browserNotifications} onChange={(v) => updateSetting("browserNotifications", v)} />
    </section>
  );

  const renderSecurity = () => (
    <section className="space-y-5">
      <SectionHeader title="Security Settings" description="Configure safe confirmation behavior." />
      <SettingSwitch label="Require Confirmation Before Delete" checked={settings.requireDeleteConfirmation} onChange={(v) => updateSetting("requireDeleteConfirmation", v)} />
      <SettingSwitch label="Require Confirmation Before Public Share" checked={settings.requirePublicShareConfirmation} onChange={(v) => updateSetting("requirePublicShareConfirmation", v)} />
    </section>
  );

  const renderAppearance = () => (
    <section className="space-y-5">
      <SectionHeader title="Appearance Settings" description="Change theme and display preference." />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-slate-700">Theme Mode</label>
        <select
          value={settings.themeMode}
          onChange={(e) => updateSetting("themeMode", e.target.value as PortalSettings["themeMode"])}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <SettingSwitch
        label="Sidebar Collapsed By Default"
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
    <div className="min-h-screen bg-[#f6f4fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                <FaSlidersH className="h-3 w-3" />
                Portal Settings
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Settings</h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Manage portal preferences, role-based permissions, AI tools, notifications, security, and appearance.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <FaUndo className="h-4 w-4" />
                Reset
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-60"
              >
                <FaSave className="h-4 w-4" />
                {saving ? "Saving…" : "Save Settings"}
              </button>
            </div>
          </div>

          {savedMessage ? (
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <FaCheck className="h-4 w-4" />
              {savedMessage}
            </div>
          ) : null}
        </header>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-[2rem] border border-white/80 bg-white/80 p-3 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <nav className="space-y-2">
              {tabs.map((tab) => {
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
                        : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{tab.label}</span>
                      <span className={`block truncate text-xs ${active ? "text-white/75" : "text-slate-400"}`}>
                        {tab.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-7">
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
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
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
