import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FaCheck, FaTimes, FaCrown, FaShieldAlt, FaCloud, FaUpload, FaStar, FaArrowLeft } from 'react-icons/fa';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface Plan {
  id: number;
  planName: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxUploadsPerMonth: number;
  maxFileSizeMB: number;
  storageQuotaGB: number;
  allowedFileTypes: string;
  maxConcurrentUploads: number;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  cloudStorageEnabled: boolean;
  prioritySupport: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface UserPlan {
  id: number;
  plan: Plan;
  billingCycle: 'MONTHLY' | 'YEARLY';
  currentPrice: number;
  uploadsUsedThisMonth: number;
  uploadsRemaining: number;
  storageUsedGB: number;
  storageRemainingGB: number;
  status: string;
  startDate: string;
  endDate: string;
  nextBillingDate: string;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

const PlanDetailsPage = () => {
  const { t } = useTranslation();
  const { planId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCycle, setSelectedCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  // Fetch plan details
  const { data: plan, isLoading: planLoading, error: planError } = useQuery({
    queryKey: ['plan', planId],
    queryFn: async () => {
      const response = await api.get(`/api/plans/${planId}`);
      return response.data as Plan;
    },
    enabled: !!planId
  });

  // Fetch user's current plan
  const { data: userPlan, isLoading: userPlanLoading } = useQuery({
    queryKey: ['userPlan'],
    queryFn: async () => {
      const response = await api.get('/api/plans/my-plan');
      return response.data as UserPlan;
    }
  });

  // Fetch all plans for comparison
  const { data: allPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await api.get('/api/plans');
      return response.data.plans as Plan[];
    }
  });

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async (data: { planId: number; billingCycle: string; autoRenew: boolean }) => {
      const response = await api.post('/api/plans/subscribe', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success(t('planDetailsPage.toastSubscribed'));
      queryClient.invalidateQueries({ queryKey: ['userPlan'] });
      setShowSubscribeModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('planDetailsPage.toastSubscribeFailed'));
    }
  });

  const getPrice = (plan: Plan) => {
    return selectedCycle === 'MONTHLY' ? plan.monthlyPrice : plan.yearlyPrice;
  };

  const getSavings = (plan: Plan) => {
    if (selectedCycle === 'YEARLY') {
      const monthlyTotal = plan.monthlyPrice * 12;
      const yearlyPrice = plan.yearlyPrice;
      return Math.round((monthlyTotal - yearlyPrice) / monthlyTotal * 100);
    }
    return 0;
  };

  const isCurrentPlan = (plan: Plan) => {
    return userPlan?.plan?.id === plan.id;
  };

  const isUpgrade = (plan: Plan) => {
    return userPlan && plan.monthlyPrice > userPlan.plan.monthlyPrice;
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toUpperCase()) {
      case 'FREE':
        return <FaUpload className="h-6 w-6" />;
      case 'BASIC':
        return <FaShieldAlt className="h-6 w-6" />;
      case 'PRO':
        return <FaCloud className="h-6 w-6" />;
      case 'ENTERPRISE':
        return <FaCrown className="h-6 w-6" />;
      default:
        return <FaStar className="h-6 w-6" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName.toUpperCase()) {
      case 'FREE':
        return 'from-gray-400 to-gray-500';
      case 'BASIC':
        return 'from-blue-400 to-blue-500';
      case 'PRO':
        return 'from-purple-400 to-purple-500';
      case 'ENTERPRISE':
        return 'from-yellow-400 to-yellow-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const handleSubscribe = () => {
    if (plan) {
      setShowSubscribeModal(true);
    }
  };

  const confirmSubscribe = () => {
    if (plan) {
      subscribeMutation.mutate({
        planId: plan.id,
        billingCycle: selectedCycle,
        autoRenew
      });
    }
  };

  if (planLoading || userPlanLoading) {
    return <LoadingSpinner />;
  }

  if (planError || !plan) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">{t('planDetailsPage.notFoundTitle')}</h2>
          <p className="text-red-600 mb-4">{t('planDetailsPage.notFoundBody')}</p>
          <button
            onClick={() => navigate('/plans')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('planDetailsPage.backToPlans')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/plans')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <FaArrowLeft className="h-4 w-4" />
          <span>{t('planDetailsPage.backToPlans')}</span>
        </button>
      </div>

      {/* Plan Details */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className={`bg-gradient-to-r ${getPlanColor(plan.planName)} p-8 text-white`}>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              {getPlanIcon(plan.planName)}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{plan.displayName}</h1>
              <p className="text-lg opacity-90">{plan.description}</p>
              {plan.isPopular && (
                <span className="inline-block bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium mt-2">
                  {t('planDetailsPage.mostPopular')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Pricing Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('planDetailsPage.pricing')}</h2>
            
            {/* Billing Cycle Toggle */}
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSelectedCycle('MONTHLY')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCycle === 'MONTHLY'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('planDetailsPage.monthly')}
                </button>
                <button
                  onClick={() => setSelectedCycle('YEARLY')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCycle === 'YEARLY'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('planDetailsPage.yearly')}
                  {selectedCycle === 'YEARLY' && (
                    <span className="ml-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      {t('planDetailsPage.savePercent', { n: getSavings(plan) })}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-baseline justify-center">
                <span className="text-5xl font-bold text-gray-900">${getPrice(plan)}</span>
                <span className="text-gray-500 ml-2 text-xl">
                  {selectedCycle === 'MONTHLY' ? t('planDetailsPage.perMonth') : t('planDetailsPage.perYear')}
                </span>
              </div>
              {getSavings(plan) > 0 && (
                <p className="text-lg text-green-600 mt-2">
                  {t('planDetailsPage.saveYearly', { n: getSavings(plan) })}
                </p>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('planDetailsPage.features')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <FaCheck className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">
                    {t('planDetailsPage.uploadsPerMonth', { n: plan.maxUploadsPerMonth.toLocaleString() })}
                  </span>
                </div>
                <div className="flex items-center">
                  <FaCheck className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">
                    {t('planDetailsPage.storageQuota', { n: plan.storageQuotaGB })}
                  </span>
                </div>
                <div className="flex items-center">
                  <FaCheck className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">
                    {t('planDetailsPage.maxFileSize', { n: plan.maxFileSizeMB })}
                  </span>
                </div>
                <div className="flex items-center">
                  <FaCheck className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">
                    {t('planDetailsPage.concurrentUploads', { n: plan.maxConcurrentUploads })}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                {plan.encryptionEnabled && (
                  <div className="flex items-center">
                    <FaCheck className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">{t('planDetailsPage.encryptionCompression')}</span>
                  </div>
                )}
                {plan.cloudStorageEnabled && (
                  <div className="flex items-center">
                    <FaCheck className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">{t('planDetailsPage.cloudStorageIntegration')}</span>
                  </div>
                )}
                {plan.prioritySupport && (
                  <div className="flex items-center">
                    <FaCheck className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">{t('planDetailsPage.prioritySupport')}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <FaCheck className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">
                    {t('planDetailsPage.fileTypes', { types: plan.allowedFileTypes })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center">
            {isCurrentPlan(plan) ? (
              <button
                disabled
                className="bg-gray-300 text-gray-500 px-8 py-3 rounded-lg font-medium cursor-not-allowed"
              >
                {t('planDetailsPage.currentPlan')}
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                  isUpgrade(plan)
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {isUpgrade(plan) ? t('planDetailsPage.upgradeToPlan') : t('planDetailsPage.subscribeToPlan')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      {allPlans && allPlans.length > 1 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('planDetailsPage.comparePlans')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">{t('planDetailsPage.featureColumn')}</th>
                  {allPlans.map((p) => (
                    <th key={p.id} className={`text-center py-3 px-4 ${p.id === plan.id ? 'bg-primary-50' : ''}`}>
                      {p.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">{t('planDetailsPage.monthlyPrice')}</td>
                  {allPlans.map((p) => (
                    <td key={p.id} className={`text-center py-3 px-4 ${p.id === plan.id ? 'bg-primary-50' : ''}`}>
                      ${p.monthlyPrice}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">{t('planDetailsPage.uploadsMonth')}</td>
                  {allPlans.map((p) => (
                    <td key={p.id} className={`text-center py-3 px-4 ${p.id === plan.id ? 'bg-primary-50' : ''}`}>
                      {p.maxUploadsPerMonth.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">{t('planDetailsPage.storage')}</td>
                  {allPlans.map((p) => (
                    <td key={p.id} className={`text-center py-3 px-4 ${p.id === plan.id ? 'bg-primary-50' : ''}`}>
                      {p.storageQuotaGB} GB
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">{t('planDetailsPage.maxFileSizeCol')}</td>
                  {allPlans.map((p) => (
                    <td key={p.id} className={`text-center py-3 px-4 ${p.id === plan.id ? 'bg-primary-50' : ''}`}>
                      {p.maxFileSizeMB} MB
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">{t('planDetailsPage.cloudStorage')}</td>
                  {allPlans.map((p) => (
                    <td key={p.id} className={`text-center py-3 px-4 ${p.id === plan.id ? 'bg-primary-50' : ''}`}>
                      {p.cloudStorageEnabled ? <FaCheck className="h-5 w-5 text-green-500 mx-auto" /> : <FaTimes className="h-5 w-5 text-gray-400 mx-auto" />}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">{t('planDetailsPage.prioritySupportCol')}</td>
                  {allPlans.map((p) => (
                    <td key={p.id} className={`text-center py-3 px-4 ${p.id === plan.id ? 'bg-primary-50' : ''}`}>
                      {p.prioritySupport ? <FaCheck className="h-5 w-5 text-green-500 mx-auto" /> : <FaTimes className="h-5 w-5 text-gray-400 mx-auto" />}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('planDetailsPage.modalTitle', { name: plan.displayName })}
              </h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="font-medium text-gray-900">{t('planDetailsPage.planSummary')}</h4>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p>{t('planDetailsPage.summaryUploads', { n: plan.maxUploadsPerMonth.toLocaleString() })}</p>
                    <p>{t('planDetailsPage.summaryStorage', { n: plan.storageQuotaGB })}</p>
                    <p>{t('planDetailsPage.summaryMaxFile', { n: plan.maxFileSizeMB })}</p>
                    <p>{t('planDetailsPage.summaryConcurrent', { n: plan.maxConcurrentUploads })}</p>
                    <p>
                      {selectedCycle === 'YEARLY'
                        ? t('planDetailsPage.summaryBillingYearly')
                        : t('planDetailsPage.summaryBillingMonthly')}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    ${getPrice(plan)}
                    <span className="text-sm text-gray-500">
                      {selectedCycle === 'MONTHLY' ? t('planDetailsPage.perMonth') : t('planDetailsPage.perYear')}
                    </span>
                  </p>
                  {getSavings(plan) > 0 && (
                    <p className="text-sm text-green-600">
                      {t('planDetailsPage.saveYearly', { n: getSavings(plan) })}
                    </p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoRenew"
                    checked={autoRenew}
                    onChange={(e) => setAutoRenew(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoRenew" className="ml-2 block text-sm text-gray-900">
                    {t('planDetailsPage.autoRenew')}
                  </label>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowSubscribeModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    {t('planDetailsPage.cancel')}
                  </button>
                  <button
                    onClick={confirmSubscribe}
                    disabled={subscribeMutation.isPending}
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {subscribeMutation.isPending ? (
                      <LoadingSpinner size="sm" text={t('planDetailsPage.processing')} />
                    ) : (
                      t('planDetailsPage.subscribe')
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanDetailsPage;
