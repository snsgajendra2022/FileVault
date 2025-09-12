import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService, { Plan } from '../../services/adminService';
import { FaPlus, FaEdit, FaTimes, FaEye, FaCheck, FaCrown, FaStar, FaShieldAlt, FaCloud, FaUpload, FaLock, FaUsers, FaCog } from 'react-icons/fa';
import toast from 'react-hot-toast';

const PlanManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const queryClient = useQueryClient();

  // Fetch all plans
  const { data: plansResponse, isLoading: plansLoading } = useQuery({
    queryKey: ['adminPlans'],
    queryFn: () => adminService.getAllPlans()
  });

  // Extract plans array from response, with fallback to empty array
  const plans = Array.isArray(plansResponse) ? plansResponse : 
                plansResponse?.plans ? plansResponse.plans : 
                plansResponse?.data ? plansResponse.data : [];

  // Debug logging
  // console.log('Plans response:', plansResponse);
  // console.log('Extracted plans:', plans);

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: (planData: Partial<Plan>) => adminService.createPlan(planData),
    onSuccess: () => {
      toast.success('Plan created successfully');
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
    },
    onError: () => toast.error('Failed to create plan')
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ planId, planData }: { planId: number; planData: Partial<Plan> }) => 
      adminService.updatePlan(planId, planData),
    onSuccess: () => {
      toast.success('Plan updated successfully');
      setShowEditModal(false);
      setSelectedPlan(null);
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
    },
    onError: () => toast.error('Failed to update plan')
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: (planId: number) => adminService.deletePlan(planId),
    onSuccess: () => {
      toast.success('Plan deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
    },
    onError: () => toast.error('Failed to delete plan')
  });

  const handleEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowEditModal(true);
  };

  const handleDeletePlan = (planId: number) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      deletePlanMutation.mutate(planId);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName?.toUpperCase()) {
      case 'FREE':
        return <FaUsers className="h-6 w-6 text-gray-500" />;
      case 'BASIC':
        return <FaStar className="h-6 w-6 text-blue-500" />;
      case 'PRO':
        return <FaCrown className="h-6 w-6 text-purple-500" />;
      case 'ENTERPRISE':
        return <FaShieldAlt className="h-6 w-6 text-red-500" />;
      default:
        return <FaCog className="h-6 w-6 text-gray-500" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName?.toUpperCase()) {
      case 'FREE':
        return 'from-gray-400 to-gray-600';
      case 'BASIC':
        return 'from-blue-400 to-blue-600';
      case 'PRO':
        return 'from-purple-400 to-purple-600';
      case 'ENTERPRISE':
        return 'from-red-400 to-red-600';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Free' : `$${price}`;
  };

  const formatStorage = (storageGB: number) => {
    if (storageGB >= 1000) {
      return `${storageGB / 1000} TB`;
    }
    return `${storageGB} GB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          Plan Management
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Create and manage subscription plans for your users
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center mb-8">
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center space-x-3"
        >
          <FaPlus className="h-5 w-5" />
          <span>Create New Plan</span>
        </button>
      </div>

      {/* Plans Grid */}
      {plansLoading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-600 transition ease-in-out duration-150">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading plans...
          </div>
        </div>
      ) : !Array.isArray(plans) ? (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
            <FaTimes className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Plans</h3>
            <p className="text-red-600">Invalid data format received from server</p>
          </div>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto border border-gray-200 shadow-lg">
            <FaPlus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Plans Found</h3>
            <p className="text-gray-600 mb-6">Create your first subscription plan to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
            >
              Create First Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {plans.map((plan: any) => (
            <div key={plan.id} className="bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 rounded-3xl shadow-2xl border border-blue-100/50 overflow-hidden transform hover:scale-105 transition-all duration-300">
              {/* Plan Header */}
              <div className={`bg-gradient-to-r ${getPlanColor(plan.planName)} p-6 text-white relative`}>
                {plan.isPopular && (
                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                    POPULAR
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getPlanIcon(plan.planName)}
                    <div>
                      <h3 className="text-xl font-bold">{plan.displayName}</h3>
                      <p className="text-sm opacity-90">{plan.planName}</p>
                    </div>
                  </div>
                </div>
                
                {/* Pricing */}
                <div className="text-center">
                  <div className="text-3xl font-bold mb-1">
                    {formatPrice(plan.monthlyPrice)}
                  </div>
                  <div className="text-sm opacity-90">per month</div>
                  {plan.yearlyPrice > 0 && (
                    <div className="text-xs opacity-75 mt-1">
                      {formatPrice(plan.yearlyPrice)} yearly
                    </div>
                  )}
                </div>
              </div>

              {/* Plan Content */}
              <div className="p-6">
                <p className="text-gray-600 text-sm mb-6 leading-relaxed">{plan.description}</p>
                
                {/* Features Grid */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Storage</span>
                    <span className="font-semibold text-gray-800">{formatStorage(plan.storageQuotaGB)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Max File Size</span>
                    <span className="font-semibold text-gray-800">{plan.maxFileSizeMB} MB</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Uploads/Month</span>
                    <span className="font-semibold text-gray-800">
                      {plan.maxUploadsPerMonth === 10000 ? '∞' : plan.maxUploadsPerMonth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Concurrent Uploads</span>
                    <span className="font-semibold text-gray-800">{plan.maxConcurrentUploads}</span>
                  </div>
                </div>

                {/* Feature Icons */}
                <div className="flex items-center justify-center space-x-4 mb-6">
                  {plan.encryptionEnabled && (
                    <div className="flex flex-col items-center">
                      <FaLock className="h-5 w-5 text-green-500 mb-1" />
                      <span className="text-xs text-gray-500">Encryption</span>
                    </div>
                  )}
                  {plan.cloudStorageEnabled && (
                    <div className="flex flex-col items-center">
                      <FaCloud className="h-5 w-5 text-blue-500 mb-1" />
                      <span className="text-xs text-gray-500">Cloud Storage</span>
                    </div>
                  )}
                  {plan.compressionEnabled && (
                    <div className="flex flex-col items-center">
                      <FaUpload className="h-5 w-5 text-purple-500 mb-1" />
                      <span className="text-xs text-gray-500">Compression</span>
                    </div>
                  )}
                  {plan.prioritySupport && (
                    <div className="flex flex-col items-center">
                      <FaStar className="h-5 w-5 text-yellow-500 mb-1" />
                      <span className="text-xs text-gray-500">Priority Support</span>
                    </div>
                  )}
                </div>

                {/* File Types */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Supported Files</h4>
                  <div className="flex flex-wrap gap-1">
                    {plan.allowedFileTypes?.split(',').map((type: string, index: number) => (
                      <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs">
                        {type.trim().toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <FaEdit className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    disabled={deletePlanMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-red-700 hover:to-pink-700 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <FaTimes className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(planData) => createPlanMutation.mutate(planData)}
          isLoading={createPlanMutation.isPending}
        />
      )}

      {/* Edit Plan Modal */}
      {showEditModal && selectedPlan && (
        <EditPlanModal
          plan={selectedPlan}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPlan(null);
          }}
          onSubmit={(planData) => updatePlanMutation.mutate({ planId: selectedPlan.id, planData })}
          isLoading={updatePlanMutation.isPending}
        />
      )}
    </div>
  );
};

// Create Plan Modal Component
const CreatePlanModal = ({ onClose, onSubmit, isLoading }: {
  onClose: () => void;
  onSubmit: (planData: Partial<Plan>) => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState({
    planName: '',
    displayName: '',
    description: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    storageQuotaGB: 1,
    maxFileSizeMB: 5,
    maxUploadsPerMonth: 10,
    maxConcurrentUploads: 1,
    allowedFileTypes: 'jpg,jpeg,png',
    encryptionEnabled: false,
    cloudStorageEnabled: false,
    compressionEnabled: false,
    prioritySupport: false,
    isPopular: false,
    isActive: false,
    sortOrder: 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Create New Plan</h2>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <FaTimes className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Plan Name</label>
              <input
                type="text"
                required
                value={formData.planName}
                onChange={(e) => setFormData(prev => ({ ...prev, planName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., BASIC, PRO, ENTERPRISE"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Display Name</label>
              <input
                type="text"
                required
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., Basic Plan, Pro Plan"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              rows={3}
              placeholder="Describe the plan features and benefits"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Monthly Price ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.monthlyPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyPrice: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Yearly Price ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.yearlyPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, yearlyPrice: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Storage (GB)</label>
              <input
                type="number"
                required
                min="1"
                value={formData.storageQuotaGB}
                onChange={(e) => setFormData(prev => ({ ...prev, storageQuotaGB: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Max File Size (MB)</label>
              <input
                type="number"
                required
                min="1"
                value={formData.maxFileSizeMB}
                onChange={(e) => setFormData(prev => ({ ...prev, maxFileSizeMB: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Uploads/Month</label>
              <input
                type="number"
                required
                min="1"
                value={formData.maxUploadsPerMonth}
                onChange={(e) => setFormData(prev => ({ ...prev, maxUploadsPerMonth: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Concurrent Uploads</label>
              <input
                type="number"
                required
                min="1"
                value={formData.maxConcurrentUploads}
                onChange={(e) => setFormData(prev => ({ ...prev, maxConcurrentUploads: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Allowed File Types</label>
            <input
              type="text"
              required
              value={formData.allowedFileTypes}
              onChange={(e) => setFormData(prev => ({ ...prev, allowedFileTypes: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="jpg,jpeg,png,pdf,doc,docx"
            />
            <p className="text-sm text-gray-500 mt-1">Comma-separated list of file extensions</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.encryptionEnabled}
                onChange={(e) => setFormData(prev => ({ ...prev, encryptionEnabled: e.target.checked }))}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Encryption</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.cloudStorageEnabled}
                onChange={(e) => setFormData(prev => ({ ...prev, cloudStorageEnabled: e.target.checked }))}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Cloud Storage</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.compressionEnabled}
                onChange={(e) => setFormData(prev => ({ ...prev, compressionEnabled: e.target.checked }))}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Compression</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.prioritySupport}
                onChange={(e) => setFormData(prev => ({ ...prev, prioritySupport: e.target.checked }))}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Priority Support</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isPopular}
                onChange={(e) => setFormData(prev => ({ ...prev, isPopular: e.target.checked }))}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Popular Plan</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Active Plan</span>
            </label>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Plan Modal Component
const EditPlanModal = ({ plan, onClose, onSubmit, isLoading }: {
  plan: Plan;
  onClose: () => void;
  onSubmit: (planData: Partial<Plan>) => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState({
    planName: plan.planName || '',
    displayName: plan.displayName || '',
    description: plan.description || '',
    monthlyPrice: plan.monthlyPrice || 0,
    yearlyPrice: plan.yearlyPrice || 0,
    storageQuotaGB: plan.storageQuotaGB || 1,
    maxFileSizeMB: plan.maxFileSizeMB || 5,
    maxUploadsPerMonth: plan.maxUploadsPerMonth || 10,
    maxConcurrentUploads: plan.maxConcurrentUploads || 1,
    allowedFileTypes: plan.allowedFileTypes || 'jpg,jpeg,png',
    encryptionEnabled: plan.encryptionEnabled ?? false,
    cloudStorageEnabled: plan.cloudStorageEnabled ?? false,
    compressionEnabled: plan.compressionEnabled ?? false,
    prioritySupport: plan.prioritySupport ?? false,
    isPopular: plan.isPopular ?? false,
    isActive: plan.isActive ?? false,
    sortOrder: plan.sortOrder || 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Edit Plan</h2>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <FaTimes className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Plan Name</label>
              <input
                type="text"
                required
                value={formData.planName}
                onChange={(e) => setFormData(prev => ({ ...prev, planName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., BASIC, PRO, ENTERPRISE"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Display Name</label>
              <input
                type="text"
                required
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Basic Plan, Pro Plan"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Describe the plan features and benefits"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Monthly Price ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.monthlyPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyPrice: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Yearly Price ($)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.yearlyPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, yearlyPrice: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Storage (GB)</label>
              <input
                type="number"
                required
                min="1"
                value={formData.storageQuotaGB}
                onChange={(e) => setFormData(prev => ({ ...prev, storageQuotaGB: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Max File Size (MB)</label>
              <input
                type="number"
                required
                min="1"
                value={formData.maxFileSizeMB}
                onChange={(e) => setFormData(prev => ({ ...prev, maxFileSizeMB: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Uploads/Month</label>
              <input
                type="number"
                required
                min="1"
                value={formData.maxUploadsPerMonth}
                onChange={(e) => setFormData(prev => ({ ...prev, maxUploadsPerMonth: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Concurrent Uploads</label>
              <input
                type="number"
                required
                min="1"
                value={formData.maxConcurrentUploads}
                onChange={(e) => setFormData(prev => ({ ...prev, maxConcurrentUploads: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Allowed File Types</label>
            <input
              type="text"
              required
              value={formData.allowedFileTypes}
              onChange={(e) => setFormData(prev => ({ ...prev, allowedFileTypes: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="jpg,jpeg,png,pdf,doc,docx"
            />
            <p className="text-sm text-gray-500 mt-1">Comma-separated list of file extensions</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.encryptionEnabled}
                onChange={(e) => setFormData(prev => ({ ...prev, encryptionEnabled: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Encryption</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.cloudStorageEnabled}
                onChange={(e) => setFormData(prev => ({ ...prev, cloudStorageEnabled: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Cloud Storage</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.compressionEnabled}
                onChange={(e) => setFormData(prev => ({ ...prev, compressionEnabled: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Compression</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.prioritySupport}
                onChange={(e) => setFormData(prev => ({ ...prev, prioritySupport: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Priority Support</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isPopular}
                onChange={(e) => setFormData(prev => ({ ...prev, isPopular: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Popular Plan</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Active Plan</span>
            </label>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanManagement;
