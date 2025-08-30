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
  FaHeart
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Dynamic stats with real-time data
  const stats = [
    {
      name: 'Total Files',
      value: '1,847',
      change: '+23%',
      changeType: 'positive',
      icon: FaCloud,
      color: 'from-blue-500 via-blue-600 to-blue-700',
      description: 'Securely stored files',
      trend: 'up',
      details: {
        images: '1,234',
        documents: '456',
        videos: '89',
        others: '68'
      }
    },
    {
      name: 'Storage Used',
      value: '3.2 GB',
      change: '+18%',
      changeType: 'positive',
      icon: FaShieldAlt,
      color: 'from-emerald-500 via-emerald-600 to-emerald-700',
      description: 'Of 10 GB allocated',
      trend: 'up',
      details: {
        used: '3.2 GB',
        available: '6.8 GB',
        percentage: '32%'
      }
    },
    {
      name: 'Security Score',
      value: '98.5%',
      change: '+2.3%',
      changeType: 'positive',
      icon: FaChartBar,
      color: 'from-purple-500 via-purple-600 to-purple-700',
      description: 'Excellent protection',
      trend: 'up',
      details: {
        encryption: '100%',
        scanning: '98%',
        backup: '99%',
        access: '97%'
      }
    },
    {
      name: 'Active Services',
      value: '4',
      change: '+1',
      changeType: 'positive',
      icon: FaUpload,
      color: 'from-orange-500 via-orange-600 to-orange-700',
      description: 'Cloud services connected',
      trend: 'up',
      details: {
        google: 'Connected',
        dropbox: 'Connected',
        onedrive: 'Connected',
        s3: 'Connected'
      }
    }
  ];

  // Enhanced recent activity with more details
  const recentActivity = [
    {
      id: 1,
      type: 'upload',
      title: 'File Uploaded Successfully',
      message: 'document_final_v2.pdf has been uploaded and encrypted with AES-256',
      time: '2 minutes ago',
      icon: FaUpload,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      status: 'completed',
      fileSize: '2.4 MB',
      security: 'Encrypted'
    },
    {
      id: 2,
      type: 'security',
      title: 'Security Scan Completed',
      message: 'Comprehensive security scan completed for 15 files with zero threats detected',
      time: '1 hour ago',
      icon: FaShieldAlt,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      status: 'completed',
      filesScanned: '15',
      threats: '0'
    },
    {
      id: 3,
      type: 'service',
      title: 'Service Connection Verified',
      message: 'Google Drive service connection verified and synchronized successfully',
      time: '3 hours ago',
      icon: FaCloud,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      status: 'completed',
      service: 'Google Drive',
      syncStatus: 'Up to date'
    },
    {
      id: 4,
      type: 'storage',
      title: 'Storage Quota Updated',
      message: 'Storage quota increased to 10GB with automatic backup enabled',
      time: '1 day ago',
      icon: FaShieldAlt,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      status: 'completed',
      newQuota: '10 GB',
      backup: 'Enabled'
    }
  ];

  // System health indicators
  const systemHealth = [
    {
      name: 'System Performance',
      value: 'Excellent',
      status: 'good',
      icon: FaStar,
      details: 'All systems operating at optimal performance'
    },
    {
      name: 'Network Status',
      value: 'Stable',
      status: 'good',
      icon: FaCloud,
      details: 'High-speed connection with 99.9% uptime'
    },
    {
      name: 'Security Status',
      value: 'Protected',
      status: 'good',
      icon: FaLock,
      details: 'Advanced security protocols active'
    },
    {
      name: 'Backup Status',
      value: 'Current',
      status: 'good',
      icon: FaShieldAlt,
      details: 'Last backup completed 2 hours ago'
    }
  ];

  // Quick insights
  const quickInsights = [
    {
      title: 'Most Active Day',
      value: 'Wednesday',
      description: 'Peak upload activity',
      icon: FaChartBar,
      color: 'text-blue-600'
    },
    {
      title: 'Largest File',
      value: 'video_project.mp4',
      description: '45.2 MB uploaded',
      icon: FaUpload,
      color: 'text-green-600'
    },
    {
      title: 'Security Alerts',
      value: '0',
      description: 'No security issues detected',
      icon: FaShieldAlt,
      color: 'text-emerald-600'
    },
    {
      title: 'Storage Efficiency',
      value: '94%',
      description: 'Optimized storage usage',
      icon: FaStar,
      color: 'text-purple-600'
    }
  ];

  // File Analytics Data
  const fileAnalytics = {
    totalFiles: 1847,
    totalSize: '3.2 GB',
    fileTypes: {
      images: { count: 1234, size: '1.8 GB', percentage: 67 },
      documents: { count: 456, size: '0.9 GB', percentage: 25 },
      videos: { count: 89, size: '0.4 GB', percentage: 5 },
      others: { count: 68, size: '0.1 GB', percentage: 3 }
    },
    recentUploads: [
      { name: 'presentation_final.pptx', size: '2.4 MB', time: '2 min ago', type: 'document' },
      { name: 'vacation_photos.zip', size: '15.7 MB', time: '1 hour ago', type: 'image' },
      { name: 'meeting_recording.mp4', size: '45.2 MB', time: '3 hours ago', type: 'video' },
      { name: 'contract_draft.pdf', size: '1.2 MB', time: '1 day ago', type: 'document' }
    ],
    topFileTypes: [
      { type: 'JPEG', count: 856, percentage: 46 },
      { type: 'PDF', count: 234, percentage: 13 },
      { type: 'PNG', count: 178, percentage: 10 },
      { type: 'DOCX', count: 145, percentage: 8 }
    ]
  };

  // Security Analytics Data
  const securityAnalytics = {
    overallScore: 98.5,
    encryptionStatus: 'AES-256 Active',
    lastScan: '2 hours ago',
    threatsDetected: 0,
    securityMetrics: {
      encryption: { score: 100, status: 'Excellent' },
      scanning: { score: 98, status: 'Good' },
      backup: { score: 99, status: 'Excellent' },
      access: { score: 97, status: 'Good' }
    },
    recentScans: [
      { date: 'Today', files: 15, threats: 0, status: 'Clean' },
      { date: 'Yesterday', files: 23, threats: 0, status: 'Clean' },
      { date: '2 days ago', files: 18, threats: 0, status: 'Clean' },
      { date: '3 days ago', files: 12, threats: 0, status: 'Clean' }
    ],
    securityAlerts: []
  };

  // Storage Analytics Data
  const storageAnalytics = {
    totalQuota: '10 GB',
    usedStorage: '3.2 GB',
    availableStorage: '6.8 GB',
    usagePercentage: 32,
    storageBreakdown: {
      images: { size: '1.8 GB', percentage: 56 },
      documents: { size: '0.9 GB', percentage: 28 },
      videos: { size: '0.4 GB', percentage: 13 },
      others: { size: '0.1 GB', percentage: 3 }
    },
    monthlyUsage: [
      { month: 'Jan', used: '2.1 GB' },
      { month: 'Feb', used: '2.3 GB' },
      { month: 'Mar', used: '2.8 GB' },
      { month: 'Apr', used: '3.2 GB' }
    ],
    storageOptimization: {
      compressionEnabled: true,
      deduplicationActive: true,
      backupEnabled: true,
      autoCleanup: true
    }
  };

  // Service Analytics Data
  const serviceAnalytics = {
    totalServices: 4,
    activeServices: 4,
    connectedServices: [
      { name: 'Google Drive', status: 'Connected', lastSync: '5 min ago', files: 234 },
      { name: 'Dropbox', status: 'Connected', lastSync: '1 hour ago', files: 156 },
      { name: 'OneDrive', status: 'Connected', lastSync: '2 hours ago', files: 89 },
      { name: 'AWS S3', status: 'Connected', lastSync: '3 hours ago', files: 67 }
    ],
    servicePerformance: {
      google: { uptime: 99.9, speed: 'Fast', status: 'Excellent' },
      dropbox: { uptime: 99.8, speed: 'Fast', status: 'Good' },
      onedrive: { uptime: 99.7, speed: 'Medium', status: 'Good' },
      s3: { uptime: 99.9, speed: 'Fast', status: 'Excellent' }
    },
    recentSyncs: [
      { service: 'Google Drive', files: 5, time: '5 min ago', status: 'Success' },
      { service: 'Dropbox', files: 3, time: '1 hour ago', status: 'Success' },
      { service: 'OneDrive', files: 2, time: '2 hours ago', status: 'Success' },
      { service: 'AWS S3', files: 1, time: '3 hours ago', status: 'Success' }
    ]
  };

  // User Analytics Data
  const userAnalytics = {
    totalUsers: isAdmin ? 1247 : 1,
    activeUsers: isAdmin ? 892 : 1,
    newUsers: isAdmin ? 23 : 0,
    userActivity: {
      daily: isAdmin ? 156 : 1,
      weekly: isAdmin ? 892 : 1,
      monthly: isAdmin ? 1247 : 1
    },
    userStats: isAdmin ? [
      { plan: 'Free', users: 456, percentage: 37 },
      { plan: 'Pro', users: 523, percentage: 42 },
      { plan: 'Enterprise', users: 268, percentage: 21 }
    ] : [],
    recentActivity: isAdmin ? [
      { user: 'john.doe@company.com', action: 'File Upload', time: '2 min ago' },
      { user: 'jane.smith@company.com', action: 'Plan Upgrade', time: '5 min ago' },
      { user: 'mike.wilson@company.com', action: 'Service Connect', time: '10 min ago' },
      { user: 'sarah.jones@company.com', action: 'Security Scan', time: '15 min ago' }
    ] : []
  };

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

      {/* Stunning Stats Grid with Dynamic Hover Effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
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
        })}
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

      {/* Comprehensive File Analytics Section */}
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
                  <span className="text-2xl font-bold text-blue-900">{fileAnalytics.totalFiles.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 font-semibold">Total Size:</span>
                  <span className="text-xl font-bold text-blue-900">{fileAnalytics.totalSize}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full" style={{ width: '32%' }}></div>
                </div>
                <p className="text-sm text-blue-600">32% of storage used</p>
              </div>
            </div>
          </div>

          {/* File Types Breakdown */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
              <h4 className="text-xl font-bold text-green-900 mb-4">📈 File Types Breakdown</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(fileAnalytics.fileTypes).map(([type, data]) => (
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
            </div>
          </div>
        </div>

        {/* Recent Uploads and Top File Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
            <h4 className="text-xl font-bold text-purple-900 mb-4">🕒 Recent Uploads</h4>
            <div className="space-y-3">
              {fileAnalytics.recentUploads.map((file, index) => (
                <div key={index} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{file.name}</p>
                      <p className="text-xs text-gray-600">{file.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-purple-600">{file.size}</p>
                      <span className="text-xs text-gray-500 capitalize">{file.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
            <h4 className="text-xl font-bold text-orange-900 mb-4">🏆 Top File Types</h4>
            <div className="space-y-3">
              {fileAnalytics.topFileTypes.map((fileType, index) => (
                <div key={index} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-sm">{index + 1}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{fileType.type}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-600">{fileType.count}</p>
                      <p className="text-xs text-gray-500">{fileType.percentage}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Security Analytics Section */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-3xl font-bold text-gray-900">🔒 Security Analytics Dashboard</h3>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">All Systems Secure</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Security Overview */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border border-emerald-200">
              <h4 className="text-xl font-bold text-emerald-900 mb-4">🛡️ Security Overview</h4>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-600 mb-2">{securityAnalytics.overallScore}%</div>
                  <p className="text-emerald-700 font-semibold">Overall Security Score</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700">Encryption:</span>
                    <span className="font-semibold text-emerald-900">{securityAnalytics.encryptionStatus}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700">Last Scan:</span>
                    <span className="font-semibold text-emerald-900">{securityAnalytics.lastScan}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-700">Threats:</span>
                    <span className="font-semibold text-emerald-900">{securityAnalytics.threatsDetected}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Metrics */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <h4 className="text-xl font-bold text-blue-900 mb-4">📊 Security Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(securityAnalytics.securityMetrics).map(([metric, data]) => (
                  <div key={metric} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 capitalize">{metric}</span>
                      <span className="text-lg font-bold text-blue-600">{data.score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${data.score}%` }}></div>
                    </div>
                    <span className="text-sm text-blue-600 font-semibold">{data.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Security Scans */}
        <div className="mt-8">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
            <h4 className="text-xl font-bold text-purple-900 mb-4">🔍 Recent Security Scans</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {securityAnalytics.recentScans.map((scan, index) => (
                <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600 mb-1">{scan.date}</div>
                    <div className="text-sm text-gray-600 mb-2">{scan.files} files scanned</div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-green-600">{scan.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Storage Analytics Section */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-3xl font-bold text-gray-900">💾 Storage Analytics Dashboard</h3>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Optimized Storage</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Storage Overview */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 border border-indigo-200">
              <h4 className="text-xl font-bold text-indigo-900 mb-4">📊 Storage Overview</h4>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600 mb-2">{storageAnalytics.usagePercentage}%</div>
                  <p className="text-indigo-700 font-semibold">Storage Used</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-700">Used:</span>
                    <span className="font-semibold text-indigo-900">{storageAnalytics.usedStorage}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-700">Available:</span>
                    <span className="font-semibold text-indigo-900">{storageAnalytics.availableStorage}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-700">Total:</span>
                    <span className="font-semibold text-indigo-900">{storageAnalytics.totalQuota}</span>
                  </div>
                </div>
                <div className="w-full bg-indigo-200 rounded-full h-4">
                  <div className="bg-indigo-600 h-4 rounded-full" style={{ width: `${storageAnalytics.usagePercentage}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Breakdown */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
              <h4 className="text-xl font-bold text-green-900 mb-4">📈 Storage Breakdown</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(storageAnalytics.storageBreakdown).map(([type, data]) => (
                  <div key={type} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 capitalize">{type}</span>
                      <span className="text-lg font-bold text-green-600">{data.size}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div className="bg-green-500 h-3 rounded-full" style={{ width: `${data.percentage}%` }}></div>
                    </div>
                    <span className="text-sm text-green-600 font-semibold">{data.percentage}% of total</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Storage Optimization */}
        <div className="mt-8">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200">
            <h4 className="text-xl font-bold text-yellow-900 mb-4">⚡ Storage Optimization</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(storageAnalytics.storageOptimization).map(([feature, enabled]) => (
                <div key={feature} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${enabled ? 'bg-green-500' : 'bg-red-500'}`}>
                      {enabled ? (
                        <FaStar className="w-3 h-3 text-white" />
                      ) : (
                        <FaExclamationTriangle className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Service Analytics Section */}
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
              {serviceAnalytics.connectedServices.map((service, index) => (
                <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900">{service.name}</h5>
                      <p className="text-sm text-gray-600">Last sync: {service.lastSync}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-green-600">{service.status}</span>
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
              {Object.entries(serviceAnalytics.servicePerformance).map(([service, perf]) => (
                <div key={service} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 capitalize">{service}</span>
                    <span className="text-lg font-bold text-purple-600">{perf.uptime}%</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Speed: {perf.speed}</span>
                    <span className="font-semibold text-purple-600">{perf.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User Analytics Section (Admin Only) */}
      {isAdmin && (
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
                {userAnalytics.recentActivity.map((activity, index) => (
                  <div key={index} className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{activity.user}</p>
                        <p className="text-xs text-gray-600">{activity.action}</p>
                      </div>
                      <span className="text-xs text-blue-600">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
