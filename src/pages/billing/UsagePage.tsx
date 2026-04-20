import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { FaChartBar, FaUpload, FaCloud, FaExclamationTriangle } from 'react-icons/fa';
import { FiDownload } from 'react-icons/fi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DashboardLoading from '../../components/common/DashboardLoading';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const UsagePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const { data: usage, isLoading, error } = useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const response = await api.get('/api/plans/usage');
      return response.data;
    },
  });

  // console.log('UsagePage state:', { usage, isLoading, error });

  if (isLoading) {
    return (
      <DashboardLoading 
        title={t('usagePage.loadingTitle')}
        subtitle={t('usagePage.loadingSubtitle')}
        icon={FaChartBar}
        features={[
          { icon: FaUpload, label: t('usagePage.featUploads') },
          { icon: FaCloud, label: t('usagePage.featStorage') },
          { icon: FaChartBar, label: t('usagePage.featStatistics') }
        ]}
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">{t('usagePage.errorTitle')}</h1>
          <p className="text-gray-600 mb-4">{t('usagePage.errorBody')}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  const uploadPercentage = usage?.currentPlan ? 
    ((usage.totalUploadsThisMonth || 0) / (usage.currentPlan.plan.maxUploadsPerMonth || 1)) * 100 : 0;
  
  const storagePercentage = usage?.currentPlan ? 
    ((usage.totalStorageUsedGB || 0) / (usage.currentPlan.plan.storageQuotaGB || 1)) * 100 : 0;

  const generateUsageReport = () => {
    if (!usage) {
      toast.error(t('usagePage.toastNoData'));
      return;
    }

    setIsDownloading(true);
    
    try {
      // Create comprehensive usage report
      const reportData = {
        reportGeneratedAt: new Date().toISOString(),
        currentPlan: {
          planName: usage.currentPlan?.plan.displayName || 'No Plan',
          planType: usage.currentPlan?.plan.planName || 'N/A',
          billingCycle: usage.currentPlan?.billingCycle || 'N/A',
          currentPrice: usage.currentPlan?.currentPrice || 0,
          nextBillingDate: usage.currentPlan?.nextBillingDate || 'N/A'
        },
        usageMetrics: {
          uploadsUsedThisMonth: usage.uploadsUsedThisMonth || 0,
          maxUploadsPerMonth: usage.currentPlan?.plan.maxUploadsPerMonth || 0,
          uploadPercentage: uploadPercentage.toFixed(2) + '%',
          storageUsedGB: usage.storageUsedGB || 0,
          storageQuotaGB: usage.currentPlan?.plan.storageQuotaGB || 0,
          storagePercentage: storagePercentage.toFixed(2) + '%',
          totalUploadsThisMonth: usage.totalUploadsThisMonth || 0,
          totalStorageUsedGB: usage.totalStorageUsedGB || 0
        },
        alerts: {
          uploadLimitWarning: uploadPercentage > 80,
          storageLimitWarning: storagePercentage > 80,
          uploadLimitReached: uploadPercentage >= 100,
          storageLimitReached: storagePercentage >= 100
        }
      };

      // Convert to CSV format
      const csvContent = [
        ['Usage Report', ''],
        ['Generated At', reportData.reportGeneratedAt],
        ['', ''],
        ['Current Plan Information', ''],
        ['Plan Name', reportData.currentPlan.planName],
        ['Plan Type', reportData.currentPlan.planType],
        ['Billing Cycle', reportData.currentPlan.billingCycle],
        ['Current Price', `$${reportData.currentPlan.currentPrice}`],
        ['Next Billing Date', reportData.currentPlan.nextBillingDate],
        ['', ''],
        ['Usage Metrics', ''],
        ['Uploads Used This Month', reportData.usageMetrics.uploadsUsedThisMonth],
        ['Max Uploads Per Month', reportData.usageMetrics.maxUploadsPerMonth],
        ['Upload Usage Percentage', reportData.usageMetrics.uploadPercentage],
        ['Storage Used (GB)', reportData.usageMetrics.storageUsedGB],
        ['Storage Quota (GB)', reportData.usageMetrics.storageQuotaGB],
        ['Storage Usage Percentage', reportData.usageMetrics.storagePercentage],
        ['Total Uploads This Month', reportData.usageMetrics.totalUploadsThisMonth],
        ['Total Storage Used (GB)', reportData.usageMetrics.totalStorageUsedGB],
        ['', ''],
        ['Alerts', ''],
        ['Upload Limit Warning', reportData.alerts.uploadLimitWarning ? 'Yes' : 'No'],
        ['Storage Limit Warning', reportData.alerts.storageLimitWarning ? 'Yes' : 'No'],
        ['Upload Limit Reached', reportData.alerts.uploadLimitReached ? 'Yes' : 'No'],
        ['Storage Limit Reached', reportData.alerts.storageLimitReached ? 'Yes' : 'No']
      ].map(row => row.join(',')).join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `usage-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t('usagePage.toastDownloadOk'));
    } catch (error) {
      toast.error(t('usagePage.toastDownloadFail'));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl mb-6">
            <FaChartBar className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            {t('usagePage.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {t('usagePage.subtitle')}
          </p>
        </div>

        {/* Current Plan Banner */}
        {usage?.currentPlan && (
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl border border-white/20 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">
                {t('usagePage.currentPlan')} {usage.currentPlan.plan.displayName || t('usagePage.unknownPlan')}
              </h3>
              <p className="text-primary-100 mb-4">
                ${usage.currentPlan.currentPrice || 0}/{usage.currentPlan.billingCycle?.toLowerCase() || 'month'} • 
                {t('usagePage.nextBilling')}{' '}
                {usage.currentPlan.nextBillingDate ? new Date(usage.currentPlan.nextBillingDate).toLocaleDateString() : 'N/A'}
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-sm text-primary-100 mb-1">{t('usagePage.uploadsUsed')}</p>
                  <p className="text-2xl font-bold">
                    {usage.uploadsUsedThisMonth || 0}/{usage.currentPlan.plan.maxUploadsPerMonth || 0}
                  </p>
                </div>
                {/* <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-sm text-primary-100 mb-1">Storage Used</p>
                  <p className="text-2xl font-bold">
                    {(usage.storageUsedGB || 0).toFixed(2)}/{usage.currentPlan.plan.storageQuotaGB || 0} GB
                  </p>
                </div> */}
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                ${usage.currentPlan.currentPrice || 0}
              </div>
              <p className="text-blue-100 text-lg">
                {t('usagePage.per')} {usage.currentPlan.billingCycle?.toLowerCase() || 'month'}
              </p>
              <button className="mt-6 bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 shadow-lg">
                {t('usagePage.viewUsageDetails')}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Usage Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Uploads */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                <FaUpload className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('usagePage.uploadsThisMonth')}</h3>
                <p className="text-gray-600">{t('usagePage.fileUploadActivity')}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {usage?.totalUploadsThisMonth || 0}
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="text-green-500 mr-1">↑</span>
                {t('usagePage.fromLastMonth')}
              </div>
            </div>
          </div>

          <div className="mb-4">
            {usage?.currentPlan ? (
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm text-gray-600">{t('usagePage.progress')}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {uploadPercentage.toFixed(1)}%
                </span>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaExclamationTriangle className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">{t('usagePage.noActivePlan')}</p>
                <p className="text-sm text-gray-400">{t('usagePage.subscribeToUpload')}</p>
              </div>
            )}
          </div>

          {usage?.currentPlan && (
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(uploadPercentage, 100)}%` }}
              />
            </div>
          )}
        </div>

          {/* Storage */}
          {/* <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4">
                <FaCloud className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Storage Used</h3>
                <p className="text-gray-600">Cloud storage consumption</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {usage?.totalStorageUsedGB?.toFixed(2) || '0.00'} GB
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="text-green-500 mr-1">↑</span>
                +8% from last month
              </div>
            </div>
          </div>

          <div className="mb-4">
            {usage?.currentPlan ? (
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm text-gray-600">{t('usagePage.progress')}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {storagePercentage.toFixed(1)}%
                </span>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaExclamationTriangle className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No active plan</p>
                <p className="text-sm text-gray-400">Subscribe to a plan to start storing files</p>
              </div>
            )}
          </div>

          {usage?.currentPlan && (
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              />
            </div>
          )}
        </div> */}
      </div>

        {/* Usage Alerts */}
        {(uploadPercentage > 80 || storagePercentage > 80) && (
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-3xl p-8 text-white shadow-2xl border border-white/20 backdrop-blur-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold mb-2">
                {t('usagePage.usageAlert')}
              </h3>
              <p className="mb-4 opacity-90">
                {t('usagePage.usageAlertBody')}
              </p>
              <div className="flex space-x-3">
                <button className="bg-white text-orange-600 px-6 py-2 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                  {t('usagePage.upgradePlan')}
                </button>
                <button className="bg-white/20 text-white px-6 py-2 rounded-xl font-semibold hover:bg-white/30 transition-colors">
                  {t('usagePage.viewDetails')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Usage History */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('usagePage.usageHistory')}</h2>
            <p className="text-gray-600">{t('usagePage.usageHistorySub')}</p>
          </div>
          <div className="flex space-x-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
              {t('usagePage.days7')}
            </button>
            <button className="px-4 py-2 text-sm font-medium bg-blue-100 text-blue-700 rounded-xl">
              {t('usagePage.days30')}
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
              {t('usagePage.days90')}
            </button>
          </div>
        </div>
        
        <div className="h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FaChartBar className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('usagePage.usageAnalytics')}</h3>
            <p className="text-gray-500 max-w-sm">
              {t('usagePage.usageAnalyticsPlaceholder')}
            </p>
          </div>
        </div>
      </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">{t('usagePage.quickActions')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => navigate('/plans')} className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              <span className="inline mr-2 text-lg">↑</span>
              {t('usagePage.upgradePlan')}
            </button>
            <button onClick={() => navigate('/billing')} className="group relative overflow-hidden bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-4 rounded-2xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              <FaChartBar className="inline mr-2 h-5 w-5" />
              {t('usagePage.viewBilling')}
            </button>
            <button 
              onClick={generateUsageReport} 
              disabled={isDownloading || !usage}
              className="group relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-2xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
            {isDownloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                {t('usagePage.generating')}
              </>
            ) : (
              <>
                <FiDownload className="inline mr-2 h-4 w-4" />
                {t('usagePage.downloadReport')}
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default UsagePage;
