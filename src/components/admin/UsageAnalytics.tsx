import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import adminService, { UsageStatistics } from '../../services/adminService';
import { FaChartBar, FaCloud, FaUsers } from 'react-icons/fa';

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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Usage Analytics</h3>
          <p className="text-sm text-gray-600">System-wide usage statistics and insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input-modern"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading usage statistics...</p>
        </div>
      ) : usageStats ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Storage Used</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatBytes(usageStats.totalStorageUsedBytes)}
                  </p>
                  <p className="text-sm text-blue-700">
                    {usageStats.totalStorageUsedGB?.toFixed(2)} GB
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
                  <p className="text-sm font-medium text-green-600">Total Images</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatNumber(usageStats.totalImages)}
                  </p>
                  <p className="text-sm text-green-700">
                    Files uploaded
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
                  <p className="text-sm font-medium text-purple-600">Average File Size</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatBytes(usageStats.averageFileSizeBytes)}
                  </p>
                  <p className="text-sm text-purple-700">
                    Per file
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <FaChartBar className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Top Users</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {usageStats.topUsersByStorage?.length || 0}
                  </p>
                  <p className="text-sm text-orange-700">
                    Heavy users
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <FaUsers className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* File Type Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">File Type Distribution</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(usageStats.fileTypeDistribution || {}).map(([type, count]) => {
                const percentage = Math.round((count / usageStats.totalImages) * 100);
                return (
                  <div key={type} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{type.toUpperCase()}</span>
                      <span className="text-sm text-gray-600">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{formatNumber(count)} files</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Users by Storage */}
          {usageStats.topUsersByStorage && usageStats.topUsersByStorage.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Users by Storage Usage</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Storage Used
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usage Bar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usageStats.topUsersByStorage.map((user, index) => {
                      const percentage = getStorageUsagePercentage(
                        user.storageUsedBytes, 
                        usageStats.totalStorageUsedBytes
                      );
                      return (
                        <tr key={user.userId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {user.username?.charAt(0)}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.username}
                                </div>
                                <div className="text-sm text-gray-500">ID: {user.userId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatBytes(user.storageUsedBytes)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.storageUsedMB?.toFixed(2)} MB
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* User Storage Usage Chart */}
          {usageStats.userStorageUsage && Object.keys(usageStats.userStorageUsage).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">User Storage Usage Overview</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(usageStats.userStorageUsage).slice(0, 9).map(([userId, storageUsed]) => {
                  const percentage = getStorageUsagePercentage(
                    storageUsed, 
                    usageStats.totalStorageUsedBytes
                  );
                  return (
                    <div key={userId} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">User {userId}</span>
                        <span className="text-sm text-gray-600">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600">{formatBytes(storageUsed)}</p>
                    </div>
                  );
                })}
              </div>
              {Object.keys(usageStats.userStorageUsage).length > 9 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Showing top 9 users. Total users: {Object.keys(usageStats.userStorageUsage).length}
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No usage statistics available</p>
        </div>
      )}
    </div>
  );
};

export default UsageAnalytics;
