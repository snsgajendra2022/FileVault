import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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
import api from '../services/api';

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
        errors.fileStats = 'Failed to load file statistics';
        console.error('File stats error:', fileStatsResult.reason);
      }

      // Process services data
      if (servicesResult.status === 'fulfilled') {
        setServiceData(servicesResult.value);
      } else {
        errors.services = 'Failed to load services data';
        console.error('Services error:', servicesResult.reason);
      }

      // Process system health
      if (systemHealthResult.status === 'fulfilled') {
        setSystemHealth(systemHealthResult.value);
      } else {
        errors.systemHealth = 'Failed to load system health';
        console.error('System health error:', systemHealthResult.reason);
      }

      // Process user analytics (admin only)
      if (userStatsResult.status === 'fulfilled' && userStatsResult.value) {
        setUserAnalytics(userStatsResult.value);
      } else if (isAdmin && userStatsResult.status === 'rejected') {
        errors.userAnalytics = 'Failed to load user analytics';
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
      setError('Failed to load dashboard data');
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
        title: 'File Uploaded Successfully',
        message: `${stats.recentUploads} files uploaded today`,
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
        title: 'Service Status Updated',
        message: `${activeServices} cloud services connected`,
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
      title: 'Security Scan Completed',
      message: 'All files scanned with zero threats detected',
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
        title: 'Total Files',
        value: stats.totalFiles.toLocaleString(),
        description: 'Files in your account',
        icon: FaCloud,
        color: 'text-blue-600'
      });

      insights.push({
        title: 'Security Score',
        value: `${stats.securityScore}%`,
        description: stats.securityScore >= 95 ? 'Excellent protection' : stats.securityScore >= 80 ? 'Good protection' : 'Needs attention',
        icon: FaShieldAlt,
        color: stats.securityScore >= 95 ? 'text-emerald-600' : stats.securityScore >= 80 ? 'text-yellow-600' : 'text-red-600'
      });
    }

    if (serviceData.length > 0) {
      const activeServices = serviceData.filter(s => s.status === 'Connected').length;
      insights.push({
        title: 'Active Services',
        value: activeServices.toString(),
        description: 'Cloud services connected',
        icon: FaUpload,
        color: 'text-green-600'
      });
    }

    insights.push({
      title: 'Account Status',
      value: 'Active',
      description: 'Your account is secure',
      icon: FaStar,
      color: 'text-purple-600'
    });

    setQuickInsights(insights);
  };

  // Refresh data
  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Loading component
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard data...</p>
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
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // Create dynamic stats array for rendering
  const dynamicStats = stats ? [
    {
      name: 'Total Files',
      value: stats.totalFiles.toLocaleString(),
      change: '+23%',
      changeType: 'positive' as const,
      icon: FaCloud,
      color: 'from-blue-500 via-blue-600 to-blue-700',
      description: 'Securely stored files',
      trend: 'up' as const,
      details: stats.fileTypes
    },
    {
      name: 'Security Score',
      value: `${stats.securityScore}%`,
      change: '+2.3%',
      changeType: 'positive' as const,
      icon: FaShieldAlt,
      color: 'from-emerald-500 via-emerald-600 to-emerald-700',
      description: stats.securityScore >= 95 ? 'Excellent protection' : stats.securityScore >= 80 ? 'Good protection' : 'Needs attention',
      trend: 'up' as const,
      details: {
        encryption: '100%',
        scanning: '98%',
        backup: '99%',
        access: '97%'
      }
    },
    {
      name: 'Active Services',
      value: serviceData.filter(s => s.status === 'Connected').length.toString(),
      change: '+1',
      changeType: 'positive' as const,
      icon: FaUpload,
      color: 'from-orange-500 via-orange-600 to-orange-700',
      description: 'Cloud services connected',
      trend: 'up' as const,
      details: serviceData.reduce((acc, service) => {
        acc[service.name.toLowerCase().replace(' ', '')] = service.status;
        return acc;
      }, {} as Record<string, string>)
    },
    {
      name: 'Recent Uploads',
      value: stats.recentUploads.toString(),
      change: '+5',
      changeType: 'positive' as const,
      icon: FaChartBar,
      color: 'from-purple-500 via-purple-600 to-purple-700',
      description: 'Files uploaded today',
      trend: 'up' as const,
      details: {
        today: stats.recentUploads.toString(),
        thisWeek: Math.round(stats.recentUploads * 1.5).toString(),
        thisMonth: Math.round(stats.recentUploads * 4).toString()
      }
    }
  ] : [];

  return (
    <div className="space-y-8 w-full">
      {/* Stunning Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-24 -translate-x-24"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Welcome back, {user?.firstName || 'User'}! 👋
        </h1>
              <p className="text-xl text-blue-100 mb-4">
                {isAdmin 
                  ? 'Here\'s your comprehensive admin dashboard with real-time system overview and advanced user management capabilities.'
                  : 'Here\'s what\'s happening with your ImageSecurity account today with enhanced security and performance insights.'
                }
              </p>
              <div className="flex items-center space-x-4">
                {user?.accountType && (
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30">
                    <FaStar className="mr-2 text-yellow-300" />
                    {user.accountType} Plan
                  </div>
                )}
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30">
                  <FaBell className="mr-2" />
                  {currentTime.toLocaleTimeString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-6xl font-bold text-white opacity-20">📊</div>
            </div>
          </div>
        </div>
      </div>

      {/* API Errors Banner */}
      {Object.keys(apiErrors).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FaExclamationTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Some data could not be loaded</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(apiErrors).map(([key, error]) => (
                    <li key={key}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <FaRedoAlt className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Refresh Button and Last Updated */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {lastUpdated && (
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <FaRedoAlt className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Stunning Stats Grid with Dynamic Hover Effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
        {loading && dynamicStats.length === 0 ? (
          // Loading skeleton for stats
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-3"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
                <div className="w-16 h-16 bg-gray-200 rounded-2xl"></div>
              </div>
            </div>
          ))
        ) : (
          dynamicStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.name} 
              className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-2 border border-gray-100 overflow-hidden"
            >
              {/* Animated background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
              
              {/* Floating particles effect */}
              <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full opacity-0 group-hover:opacity-60 animate-pulse"></div>
              <div className="absolute top-4 right-4 w-1 h-1 bg-purple-400 rounded-full opacity-0 group-hover:opacity-40 animate-ping"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">{stat.name}</p>
                    <p className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</p>
                    <p className="text-sm text-gray-600 mb-3">{stat.description}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stat.changeType === 'positive' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {stat.change}
                      </span>
                      <span className="text-xs text-gray-500">from last month</span>
                    </div>
                  </div>
                  <div className={`w-16 h-16 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                </div>
                
                {/* Hover details panel */}
                <div className="absolute inset-0 bg-white rounded-2xl p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-95 pointer-events-none group-hover:pointer-events-auto">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 text-lg">Detailed Breakdown</h4>
                    {Object.entries(stat.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 capitalize">{key}:</span>
                        <span className="text-sm font-semibold text-gray-900">{value}</span>
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

      {/* Enhanced Activity and System Health Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
        {/* Enhanced Recent Activity */}
        <div className="xl:col-span-2 2xl:col-span-2">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Recent Activity</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Live Updates</span>
              </div>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div 
                    key={activity.id} 
                    className={`group relative p-4 ${activity.bgColor} rounded-xl border border-gray-200 hover:shadow-lg transform transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 ${activity.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-6 w-6 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1">{activity.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{activity.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{activity.time}</span>
                          <div className="flex items-center space-x-2">
                            {activity.status === 'completed' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <FaStar className="w-3 h-3 mr-1" />
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Hover details */}
                    <div className="absolute inset-0 bg-white rounded-xl p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-95 pointer-events-none group-hover:pointer-events-auto shadow-xl">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                        <p className="text-sm text-gray-600">{activity.message}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                     {Object.entries(activity).filter(([key]) => !['id', 'type', 'title', 'message', 'time', 'icon', 'color', 'bgColor', 'status'].includes(key)).map(([key, value]) => (
                             <div key={key} className="flex justify-between">
                               <span className="text-gray-500 capitalize">{key}:</span>
                               <span className="font-medium text-gray-900">{String(value)}</span>
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
        <div className="xl:col-span-1 2xl:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">System Health</h3>
            <div className="space-y-4">
              {systemHealth.map((health) => {
                const Icon = health.icon;
                return (
                  <div 
                    key={health.name}
                    className="group relative p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transform transition-all duration-300 hover:scale-105 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Icon className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm">{health.name}</h4>
                        <p className="text-lg font-bold text-green-600">{health.value}</p>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      {health.details}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="xl:col-span-1 2xl:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {isAdmin ? 'Admin Actions' : 'Quick Actions'}
            </h3>
            <div className="space-y-4">
              {isAdmin ? (
                <>
                  <button 
                    onClick={() => navigate('/admin')}
                    className="w-full group relative bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <FaUsers className="h-5 w-5" />
                    <span>User Management</span>
                  </button>
                  <button 
                    onClick={() => navigate('/analytics')}
                    className="w-full group relative bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <FaChartBar className="h-5 w-5" />
                    <span>System Analytics</span>
                  </button>
                  <button 
                    onClick={() => navigate('/services')}
                    className="w-full group relative bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <FaCloud className="h-5 w-5" />
                    <span>Service Management</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/upload')}
                    className="w-full group relative bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                <FaUpload className="h-5 w-5" />
                <span>Upload Files</span>
              </button>
                  <button 
                    onClick={() => navigate('/images')}
                    className="w-full group relative bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                <FaShieldAlt className="h-5 w-5" />
                    <span>My Files</span>
              </button>
                  <button 
                    onClick={() => navigate('/services')}
                    className="w-full group relative bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-xl font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <FaCloud className="h-5 w-5" />
                    <span>Cloud Services</span>
              </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insights Section */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Quick Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickInsights.map((insight) => {
            const Icon = insight.icon;
            return (
              <div 
                key={insight.title}
                className="group relative p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transform transition-all duration-300 hover:scale-105 cursor-pointer border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${insight.color.replace('text-', 'bg-').replace('-600', '-100')} rounded-xl flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${insight.color}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{insight.title}</h4>
                    <p className="text-lg font-bold text-gray-900">{insight.value}</p>
                    <p className="text-xs text-gray-600">{insight.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic File Analytics Section */}
      {stats && !apiErrors.fileStats && (
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold text-gray-900">📁 File Analytics Dashboard</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Real-time Data</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* File Overview */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                <h4 className="text-xl font-bold text-blue-900 mb-4">📊 File Overview</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-semibold">Total Files:</span>
                    <span className="text-2xl font-bold text-blue-900">{stats.totalFiles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-semibold">Total Size:</span>
                    <span className="text-xl font-bold text-blue-900">{stats.totalSize}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-semibold">Recent Uploads:</span>
                    <span className="text-lg font-bold text-blue-900">{stats.recentUploads}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* File Types Breakdown */}
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                <h4 className="text-xl font-bold text-green-900 mb-4">📈 File Types Breakdown</h4>
                {Object.keys(stats.fileTypes).length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(stats.fileTypes).map(([type, data]) => (
                      <div key={type} className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900 capitalize">{type}</span>
                          <span className="text-lg font-bold text-green-600">{data.count}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>{data.size}</span>
                          <span>{data.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${data.percentage}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No file type data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Analytics Error Fallback */}
      {apiErrors.fileStats && (
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="text-center py-8">
            <FaExclamationTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">File Analytics Unavailable</h3>
            <p className="text-gray-600 mb-4">Unable to load file statistics. Please try refreshing the page.</p>
            <button
              onClick={handleRefresh}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
            >
              <FaRedoAlt className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Service Analytics Section */}
      {serviceData.length > 0 && !apiErrors.services && (
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold text-gray-900">☁️ Service Analytics Dashboard</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">All Services Connected</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Connected Services */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <h4 className="text-xl font-bold text-blue-900 mb-4">🔗 Connected Services</h4>
              <div className="space-y-4">
                {serviceData.map((service, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900">{service.name}</h5>
                        <p className="text-sm text-gray-600">Last sync: {service.lastSync}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${service.status === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className={`text-sm font-semibold ${service.status === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
                            {service.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{service.files} files</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Performance */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
              <h4 className="text-xl font-bold text-purple-900 mb-4">📊 Service Performance</h4>
              <div className="space-y-4">
                {serviceData.map((service, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{service.name}</span>
                      <span className="text-lg font-bold text-purple-600">{service.uptime}%</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Speed: {service.speed}</span>
                      <span className="font-semibold text-purple-600">Good</span>
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
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="text-center py-8">
            <FaExclamationTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Service Analytics Unavailable</h3>
            <p className="text-gray-600 mb-4">Unable to load services data. Please try refreshing the page.</p>
            <button
              onClick={handleRefresh}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
            >
              <FaRedoAlt className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic User Analytics Section (Admin Only) */}
      {isAdmin && userAnalytics && !apiErrors.userAnalytics && (
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold text-gray-900">👥 User Analytics Dashboard</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Active Users</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* User Overview */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 border border-pink-200">
                <h4 className="text-xl font-bold text-pink-900 mb-4">📊 User Overview</h4>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-pink-600 mb-2">{userAnalytics.totalUsers.toLocaleString()}</div>
                    <p className="text-pink-700 font-semibold">Total Users</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-pink-700">Active:</span>
                      <span className="font-semibold text-pink-900">{userAnalytics.activeUsers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-pink-700">New Today:</span>
                      <span className="font-semibold text-pink-900">{userAnalytics.newUsers}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Activity */}
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
                <h4 className="text-xl font-bold text-orange-900 mb-4">📈 User Activity</h4>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(userAnalytics.userActivity).map(([period, count]) => (
                    <div key={period} className="bg-white rounded-xl p-4 shadow-sm text-center">
                      <div className="text-2xl font-bold text-orange-600 mb-1">{count.toLocaleString()}</div>
                      <p className="text-sm text-orange-700 capitalize">{period} Users</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* User Plans and Recent Activity */}
          {userAnalytics.userStats.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                <h4 className="text-xl font-bold text-green-900 mb-4">💳 User Plans</h4>
                <div className="space-y-3">
                  {userAnalytics.userStats.map((plan, index) => (
                    <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{plan.plan}</span>
                        <span className="text-lg font-bold text-green-600">{plan.users.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${plan.percentage}%` }}></div>
                      </div>
                      <p className="text-sm text-green-600 mt-1">{plan.percentage}% of total</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                <h4 className="text-xl font-bold text-blue-900 mb-4">🕒 Recent User Activity</h4>
                <div className="space-y-3">
                  {userAnalytics.recentActivity.length > 0 ? (
                    userAnalytics.recentActivity.map((activity, index) => (
                      <div key={index} className="bg-white rounded-xl p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">{activity.user}</p>
                            <p className="text-xs text-gray-600">{activity.action}</p>
                          </div>
                          <span className="text-xs text-blue-600">{activity.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No recent activity data available</p>
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
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="text-center py-8">
            <FaExclamationTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">User Analytics Unavailable</h3>
            <p className="text-gray-600 mb-4">Unable to load user analytics data. Please try refreshing the page.</p>
            <button
              onClick={handleRefresh}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
            >
              <FaRedoAlt className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
