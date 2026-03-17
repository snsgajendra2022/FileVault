import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUsers, FaCloud, FaChartBar, FaCog, FaPlus, FaUser, FaShieldAlt, FaRupeeSign, FaFlag } from 'react-icons/fa';
import UserManagement from '../components/admin/UserManagement';
import ServiceManagement from '../components/admin/ServiceManagement';
import PlanManagement from '../components/admin/PlanManagement';
import PaymentManagement from '../components/admin/PaymentManagement';
import FlagManagement from '../components/admin/FlagManagement';
import UsageAnalytics from '../components/admin/UsageAnalytics';
import SystemHealth from '../components/admin/SystemHealth';
import adminService from '../services/adminService';
import { toast } from 'react-hot-toast';

const AdminPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'Admin Dashboard', icon: FaShieldAlt },
    { id: 'users', name: 'User Management', icon: FaUsers },
    { id: 'services', name: 'Service Config', icon: FaCloud },
    { id: 'plans', name: 'Plan Management', icon: FaPlus },
    { id: 'payments', name: 'Payment Management', icon: FaRupeeSign },
    { id: 'flags', name: 'Feature Flags', icon: FaFlag },
    { id: 'analytics', name: 'Usage Analytics', icon: FaChartBar },
    { id: 'health', name: 'System Health', icon: FaShieldAlt },
    { id: 'settings', name: 'Admin Settings', icon: FaCog }
  ];

  // Set initial tab from URL parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabs.find(tab => tab.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard setActiveTab={handleTabChange} />;
      case 'users':
        return <UserManagement />;
      case 'services':
        return <ServiceManagement />;
      case 'plans':
        return <PlanManagement />;
      case 'payments':
        return <PaymentManagement />;
      case 'flags':
        return <FlagManagement />;
      case 'analytics':
        return <UsageAnalytics />;
      case 'health':
        return <SystemHealth />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminDashboard setActiveTab={handleTabChange} />;
    }
  };

  // Check if user is admin
  if (!user || user.accountType !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {renderTabContent()}
      </div>
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const [dashboardData, setDashboardData] = useState({
    userStats: null,
    systemHealth: null,
    usageStats: null,
    serviceStats: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all dashboard data in parallel
      const [userStats, systemHealth, usageStats, serviceStats] = await Promise.allSettled([
        adminService.getUserStatistics(),
        adminService.getSystemHealth(),
        adminService.getUsageStatistics(),
        adminService.getServiceStatistics()
      ]);

      setDashboardData({
        userStats: userStats.status === 'fulfilled' ? userStats.value : null,
        systemHealth: systemHealth.status === 'fulfilled' ? systemHealth.value : null,
        usageStats: usageStats.status === 'fulfilled' ? usageStats.value : null,
        serviceStats: serviceStats.status === 'fulfilled' ? serviceStats.value : null
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { name: 'User Management', tab: 'users', icon: FaUser, color: 'bg-blue-500' },
    { name: 'Service Config', tab: 'services', icon: FaCloud, color: 'bg-green-500' },
    { name: 'Plan Management', tab: 'plans', icon: FaPlus, color: 'bg-purple-500' },
    { name: 'Payment Management', tab: 'payments', icon: FaRupeeSign, color: 'bg-yellow-500' },
    { name: 'Usage Analytics', tab: 'analytics', icon: FaChartBar, color: 'bg-orange-500' },
    { name: 'System Health', tab: 'health', icon: FaShieldAlt, color: 'bg-red-500' },
  ];

  const getSystemHealthStatus = () => {
    if (!dashboardData.systemHealth) return { status: 'Loading...', color: 'text-gray-500' };
    
    const health = dashboardData.systemHealth;
    if (health.status === 'HEALTHY') return { status: 'Good', color: 'text-green-600' };
    if (health.status === 'WARNING') return { status: 'Warning', color: 'text-yellow-600' };
    return { status: 'Critical', color: 'text-red-600' };
  };

  const formatStorage = (bytes: number) => {
    if (!bytes) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome to the admin panel. Manage your system from here.</p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <FaChartBar className="h-4 w-4" />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.name}
              onClick={() => setActiveTab(action.tab)}
              className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
            >
              <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">{action.name}</h3>
              <p className="text-sm text-gray-600 mt-1">Manage {action.name.toLowerCase()}</p>
            </button>
          );
        })}
      </div>

      {/* System Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-600">Total Users</p>
            <p className="text-2xl font-bold text-blue-900">
              {loading ? 'Loading...' : (dashboardData.userStats?.totalUsers || 0)}
            </p>
            {dashboardData.userStats && (
              <p className="text-xs text-blue-600 mt-1">
                {dashboardData.userStats.activeUsers || 0} active
              </p>
            )}
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-green-600">Active Services</p>
            <p className="text-2xl font-bold text-green-900">
              {loading ? 'Loading...' : (dashboardData.serviceStats?.activeServices || 0)}
            </p>
            {dashboardData.serviceStats && (
              <p className="text-xs text-green-600 mt-1">
                {dashboardData.serviceStats.totalServices || 0} total
              </p>
            )}
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-600">Total Storage</p>
            <p className="text-2xl font-bold text-purple-900">
              {loading ? 'Loading...' : formatStorage(dashboardData.usageStats?.totalStorageUsed || 0)}
            </p>
            {dashboardData.usageStats && (
              <p className="text-xs text-purple-600 mt-1">
                {dashboardData.usageStats.totalFiles || 0} files
              </p>
            )}
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm font-medium text-orange-600">System Health</p>
            <p className={`text-2xl font-bold ${getSystemHealthStatus().color}`}>
              {getSystemHealthStatus().status}
            </p>
            {dashboardData.systemHealth && (
              <p className="text-xs text-orange-600 mt-1">
                {dashboardData.systemHealth.uptime || 'N/A'} uptime
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      {dashboardData.userStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">User Activity</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">New Users (30d)</span>
                <span className="font-semibold">{dashboardData.userStats.newUsersThisMonth || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Pending Verification</span>
                <span className="font-semibold">{dashboardData.userStats.pendingVerification || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Suspended Users</span>
                <span className="font-semibold">{dashboardData.userStats.suspendedUsers || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Storage Usage</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Used Storage</span>
                <span className="font-semibold">{formatStorage(dashboardData.usageStats?.totalStorageUsed || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Available</span>
                <span className="font-semibold">{formatStorage(dashboardData.usageStats?.totalStorageAvailable || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Uploads (30d)</span>
                <span className="font-semibold">{dashboardData.usageStats?.uploadsThisMonth || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Service Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Connected Services</span>
                <span className="font-semibold">{dashboardData.serviceStats?.connectedServices || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Failed Connections</span>
                <span className="font-semibold">{dashboardData.serviceStats?.failedConnections || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Last Sync</span>
                <span className="font-semibold">{dashboardData.serviceStats?.lastSyncTime || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Admin Settings Component
const AdminSettings = () => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-600">Configure system-wide settings and preferences.</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">Admin settings configuration will be implemented here.</p>
      </div>
    </div>
  );
};

export default AdminPage;
