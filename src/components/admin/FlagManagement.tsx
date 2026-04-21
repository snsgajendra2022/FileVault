import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../../api/services/adminService';
import { FaPlus, FaTimes, FaFlag, FaCheck, FaEdit } from 'react-icons/fa';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';

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

  const openEdit = (flag: FlagRow) => {
    setEditingFlag(flag);
    setEditValue(flag.value);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlag) return;
    updateFlagMutation.mutate({ name: editingFlag.name, value: editValue });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      toast.error('Enter a flag name');
      return;
    }
    createFlagMutation.mutate({ name, value: newValue });
  };

  return (
    <div className="bg-white p-2 min-h-screen">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Feature Flags</h2>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            <FaPlus className="h-4 w-4" />
            Create flag
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : flags.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaFlag className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium">No flags yet</p>
              <p className="text-xs mt-1">Create a flag to control features (e.g. isEmail, isPhone, isDownload).</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Id</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {flags.map((flag) => (
                  <tr key={flag.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{flag.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{flag.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          flag.value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {flag.value ? <FaCheck className="mr-1 h-3 w-3" /> : null}
                        {flag.value ? 'true' : 'false'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(flag)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                      >
                        <FaEdit className="h-3.5 w-3" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create flag</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewName('');
                  setNewValue(false);
                }}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. isDownload, isEmail, isPhone"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="new-flag-value"
                  checked={newValue}
                  onChange={(e) => setNewValue(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="new-flag-value" className="text-sm font-medium text-gray-700">
                  Value (true/false)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewName('');
                    setNewValue(false);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFlagMutation.isPending || !newName.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createFlagMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit flag</h3>
              <button
                type="button"
                onClick={() => setEditingFlag(null)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-sm font-medium text-gray-900">{editingFlag.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-flag-value"
                  checked={editValue}
                  onChange={(e) => setEditValue(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="edit-flag-value" className="text-sm font-medium text-gray-700">
                  Value (true/false)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFlag(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateFlagMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateFlagMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlagManagement;
