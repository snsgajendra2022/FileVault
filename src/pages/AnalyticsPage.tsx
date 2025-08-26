import React, { useState } from 'react';
import { FaUpload, FaEye, FaCloud, FaShieldAlt, FaCheck, FaChartBar } from 'react-icons/fa';

const AnalyticsPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Mock data
  const analyticsData = {
    totalUploads: 1247,
    totalDownloads: 892,
    totalViews: 3456,
    storageUsed: 45.2,
    storageLimit: 100,
    activeUsers: 156,
    successRate: 98.5,
    averageFileSize: 2.4
  };

  const uploadTrends = [
    { date: 'Jan 1', uploads: 45, downloads: 32, views: 120 },
    { date: 'Jan 2', uploads: 52, downloads: 38, views: 145 },
    { date: 'Jan 3', uploads: 38, downloads: 29, views: 98 },
    { date: 'Jan 4', uploads: 61, downloads: 45, views: 167 },
    { date: 'Jan 5', uploads: 48, downloads: 36, views: 134 },
    { date: 'Jan 6', uploads: 55, downloads: 42, views: 156 },
    { date: 'Jan 7', uploads: 67, downloads: 51, views: 189 }
  ];

  const fileTypes = [
    { type: 'Images', count: 456, percentage: 45.6, color: 'from-blue-500 to-indigo-600' },
    { type: 'Documents', count: 234, percentage: 23.4, color: 'from-green-500 to-emerald-600' },
    { type: 'Videos', count: 123, percentage: 12.3, color: 'from-purple-500 to-pink-600' },
    { type: 'Audio', count: 89, percentage: 8.9, color: 'from-yellow-500 to-orange-600' },
    { type: 'Other', count: 98, percentage: 9.8, color: 'from-gray-500 to-gray-600' }
  ];

  const recentActivity = [
    { id: 1, action: 'File uploaded', file: 'document.pdf', user: 'John Doe', time: '2 minutes ago', status: 'success' },
    { id: 2, action: 'File downloaded', file: 'image.jpg', user: 'Jane Smith', time: '5 minutes ago', status: 'success' },
    { id: 3, action: 'File shared', file: 'video.mp4', user: 'Mike Johnson', time: '12 minutes ago', status: 'success' },
    { id: 4, action: 'Upload failed', file: 'large-file.zip', user: 'Sarah Wilson', time: '15 minutes ago', status: 'error' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          Analytics Dashboard
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Comprehensive insights into your file storage usage, performance metrics, and user activity
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex justify-center mb-8">
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-2 shadow-lg">
          <button
            onClick={() => setSelectedPeriod('7d')}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
              selectedPeriod === '7d'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setSelectedPeriod('30d')}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
              selectedPeriod === '30d'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setSelectedPeriod('90d')}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
              selectedPeriod === '90d'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-2xl p-8 border border-blue-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Total Uploads</p>
              <p className="text-3xl font-bold text-gray-800">{analyticsData.totalUploads.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaUpload className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 rounded-2xl p-8 border border-green-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Total Downloads</p>
              <p className="text-3xl font-bold text-gray-800">{analyticsData.totalDownloads.toLocaleString()}</p>
            </div>
                         <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
               <FaUpload className="h-6 w-6 text-white" />
             </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-white via-yellow-50/30 to-orange-50/30 rounded-2xl p-8 border border-yellow-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Total Views</p>
              <p className="text-3xl font-bold text-gray-800">{analyticsData.totalViews.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaEye className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 rounded-2xl p-8 border border-purple-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">Success Rate</p>
              <p className="text-3xl font-bold text-gray-800">{analyticsData.successRate}%</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaCheck className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-3xl shadow-2xl border border-blue-100/50 p-8 mb-10">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <FaCloud className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Storage Usage</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
            <p className="text-sm text-gray-500 mb-2">Used Storage</p>
            <p className="text-2xl font-bold text-gray-800">{analyticsData.storageUsed} GB</p>
            <p className="text-sm text-gray-600">of {analyticsData.storageLimit} GB</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
            <p className="text-sm text-gray-500 mb-2">Available</p>
            <p className="text-2xl font-bold text-gray-800">{(analyticsData.storageLimit - analyticsData.storageUsed).toFixed(1)} GB</p>
            <p className="text-sm text-gray-600">remaining</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
            <p className="text-sm text-gray-500 mb-2">Usage Percentage</p>
            <p className="text-2xl font-bold text-gray-800">{((analyticsData.storageUsed / analyticsData.storageLimit) * 100).toFixed(1)}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(analyticsData.storageUsed / analyticsData.storageLimit) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Upload Trends */}
        <div className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 rounded-3xl shadow-2xl border border-green-100/50 p-8">
          <div className="flex items-center space-x-4 mb-6">
                         <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
               <FaChartBar className="h-6 w-6 text-white" />
             </div>
            <h2 className="text-2xl font-bold text-gray-800">Upload Trends</h2>
          </div>
          
          <div className="space-y-4">
            {uploadTrends.map((day, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-green-100/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{day.date}</span>
                  <span className="text-sm text-gray-500">{day.uploads} uploads</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(day.uploads / 70) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* File Types Distribution */}
        <div className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 rounded-3xl shadow-2xl border border-purple-100/50 p-8">
          <div className="flex items-center space-x-4 mb-6">
                         <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
               <FaChartBar className="h-6 w-6 text-white" />
             </div>
            <h2 className="text-2xl font-bold text-gray-800">File Types</h2>
          </div>
          
          <div className="space-y-4">
            {fileTypes.map((fileType, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{fileType.type}</span>
                  <span className="text-sm text-gray-500">{fileType.count} files</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`bg-gradient-to-r ${fileType.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${fileType.percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{fileType.percentage}% of total</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gradient-to-br from-white via-yellow-50/30 to-orange-50/30 rounded-3xl shadow-2xl border border-yellow-100/50 p-8">
        <div className="flex items-center space-x-4 mb-6">
                       <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
               <FaShieldAlt className="h-6 w-6 text-white" />
             </div>
          <h2 className="text-2xl font-bold text-gray-800">Recent Activity</h2>
        </div>
        
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-yellow-100/50 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activity.status === 'success' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                    : 'bg-gradient-to-r from-red-500 to-pink-600'
                }`}>
                  <FaCheck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.file} • {activity.user}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{activity.time}</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  activity.status === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {activity.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
