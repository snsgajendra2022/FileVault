import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/context/AuthContext';
import {
  FaUsers,
  FaCloud,
  FaChartBar,
  FaCog,
  FaPlus,
  FaShieldAlt,
  FaRupeeSign,
  FaFlag,
  FaBars,
} from 'react-icons/fa';
import UserManagement from '../../components/admin/UserManagement';
import ServiceManagement from '../../components/admin/ServiceManagement';
import PlanManagement from '../../components/admin/PlanManagement';
import PaymentManagement from '../../components/admin/PaymentManagement';
import FlagManagement from '../../components/admin/FlagManagement';
import UsageAnalytics from '../../components/admin/UsageAnalytics';
import SystemHealth from '../../components/admin/SystemHealth';
import PortalMenuManagement from '../../components/admin/PortalMenuManagement';
import adminService from '../../api/services/adminService';
import { toast } from 'react-hot-toast';
import {
  AdminShell,
  AdminStatGrid,
  AdminStatCard,
  AdminCard,
  adminBtnPrimary,
  adminCardClass,
} from '../../components/admin/adminUi';

const tabDefs = [
  { id: 'dashboard', icon: FaShieldAlt },
  { id: 'users', icon: FaUsers },
  { id: 'services', icon: FaCloud },
  { id: 'plans', icon: FaPlus },
  { id: 'payments', icon: FaRupeeSign },
  { id: 'flags', icon: FaFlag },
  { id: 'analytics', icon: FaChartBar },
  { id: 'health', icon: FaShieldAlt },
  { id: 'settings', icon: FaBars },
] as const;

const AdminPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');

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
        return <PortalMenuManagement />;
      default:
        return <AdminDashboard setActiveTab={handleTabChange} />;
    }
  };

  if (!user || user.accountType !== 'ADMIN') {
    return (
      <div className="admin-scope admin-panel-page flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <AdminCard className="max-w-md text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('adminPage.accessDenied')}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('adminPage.accessDeniedBody')}</p>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className="admin-scope admin-panel-page min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex items-center gap-3 border-b border-slate-100 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
              <FaShieldAlt className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                {t('adminPage.badge', 'Admin')}
              </p>
              <h1 className="text-lg font-bold text-slate-900">{t('adminPage.panelTitle', 'Control panel')}</h1>
            </div>
          </div>
          <nav className="-mb-px flex gap-1 overflow-x-auto py-2 scrollbar-thin" aria-label="Admin sections">
            {tabDefs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(`adminPage.tabs.${tab.id}`)}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div> */}

      <div className="flex-1">{renderTabContent()}</div>
    </div>
  );
};

const AdminDashboard = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState({
    userStats: null as any,
    systemHealth: null as any,
    usageStats: null as any,
    serviceStats: null as any,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [userStats, systemHealth, usageStats, serviceStats] = await Promise.all([
        adminService.getUserStatisticsOptional(),
        adminService.getSystemHealthOptional(),
        adminService.getUsageStatisticsOptional(),
        adminService.getServiceStatisticsOptional(),
      ]);
      setDashboardData({
        userStats,
        systemHealth,
        usageStats,
        serviceStats,
      });
    } catch {
      toast.error(t('adminPage.toastDashboardLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const quickActionDefs = [
    { tab: 'users' as const, icon: FaUsers, tone: 'blue' as const },
    { tab: 'services' as const, icon: FaCloud, tone: 'green' as const },
    { tab: 'plans' as const, icon: FaPlus, tone: 'purple' as const },
    { tab: 'payments' as const, icon: FaRupeeSign, tone: 'amber' as const },
    { tab: 'analytics' as const, icon: FaChartBar, tone: 'indigo' as const },
    { tab: 'health' as const, icon: FaShieldAlt, tone: 'rose' as const },
    { tab: 'settings' as const, icon: FaBars, tone: 'slate' as const },
  ];

  const formatStorage = (bytes: number) => {
    if (!bytes) return t('adminPage.gbZero');
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const healthLabel = () => {
    const h = dashboardData.systemHealth;
    if (!h) return t('adminPage.healthLoading');
    if (h.status === 'HEALTHY') return t('adminPage.healthGood');
    if (h.status === 'WARNING') return t('adminPage.healthWarning');
    return t('adminPage.healthCritical');
  };

  return (
    <AdminShell
      embedded
      badge={t('adminPage.badge', 'Admin')}
      badgeIcon={FaShieldAlt}
      title={t('adminPage.dashboardTitle')}
      subtitle={t('adminPage.dashboardSubtitle')}
      actions={
        <button type="button" onClick={() => void fetchDashboardData()} disabled={loading} className={adminBtnPrimary}>
          <FaChartBar className="h-4 w-4" />
          {loading ? t('adminPage.refreshing') : t('adminPage.refresh')}
        </button>
      }
    >
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quickActionDefs.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.tab}
              type="button"
              onClick={() => setActiveTab(action.tab)}
              className={`${adminCardClass} p-5 text-left transition hover:border-indigo-200 hover:shadow-md dark:hover:border-indigo-700`}
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white dark:bg-indigo-500">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {t(`adminPage.quickActions.${action.tab}`)}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t(`adminPage.quickActionManage.${action.tab}`)}
              </p>
            </button>
          );
        })}
      </div>

      <AdminStatGrid>
        <AdminStatCard
          tone="blue"
          label={t('adminPage.totalUsers')}
          value={loading ? '…' : dashboardData.userStats?.totalUsers ?? 0}
          hint={
            dashboardData.userStats
              ? t('adminPage.activeCount', { count: dashboardData.userStats.activeUsers || 0 })
              : undefined
          }
          icon={FaUsers}
        />
        <AdminStatCard
          tone="green"
          label={t('adminPage.activeServices')}
          value={loading ? '…' : dashboardData.serviceStats?.activeServices ?? 0}
          hint={
            dashboardData.serviceStats
              ? t('adminPage.totalCount', { count: dashboardData.serviceStats.totalServices || 0 })
              : undefined
          }
          icon={FaCloud}
        />
        <AdminStatCard
          tone="purple"
          label={t('adminPage.totalStorage')}
          value={loading ? '…' : formatStorage(dashboardData.usageStats?.totalStorageUsed || 0)}
          hint={
            dashboardData.usageStats
              ? t('adminPage.filesCount', { count: dashboardData.usageStats.totalFiles || 0 })
              : undefined
          }
        />
        <AdminStatCard
          tone="amber"
          label={t('adminPage.systemHealthCard')}
          value={healthLabel()}
          hint={
            dashboardData.systemHealth
              ? t('adminPage.uptime', { value: dashboardData.systemHealth.uptime || t('adminPage.na') })
              : undefined
          }
          icon={FaShieldAlt}
        />
      </AdminStatGrid>

      {dashboardData.userStats ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminCard title={t('adminPage.userActivity')}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('adminPage.newUsers30d')}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {dashboardData.userStats.newUsersThisMonth || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('adminPage.pendingVerification')}</span>
                <span className="font-semibold">{dashboardData.userStats.pendingVerification || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('adminPage.suspendedUsers')}</span>
                <span className="font-semibold">{dashboardData.userStats.suspendedUsers || 0}</span>
              </div>
            </div>
          </AdminCard>
          <AdminCard title={t('adminPage.storageUsage')}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('adminPage.usedStorage')}</span>
                <span className="font-semibold">
                  {formatStorage(dashboardData.usageStats?.totalStorageUsed || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('adminPage.available')}</span>
                <span className="font-semibold">
                  {formatStorage(dashboardData.usageStats?.totalStorageAvailable || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('adminPage.uploads30d')}</span>
                <span className="font-semibold">{dashboardData.usageStats?.uploadsThisMonth || 0}</span>
              </div>
            </div>
          </AdminCard>
          <AdminCard title={t('adminPage.serviceStatus')}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('adminPage.connectedServices')}</span>
                <span className="font-semibold">{dashboardData.serviceStats?.connectedServices || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('adminPage.failedConnections')}</span>
                <span className="font-semibold">{dashboardData.serviceStats?.failedConnections || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('adminPage.lastSync')}</span>
                <span className="font-semibold">{dashboardData.serviceStats?.lastSyncTime || t('adminPage.na')}</span>
              </div>
            </div>
          </AdminCard>
        </div>
      ) : null}
    </AdminShell>
  );
};

export default AdminPage;
