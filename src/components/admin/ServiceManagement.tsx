import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService, { ServiceConfiguration, ServiceStatistics } from '../../services/adminService';
import { FaCloud, FaPlus, FaTimes, FaSave, FaEye, FaEyeSlash, FaCog, FaShieldAlt, FaCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';

interface ServiceField {
  id: string;
  fieldName: string;
  fieldType: 'text' | 'password' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox';
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[]; // For select fields
  defaultValue?: string | number | boolean;
}

interface DynamicServiceConfiguration {
  id: string;
  serviceName: string;
  serviceType: 'S3_BUCKET' | 'B2_SERVICE' | 'GOOGLE_DRIVE' | 'CUSTOM';
  description: string;
  isEnabled: boolean;
  isPublic: boolean;
  maxUsers: number;
  fields: ServiceField[];
}

const ServiceManagement = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({
    serviceType: '',
    status: ''
  });
  const [dynamicServiceConfigurations, setDynamicServiceConfigurations] = useState<DynamicServiceConfiguration[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentService, setCurrentService] = useState<DynamicServiceConfiguration | null>(null);

  const queryClient = useQueryClient();

  // Fetch service configurations
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['serviceConfigurations', currentPage, pageSize, filters],
    queryFn: () => adminService.getServiceConfigurations({
      page: currentPage,
      size: pageSize,
      ...filters
    })
  });

  // Fetch service statistics
  const { data: serviceStats, isLoading: statsLoading } = useQuery({
    queryKey: ['serviceStatistics'],
    queryFn: () => adminService.getServiceStatistics()
  });

  // Test service configuration mutation
  const testServiceMutation = useMutation({
    mutationFn: (subscriptionId: number) => adminService.testServiceConfiguration(subscriptionId),
    onSuccess: (data) => {
      toast.success(data.message || 'Service test completed');
      queryClient.invalidateQueries({ queryKey: ['serviceConfigurations'] });
      queryClient.invalidateQueries({ queryKey: ['serviceStatistics'] });
    },
    onError: () => toast.error('Failed to test service configuration')
  });

  // Create service configuration mutation
  const createServiceMutation = useMutation({
    mutationFn: (serviceData: any) => adminService.createServiceConfiguration(serviceData),
    onSuccess: () => {
      toast.success('Service configuration created successfully');
      setShowCreateModal(false);
      setCurrentService(null);
      queryClient.invalidateQueries({ queryKey: ['serviceConfigurations'] });
    },
    onError: () => toast.error('Failed to create service configuration')
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0);
  };

  const handleCreateService = () => {
    const newService: DynamicServiceConfiguration = {
      id: Date.now().toString(),
      serviceName: '',
      serviceType: 'S3_BUCKET',
      description: '',
      isEnabled: true,
      isPublic: true,
      maxUsers: 0,
      fields: []
    };
    setCurrentService(newService);
    setShowCreateModal(true);
  };

  const handleSaveService = (serviceData: DynamicServiceConfiguration) => {
    // Convert to API format
    const apiData = {
      serviceType: serviceData.serviceType,
      serviceDisplayName: serviceData.serviceName,
      serviceDescription: serviceData.description,
      isEnabled: serviceData.isEnabled,
      isPublic: serviceData.isPublic,
      maxUsers: serviceData.maxUsers,
      configuration: {
        customFields: serviceData.fields.map(field => ({
          name: field.fieldName,
          type: field.fieldType,
          label: field.label,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options,
          defaultValue: field.defaultValue
        }))
      }
    };

    createServiceMutation.mutate(apiData);
  };

  const handleDeleteService = (serviceId: string) => {
    setDynamicServiceConfigurations(prev => prev.filter(service => service.id !== serviceId));
    toast.success('Service configuration deleted');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      CONNECTED: { color: 'bg-green-100 text-green-800', label: 'Connected' },
      FAILED: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      NOT_TESTED: { color: 'bg-gray-100 text-gray-800', label: 'Not Tested' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.NOT_TESTED;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getServiceTypeBadge = (serviceType: string) => {
    const typeConfig = {
      S3_BUCKET: { color: 'bg-blue-100 text-blue-800', label: 'S3 Bucket' },
      B2_SERVICE: { color: 'bg-purple-100 text-purple-800', label: 'Backblaze B2' },
      GOOGLE_DRIVE: { color: 'bg-green-100 text-green-800', label: 'Google Drive' }
    };

    const config = typeConfig[serviceType as keyof typeof typeConfig] || { color: 'bg-gray-100 text-gray-800', label: serviceType };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Service Management</h3>
          <p className="text-sm text-gray-600">Manage existing services and create dynamic configurations</p>
        </div>
        <button
          onClick={handleCreateService}
          className="btn-primary flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <FaPlus className="h-4 w-4" />
          <span>Create Dynamic Service</span>
        </button>
      </div>

      {/* Statistics Cards */}
      {!statsLoading && serviceStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm font-medium text-blue-600">Total Configurations</p>
            <p className="text-2xl font-bold text-blue-900">{serviceStats.totalConfigurations}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm font-medium text-green-600">Connected Services</p>
            <p className="text-2xl font-bold text-green-900">{serviceStats.connectionStatusCounts.CONNECTED || 0}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-sm font-medium text-red-600">Failed Connections</p>
            <p className="text-2xl font-bold text-red-900">{serviceStats.connectionStatusCounts.FAILED || 0}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <p className="text-sm font-medium text-purple-600">Unique Users</p>
            <p className="text-2xl font-bold text-purple-900">{serviceStats.uniqueUsersWithServices}</p>
          </div>
        </div>
      )}

      {/* Service Type Distribution */}
      {!statsLoading && serviceStats && (
        <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Service Type Distribution</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(serviceStats.serviceTypeCounts).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{type.replace('_', ' ')}</span>
                <span className="text-lg font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
            <select
              value={filters.serviceType}
              onChange={(e) => handleFilterChange('serviceType', e.target.value)}
              className="input-modern"
            >
              <option value="">All Types</option>
              <option value="S3_BUCKET">S3 Bucket</option>
              <option value="B2_SERVICE">Backblaze B2</option>
              <option value="GOOGLE_DRIVE">Google Drive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Connection Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input-modern"
            >
              <option value="">All Status</option>
              <option value="CONNECTED">Connected</option>
              <option value="FAILED">Failed</option>
              <option value="NOT_TESTED">Not Tested</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="input-modern"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Existing Services Table */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Existing Service Configurations</h3>
        <p className="text-sm text-gray-600 mb-4">Manage and monitor current user service connections</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enabled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Tested
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {servicesLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading services...
                  </td>
                </tr>
              ) : servicesData?.configurations?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No service configurations found
                  </td>
                </tr>
              ) : (
                servicesData?.configurations?.map((service: ServiceConfiguration) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {service.username?.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {service.username}
                          </div>
                          <div className="text-sm text-gray-500">User ID: {service.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {service.serviceDisplayName}
                        </div>
                        {getServiceTypeBadge(service.serviceType)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(service.connectionStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        service.isEnabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {service.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.lastTestedAt 
                        ? new Date(service.lastTestedAt).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => testServiceMutation.mutate(service.id)}
                          disabled={testServiceMutation.isPending}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Test Connection"
                        >
                          <FaEye className={`h-4 w-4 ${testServiceMutation.isPending ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          className="text-gray-600 hover:text-gray-900 p-1"
                          title="View Details"
                        >
                          <FaEye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {servicesData && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= servicesData.totalPages - 1}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{currentPage * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min((currentPage + 1) * pageSize, servicesData.totalConfigurations)}
                  </span>{' '}
                  of <span className="font-medium">{servicesData.totalConfigurations}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, servicesData.totalPages) }, (_, i) => {
                    const page = i + Math.max(0, currentPage - 2);
                    if (page >= servicesData.totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= servicesData.totalPages - 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Service Configurations */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Dynamic Service Configurations</h3>
        <p className="text-sm text-gray-600 mb-4">Create custom service templates with dynamic fields for users</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dynamicServiceConfigurations.map((service) => (
            <div key={service.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <FaCloud className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{service.serviceName || 'Unnamed Service'}</h4>
                    <p className="text-sm text-gray-500">{service.serviceType.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setCurrentService(service);
                      setShowCreateModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Edit Service"
                  >
                    <FaCog className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete Service"
                  >
                    <FaTimes className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4">{service.description || 'No description'}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    service.isEnabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {service.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Visibility:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    service.isPublic 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {service.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Max Users:</span>
                  <span className="font-medium text-gray-900">
                    {service.maxUsers === 0 ? 'Unlimited' : service.maxUsers}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Fields:</span>
                  <span className="font-medium text-gray-900">{service.fields.length}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {dynamicServiceConfigurations.length === 0 && (
            <div className="col-span-full">
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaCloud className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Dynamic Service Configurations</h3>
                <p className="text-gray-500 mb-6">Create your first dynamic service configuration to get started.</p>
                <button
                  onClick={handleCreateService}
                  className="btn-primary flex items-center space-x-2 mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <FaPlus className="h-4 w-4" />
                  <span>Create First Dynamic Service</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Service Modal */}
      {showCreateModal && currentService && (
        <DynamicServiceModal
          service={currentService}
          onClose={() => {
            setShowCreateModal(false);
            setCurrentService(null);
          }}
          onSave={handleSaveService}
          isLoading={createServiceMutation.isPending}
        />
      )}
    </div>
  );
};

// Dynamic Service Modal Component
const DynamicServiceModal = ({ 
  service, 
  onClose, 
  onSave, 
  isLoading 
}: {
  service: DynamicServiceConfiguration;
  onClose: () => void;
  onSave: (serviceData: DynamicServiceConfiguration) => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState<DynamicServiceConfiguration>(service);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.serviceName.trim()) {
      newErrors.serviceName = 'Service name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Service description is required';
    }

    // Validate fields
    formData.fields.forEach((field, index) => {
      if (!field.fieldName.trim()) {
        newErrors[`field_${index}_name`] = 'Field name is required';
      }
      if (!field.label.trim()) {
        newErrors[`field_${index}_label`] = 'Field label is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const addField = () => {
    const newField: ServiceField = {
      id: Date.now().toString(),
      fieldName: '',
      fieldType: 'text',
      label: '',
      placeholder: '',
      required: false,
      defaultValue: ''
    };

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const removeField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
  };

  const updateField = (fieldId: string, updates: Partial<ServiceField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const getFieldTypeOptions = () => [
    { value: 'text', label: 'Text Input' },
    { value: 'password', label: 'Password' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Number' },
    { value: 'select', label: 'Dropdown' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'checkbox', label: 'Checkbox' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Dynamic Service Builder</h3>
              <p className="text-blue-100 mt-1">Create custom service with dynamic fields</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <FaTimes className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Service Information */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaCloud className="h-5 w-5 text-blue-600 mr-2" />
                Service Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Service Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.serviceName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter service name"
                    value={formData.serviceName}
                    onChange={(e) => setFormData(prev => ({ ...prev, serviceName: e.target.value }))}
                  />
                  {errors.serviceName && <p className="text-red-500 text-sm mt-1">{errors.serviceName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Service Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData(prev => ({ ...prev, serviceType: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="S3_BUCKET">Amazon S3</option>
                    <option value="B2_SERVICE">Backblaze B2</option>
                    <option value="GOOGLE_DRIVE">Google Drive</option>
                    <option value="CUSTOM">Custom Service</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter service description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Max Users</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="0 for unlimited"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">0 means unlimited users</p>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isEnabled"
                      checked={formData.isEnabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, isEnabled: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isEnabled" className="ml-2 block text-sm text-gray-700">
                      Enable Service
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                      Public Service
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Fields Section */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaCog className="h-5 w-5 text-purple-600 mr-2" />
                  Dynamic Fields
                </h4>
                <button
                  type="button"
                  onClick={addField}
                  className="btn-primary flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <FaPlus className="h-4 w-4" />
                  <span>Add Field</span>
                </button>
              </div>

              {formData.fields.length === 0 ? (
                <div className="text-center py-8">
                  <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaCog className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Fields Added</h3>
                  <p className="text-gray-500">Click "Add Field" to start building your dynamic form</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.fields.map((field, index) => (
                    <div key={field.id} className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-md font-semibold text-gray-900">Field #{index + 1}</h5>
                        <button
                          type="button"
                          onClick={() => removeField(field.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Remove Field"
                        >
                          <FaTimes className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Field Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                              errors[`field_${index}_name`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="e.g., api_key, bucket_name"
                            value={field.fieldName}
                            onChange={(e) => updateField(field.id, { fieldName: e.target.value })}
                          />
                          {errors[`field_${index}_name`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`field_${index}_name`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Field Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={field.fieldType}
                            onChange={(e) => updateField(field.id, { fieldType: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          >
                            {getFieldTypeOptions().map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Display Label <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                              errors[`field_${index}_label`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="e.g., API Key, Bucket Name"
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                          />
                          {errors[`field_${index}_label`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`field_${index}_label`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Placeholder</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Enter placeholder text"
                            value={field.placeholder}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Default Value</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Enter default value"
                            value={field.defaultValue as string}
                            onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`required_${field.id}`}
                            checked={field.required}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`required_${field.id}`} className="ml-2 block text-sm text-gray-700">
                            Required Field
                          </label>
                        </div>

                        {field.fieldType === 'select' && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Options (comma-separated)</label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                              placeholder="Option 1, Option 2, Option 3"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => updateField(field.id, { 
                                options: e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt)
                              })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
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
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Saving Service...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <FaSave className="h-4 w-4 mr-2" />
                    Save Service
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ServiceManagement;
