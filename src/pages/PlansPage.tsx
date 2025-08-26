import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FaCheck, FaTimes, FaCrown, FaShieldAlt, FaCloud, FaUpload, FaUsers, FaStar } from 'react-icons/fa';
import LoadingSpinner from '../components/common/LoadingSpinner';

// API Response Interfaces
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

interface PlansResponse {
  plans: Plan[];
  totalPlans: number;
}

interface UpgradeRequest {
  newPlanId: number;
  billingCycle: string;
  prorate: boolean;
}

interface SubscribeRequest {
  planId: number;
  billingCycle: string;
  autoRenew: boolean;
}

interface CancelRequest {
  reason: string;
  immediate: boolean;
}

const PlansPage = () => {
  const [selectedCycle, setSelectedCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [immediateCancel, setImmediateCancel] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Auto-refresh data when component mounts or after plan operations
  useEffect(() => {
    const refreshData = async () => {
      try {
        await queryClient.refetchQueries({ queryKey: ['userPlan'] });
        await queryClient.refetchQueries({ queryKey: ['planUsage'] });
        await queryClient.refetchQueries({ queryKey: ['usage'] });
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    };

    refreshData();
  }, [queryClient]);

  // Fetch all plan
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await api.get('/api/plans');
      return response.data as PlansResponse;
    }
  });

  // Fetch user's current plan
  const { data: userPlan, isLoading: userPlanLoading } = useQuery({
    queryKey: ['userPlan'],
    queryFn: async () => {
      const response = await api.get('/api/plans/my-plan');
      return response.data as UserPlan;
    }
  });

  // Fetch usage data
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['planUsage'],
    queryFn: async () => {
      const response = await api.get('/api/plans/usage');
      return response.data;
    }
  });

  // Subscribe to plan mutation
  const subscribeMutation = useMutation({
    mutationFn: async (data: SubscribeRequest) => {
      const response = await api.post('/api/plans/subscribe', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Successfully subscribed to plan!');
      queryClient.invalidateQueries({ queryKey: ['userPlan'] });
      queryClient.invalidateQueries({ queryKey: ['planUsage'] });
      setShowSubscribeModal(false);
      setSelectedPlan(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to subscribe to plan');
    }
  });

  // Upgrade plan mutation
  const upgradeMutation = useMutation({
    mutationFn: async (data: UpgradeRequest) => {
      const response = await api.post('/api/plans/upgrade', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Successfully upgraded your plan!');
      queryClient.invalidateQueries({ queryKey: ['userPlan'] });
      queryClient.invalidateQueries({ queryKey: ['planUsage'] });
      setShowSubscribeModal(false);
      setSelectedPlan(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upgrade plan');
    }
  });

  // Cancel plan mutation
  const cancelMutation = useMutation({
    mutationFn: async (data: CancelRequest) => {
      const response = await api.post('/api/plans/cancel', data);
      return response.data;
    },
    onSuccess: () => {
      // toast.success('Plan cancellation processed successfully');
      queryClient.invalidateQueries({ queryKey: ['userPlan'] });
      queryClient.invalidateQueries({ queryKey: ['planUsage'] });
      setShowCancelModal(false);
      setCancelReason('');
      setImmediateCancel(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel plan');
    }
  });

  const handleSubscribe = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowSubscribeModal(true);
  };

  const handleCancelPlan = () => {
    setShowCancelModal(true);
  };

  const confirmSubscribe = () => {
    if (selectedPlan) {
      const isUpgrade = userPlan && selectedPlan.monthlyPrice > userPlan.plan.monthlyPrice;
      
      if (isUpgrade) {
        upgradeMutation.mutate({
          newPlanId: selectedPlan.id,
          billingCycle: selectedCycle,
          prorate: true
        });
      } else {
        subscribeMutation.mutate({
          planId: selectedPlan.id,
          billingCycle: selectedCycle,
          autoRenew
        });
      }
    }
  };

  const confirmCancel = () => {
    cancelMutation.mutate({
      reason: cancelReason,
      immediate: immediateCancel
    }, {
      onSuccess: () => {
        // Force immediate refetch of all related data
        queryClient.refetchQueries({ queryKey: ['userPlan'] });
        queryClient.refetchQueries({ queryKey: ['planUsage'] });
        queryClient.refetchQueries({ queryKey: ['usage'] });
        
        // Invalidate all related queries to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ['userPlan'] });
        queryClient.invalidateQueries({ queryKey: ['planUsage'] });
        queryClient.invalidateQueries({ queryKey: ['usage'] });
        queryClient.invalidateQueries({ queryKey: ['billing'] });
        
        // Force a complete cache reset for plan-related data
        queryClient.removeQueries({ queryKey: ['userPlan'] });
        queryClient.removeQueries({ queryKey: ['planUsage'] });
        queryClient.removeQueries({ queryKey: ['usage'] });
        
        // Close modal and reset form
        setShowCancelModal(false);
        setCancelReason('');
        setImmediateCancel(false);
        
        // Show success message
        toast.success('Plan cancellation processed successfully');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to cancel plan. Please try again.');
      }
    });
  };

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

  const isDowngrade = (plan: Plan) => {
    return userPlan && plan.monthlyPrice < userPlan.plan.monthlyPrice;
  };

  const isFreePlan = (plan: Plan) => {
    return plan.planName === 'FREE' || plan.monthlyPrice === 0;
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

  if (plansLoading || userPlanLoading || usageLoading) {
    return <LoadingSpinner />;
  }

  const plans = plansData?.plans || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Select the perfect plan for your needs with advanced features and competitive pricing
        </p>
      </div>

      {/* Current Plan Banner */}
      {userPlan && (
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-3xl shadow-2xl border border-blue-100/50 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  queryClient.refetchQueries({ queryKey: ['userPlan'] });
                  queryClient.refetchQueries({ queryKey: ['planUsage'] });
                  queryClient.refetchQueries({ queryKey: ['usage'] });
                  toast.success('Data refreshed successfully!');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Refresh Data
              </button>
            </div>
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FaCrown className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  Current Plan: {userPlan.plan.displayName}
                </h3>
                <p className="text-lg text-gray-600">
                  ${userPlan.currentPrice}/{userPlan.billingCycle.toLowerCase()} • 
                  Next billing: {new Date(userPlan.nextBillingDate).toLocaleDateString()}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-6">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-100/50">
                    <p className="text-sm text-gray-500 mb-1">Uploads</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {userPlan.uploadsUsedThisMonth}/{userPlan.plan.maxUploadsPerMonth}
                    </p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-100/50">
                    <p className="text-sm text-gray-500 mb-1">Storage</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {userPlan.storageUsedGB.toFixed(2)}/{userPlan.plan.storageQuotaGB} GB
                    </p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-100/50">
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <p className={`text-lg font-semibold ${userPlan.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {userPlan.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => {navigate('/usage');}}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg transform hover:scale-105"
              >
                View Usage
              </button>
              {userPlan.status === 'ACTIVE' && !isFreePlan(userPlan.plan) && (
                <button
                  onClick={handleCancelPlan}
                  className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-pink-700 transition-all duration-300 shadow-lg transform hover:scale-105"
                >
                  Cancel Plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-2 shadow-lg">
          <button
            onClick={() => setSelectedCycle('MONTHLY')}
            className={`px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 ${
              selectedCycle === 'MONTHLY'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedCycle('YEARLY')}
            className={`px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 ${
              selectedCycle === 'YEARLY'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            Yearly
            {selectedCycle === 'YEARLY' && (
              <span className="ml-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm">
                Save up to 20%
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {plans.map((plan: Plan) => (
          <div
            key={plan.id}
            className={`relative bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 rounded-3xl shadow-2xl border border-blue-100/50 ${
              plan.isPopular ? 'border-indigo-500/50' : 'border-blue-100/50'
            } ${isCurrentPlan(plan) ? 'ring-4 ring-indigo-500/30' : ''} hover:shadow-3xl transition-all duration-300 transform hover:scale-105`}
          >
            {plan.isPopular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                  Most Popular
                </span>
              </div>
            )}

            {isCurrentPlan(plan) && (
              <div className="absolute -top-4 right-6">
                <span className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                  Current Plan
                </span>
              </div>
            )}

            <div className="p-8">
              <div className="text-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${getPlanColor(plan.planName)} rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg`}>
                  {getPlanIcon(plan.planName)}
                </div>
                <h3 className="text-2xl font-bold text-gray-800">{plan.displayName}</h3>
                <p className="text-base text-gray-600 mt-2 leading-relaxed">{plan.description}</p>
              </div>

              <div className="mt-8 text-center">
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-bold text-gray-800">${getPrice(plan)}</span>
                  <span className="text-gray-500 ml-2 text-lg">
                    /{selectedCycle === 'MONTHLY' ? 'month' : 'year'}
                  </span>
                </div>
                {getSavings(plan) > 0 && (
                  <p className="text-base text-green-600 mt-2 font-semibold">
                    Save {getSavings(plan)}% with yearly billing
                  </p>
                )}
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                    <FaCheck className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-base text-gray-700 font-medium">
                    {plan.maxUploadsPerMonth.toLocaleString()} uploads/month
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                    <FaCheck className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-base text-gray-700 font-medium">
                    {plan.storageQuotaGB} GB storage
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                    <FaCheck className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-base text-gray-700 font-medium">
                    Up to {plan.maxFileSizeMB} MB per file
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                    <FaCheck className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-base text-gray-700 font-medium">
                    {plan.maxConcurrentUploads} concurrent uploads
                  </span>
                </div>
                {plan.encryptionEnabled && (
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                      <FaCheck className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-base text-gray-700 font-medium">
                      Encryption & compression
                    </span>
                  </div>
                )}
                {plan.cloudStorageEnabled && (
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                      <FaCheck className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-base text-gray-700 font-medium">
                      Cloud storage integration
                    </span>
                  </div>
                )}
                {plan.prioritySupport && (
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                      <FaCheck className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-base text-gray-700 font-medium">
                      Priority support
                    </span>
                  </div>
                )}
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                    <FaCheck className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-base text-gray-700 font-medium">
                    {plan.allowedFileTypes}
                  </span>
                </div>
              </div>

              <div className="mt-10">
                {isCurrentPlan(plan) ? (
                  <button
                    disabled
                    className="w-full bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 px-6 py-4 rounded-xl font-semibold cursor-not-allowed shadow-md"
                  >
                    Current Plan
                  </button>
                ) : isFreePlan(plan) ? (
                  <button
                    disabled
                    className="w-full bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 px-6 py-4 rounded-xl font-semibold cursor-not-allowed shadow-md"
                  >
                    Free Plan
                  </button>
                ) : (
                  <button
                    onClick={() =>navigate(`/checkout/${plan.id}`)}
                    className={`w-full px-6 py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg transform hover:scale-105 ${
                      isUpgrade(plan)
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                        : isDowngrade(plan)
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700'
                        : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800'
                    }`}
                  >
                    {isUpgrade(plan) ? 'Upgrade Plan' : isDowngrade(plan) ? 'Downgrade' : 'Upgrade Plan'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-8 border w-[500px] shadow-2xl rounded-3xl bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 border-blue-100/50">
            <div className="mt-3">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FaCrown className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {isUpgrade(selectedPlan) ? 'Upgrade' : 'Subscribe'} to {selectedPlan.displayName}
                </h3>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-blue-100/50 shadow-lg">
                  <h4 className="font-semibold text-gray-800 mb-4 text-lg">Plan Summary</h4>
                  <div className="space-y-3 text-base text-gray-700">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                        <FaCheck className="h-3 w-3 text-white" />
                      </div>
                      <span>{selectedPlan.maxUploadsPerMonth.toLocaleString()} uploads/month</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                        <FaCheck className="h-3 w-3 text-white" />
                      </div>
                      <span>{selectedPlan.storageQuotaGB} GB storage</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                        <FaCheck className="h-3 w-3 text-white" />
                      </div>
                      <span>Up to {selectedPlan.maxFileSizeMB} MB per file</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                        <FaCheck className="h-3 w-3 text-white" />
                      </div>
                      <span>{selectedPlan.maxConcurrentUploads} concurrent uploads</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                        <FaCheck className="h-3 w-3 text-white" />
                      </div>
                      <span>{selectedCycle === 'YEARLY' ? 'Yearly' : 'Monthly'} billing</span>
                    </div>
                  </div>
                </div>

                <div className="text-center bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100/50">
                  <p className="text-4xl font-bold text-gray-800">
                    ${getPrice(selectedPlan)}
                    <span className="text-lg text-gray-500 ml-2">
                      /{selectedCycle === 'MONTHLY' ? 'month' : 'year'}
                    </span>
                  </p>
                  {getSavings(selectedPlan) > 0 && (
                    <p className="text-base text-green-600 mt-2 font-semibold">
                      Save {getSavings(selectedPlan)}% with yearly billing
                    </p>
                  )}
                </div>

                {!isUpgrade(selectedPlan) && (
                  <div className="flex items-center bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-100/50">
                    <input
                      type="checkbox"
                      id="autoRenew"
                      checked={autoRenew}
                      onChange={(e) => setAutoRenew(e.target.checked)}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoRenew" className="ml-3 block text-base text-gray-800 font-medium">
                      Auto-renew subscription
                    </label>
                  </div>
                )}

                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowSubscribeModal(false)}
                    className="flex-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-6 py-4 rounded-xl font-semibold hover:from-gray-200 hover:to-gray-300 transition-all duration-300 shadow-md transform hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSubscribe}
                    disabled={subscribeMutation.isPending || upgradeMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-300 shadow-lg transform hover:scale-105"
                  >
                    {subscribeMutation.isPending || upgradeMutation.isPending ? (
                      <LoadingSpinner size="sm" text="Processing..." />
                    ) : (
                      isUpgrade(selectedPlan) ? 'Upgrade' : 'Subscribe'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Plan Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-8 border w-[500px] shadow-2xl rounded-3xl bg-gradient-to-br from-white via-red-50/30 to-pink-50/30 border-red-100/50">
            <div className="mt-3">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FaTimes className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">
                  Cancel Subscription
                </h3>
              </div>
              
              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-red-100/50 shadow-lg">
                  <label className="block text-base font-semibold text-gray-800 mb-4">
                    Reason for cancellation
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-base"
                    rows={4}
                    placeholder="Please tell us why you're cancelling..."
                  />
                </div>

                <div className="flex items-center bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-red-100/50">
                  <input
                    type="checkbox"
                    id="immediateCancel"
                    checked={immediateCancel}
                    onChange={(e) => setImmediateCancel(e.target.checked)}
                    className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="immediateCancel" className="ml-3 block text-base text-gray-800 font-medium">
                    Cancel immediately (no refund)
                  </label>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-6 py-4 rounded-xl font-semibold hover:from-gray-200 hover:to-gray-300 transition-all duration-300 shadow-md transform hover:scale-105"
                  >
                    Keep Plan
                  </button>
                  <button
                    onClick={confirmCancel}
                    disabled={cancelMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-red-600 hover:to-pink-700 disabled:opacity-50 transition-all duration-300 shadow-lg transform hover:scale-105"
                  >
                    {cancelMutation.isPending ? (
                      <LoadingSpinner size="sm" text="Processing..." />
                    ) : (
                      'Cancel Plan'
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

export default PlansPage;
