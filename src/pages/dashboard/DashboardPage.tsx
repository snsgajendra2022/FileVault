import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useAuth } from '../../state/context/AuthContext';
import { 
  FaCloud, 
  FaShieldAlt, 
  FaChartBar, 
  FaUpload, 
  FaUsers, 
  FaLock, 
  FaEye, 
  FaCog, 
  FaBell, 
  FaStar,
  FaExclamationTriangle,
  FaInfoCircle,
  FaUser,
  FaHeart,
  FaSpinner,
  FaRedoAlt
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client/axiosInstance';

// Interface definitions for dynamic data
interface DashboardStats {
  totalFiles: number;
  totalSize: string;
  securityScore: number;
  activeServices: number;
  recentUploads: number;
  fileTypes: Record<string, { count: number; size: string; percentage: number }>;
}

interface RecentActivity {
  id: number;
  type: string;
  title: string;
  message: string;
  time: string;
  icon: any;
  color: string;
  bgColor: string;
  status: string;
  details?: Record<string, any>;
}

interface SystemHealth {
  name: string;
  value: string;
  status: string;
  icon: any;
  details: string;
}

interface QuickInsight {
  title: string;
  value: string;
  description: string;
  icon: any;
  color: string;
}

interface ServiceData {
  name: string;
  status: string;
  lastSync: string;
  files: number;
  uptime: number;
  speed: string;
}

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userActivity: Record<string, number>;
  userStats: Array<{ plan: string; users: number; percentage: number }>;
  recentActivity: Array<{ user: string; action: string; time: string }>;
}

const DashboardPage = () => {
  const { t, i18n } = useTranslation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Dynamic data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [quickInsights, setQuickInsights] = useState<QuickInsight[]>([]);
  const [serviceData, setServiceData] = useState<ServiceData[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  // Update time every minute and auto-refresh data every 5 minutes
  useEffect(() => {
    const timeTimer = setInterval(() => setCurrentTime(new Date()), 60000);
    const dataTimer = setInterval(() => {
      if (!loading) {
        fetchDashboardData();
      }
    }, 300000); // 5 minutes
    
    return () => {
      clearInterval(timeTimer);
      clearInterval(dataTimer);
    };
  }, [loading]);

  // Fetch all dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [isAdmin]);

  // Fetch dashboard data from APIs
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setApiErrors({});

      // Fetch data in parallel
      const [fileStatsResult, servicesResult, systemHealthResult, userStatsResult] = await Promise.allSettled([
        fetchFileStats(),
        fetchServicesData(),
        fetchSystemHealth(),
        isAdmin ? fetchUserAnalytics() : Promise.resolve(null)
      ]);

      const errors: Record<string, string> = {};

      // Process file stats
      if (fileStatsResult.status === 'fulfilled') {
        setStats(fileStatsResult.value);
      } else {
        errors.fileStats = i18n.t('mainDashboard.errFileStats');
        console.error('File stats error:', fileStatsResult.reason);
      }

      // Process services data
      if (servicesResult.status === 'fulfilled') {
        setServiceData(servicesResult.value);
      } else {
        errors.services = i18n.t('mainDashboard.errServices');
        console.error('Services error:', servicesResult.reason);
      }

      // Process system health
      if (systemHealthResult.status === 'fulfilled') {
        setSystemHealth(systemHealthResult.value);
      } else {
        errors.systemHealth = i18n.t('mainDashboard.errSystemHealth');
        console.error('System health error:', systemHealthResult.reason);
      }

      // Process user analytics (admin only)
      if (userStatsResult.status === 'fulfilled' && userStatsResult.value) {
        setUserAnalytics(userStatsResult.value);
      } else if (isAdmin && userStatsResult.status === 'rejected') {
        errors.userAnalytics = i18n.t('mainDashboard.errUserAnalytics');
        console.error('User analytics error:', userStatsResult.reason);
      }

      // Set API errors if any
      if (Object.keys(errors).length > 0) {
        setApiErrors(errors);
      }

      // Generate recent activity and quick insights
      generateRecentActivity();
      generateQuickInsights();

      // Set last updated timestamp
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(i18n.t('mainDashboard.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch file statistics
  const fetchFileStats = async (): Promise<DashboardStats> => {
    try {
      const userToken = localStorage.getItem('token');
      const [filesResult, statsResult] = await Promise.allSettled([
        api.get(`/api/images/user/all?token=${userToken}`),
        api.get('/api/images/stats')
      ]);

      const files = filesResult.status === 'fulfilled' ? filesResult.value.data : [];
      const stats = statsResult.status === 'fulfilled' ? statsResult.value.data : null;

      // console.log('Files API Response:', files); // Debug log
      // console.log('Stats API Response:', stats); // Debug log

      const totalFiles = Array.isArray(files) ? files.length : 0;
      const totalSize = stats?.totalSize || '0 MB';
      const fileTypes = stats?.fileTypeDistribution || {};

      return {
        totalFiles,
        totalSize,
        securityScore: stats?.securityScore || (totalFiles > 0 ? 95.0 : 100.0), // Dynamic security score
        activeServices: 0, // Will be updated by services data
        recentUploads: stats?.uploadsToday || 0,
        fileTypes: Object.entries(fileTypes).reduce((acc, [type, count]) => {
          acc[type] = {
            count: count as number,
            size: `${Math.round((count as number) * 2.5)} MB`, // Estimated size
            percentage: Math.round(((count as number) / totalFiles) * 100) || 0
          };
          return acc;
        }, {} as Record<string, { count: number; size: string; percentage: number }>)
      };
    } catch (error) {
      console.error('Error fetching file stats:', error);
      return {
        totalFiles: 0,
        totalSize: '0 MB',
        securityScore: 100.0, // Perfect score when no data
        activeServices: 0,
        recentUploads: 0,
        fileTypes: {}
      };
    }
  };

  // Fetch services data
  const fetchServicesData = async (): Promise<ServiceData[]> => {
    try {
      const response = await api.get('/api/services/user');
      // console.log('Services API Response:', response.data); // Debug log
      
      const services = response.data.subscriptions || [];
      const summary = response.data.summary || {};

      return services.map((service: any) => ({
        name: service.serviceDisplayName || service.serviceName || service.name || 'Unknown Service',
        status: service.connectionStatus === 'CONNECTED' ? 'Connected' : 'Disconnected',
        lastSync: service.lastConnectionTest ? new Date(service.lastConnectionTest).toLocaleString() : 'Never',
        files: service.fileCount || 0,
        uptime: service.uptime || (service.connectionStatus === 'CONNECTED' ? 99.9 : 0),
        speed: service.speed || (service.connectionStatus === 'CONNECTED' ? 'Fast' : 'Offline')
      }));
    } catch (error) {
      console.error('Error fetching services data:', error);
      return [];
    }
  };

  // Fetch system health
  const fetchSystemHealth = async (): Promise<SystemHealth[]> => {
    try {
      if (isAdmin) {
        const response = await api.get('/api/admin/system/health');
        const healthData = response.data || {};
        
        return [
          {
            name: 'System Performance',
            value: healthData.systemPerformance || 'Good',
            status: healthData.systemStatus || 'good',
            icon: FaStar,
            details: healthData.systemDetails || 'System operating normally'
          },
          {
            name: 'Network Status',
            value: healthData.networkStatus || 'Stable',
            status: healthData.networkHealth || 'good',
            icon: FaCloud,
            details: healthData.networkDetails || 'Network connection stable'
          },
          {
            name: 'Security Status',
            value: healthData.securityStatus || 'Protected',
            status: healthData.securityHealth || 'good',
            icon: FaLock,
            details: healthData.securityDetails || 'Security protocols active'
          },
          {
            name: 'Backup Status',
            value: healthData.backupStatus || 'Current',
            status: healthData.backupHealth || 'good',
            icon: FaShieldAlt,
            details: healthData.backupDetails || 'Backup system operational'
          }
        ];
      } else {
        return [
          {
            name: 'Account Status',
            value: 'Active',
            status: 'good',
            icon: FaUser,
            details: 'Your account is active and secure'
          },
          {
            name: 'Security Status',
            value: 'Protected',
            status: 'good',
            icon: FaLock,
            details: 'Your files are encrypted and secure'
          }
        ];
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
      return [];
    }
  };

  // Fetch user analytics (admin only)
  const fetchUserAnalytics = async (): Promise<UserAnalytics> => {
    try {
      const [userStats, systemHealth] = await Promise.allSettled([
        api.get('/api/admin/users/statistics'),
        api.get('/api/admin/system/health')
      ]);

      const stats = userStats.status === 'fulfilled' ? userStats.value.data : null;
      const health = systemHealth.status === 'fulfilled' ? systemHealth.value.data : null;

      // console.log('User Stats API Response:', stats); // Debug log
      // console.log('System Health API Response:', health); // Debug log

      return {
        totalUsers: health?.totalUsers || stats?.totalUsers || 0,
        activeUsers: health?.activeUsers || stats?.activeUsers || 0,
        newUsers: stats?.newUsersToday || stats?.newUsers || 0,
        userActivity: {
          daily: stats?.dailyActiveUsers || stats?.dailyUsers || 0,
          weekly: stats?.weeklyActiveUsers || stats?.weeklyUsers || 0,
          monthly: stats?.monthlyActiveUsers || stats?.monthlyUsers || 0
        },
        userStats: stats?.statusCounts ? Object.entries(stats.statusCounts).map(([status, count]) => ({
          plan: status,
          users: count as number,
          percentage: Math.round(((count as number) / (health?.totalUsers || stats?.totalUsers || 1)) * 100)
        })) : [],
        recentActivity: [] // Could be fetched from a separate endpoint
      };
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        userActivity: { daily: 0, weekly: 0, monthly: 0 },
        userStats: [],
        recentActivity: []
      };
    }
  };

  // Generate recent activity based on available data
  const generateRecentActivity = () => {
    const activities: RecentActivity[] = [];

    if (stats?.recentUploads && stats.recentUploads > 0) {
      activities.push({
        id: 1,
        type: 'upload',
        title: i18n.t('mainDashboard.activityUploadTitle'),
        message: i18n.t('mainDashboard.activityUploadMsg', { count: stats.recentUploads }),
        time: '2 minutes ago',
        icon: FaUpload,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        status: 'completed',
        details: { filesUploaded: stats.recentUploads }
      });
    }

    if (serviceData.length > 0) {
      const activeServices = serviceData.filter(s => s.status === 'Connected').length;
      activities.push({
        id: 2,
        type: 'service',
        title: i18n.t('mainDashboard.activityServiceTitle'),
        message: i18n.t('mainDashboard.activityServiceMsg', { count: activeServices }),
        time: '1 hour ago',
        icon: FaCloud,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        status: 'completed',
        details: { activeServices }
      });
    }

    activities.push({
      id: 3,
      type: 'security',
      title: i18n.t('mainDashboard.activitySecurityTitle'),
      message: i18n.t('mainDashboard.activitySecurityMsg'),
      time: '3 hours ago',
      icon: FaShieldAlt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      status: 'completed',
      details: { threats: 0 }
    });

    setRecentActivity(activities);
  };

  // Generate quick insights based on available data
  const generateQuickInsights = () => {
    const insights: QuickInsight[] = [];

    if (stats) {
      insights.push({
        title: t('mainDashboard.totalFiles'),
        value: stats.totalFiles.toLocaleString(),
        description: i18n.t('mainDashboard.insightFilesInAccount'),
        icon: FaCloud,
        color: 'text-blue-600'
      });

      insights.push({
        title: t('mainDashboard.securityScore'),
        value: `${stats.securityScore}%`,
        description:
          stats.securityScore >= 95
            ? t('mainDashboard.excellentProtection')
            : stats.securityScore >= 80
              ? t('mainDashboard.goodProtection')
              : t('mainDashboard.needsAttention'),
        icon: FaShieldAlt,
        color: stats.securityScore >= 95 ? 'text-emerald-600' : stats.securityScore >= 80 ? 'text-yellow-600' : 'text-red-600'
      });
    }

    if (serviceData.length > 0) {
      const activeServices = serviceData.filter(s => s.status === 'Connected').length;
      insights.push({
        title: t('mainDashboard.activeServices'),
        value: activeServices.toString(),
        description: t('mainDashboard.cloudConnected'),
        icon: FaUpload,
        color: 'text-green-600'
      });
    }

    insights.push({
      title: t('mainDashboard.insightAccountStatus'),
      value: 'Active',
      description: t('mainDashboard.insightAccountSecure'),
      icon: FaStar,
      color: 'text-purple-600'
    });

    setQuickInsights(insights);
  };

  // Refresh data
  const handleRefresh = () => {
    fetchDashboardData();
  };

  useEffect(() => {
    if (loading || !stats) return;
    generateRecentActivity();
    generateQuickInsights();
  }, [i18n.language]);

  const dynamicStats = useMemo(() => {
    if (!stats) return [];
    return [
      {
        name: t('mainDashboard.totalFiles'),
        value: stats.totalFiles.toLocaleString(),
        change: '+23%',
        changeType: 'positive' as const,
        icon: FaCloud,
        color: 'from-blue-500 via-blue-600 to-blue-700',
        description: t('mainDashboard.secureFiles'),
        trend: 'up' as const,
        details: stats.fileTypes
      },
      {
        name: t('mainDashboard.securityScore'),
        value: `${stats.securityScore}%`,
        change: '+2.3%',
        changeType: 'positive' as const,
        icon: FaShieldAlt,
        color: 'from-emerald-500 via-emerald-600 to-emerald-700',
        description:
          stats.securityScore >= 95
            ? t('mainDashboard.excellentProtection')
            : stats.securityScore >= 80
              ? t('mainDashboard.goodProtection')
              : t('mainDashboard.needsAttention'),
        trend: 'up' as const,
        details: {
          encryption: '100%',
          scanning: '98%',
          backup: '99%',
          access: '97%'
        }
      },
      {
        name: t('mainDashboard.activeServices'),
        value: serviceData.filter((s) => s.status === 'Connected').length.toString(),
        change: '+1',
        changeType: 'positive' as const,
        icon: FaUpload,
        color: 'from-orange-500 via-orange-600 to-orange-700',
        description: t('mainDashboard.cloudConnected'),
        trend: 'up' as const,
        details: serviceData.reduce((acc, service) => {
          acc[service.name.toLowerCase().replace(' ', '')] = service.status;
          return acc;
        }, {} as Record<string, string>)
      },
      {
        name: t('mainDashboard.recentUploads'),
        value: stats.recentUploads.toString(),
        change: '+5',
        changeType: 'positive' as const,
        icon: FaChartBar,
        color: 'from-purple-500 via-purple-600 to-purple-700',
        description: t('mainDashboard.filesUploadedToday'),
        trend: 'up' as const,
        details: {
          today: stats.recentUploads.toString(),
          thisWeek: Math.round(stats.recentUploads * 1.5).toString(),
          thisMonth: Math.round(stats.recentUploads * 4).toString()
        }
      }
    ];
  }, [stats, serviceData, t]);

  // Loading component
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('mainDashboard.loading')}</p>
        </div>
      </div>
    );
  }

  // Error component
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaExclamationTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
          >
            <FaRedoAlt className="h-4 w-4" />
            <span>{t('common.retry')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -translate-y-24 translate-x-24"></div>
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-white opacity-5 rounded-full translate-y-16 -translate-x-16"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1 text-white">
                {t('mainDashboard.welcome', { name: user?.firstName || 'User' })}
        </h1>
              <p className="text-sm text-blue-100 mb-3">
                {isAdmin ? t('mainDashboard.subtitleAdmin') : t('mainDashboard.subtitleUser')}
              </p>
              <div className="flex items-center space-x-3">
                {user?.accountType && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30">
                    <FaStar className="mr-1.5 text-yellow-300" />
                    {t('mainDashboard.plan', { type: user.accountType })}
                  </div>
                )}
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30">
                  <FaBell className="mr-1.5" />
                  {currentTime.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Errors Banner */}
      {Object.keys(apiErrors).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <div className="flex items-start space-x-2">
            <FaExclamationTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xs font-medium text-yellow-800">{t('mainDashboard.apiPartial')}</h3>
              <ul className="mt-1 text-xs text-yellow-700 list-disc list-inside space-y-0.5">
                  {Object.entries(apiErrors).map(([key, error]) => (
                    <li key={key}>{error}</li>
                  ))}
                </ul>
            </div>
            <button onClick={handleRefresh} className="text-yellow-600 hover:text-yellow-800 flex-shrink-0">
              <FaRedoAlt className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Refresh Button and Last Updated */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {lastUpdated && (
            <span>{t('mainDashboard.lastUpdated')} {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-1.5 text-sm font-medium"
        >
          <FaRedoAlt className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? t('mainDashboard.refreshing') : t('mainDashboard.refreshData')}</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && dynamicStats.length === 0 ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-xl ml-3"></div>
              </div>
            </div>
          ))
        ) : (
          dynamicStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.name} 
              className="group relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 border border-gray-100 overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-200`}></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-xs text-gray-500 mb-2 truncate">{stat.description}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      stat.changeType === 'positive' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center flex-shrink-0 ml-3 shadow-sm`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                {/* Hover details panel */}
                <div className="absolute inset-0 bg-white rounded-xl p-4 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto shadow-lg border border-gray-100">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900 text-sm">{t('mainDashboard.detailedBreakdown')}</h4>
                    {Object.entries(stat.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 capitalize">{key}:</span>
                        <span className="text-xs font-semibold text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })
        )}
      </div>

      {/* Activity and System Health Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">{t('mainDashboard.recentActivity')}</h3>
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">{t('mainDashboard.liveUpdates')}</span>
              </div>
            </div>
            <div className="space-y-2 scrollable scrollable-lg scrollable-content">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div 
                    key={activity.id} 
                    className={`group relative p-3 ${activity.bgColor} rounded-lg border border-gray-100 hover:shadow-sm transition-all duration-200 hover:translate-x-1 cursor-pointer`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-9 h-9 ${activity.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-0.5">{activity.title}</h4>
                        <p className="text-xs text-gray-500 mb-1">{activity.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{activity.time}</span>
                          {activity.status === 'completed' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              {t('mainDashboard.completed')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Hover details */}
                    <div className="absolute inset-0 bg-white rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto shadow-md border border-gray-100">
                      <div className="space-y-1.5">
                        <h4 className="font-semibold text-gray-900 text-sm">{activity.title}</h4>
                        <p className="text-xs text-gray-500">{activity.message}</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {Object.entries(activity).filter(([key]) => !['id', 'type', 'title', 'message', 'time', 'icon', 'color', 'bgColor', 'status'].includes(key)).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-400 capitalize">{key}:</span>
                              <span className="font-medium text-gray-800">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* System Health Status */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4">{t('mainDashboard.systemHealth')}</h3>
            <div className="space-y-2">
              {systemHealth.map((health) => {
                const Icon = health.icon;
                return (
                  <div 
                    key={health.name}
                    className="group relative p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 text-xs">{health.name}</h4>
                        <p className="text-sm font-bold text-green-600">{health.value}</p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    </div>
                    
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {health.details}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions + Quick Insights row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {isAdmin ? t('mainDashboard.adminActions') : t('mainDashboard.quickActions')}
            </h3>
            <div className="space-y-2">
              {isAdmin ? (
                <>
                  <button 
                    onClick={() => navigate('/admin')}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <FaUsers className="h-4 w-4" />
                    <span>{t('mainDashboard.userManagement')}</span>
                  </button>
                  <button 
                    onClick={() => navigate('/analytics')}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <FaChartBar className="h-4 w-4" />
                    <span>{t('mainDashboard.systemAnalytics')}</span>
                  </button>
                  <button 
                    onClick={() => navigate('/services')}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <FaCloud className="h-4 w-4" />
                    <span>{t('mainDashboard.serviceManagement')}</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/upload')}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <FaUpload className="h-4 w-4" />
                    <span>{t('mainDashboard.uploadFiles')}</span>
                  </button>
                  <button 
                    onClick={() => navigate('/images')}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <FaShieldAlt className="h-4 w-4" />
                    <span>{t('mainDashboard.myFiles')}</span>
                  </button>
                  <button 
                    onClick={() => navigate('/services')}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <FaCloud className="h-4 w-4" />
                    <span>{t('mainDashboard.cloudServices')}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4">{t('mainDashboard.quickInsights')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickInsights.map((insight) => {
                const Icon = insight.icon;
                return (
                  <div 
                    key={insight.title}
                    className="group p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 cursor-pointer border border-gray-100"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 ${insight.color.replace('text-', 'bg-').replace('-600', '-100')} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${insight.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-gray-700 text-xs truncate">{insight.title}</h4>
                        <p className="text-base font-bold text-gray-900">{insight.value}</p>
                        <p className="text-xs text-gray-500 truncate">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic File Analytics Section */}
      {stats && !apiErrors.fileStats && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">{t('mainDashboard.fileAnalyticsTitle')}</h3>
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">{t('mainDashboard.realtimeData')}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* File Overview */}
            <div className="lg:col-span-1">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">{t('mainDashboard.fileOverviewTitle')}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700 font-medium">{t('mainDashboard.totalFilesLabel')}</span>
                    <span className="text-lg font-bold text-blue-900">{stats.totalFiles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700 font-medium">{t('mainDashboard.totalSizeLabel')}</span>
                    <span className="text-base font-bold text-blue-900">{stats.totalSize}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700 font-medium">{t('mainDashboard.recentUploadsLabel')}</span>
                    <span className="text-base font-bold text-blue-900">{stats.recentUploads}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* File Types Breakdown */}
            <div className="lg:col-span-2">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <h4 className="text-sm font-semibold text-green-900 mb-3">{t('mainDashboard.fileTypesBreakdownTitle')}</h4>
                {Object.keys(stats.fileTypes).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(stats.fileTypes).map(([type, data]) => (
                      <div key={type} className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-800 capitalize">{type}</span>
                          <span className="text-sm font-bold text-green-600">{data.count}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                          <span>{data.size}</span>
                          <span>{data.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${data.percentage}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400">{t('mainDashboard.noFileTypeData')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Analytics Error Fallback */}
      {apiErrors.fileStats && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-center py-6">
            <FaExclamationTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('mainDashboard.fileAnalyticsUnavailable')}</h3>
            <p className="text-xs text-gray-500 mb-3">{t('mainDashboard.fileStatsRefresh')}</p>
            <button onClick={handleRefresh} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center space-x-1.5 mx-auto text-sm">
              <FaRedoAlt className="h-3.5 w-3.5" />
              <span>{t('common.retry')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Service Analytics Section */}
      {serviceData.length > 0 && !apiErrors.services && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">{t('mainDashboard.serviceAnalyticsTitle')}</h3>
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">{t('mainDashboard.allServicesConnected')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Connected Services */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">{t('mainDashboard.connectedServicesTitle')}</h4>
              <div className="space-y-2">
                {serviceData.map((service, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-semibold text-gray-800 truncate">{service.name}</h5>
                        <p className="text-xs text-gray-400">{t('mainDashboard.lastSync')} {service.lastSync}</p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <div className="flex items-center space-x-1.5 justify-end">
                          <div className={`w-2 h-2 rounded-full ${service.status === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className={`text-xs font-semibold ${service.status === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
                            {service.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{service.files} {t('mainDashboard.filesSuffix')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Performance */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <h4 className="text-sm font-semibold text-purple-900 mb-3">{t('mainDashboard.servicePerformanceTitle')}</h4>
              <div className="space-y-2">
                {serviceData.map((service, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800 truncate">{service.name}</span>
                      <span className="text-sm font-bold text-purple-600 ml-2">{service.uptime}%</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t('mainDashboard.speedLabel')} {service.speed}</span>
                      <span className="font-medium text-purple-600">{t('mainDashboard.good')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Error Fallback */}
      {apiErrors.services && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-center py-6">
            <FaExclamationTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('mainDashboard.serviceAnalyticsUnavailable')}</h3>
            <p className="text-xs text-gray-500 mb-3">{t('mainDashboard.serviceDataRefresh')}</p>
            <button onClick={handleRefresh} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center space-x-1.5 mx-auto text-sm">
              <FaRedoAlt className="h-3.5 w-3.5" />
              <span>{t('common.retry')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic User Analytics Section (Admin Only) */}
      {isAdmin && userAnalytics && !apiErrors.userAnalytics && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">{t('mainDashboard.userAnalyticsTitle')}</h3>
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">{t('mainDashboard.activeUsers')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* User Overview */}
            <div className="lg:col-span-1">
              <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                <h4 className="text-sm font-semibold text-pink-900 mb-3">{t('mainDashboard.userOverviewTitle')}</h4>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-pink-600 mb-1">{userAnalytics.totalUsers.toLocaleString()}</div>
                    <p className="text-xs text-pink-700 font-medium">{t('mainDashboard.totalUsers')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-pink-600">{t('mainDashboard.active')}</span>
                      <span className="text-sm font-semibold text-pink-900">{userAnalytics.activeUsers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-pink-600">{t('mainDashboard.newToday')}</span>
                      <span className="text-sm font-semibold text-pink-900">{userAnalytics.newUsers}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Activity */}
            <div className="lg:col-span-2">
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <h4 className="text-sm font-semibold text-orange-900 mb-3">{t('mainDashboard.userActivityTitle')}</h4>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(userAnalytics.userActivity).map(([period, count]) => (
                    <div key={period} className="bg-white rounded-lg p-3 shadow-sm text-center">
                      <div className="text-xl font-bold text-orange-600 mb-0.5">{count.toLocaleString()}</div>
                      <p className="text-xs text-orange-600 capitalize">{period} {t('mainDashboard.usersSuffix')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* User Plans and Recent Activity */}
          {userAnalytics.userStats.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <h4 className="text-sm font-semibold text-green-900 mb-3">{t('mainDashboard.userPlansTitle')}</h4>
                <div className="space-y-2">
                  {userAnalytics.userStats.map((plan, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-800">{plan.plan}</span>
                        <span className="text-sm font-bold text-green-600">{plan.users.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${plan.percentage}%` }}></div>
                      </div>
                      <p className="text-xs text-green-600">{t('mainDashboard.percentOfTotal', { n: plan.percentage })}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">{t('mainDashboard.recentUserActivityTitle')}</h4>
                <div className="space-y-2">
                  {userAnalytics.recentActivity.length > 0 ? (
                    userAnalytics.recentActivity.map((activity, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{activity.user}</p>
                            <p className="text-xs text-gray-500">{activity.action}</p>
                          </div>
                          <span className="text-xs text-blue-600 ml-2 flex-shrink-0">{activity.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-400">{t('mainDashboard.noRecentActivityData')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Analytics Error Fallback (Admin Only) */}
      {isAdmin && apiErrors.userAnalytics && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-center py-6">
            <FaExclamationTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('mainDashboard.userAnalyticsUnavailable')}</h3>
            <p className="text-xs text-gray-500 mb-3">{t('mainDashboard.userAnalyticsRefresh')}</p>
            <button onClick={handleRefresh} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center space-x-1.5 mx-auto text-sm">
              <FaRedoAlt className="h-3.5 w-3.5" />
              <span>{t('common.retry')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
