import React from 'react';
import { useQuery } from '@tanstack/react-query';
import adminService, { SystemHealth as SystemHealthType } from '../../api/services/adminService';
import { FaUsers, FaExclamationTriangle, FaCheck, FaShieldAlt } from 'react-icons/fa';
import {
  AdminShell,
  AdminStatGrid,
  AdminStatCard,
  AdminCard,
  AdminEmptyState,
  adminBtnSecondary,
} from './adminUi';

const SystemHealth = () => {
  // Fetch system health data
  const { data: systemHealth, isLoading, refetch } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => adminService.getSystemHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getHealthStatus = (value: number, threshold: number, type: 'high' | 'low' = 'high') => {
    if (type === 'high') {
      return value > threshold ? 'warning' : 'healthy';
    } else {
      return value < threshold ? 'warning' : 'healthy';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <FaCheck className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <FaExclamationTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <FaExclamationTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <FaUsers className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AdminShell
      embedded
      badge="Admin"
      badgeIcon={FaShieldAlt}
      title="System health"
      subtitle="Real-time system performance and status."
      actions={
        <button type="button" onClick={() => refetch()} className={adminBtnSecondary}>
          <FaUsers className="h-4 w-4" />
          Refresh
        </button>
      }
    >
      {isLoading ? (
        <AdminEmptyState title="Loading system health…" />
      ) : systemHealth ? (
        <>
          <AdminStatGrid>
            <AdminStatCard
              tone="blue"
              label="Total users"
              value={formatNumber(systemHealth.totalUsers)}
              hint="Registered accounts"
              icon={FaUsers}
            />
            <AdminStatCard
              tone="green"
              label="Active users"
              value={formatNumber(systemHealth.activeUsers)}
              hint="Currently online"
              icon={FaUsers}
            />
            <AdminStatCard
              tone="purple"
              label="Total images"
              value={formatNumber(systemHealth.totalImages)}
              hint="Files stored"
              icon={FaUsers}
            />
            <AdminStatCard
              tone="amber"
              label="Storage used"
              value={formatBytes(systemHealth.totalStorageUsedGB * 1024 * 1024 * 1024)}
              hint={`${systemHealth.totalStorageUsedGB?.toFixed(2)} GB`}
              icon={FaShieldAlt}
            />
          </AdminStatGrid>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AdminCard title="User health">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(getHealthStatus(systemHealth.pendingVerifications, 10, 'high'))}
                    <div>
                      <p className="font-medium text-slate-900">Pending verifications</p>
                      <p className="text-sm text-slate-500">Users awaiting approval</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getHealthStatus(systemHealth.pendingVerifications, 10, 'high') === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                      {systemHealth.pendingVerifications}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getHealthStatus(systemHealth.pendingVerifications, 10, 'high') === 'warning' ? 'High' : 'Normal'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(getHealthStatus(systemHealth.suspendedUsers, 5, 'high'))}
                    <div>
                      <p className="font-medium text-slate-900">Suspended users</p>
                      <p className="text-sm text-slate-500">Accounts temporarily disabled</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getHealthStatus(systemHealth.suspendedUsers, 5, 'high') === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                      {systemHealth.suspendedUsers}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getHealthStatus(systemHealth.suspendedUsers, 5, 'high') === 'warning' ? 'High' : 'Normal'}
                    </p>
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard title="Service health">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(getHealthStatus(systemHealth.failedServiceConnections, 3, 'high'))}
                    <div>
                      <p className="font-medium text-slate-900">Failed connections</p>
                      <p className="text-sm text-slate-500">Service configuration issues</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getHealthStatus(systemHealth.failedServiceConnections, 3, 'high') === 'warning' ? 'text-yellow-600' : 'text-green-600'}`}>
                      {systemHealth.failedServiceConnections}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getHealthStatus(systemHealth.failedServiceConnections, 3, 'high') === 'warning' ? 'Issues detected' : 'All good'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon('healthy')}
                    <div>
                      <p className="font-medium text-slate-900">Total configurations</p>
                      <p className="text-sm text-slate-500">Service configurations</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {systemHealth.totalServiceConfigurations}
                    </p>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>

          <AdminCard title="System metrics" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="h-24 w-24 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                  <FaUsers className="h-8 w-8 text-blue-600" />
                </div>
                <h5 className="font-semibold text-slate-900">User activity</h5>
                <p className="text-2xl font-bold text-blue-600">
                  {systemHealth.activeUsers > 0 ? Math.round((systemHealth.activeUsers / systemHealth.totalUsers) * 100) : 0}%
                </p>
                <p className="text-sm text-gray-600">Active rate</p>
              </div>

              <div className="text-center">
                                 <div className="h-24 w-24 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                   <FaUsers className="h-8 w-8 text-green-600" />
                 </div>
                <h5 className="font-semibold text-slate-900">Storage efficiency</h5>
                <p className="text-2xl font-bold text-green-600">
                  {systemHealth.totalImages > 0 ? Math.round(systemHealth.totalStorageUsedGB / systemHealth.totalImages) : 0}
                </p>
                <p className="text-sm text-gray-600">MB per file</p>
              </div>

              <div className="text-center">
                                 <div className="h-24 w-24 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
                   <FaUsers className="h-8 w-8 text-purple-600" />
                 </div>
                <h5 className="font-semibold text-slate-900">Service reliability</h5>
                <p className="text-2xl font-bold text-purple-600">
                  {systemHealth.totalServiceConfigurations > 0 ? 
                    Math.round(((systemHealth.totalServiceConfigurations - systemHealth.failedServiceConnections) / systemHealth.totalServiceConfigurations) * 100) : 100}%
                </p>
                <p className="text-sm text-gray-600">Success rate</p>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Health alerts">
            <div className="space-y-3">
              {systemHealth.pendingVerifications > 10 && (
                <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <FaExclamationTriangle className="h-5 w-5 text-yellow-600 mr-3" />
                  <div>
                    <p className="font-medium text-yellow-800">High Pending Verifications</p>
                    <p className="text-sm text-yellow-700">
                      {systemHealth.pendingVerifications} users are waiting for verification approval
                    </p>
                  </div>
                </div>
              )}

              {systemHealth.failedServiceConnections > 5 && (
                <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                  <FaExclamationTriangle className="h-5 w-5 text-red-600 mr-3" />
                  <div>
                    <p className="font-medium text-red-800">Service Connection Issues</p>
                    <p className="text-sm text-red-700">
                      {systemHealth.failedServiceConnections} service configurations have connection problems
                    </p>
                  </div>
                </div>
              )}

              {systemHealth.suspendedUsers > 3 && (
                <div className="flex items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <FaExclamationTriangle className="h-5 w-5 text-orange-600 mr-3" />
                  <div>
                    <p className="font-medium text-orange-800">Multiple Suspended Users</p>
                    <p className="text-sm text-orange-700">
                      {systemHealth.suspendedUsers} user accounts are currently suspended
                    </p>
                  </div>
                </div>
              )}

              {systemHealth.pendingVerifications <= 10 && systemHealth.failedServiceConnections <= 5 && systemHealth.suspendedUsers <= 3 && (
                <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                                     <FaCheck className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-800">All Systems Operational</p>
                    <p className="text-sm text-green-700">
                      No critical issues detected. System is running smoothly.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </AdminCard>
        </>
      ) : (
        <AdminEmptyState icon={FaShieldAlt} title="No system health data available" />
      )}
    </AdminShell>
  );
};

export default SystemHealth;
