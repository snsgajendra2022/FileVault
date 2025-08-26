import React from 'react';
import { useQuery } from '@tanstack/react-query';
import adminService, { SystemHealth as SystemHealthType } from '../../services/adminService';
import { FaUsers, FaExclamationTriangle, FaCheck } from 'react-icons/fa';

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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">System Health Monitor</h3>
          <p className="text-sm text-gray-600">Real-time system performance and status</p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary flex items-center space-x-2"
        >
          <FaUsers className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading system health data...</p>
        </div>
      ) : systemHealth ? (
        <>
          {/* System Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Users</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatNumber(systemHealth.totalUsers)}
                  </p>
                  <p className="text-sm text-blue-700">
                    Registered accounts
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FaUsers className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatNumber(systemHealth.activeUsers)}
                  </p>
                  <p className="text-sm text-green-700">
                    Currently online
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <FaUsers className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Total Images</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatNumber(systemHealth.totalImages)}
                  </p>
                  <p className="text-sm text-purple-700">
                    Files stored
                  </p>
                </div>
                                 <div className="h-12 w-12 bg-purple-500 rounded-lg flex items-center justify-center">
                   <FaUsers className="h-6 w-6 text-white" />
                 </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Storage Used</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatBytes(systemHealth.totalStorageUsedGB * 1024 * 1024 * 1024)}
                  </p>
                  <p className="text-sm text-orange-700">
                    {systemHealth.totalStorageUsedGB?.toFixed(2)} GB
                  </p>
                </div>
                                 <div className="h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center">
                   <FaUsers className="h-6 w-6 text-white" />
                 </div>
              </div>
            </div>
          </div>

          {/* Health Status Indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* User Health */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">User Health Status</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(getHealthStatus(systemHealth.pendingVerifications, 10, 'high'))}
                    <div>
                      <p className="font-medium text-gray-900">Pending Verifications</p>
                      <p className="text-sm text-gray-600">Users awaiting approval</p>
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

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(getHealthStatus(systemHealth.suspendedUsers, 5, 'high'))}
                    <div>
                      <p className="font-medium text-gray-900">Suspended Users</p>
                      <p className="text-sm text-gray-600">Accounts temporarily disabled</p>
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
            </div>

            {/* Service Health */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Service Health Status</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(getHealthStatus(systemHealth.failedServiceConnections, 3, 'high'))}
                    <div>
                      <p className="font-medium text-gray-900">Failed Connections</p>
                      <p className="text-sm text-gray-600">Service configuration issues</p>
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

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon('healthy')}
                    <div>
                      <p className="font-medium text-gray-900">Total Configurations</p>
                      <p className="text-sm text-gray-600">Service configurations</p>
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
            </div>
          </div>

          {/* System Metrics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">System Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="h-24 w-24 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                  <FaUsers className="h-8 w-8 text-blue-600" />
                </div>
                <h5 className="font-semibold text-gray-900">User Activity</h5>
                <p className="text-2xl font-bold text-blue-600">
                  {systemHealth.activeUsers > 0 ? Math.round((systemHealth.activeUsers / systemHealth.totalUsers) * 100) : 0}%
                </p>
                <p className="text-sm text-gray-600">Active rate</p>
              </div>

              <div className="text-center">
                                 <div className="h-24 w-24 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                   <FaUsers className="h-8 w-8 text-green-600" />
                 </div>
                <h5 className="font-semibold text-gray-900">Storage Efficiency</h5>
                <p className="text-2xl font-bold text-green-600">
                  {systemHealth.totalImages > 0 ? Math.round(systemHealth.totalStorageUsedGB / systemHealth.totalImages) : 0}
                </p>
                <p className="text-sm text-gray-600">MB per file</p>
              </div>

              <div className="text-center">
                                 <div className="h-24 w-24 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
                   <FaUsers className="h-8 w-8 text-purple-600" />
                 </div>
                <h5 className="font-semibold text-gray-900">Service Reliability</h5>
                <p className="text-2xl font-bold text-purple-600">
                  {systemHealth.totalServiceConfigurations > 0 ? 
                    Math.round(((systemHealth.totalServiceConfigurations - systemHealth.failedServiceConnections) / systemHealth.totalServiceConfigurations) * 100) : 100}%
                </p>
                <p className="text-sm text-gray-600">Success rate</p>
              </div>
            </div>
          </div>

          {/* Health Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Health Alerts</h4>
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
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No system health data available</p>
        </div>
      )}
    </div>
  );
};

export default SystemHealth;
