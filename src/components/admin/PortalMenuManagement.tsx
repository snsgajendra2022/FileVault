import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  FaSave,
  FaUndo,
  FaPlus,
  FaTrash,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaEyeSlash,
  FaSync,
  FaBars,
} from 'react-icons/fa';
import type { RoleMenuPermission, RoleType, MenuPermissionAction } from '../../types/permissions';
import type { PortalMenuFlags } from '../../types/portalApi';
import {
  fetchPortalConfig,
  savePortalConfig,
} from '../../api/services/portalSettingsService';
import {
  buildDefaultRolePermissions,
  normalizeRoleMenuPermissions,
  setPortalConfigCache,
} from '../../utils/portalSettings';
import { KNOWN_NAV_LABEL_KEYS } from '../layout/navConfig';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  AdminShell,
  AdminCard,
  adminBtnPrimary,
  adminBtnSecondary,
  adminInputClass,
  adminTableHeadClass,
} from './adminUi';

const ROLES: RoleType[] = ['admin', 'studio', 'users', 'regular'];
const ACTION_KEYS: Array<keyof MenuPermissionAction> = [
  'view',
  'create',
  'edit',
  'delete',
  'upload',
  'download',
  'share',
  'manage',
];

const defaultActions = (enabled = true): MenuPermissionAction => ({
  view: enabled,
  create: false,
  edit: false,
  delete: false,
  upload: false,
  download: enabled,
  share: false,
  manage: false,
});

function rowKey(row: RoleMenuPermission, index: number): string {
  return `${row.role}-${index}-${row.href}`;
}

function groupForRole(role: RoleType): RoleMenuPermission['group'] {
  if (role === 'admin') return 'admin';
  if (role === 'studio') return 'studio';
  if (role === 'users') return 'users';
  return 'regular';
}

const PortalMenuManagement = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<RoleType>('studio');
  const [search, setSearch] = React.useState('');
  const [roleMenuPermissions, setRoleMenuPermissions] = React.useState<
    Record<RoleType, RoleMenuPermission[]>
  >(buildDefaultRolePermissions());
  const [menuFlags, setMenuFlags] = React.useState<PortalMenuFlags>({
    regular: true,
    studio: true,
    users: true,
    admin: true,
  });
  const [dirty, setDirty] = React.useState(false);

  const loadConfig = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPortalConfig();
      setRoleMenuPermissions(normalizeRoleMenuPermissions(data.roleMenuPermissions));
      setMenuFlags({
        regular: true,
        studio: true,
        users: true,
        admin: true,
        ...data.menuFlags,
      });
      setPortalConfigCache(data);
      setDirty(false);
      if (process.env.NODE_ENV === 'development') {
        console.debug('[admin] portal config loaded', data.roleMenuPermissions);
      }
    } catch {
      toast.error(t('adminPortalMenu.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const updateRow = (role: RoleType, index: number, patch: Partial<RoleMenuPermission>) => {
    setRoleMenuPermissions((prev) => ({
      ...prev,
      [role]: prev[role].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
    setDirty(true);
  };

  const updateRowActions = (
    role: RoleType,
    index: number,
    action: keyof MenuPermissionAction,
    value: boolean,
  ) => {
    setRoleMenuPermissions((prev) => ({
      ...prev,
      [role]: prev[role].map((row, i) =>
        i === index
          ? {
              ...row,
              actions: { ...defaultActions(), ...row.actions, [action]: value },
            }
          : row,
      ),
    }));
    setDirty(true);
  };

  const setMenuEnabled = (role: RoleType, index: number, enabled: boolean) => {
    updateRow(role, index, {
      enabled,
      actions: {
        ...defaultActions(),
        ...(roleMenuPermissions[role][index]?.actions ?? {}),
        view: enabled,
      },
    });
  };

  const moveRow = (role: RoleType, index: number, dir: -1 | 1) => {
    const list = [...roleMenuPermissions[role]];
    const next = index + dir;
    if (next < 0 || next >= list.length) return;
    [list[index], list[next]] = [list[next], list[index]];
    setRoleMenuPermissions((prev) => ({ ...prev, [role]: list }));
    setDirty(true);
  };

  const removeRow = (role: RoleType, index: number) => {
    setRoleMenuPermissions((prev) => ({
      ...prev,
      [role]: prev[role].filter((_, i) => i !== index),
    }));
    setDirty(true);
  };

  const addRow = () => {
    const row: RoleMenuPermission = {
      role: selectedRole,
      labelKey: 'nav.studio.dashboard',
      href: '/studio/dashboard',
      group: groupForRole(selectedRole),
      enabled: true,
      actions: defaultActions(true),
    };
    setRoleMenuPermissions((prev) => ({
      ...prev,
      [selectedRole]: [...prev[selectedRole], row],
    }));
    setDirty(true);
  };

  const bulkEnable = (enabled: boolean) => {
    setRoleMenuPermissions((prev) => ({
      ...prev,
      [selectedRole]: prev[selectedRole].map((row) => ({
        ...row,
        enabled,
        actions: { ...defaultActions(), ...row.actions, view: enabled },
      })),
    }));
    setDirty(true);
  };

  const resetRole = () => {
    const defaults = buildDefaultRolePermissions();
    setRoleMenuPermissions((prev) => ({
      ...prev,
      [selectedRole]: defaults[selectedRole],
    }));
    setDirty(true);
    toast.success(t('adminPortalMenu.resetRoleDone', { role: selectedRole }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalized = normalizeRoleMenuPermissions(roleMenuPermissions);
      const saved = await savePortalConfig({
        roleMenuPermissions: normalized,
        menuFlags,
      });
      setRoleMenuPermissions(normalizeRoleMenuPermissions(saved.roleMenuPermissions));
      setMenuFlags({ regular: true, studio: true, users: true, admin: true, ...saved.menuFlags });
      setPortalConfigCache(saved);
      setDirty(false);
      toast.success(t('adminPortalMenu.saveSuccess'));
    } catch {
      toast.error(t('adminPortalMenu.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const rowEntries = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = roleMenuPermissions[selectedRole] ?? [];
    return list
      .map((row, index) => ({ row, index }))
      .filter(
        ({ row }) =>
          !q ||
          row.labelKey.toLowerCase().includes(q) ||
          row.href.toLowerCase().includes(q) ||
          row.group.toLowerCase().includes(q),
      );
  }, [roleMenuPermissions, selectedRole, search]);

  const roleLabel = (role: RoleType) => t(`adminPortalMenu.roles.${role}`, role);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <AdminShell
      embedded
      badge={t('adminPortalMenu.badge')}
      badgeIcon={FaBars}
      title={t('adminPortalMenu.title')}
      subtitle={t('adminPortalMenu.subtitle')}
      actions={
        <>
          <button type="button" onClick={() => void loadConfig()} disabled={saving} className={adminBtnSecondary}>
            <FaSync className="h-4 w-4" />
            {t('adminPortalMenu.reload')}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            className={adminBtnPrimary}
          >
            <FaSave className="h-4 w-4" />
            {saving ? t('adminPortalMenu.saving') : t('adminPortalMenu.save')}
          </button>
        </>
      }
    >
        <AdminCard title={t('adminPortalMenu.menuFlagsTitle')} description={t('adminPortalMenu.menuFlagsDesc')} className="mb-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => (
              <label
                key={role}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50"
              >
                <span className="text-sm font-medium capitalize">{roleLabel(role)}</span>
                <input
                  type="checkbox"
                  checked={menuFlags[role] !== false}
                  onChange={(e) => {
                    setMenuFlags((f) => ({ ...f, [role]: e.target.checked }));
                    setDirty(true);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
              </label>
            ))}
          </div>
        </AdminCard>

        {/* Role tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                selectedRole === role
                  ? 'bg-indigo-600 text-white shadow'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {roleLabel(role)}
              <span className="ml-2 text-xs opacity-80">
                ({roleMenuPermissions[role]?.length ?? 0})
              </span>
            </button>
          ))}
        </div>

        <AdminCard className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('adminPortalMenu.searchPlaceholder')}
              className={`${adminInputClass} max-w-md sm:w-auto`}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => bulkEnable(true)}
                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                {t('adminPortalMenu.enableAll')}
              </button>
              <button
                type="button"
                onClick={() => bulkEnable(false)}
                className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                {t('adminPortalMenu.disableAll')}
              </button>
              <button
                type="button"
                onClick={resetRole}
                className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
              >
                <FaUndo className="h-3 w-3" />
                {t('adminPortalMenu.resetRole')}
              </button>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <FaPlus className="h-3 w-3" />
                {t('adminPortalMenu.addItem')}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className={adminTableHeadClass}>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    {t('adminPortalMenu.colShow')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    {t('adminPortalMenu.colLabelKey')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    {t('adminPortalMenu.colPath')}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500">
                    {t('adminPortalMenu.colGroup')}
                  </th>
                  {ACTION_KEYS.map((a) => (
                    <th
                      key={a}
                      className="px-2 py-3 text-center text-[10px] font-bold uppercase text-gray-500"
                    >
                      {t(`portalSettingsPage.actions.${a}`, a)}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right text-xs font-bold uppercase text-gray-500">
                    {t('adminPortalMenu.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rowEntries.map(({ row, index }) => (
                    <tr key={rowKey(row, index)} className={row.enabled ? '' : 'bg-gray-50 opacity-70'}>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          title={row.enabled ? t('adminPortalMenu.hide') : t('adminPortalMenu.show')}
                          onClick={() => setMenuEnabled(selectedRole, index, !row.enabled)}
                          className={`rounded p-1.5 ${
                            row.enabled
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {row.enabled ? <FaEye className="h-4 w-4" /> : <FaEyeSlash className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 min-w-[200px]">
                        <input
                          list="nav-label-keys"
                          value={row.labelKey}
                          onChange={(e) =>
                            updateRow(selectedRole, index, { labelKey: e.target.value })
                          }
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs font-mono"
                        />
                      </td>
                      <td className="px-3 py-2 min-w-[180px]">
                        <input
                          value={row.href}
                          onChange={(e) => updateRow(selectedRole, index, { href: e.target.value })}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.group}
                          onChange={(e) =>
                            updateRow(selectedRole, index, {
                              group: e.target.value as RoleMenuPermission['group'],
                            })
                          }
                          className="rounded border border-gray-200 px-2 py-1 text-xs"
                        >
                          <option value="regular">regular</option>
                          <option value="studio">studio</option>
                          <option value="admin">admin</option>
                          <option value="users">users</option>
                        </select>
                      </td>
                      {ACTION_KEYS.map((action) => (
                        <td key={action} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(row.actions?.[action])}
                            onChange={(e) =>
                              updateRowActions(selectedRole, index, action, e.target.checked)
                            }
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => moveRow(selectedRole, index, -1)}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100"
                            title={t('adminPortalMenu.moveUp')}
                          >
                            <FaArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRow(selectedRole, index, 1)}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100"
                            title={t('adminPortalMenu.moveDown')}
                          >
                            <FaArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(selectedRole, index)}
                            className="rounded p-1 text-rose-600 hover:bg-rose-50"
                            title={t('adminPortalMenu.remove')}
                          >
                            <FaTrash className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rowEntries.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">{t('adminPortalMenu.noItems')}</p>
          ) : null}

          <datalist id="nav-label-keys">
            {KNOWN_NAV_LABEL_KEYS.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </AdminCard>

        <p className="mt-4 text-xs text-slate-500">{t('adminPortalMenu.footerHint')}</p>
    </AdminShell>
  );
};

export default PortalMenuManagement;
