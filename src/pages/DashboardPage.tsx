import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FaCloud, FaShieldAlt, FaChartBar, FaUpload, FaUsers } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const stats = [
    {
      name: 'Total Files',
      value: '1,234',
      change: '+12%',
      changeType: 'positive',
      icon: FaCloud,
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Storage Used',
      value: '2.4 GB',
      change: '+8%',
      changeType: 'positive',
      icon: FaShieldAlt,
      color: 'from-green-500 to-green-600'
    },
    {
      name: 'Security Score',
      value: '98%',
      change: '+2%',
      changeType: 'positive',
      icon: FaChartBar,
      color: 'from-purple-500 to-purple-600'
    },
    {
      name: 'Uploads Today',
      value: '45',
      change: '+15%',
      changeType: 'positive',
      icon: FaUpload,
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'upload',
      message: 'New file uploaded: document.pdf',
      time: '2 minutes ago',
      icon: FaUpload
    },
    {
      id: 2,
      type: 'security',
      message: 'Security scan completed for 15 files',
      time: '1 hour ago',
      icon: FaShieldAlt
    },
    {
      id: 3,
      type: 'storage',
      message: 'Storage quota updated',
      time: '3 hours ago',
      icon: FaCloud
    }
  ];

  return (
    <div className="space-y-8 w-full">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white shadow-2xl">
        <h1 className="text-4xl font-bold mb-2">
          Welcome back, {user?.firstName || 'User'}!
        </h1>
        <p className="text-xl text-primary-100">
          {isAdmin 
            ? 'Here\'s your admin dashboard with system overview and user management.'
            : 'Here\'s what\'s happening with your ImageSecurity account today.'
          }
        </p>
        {user?.accountType && (
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white bg-opacity-20">
            Account Type: {user.accountType}
          </div>
        )}
      </div>

      {/* Stats Grid - Responsive for large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="stat-card-gradient">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className={`text-sm font-medium mt-1 ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change} from last month
                  </p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity and Quick Actions - Full width layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
        {/* Recent Activity */}
        <div className="xl:col-span-2 2xl:col-span-3">
          <div className="stat-card">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.message}</p>
                      <p className="text-sm text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="xl:col-span-1">
          <div className="stat-card">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {isAdmin ? 'Admin Actions' : 'Quick Actions'}
            </h3>
            <div className="space-y-4">
              {isAdmin ? (
                <>
                  <button 
                    onClick={() => navigate('/admin')}
                    className="w-full btn-primary flex items-center justify-center space-x-2"
                  >
                    <FaUsers className="h-5 w-5" />
                    <span>User Management</span>
                  </button>
                  <button 
                    onClick={() => navigate('/analytics')}
                    className="w-full btn-secondary flex items-center justify-center space-x-2"
                  >
                    <FaChartBar className="h-5 w-5" />
                    <span>System Analytics</span>
                  </button>
                  <button 
                    onClick={() => navigate('/services')}
                    className="w-full btn-success flex items-center justify-center space-x-2"
                  >
                    <FaCloud className="h-5 w-5" />
                    <span>Service Management</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/upload')}
                    className="w-full btn-primary flex items-center justify-center space-x-2"
                  >
                    <FaUpload className="h-5 w-5" />
                    <span>Upload Files</span>
                  </button>
                  <button 
                    onClick={() => navigate('/images')}
                    className="w-full btn-secondary flex items-center justify-center space-x-2"
                  >
                    <FaShieldAlt className="h-5 w-5" />
                    <span>My Files</span>
                  </button>
                  <button 
                    onClick={() => navigate('/services')}
                    className="w-full btn-success flex items-center justify-center space-x-2"
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
    </div>
  );
};

export default DashboardPage;
