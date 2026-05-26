import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import adminService, { UsageStatistics } from '../../api/services/adminService';
import { FaChartBar, FaCloud, FaUsers } from 'react-icons/fa';
import {
  AdminShell,
  AdminStatGrid,
  AdminStatCard,
  AdminCard,
  AdminEmptyState,
  adminSelectClass,
  adminLabelClass,
  adminTableHeadClass,
} from './adminUi';

const UsageAnalytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Fetch usage statistics
  const { data: usageStats, isLoading } = useQuery({
    queryKey: ['usageStatistics', selectedPeriod],
    queryFn: () => adminService.getUsageStatistics(selectedPeriod)
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getStorageUsagePercentage = (used: number, total: number) => {
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  return (
    <AdminShell
      embedded
      badge="Admin"
      badgeIcon={FaChartBar}
      title="Usage analytics"
      subtitle="System-wide usage statistics and insights."
      actions={
        <div className="flex items-center gap-2">
          <label className={adminLabelClass}>Period</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className={adminSelectClass}
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      }
    >
      {isLoading ? (
        <AdminEmptyState title="Loading usage statistics…" />
      ) : usageStats ? (
        <>
          <AdminStatGrid>
            <AdminStatCard
              tone="blue"
              label="Total storage used"
              value={formatBytes(usageStats.totalStorageUsedBytes)}
              hint={`${usageStats.totalStorageUsedGB?.toFixed(2)} GB`}
              icon={FaCloud}
            />
            <AdminStatCard
              tone="green"
              label="Total images"
              value={formatNumber(usageStats.totalImages)}
              hint="Files uploaded"
              icon={FaUsers}
            />
            <AdminStatCard
              tone="purple"
              label="Average file size"
              value={formatBytes(usageStats.averageFileSizeBytes)}
              hint="Per file"
              icon={FaChartBar}
            />
            <AdminStatCard
              tone="amber"
              label="Top users"
              value={usageStats.topUsersByStorage?.length || 0}
              hint="Heavy storage users"
              icon={FaUsers}
            />
          </AdminStatGrid>

          <AdminCard title="File type distribution" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(usageStats.fileTypeDistribution || {}).map(([type, count]) => {
                const percentage = Math.round((count / usageStats.totalImages) * 100);
                return (
                  <div
                    key={type}
                    className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/40"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{type.toUpperCase()}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{percentage}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-2 rounded-full bg-indigo-600 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{formatNumber(count)} files</p>
                  </div>
                );
              })}
            </div>
          </AdminCard>

          {usageStats.topUsersByStorage && usageStats.topUsersByStorage.length > 0 && (
            <AdminCard title="Top users by storage" className="mb-6 overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className={adminTableHeadClass}>
                    <tr>
                      <th className="px-6 py-3">User</th>
                      <th className="px-6 py-3">Storage used</th>
                      <th className="px-6 py-3">Percentage</th>
                      <th className="px-6 py-3">Usage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {usageStats.topUsersByStorage.map((user, index) => {
                      const percentage = getStorageUsagePercentage(
                        user.storageUsedBytes, 
                        usageStats.totalStorageUsedBytes
                      );
                      return (
                        <tr key={user.userId} className="hover:bg-slate-50/80">
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                                <span className="text-sm font-semibold text-indigo-700">
                                  {user.username?.charAt(0)}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-slate-900">{user.username}</div>
                                <div className="text-xs text-slate-500">ID: {user.userId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                            {formatBytes(user.storageUsedBytes)}
                            <div className="text-xs text-slate-500">{user.storageUsedMB?.toFixed(2)} MB</div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                            {percentage}%
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="h-2 w-32 rounded-full bg-slate-200 dark:bg-slate-700">
                              <div
                                className="h-2 rounded-full bg-indigo-600"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          )}

          {usageStats.userStorageUsage && Object.keys(usageStats.userStorageUsage).length > 0 && (
            <AdminCard title="User storage overview">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(usageStats.userStorageUsage).slice(0, 9).map(([userId, storageUsed]) => {
                  const percentage = getStorageUsagePercentage(
                    storageUsed, 
                    usageStats.totalStorageUsedBytes
                  );
                  return (
                    <div key={userId} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-slate-900">User {userId}</span>
                        <span className="text-sm text-slate-500">{percentage}%</span>
                      </div>
                      <div className="mb-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-2 rounded-full bg-emerald-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-500">{formatBytes(storageUsed)}</p>
                    </div>
                  );
                })}
              </div>
              {Object.keys(usageStats.userStorageUsage).length > 9 && (
                <p className="mt-4 text-center text-xs text-slate-500">
                  Showing top 9 users. Total: {Object.keys(usageStats.userStorageUsage).length}
                </p>
              )}
            </AdminCard>
          )}
        </>
      ) : (
        <AdminEmptyState icon={FaChartBar} title="No usage statistics available" />
      )}
    </AdminShell>
  );
};

export default UsageAnalytics;
