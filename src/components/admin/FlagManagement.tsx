import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../../api/services/adminService';
import { FaPlus, FaFlag, FaCheck, FaEdit } from 'react-icons/fa';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  AdminShell,
  AdminCard,
  AdminTableWrap,
  AdminEmptyState,
  AdminModal,
  AdminBadge,
  adminBtnPrimary,
  adminBtnSecondary,
  adminInputClass,
  adminLabelClass,
  adminTableHeadClass,
} from './adminUi';

type FlagRow = { id: number; name: string; value: boolean };

const FlagManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FlagRow | null>(null);
  const [editValue, setEditValue] = useState(false);

  const queryClient = useQueryClient();

  const { data: flagsData, isLoading } = useQuery({
    queryKey: ['adminFlags'],
    queryFn: () => adminService.getFlags(),
  });

  const createFlagMutation = useMutation({
    mutationFn: (payload: { name: string; value: boolean }) => adminService.createFlag(payload),
    onSuccess: () => {
      toast.success('Flag created successfully');
      setShowCreateModal(false);
      setNewName('');
      setNewValue(false);
      queryClient.invalidateQueries({ queryKey: ['adminFlags'] });
    },
    onError: () => toast.error('Failed to create flag'),
  });

  const updateFlagMutation = useMutation({
    mutationFn: ({ name, value }: { name: string; value: boolean }) => adminService.updateFlag(name, value),
    onSuccess: () => {
      toast.success('Flag updated successfully');
      setEditingFlag(null);
      queryClient.invalidateQueries({ queryKey: ['adminFlags'] });
    },
    onError: () => toast.error('Failed to update flag'),
  });

  const flags: FlagRow[] = flagsData?.flags ?? [];

  return (
    <AdminShell
      embedded
      badge="Admin"
      badgeIcon={FaFlag}
      title="Feature flags"
      subtitle="Toggle features across the portal (e.g. isEmail, isDownload)."
      actions={
        <button type="button" onClick={() => setShowCreateModal(true)} className={adminBtnPrimary}>
          <FaPlus className="h-4 w-4" />
          Create flag
        </button>
      }
    >
      <AdminTableWrap>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="md" />
          </div>
        ) : flags.length === 0 ? (
          <AdminEmptyState
            icon={FaFlag}
            title="No flags yet"
            description="Create a flag to control features across the application."
          />
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className={adminTableHeadClass}>
              <tr>
                <th className="px-6 py-3">Id</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {flags.map((flag) => (
                <tr key={flag.id} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{flag.id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                    {flag.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <AdminBadge tone={flag.value ? 'green' : 'slate'}>
                      {flag.value ? <FaCheck className="mr-1 inline h-3 w-3" /> : null}
                      {flag.value ? 'true' : 'false'}
                    </AdminBadge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFlag(flag);
                        setEditValue(flag.value);
                      }}
                      className={adminBtnSecondary}
                    >
                      <FaEdit className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminTableWrap>

      <AdminModal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create flag">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) {
              toast.error('Enter a flag name');
              return;
            }
            createFlagMutation.mutate({ name, value: newValue });
          }}
          className="space-y-4"
        >
          <div>
            <label className={adminLabelClass}>Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. isDownload, isEmail"
              className={adminInputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={newValue}
              onChange={(e) => setNewValue(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Enabled (true)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className={adminBtnSecondary}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={createFlagMutation.isPending || !newName.trim()}
              className={adminBtnPrimary}
            >
              {createFlagMutation.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={!!editingFlag} onClose={() => setEditingFlag(null)} title="Edit flag">
        {editingFlag ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateFlagMutation.mutate({ name: editingFlag.name, value: editValue });
            }}
            className="space-y-4"
          >
            <div>
              <label className={adminLabelClass}>Name</label>
              <p className="text-sm font-semibold text-slate-900">{editingFlag.name}</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={editValue}
                onChange={(e) => setEditValue(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Value (true/false)
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingFlag(null)} className={adminBtnSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={updateFlagMutation.isPending} className={adminBtnPrimary}>
                {updateFlagMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        ) : null}
      </AdminModal>
    </AdminShell>
  );
};

export default FlagManagement;
