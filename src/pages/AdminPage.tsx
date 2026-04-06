import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const tabDefs = [
  { id: 'dashboard', icon: FaShieldAlt },
  { id: 'users', icon: FaUsers },
  { id: 'services', icon: FaCloud },
  { id: 'plans', icon: FaPlus },
  { id: 'payments', icon: FaRupeeSign },
  { id: 'flags', icon: FaFlag },
  { id: 'analytics', icon: FaChartBar },
  { id: 'health', icon: FaShieldAlt },
  { id: 'settings', icon: FaCog }
] as const;

const AdminPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Set initial tab from URL parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabDefs.find((tab) => tab.id === tabFromUrl)) {
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('adminPage.accessDenied')}</h1>
          <p className="text-gray-600">{t('adminPage.accessDeniedBody')}</p>
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
            {tabDefs.map((tab) => {
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
                  {t(`adminPage.tabs.${tab.id}`)}
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
  const { t } = useTranslation();
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
      toast.error(t('adminPage.toastDashboardLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const quickActionDefs = [
    { tab: 'users' as const, icon: FaUser, color: 'bg-blue-500' },
    { tab: 'services' as const, icon: FaCloud, color: 'bg-green-500' },
    { tab: 'plans' as const, icon: FaPlus, color: 'bg-purple-500' },
    { tab: 'payments' as const, icon: FaRupeeSign, color: 'bg-yellow-500' },
    { tab: 'analytics' as const, icon: FaChartBar, color: 'bg-orange-500' },
    { tab: 'health' as const, icon: FaShieldAlt, color: 'bg-red-500' },
  ];

  const getSystemHealthStatus = () => {
    if (!dashboardData.systemHealth) return { status: t('adminPage.healthLoading'), color: 'text-gray-500' };

    const health = dashboardData.systemHealth;
    if (health.status === 'HEALTHY') return { status: t('adminPage.healthGood'), color: 'text-green-600' };
    if (health.status === 'WARNING') return { status: t('adminPage.healthWarning'), color: 'text-yellow-600' };
    return { status: t('adminPage.healthCritical'), color: 'text-red-600' };
  };

  const formatStorage = (bytes: number) => {
    if (!bytes) return t('adminPage.gbZero');
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('adminPage.dashboardTitle')}</h1>
            <p className="text-gray-600">{t('adminPage.dashboardSubtitle')}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <FaChartBar className="h-4 w-4" />
            <span>{loading ? t('adminPage.refreshing') : t('adminPage.refresh')}</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {quickActionDefs.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.tab}
              onClick={() => setActiveTab(action.tab)}
              className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
            >
              <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">{t(`adminPage.quickActions.${action.tab}`)}</h3>
              <p className="text-sm text-gray-600 mt-1">{t(`adminPage.quickActionManage.${action.tab}`)}</p>
            </button>
          );
        })}
      </div>

      {/* System Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('adminPage.systemOverview')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-600">{t('adminPage.totalUsers')}</p>
            <p className="text-2xl font-bold text-blue-900">
              {loading ? t('adminPage.statLoading') : (dashboardData.userStats?.totalUsers || 0)}
            </p>
            {dashboardData.userStats && (
              <p className="text-xs text-blue-600 mt-1">
                {t('adminPage.activeCount', { count: dashboardData.userStats.activeUsers || 0 })}
              </p>
            )}
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-green-600">{t('adminPage.activeServices')}</p>
            <p className="text-2xl font-bold text-green-900">
              {loading ? t('adminPage.statLoading') : (dashboardData.serviceStats?.activeServices || 0)}
            </p>
            {dashboardData.serviceStats && (
              <p className="text-xs text-green-600 mt-1">
                {t('adminPage.totalCount', { count: dashboardData.serviceStats.totalServices || 0 })}
              </p>
            )}
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-600">{t('adminPage.totalStorage')}</p>
            <p className="text-2xl font-bold text-purple-900">
              {loading ? t('adminPage.statLoading') : formatStorage(dashboardData.usageStats?.totalStorageUsed || 0)}
            </p>
            {dashboardData.usageStats && (
              <p className="text-xs text-purple-600 mt-1">
                {t('adminPage.filesCount', { count: dashboardData.usageStats.totalFiles || 0 })}
              </p>
            )}
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm font-medium text-orange-600">{t('adminPage.systemHealthCard')}</p>
            <p className={`text-2xl font-bold ${getSystemHealthStatus().color}`}>
              {getSystemHealthStatus().status}
            </p>
            {dashboardData.systemHealth && (
              <p className="text-xs text-orange-600 mt-1">
                {t('adminPage.uptime', { value: dashboardData.systemHealth.uptime || t('adminPage.na') })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      {dashboardData.userStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">{t('adminPage.userActivity')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('adminPage.newUsers30d')}</span>
                <span className="font-semibold">{dashboardData.userStats.newUsersThisMonth || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('adminPage.pendingVerification')}</span>
                <span className="font-semibold">{dashboardData.userStats.pendingVerification || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('adminPage.suspendedUsers')}</span>
                <span className="font-semibold">{dashboardData.userStats.suspendedUsers || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">{t('adminPage.storageUsage')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('adminPage.usedStorage')}</span>
                <span className="font-semibold">{formatStorage(dashboardData.usageStats?.totalStorageUsed || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('adminPage.available')}</span>
                <span className="font-semibold">{formatStorage(dashboardData.usageStats?.totalStorageAvailable || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('adminPage.uploads30d')}</span>
                <span className="font-semibold">{dashboardData.usageStats?.uploadsThisMonth || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">{t('adminPage.serviceStatus')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('adminPage.connectedServices')}</span>
                <span className="font-semibold">{dashboardData.serviceStats?.connectedServices || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('adminPage.failedConnections')}</span>
                <span className="font-semibold">{dashboardData.serviceStats?.failedConnections || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('adminPage.lastSync')}</span>
                <span className="font-semibold">{dashboardData.serviceStats?.lastSyncTime || t('adminPage.na')}</span>
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
  const { t } = useTranslation();
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('adminPage.adminSettingsTitle')}</h1>
        <p className="text-gray-600">{t('adminPage.adminSettingsSubtitle')}</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">{t('adminPage.adminSettingsPlaceholder')}</p>
      </div>
    </div>
  );
};

export default AdminPage;
