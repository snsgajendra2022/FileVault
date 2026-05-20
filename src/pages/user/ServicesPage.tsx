import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/context/AuthContext';
import api from '../../api/client/axiosInstance';
import toast from 'react-hot-toast';
import { FaTimes, FaPlus, FaCheck, FaExclamationTriangle, FaCog, FaCloud, FaEye, FaEdit } from 'react-icons/fa';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ServiceCardSkeleton } from '../../components/common/skeletons';
import servicesData from '../../data/services.json';

interface UserService {
  id: number;
  serviceType: string;
  serviceDisplayName: string;
  isEnabled: boolean;
  isConfigured: boolean;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'TESTING';
  connectionErrorMessage?: string;
  lastConnectionTest?: string;
  createdAt: string;
  updatedAt: string;
  configuration: Record<string, any>;
}

interface UserServicesResponse {
  userId: number;
  username: string;
  subscriptions: UserService[];
  summary: {
    totalSubscriptions: number;
    enabledSubscriptions: number;
    configuredSubscriptions: number;
    connectedServices: number;
    failedConnections: number;
  };
}

// New interface for the API response from /api/services/available
interface AvailableServiceField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'select';
  placeholder?: string;
  description?: string;
  required: boolean;
  validation?: string;
  options?: string[];
  defaultValue?: string;
}

interface AvailableService {
  serviceType: string;
  serviceDisplayName: string;
  description: string;
  requiredFields: AvailableServiceField[];
  optionalFields: AvailableServiceField[];
  documentationUrl: string;
  configureUrl: string;
  iconUrl: string;
}

interface ServiceFormData {
  [key: string]: string;
}

const ServicesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<AvailableService | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUserService, setSelectedUserService] = useState<UserService | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({});
  const [isConfiguring, setIsConfiguring] = useState(false);
  const queryClient = useQueryClient();
  const [toggleService, setToggleService] = useState(false);
  // Fetch available services from API
  const { data: availableServices, isLoading: isLoadingAvailableServices, error: availableServicesError } = useQuery({
    queryKey: ['availableServices'],
    queryFn: async () => {
      const response = await api.get('/api/services/available');
      return response.data as AvailableService[];
    },
    retry: 2
  });

  // Fetch user services
  const { data: userServices, isLoading, refetch } = useQuery({
    queryKey: ['userServices'],
    queryFn: async () => {
      try {
        // Get user services from /api/services/user
        const userServicesResponse = await api.get('/api/services/user');
        const userServicesData = userServicesResponse.data;
        const statuses: UserService[] = [];

        for (const service of userServicesData.subscriptions || []) {
          try {
            const statusResponse = await api.get(`/api/services/${service.serviceType}/status`);
            statuses.push({
              ...service,
              ...statusResponse.data
            });
          } catch (error) {
            // console.log(`Error fetching status for ${service.serviceType}:`, error);
            statuses.push({
              ...service,
              connectionStatus: 'DISCONNECTED',
              isConnected: false
            });
          }
        }

        // Create a summary object
        const summary = {
          totalSubscriptions: statuses.length,
          enabledSubscriptions: statuses.filter(s => s.isEnabled).length,
          configuredSubscriptions: statuses.filter(s => s.isConfigured).length,
          connectedServices: statuses.filter(s => s.connectionStatus === 'CONNECTED').length,
          failedConnections: statuses.filter(s => s.connectionStatus === 'ERROR').length
        };

        return {
          subscriptions: statuses,
          summary
        } as UserServicesResponse;
      } catch (error) {
        console.error('Error fetching user services:', error);
        return null;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (serviceType: string) => {
      const response = await api.post(`/api/services/${serviceType}/test`);
      return response.data;
    },
    onSuccess: (data, serviceType) => {
      toast.success(i18n.t('servicesPage.toastTestOk', { serviceType }));
      refetch();
    },
    onError: (error, serviceType) => {
      toast.error(i18n.t('servicesPage.toastTestFail', { serviceType }));
    }
  });

  // Configure service mutation
  const configureServiceMutation = useMutation({
    mutationFn: async ({ configureUrl, config }: { configureUrl: string; config: ServiceFormData }) => {
      const response = await api.post(configureUrl, config);
      return response.data;
    },
    onSuccess: async (data, variables) => {
      toast.success(data.message);
      setShowConfigModal(false);
      setFormData({});
      setIsConfiguring(false);
      refetch();

      // Only for Google Drive service
      // if (data.serviceType === 'GOOGLE_DRIVE') {
      try {
        // Enable the service first
        await handleToggleService(data.serviceType, true);

        // Wait a bit for the service to be enabled, then test connection
        setTimeout(async () => {
          try {
            const testData: any = await handleTestConnection(data.serviceType);

            // If test returns authorizationUrl, open it for OAuth
            if (testData.success && testData.authorizationUrl) {
              toast.success(i18n.t('servicesPage.toastOpeningGoogleDrive'));
              window.open(testData.authorizationUrl, '_blank');
            } else if (testData.success) {
              toast.success(i18n.t('servicesPage.toastGoogleDriveTestOk'));
            } else {
              toast.error(i18n.t('servicesPage.toastGoogleDriveTestFail'));
            }
          } catch (error) {
            console.error('Error testing Google Drive connection:', error);
            toast.error(i18n.t('servicesPage.toastGoogleDriveTestError'));
          }
        }, 1000);
      } catch (error) {
        console.error('Error enabling Google Drive service:', error);
        toast.error(i18n.t('servicesPage.toastEnableGoogleDriveFail'));
      }
      // }
    },
    onError: (error, variables) => {
      toast.error(i18n.t('servicesPage.toastConfigureFail'));
      setIsConfiguring(false);
    }
  });

  // Toggle service mutation
  const toggleServiceMutation = useMutation({
    mutationFn: async ({ serviceType, enabled }: { serviceType: string; enabled: boolean }) => {
      const response = await api.put(`/api/services/${serviceType}/toggle`, { isEnabled: enabled });
      return response.data;
    },
    onSuccess: (data, variables) => {
      toast.success(
        i18n.t('servicesPage.toastToggleOk', {
          serviceType: variables.serviceType,
          state: variables.enabled
            ? i18n.t('servicesPage.toastToggleOkEnabled')
            : i18n.t('servicesPage.toastToggleOkDisabled'),
        })
      );
      setToggleService(true);
      refetch();
    },
    onError: (error, variables) => {
      toast.error(
        i18n.t('servicesPage.toastToggleFail', {
          serviceType: variables.serviceType,
          action: variables.enabled
            ? i18n.t('servicesPage.toastToggleFailEnable')
            : i18n.t('servicesPage.toastToggleFailDisable'),
        })
      );
    }
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceType: string) => {
      const response = await api.delete(`/api/services/${serviceType}/configure`);
      return response.data;
    },
    onSuccess: (data, serviceType) => {
      toast.success(i18n.t('servicesPage.toastDeleteOk', { serviceType }));
      refetch();
    },
    onError: (error, serviceType) => {
      toast.error(i18n.t('servicesPage.toastDeleteFail', { serviceType }));
    }
  });

  const handleConfigureService = (service: AvailableService) => {
    setSelectedService(service);
    setFormData({});
    setShowConfigModal(true);
  };

  const handleConfigureWithSteps = (serviceType: string) => {
    // Map service types to our service IDs
    const serviceIdMap: Record<string, string> = {
      'GOOGLE_DRIVE': 'google-drive',
      'S3_BUCKET': 'aws-s3',
      'DROPBOX': 'dropbox',
      'ONEDRIVE': 'onedrive',
      'GITHUB': 'github',
      'B2_SERVICE': 'backblaze-b2',
      'AZURE_BLOB': 'azure-blob'
    };

    const serviceId = serviceIdMap[serviceType] || serviceType.toLowerCase();
    navigate(`/services/config/${serviceId}`);
  };

  const handleViewDetails = (userService: UserService) => {
    setSelectedUserService(userService);
    setShowDetailsModal(true);
  };
  //connect to service test connection
  const handleTestConnection = async (serviceType: string) => {
    return new Promise((resolve, reject) => {
      testConnectionMutation.mutate(serviceType, {
        onSuccess: (data) => {
          resolve(data);
        },
        onError: (error) => {
          reject(error);
        }
      });
    });
  };
  //connect to service enable and disable
  const handleToggleService = async (serviceType: string, enabled: boolean) => {
    return new Promise((resolve, reject) => {
      toggleServiceMutation.mutate(
        { serviceType, enabled },
        {
          onSuccess: (data) => {
            resolve(data);
          },
          onError: (error) => {
            reject(error);
          }
        }
      );
    });
  };

  const handleDeleteService = (serviceType: string) => {
    if (window.confirm(t('servicesPage.confirmDelete'))) {
      deleteServiceMutation.mutate(serviceType);
    }
  };

  const handleSubmitConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setIsConfiguring(true);
    configureServiceMutation.mutate({
      configureUrl: selectedService.configureUrl,
      config: formData
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <FaCheck className="h-4 w-4 text-green-500" />;
      case 'DISCONNECTED':
        return <FaTimes className="h-4 w-4 text-gray-400" />;
      case 'ERROR':
        return <FaExclamationTriangle className="h-4 w-4 text-red-500" />;
      case 'TESTING':
        return <FaCog className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <FaTimes className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DISCONNECTED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'ERROR':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'TESTING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getServiceConfig = (serviceType: string) => {
    return availableServices?.find(service => service.serviceType === serviceType);
  };

  const getServiceColor = (serviceType: string) => {
    // switch (serviceType) {
    // case 'S3_BUCKET':
    //   return 'bg-gradient-to-r from-orange-500 to-orange-600';
    // case 'B2_SERVICE':
    //   return 'bg-gradient-to-r from-blue-500 to-blue-600';
    // case 'GOOGLE_DRIVE':
    //   return 'bg-gradient-to-r from-green-500 to-green-600';
    // case 'AZURE_BLOB':
    //   return 'bg-gradient-to-r from-blue-600 to-blue-700';
    // default:
    return 'bg-gradient-to-r  from-indigo-600 to-purple-600';
    // }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoadingAvailableServices || isLoading) {
    return (
      <div className="p-6">
        <ServiceCardSkeleton count={8} />
      </div>
    );
  }

  if (availableServicesError) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">{t('servicesPage.errorLoadingTitle')}</h2>
          <p className="text-red-600 mb-4">{t('servicesPage.errorLoadingBody')}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('servicesPage.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!availableServices) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('servicesPage.noServicesTitle')}</h2>
          <p className="text-gray-600">{t('servicesPage.noServicesBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          {t('servicesPage.headerTitle')}
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          {t('servicesPage.headerSubtitle')}
        </p>
      </div>

      {/* Stats Overview */}
      {userServices?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
          <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-2xl p-8 border border-blue-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">{t('servicesPage.statTotal')}</p>
                <p className="text-3xl font-bold text-gray-800">{userServices.summary.totalSubscriptions}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaCloud className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 rounded-2xl p-8 border border-green-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">{t('servicesPage.statEnabled')}</p>
                <p className="text-3xl font-bold text-gray-800">{userServices.summary.enabledSubscriptions}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white via-yellow-50/30 to-orange-50/30 rounded-2xl p-8 border border-yellow-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">{t('servicesPage.statConfigured')}</p>
                <p className="text-3xl font-bold text-gray-800">{userServices.summary.configuredSubscriptions}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaCog className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 rounded-2xl p-8 border border-blue-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">{t('servicesPage.statConnected')}</p>
                <p className="text-3xl font-bold text-gray-800">{userServices.summary.connectedServices}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white via-red-50/30 to-pink-50/30 rounded-2xl p-8 border border-red-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">{t('servicesPage.statFailed')}</p>
                <p className="text-3xl font-bold text-gray-800">{userServices.summary.failedConnections}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaExclamationTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-10">
        {userServices?.subscriptions.map((userService) => {
          const serviceConfig = getServiceConfig(userService.serviceType);

          return (
            <div key={userService.id} className="bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 rounded-3xl shadow-2xl border border-blue-100/50 overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
              {/* Service Header */}
              <div className="p-8 shadow-lg" style={{ background: 'linear-gradient(135deg, rgb(238, 244, 255) 0%, rgb(231, 240, 255) 35%, rgb(245, 249, 255) 100%)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {serviceConfig?.iconUrl ? (
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                        <span className="text-2xl">☁️</span>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                        <span className="text-2xl">☁️</span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-xl text-blue-900">{userService.serviceDisplayName}</h3>
                      <p className="text-sm text-blue-700">{t('servicesPage.activeService')}</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    {getStatusIcon(userService.connectionStatus)}
                  </div>
                </div>
              </div>

              {/* Service Content */}
              <div className="p-8">
                <p className="text-gray-700 text-base mb-6 line-clamp-2 leading-relaxed">
                  {serviceConfig?.description || t('servicesPage.cloudStorageFallback')}
                </p>

                {/* Status Badge */}
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(userService.connectionStatus)} mb-6 shadow-sm`}>
                  {getStatusIcon(userService.connectionStatus)}
                  <span className="ml-2">{userService.connectionStatus}</span>
                </div>

                {/* Error Message */}
                {userService.connectionErrorMessage && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl">
                    <p className="text-sm text-red-700 font-medium">
                      {t('servicesPage.errorPrefix')} {userService.connectionErrorMessage}
                    </p>
                  </div>
                )}

                {/* Last Test */}
                {userService.lastConnectionTest && (
                  <p className="text-sm text-gray-500 mb-6">
                    {t('servicesPage.lastTested')} {formatDate(userService.lastConnectionTest)}
                  </p>
                )}

                {/* Actions */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleViewDetails(userService)}
                      className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:from-gray-200 hover:to-gray-300 transition-all duration-300 text-sm flex items-center justify-center shadow-md transform hover:scale-105"
                    >
                      <FaEye className="h-4 w-4 mr-2" />
                      {t('servicesPage.details')}
                    </button>

                    <button
                      onClick={() => handleTestConnection(userService.serviceType)}
                      disabled={testConnectionMutation.isPending}
                      className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-4 py-3 rounded-xl font-semibold hover:from-blue-200 hover:to-indigo-200 transition-all duration-300 text-sm flex items-center justify-center shadow-md transform hover:scale-105"
                    >
                      {testConnectionMutation.isPending ? (
                        <LoadingSpinner size="sm" text={t('servicesPage.testing')} />
                      ) : (
                        <>
                          <FaCheck className="h-4 w-4 mr-2" />
                          {t('servicesPage.connectToService')}
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleToggleService(userService.serviceType, !userService.isEnabled)}
                      disabled={toggleServiceMutation.isPending}
                      className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 text-sm shadow-md transform hover:scale-105 ${userService.isEnabled
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                        }`}
                    >
                      {userService.isEnabled ? t('servicesPage.disable') : t('servicesPage.enable')}
                    </button>

                    <button
                      onClick={() => handleDeleteService(userService.serviceType)}
                      disabled={deleteServiceMutation.isPending}
                      className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-pink-700 transition-all duration-300 text-sm flex items-center justify-center shadow-md transform hover:scale-105"
                    >
                      <FaTimes className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Available Services Section */}
      <div className="mb-10">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <FaCloud className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">{t('servicesPage.availableServices')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {availableServices?.map((service) => {
            const isConfigured = userServices?.subscriptions.some(s => s.serviceType === service.serviceType);

            return (
              <div key={service.serviceType} className="bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 rounded-3xl shadow-2xl border border-blue-100/50 overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                {/* Service Header */}
                <div className="p-8 shadow-lg" style={{ background: 'linear-gradient(135deg, rgb(238, 244, 255) 0%, rgb(231, 240, 255) 35%, rgb(245, 249, 255) 100%)' }}>
                  <div className="flex items-center space-x-4">
                    {service.iconUrl ? (
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                        <span className="text-2xl">☁️</span>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                        <span className="text-2xl">☁️</span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-xl text-blue-900">{service.serviceDisplayName}</h3>
                      <p className="text-sm text-blue-700">{t('servicesPage.cloudStorage')}</p>
                    </div>
                  </div>
                </div>

                {/* Service Content */}
                <div className="p-8">
                  <p className="text-gray-700 text-base mb-6 line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Status */}
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border-2 mb-6 shadow-sm ${isConfigured
                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300'
                    : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300'
                    }`}>
                    {isConfigured ? (
                      <>
                        <FaCheck className="h-4 w-4 mr-2" />
                        {t('servicesPage.configured')}
                      </>
                    ) : (
                      <>
                        <FaPlus className="h-4 w-4 mr-2" />
                        {t('servicesPage.notConfigured')}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-4">
                    {!isConfigured ? (
                      <div className="space-y-3">
                        <button
                          onClick={() => handleConfigureWithSteps(service.serviceType)}
                          className="w-full text-blue-900 px-6 py-4 rounded-xl font-semibold hover:opacity-90 transition-all duration-300 flex items-center justify-center shadow-lg transform hover:scale-105"
                          style={{ background: 'linear-gradient(135deg, rgb(238, 244, 255) 0%, rgb(231, 240, 255) 35%, rgb(245, 249, 255) 100%)' }}
                        >
                          <FaPlus className="h-5 w-5 mr-3" />
                          {t('servicesPage.configureWithSteps')}
                        </button>
                        <button
                          onClick={() => handleConfigureService(service)}
                          className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:from-gray-200 hover:to-gray-300 transition-all duration-300 flex items-center justify-center shadow-md transform hover:scale-105"
                        >
                          <FaCog className="h-4 w-4 mr-2" />
                          {t('servicesPage.quickConfigure')}
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled
                        className="w-full bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 px-6 py-4 rounded-xl font-semibold cursor-not-allowed flex items-center justify-center shadow-md"
                      >
                        <FaCheck className="h-5 w-5 mr-3" />
                        {t('servicesPage.alreadyConfigured')}
                      </button>
                    )}

                    {service.documentationUrl && (
                      <a
                        href={service.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-6 py-4 rounded-xl font-semibold hover:from-gray-200 hover:to-gray-300 transition-all duration-300 flex items-center justify-center text-sm shadow-md transform hover:scale-105"
                      >
                        <FaEye className="h-5 w-5 mr-3" />
                        {t('servicesPage.documentation')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Service Details Modal */}
      {showDetailsModal && selectedUserService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedUserService.serviceDisplayName} {t('servicesPage.detailsTitleSuffix')}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Service Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{t('servicesPage.serviceInformation')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('servicesPage.serviceType')}</p>
                      <p className="text-sm text-gray-900">{selectedUserService.serviceType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('servicesPage.status')}</p>
                      <div className="flex items-center">
                        {getStatusIcon(selectedUserService.connectionStatus)}
                        <span className="ml-2 text-sm text-gray-900">{selectedUserService.connectionStatus}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('servicesPage.enabled')}</p>
                      <p className="text-sm text-gray-900">
                        {selectedUserService.isEnabled ? t('servicesPage.yes') : t('servicesPage.no')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('servicesPage.configuredLabel')}</p>
                      <p className="text-sm text-gray-900">
                        {selectedUserService.isConfigured ? t('servicesPage.yes') : t('servicesPage.no')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configuration */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{t('servicesPage.configuration')}</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedUserService.configuration, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Timestamps */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{t('servicesPage.timestamps')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('servicesPage.created')}</p>
                      <p className="text-sm text-gray-900">{formatDate(selectedUserService.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('servicesPage.lastUpdated')}</p>
                      <p className="text-sm text-gray-900">{formatDate(selectedUserService.updatedAt)}</p>
                    </div>
                    {selectedUserService.lastConnectionTest && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">{t('servicesPage.lastConnectionTest')}</p>
                        <p className="text-sm text-gray-900">{formatDate(selectedUserService.lastConnectionTest)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {selectedUserService.connectionErrorMessage && (
                  <div>
                    <h3 className="text-lg font-medium text-red-900 mb-4">{t('servicesPage.errorMessage')}</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-700">{selectedUserService.connectionErrorMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {t('servicesPage.configureTitle', { name: selectedService.serviceDisplayName })}
                </h2>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitConfiguration} className="p-6">
              {selectedService.documentationUrl && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-blue-900">{t('servicesPage.needHelp')}</h3>
                      <p className="text-sm text-blue-700">{t('servicesPage.needHelpBody')}</p>
                    </div>
                    <a
                      href={selectedService.documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      {t('servicesPage.viewDocs')}
                    </a>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Required Fields */}
                {selectedService.requiredFields.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('servicesPage.requiredConfiguration')}</h3>
                    <div className="space-y-4">
                      {selectedService.requiredFields.map((field) => (
                        <div key={field.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              required={field.required}
                              value={formData[field.name] || field.defaultValue || ''}
                              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={4}
                              placeholder={
                                field.placeholder ||
                                t('servicesPage.placeholderEnter', { field: field.label.toLowerCase() })
                              }
                            />
                          ) : field.type === 'select' ? (
                            <select
                              required={field.required}
                              value={formData[field.name] || field.defaultValue || ''}
                              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">
                                {field.placeholder ||
                                  t('servicesPage.placeholderSelect', { field: field.label.toLowerCase() })}
                              </option>
                              {field.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type}
                              required={field.required}
                              value={formData[field.name] || ''}
                              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder={
                                field.placeholder ||
                                t('servicesPage.placeholderEnter', { field: field.label.toLowerCase() })
                              }
                            />
                          )}
                          {field.description && (
                            <p className="mt-1 text-sm text-gray-500">{field.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optional Fields */}
                {selectedService.optionalFields.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('servicesPage.optionalConfiguration')}</h3>
                    <div className="space-y-4">
                      {selectedService.optionalFields.map((field) => (
                        <div key={field.name}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {field.label}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={formData[field.name] || field.defaultValue || ''}
                              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={3}
                              placeholder={
                                field.placeholder ||
                                t('servicesPage.placeholderEnter', { field: field.label.toLowerCase() })
                              }
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={formData[field.name] || field.defaultValue || ''}
                              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">
                                {field.placeholder ||
                                  t('servicesPage.placeholderSelect', { field: field.label.toLowerCase() })}
                              </option>
                              {field.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type}
                              value={formData[field.name] || ''}
                              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder={
                                field.placeholder ||
                                t('servicesPage.placeholderEnter', { field: field.label.toLowerCase() })
                              }
                            />
                          )}
                          {field.description && (
                            <p className="mt-1 text-sm text-gray-500">{field.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  {t('servicesPage.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isConfiguring}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center"
                >
                  {isConfiguring ? (
                    <LoadingSpinner size="sm" text={t('servicesPage.configuring')} />
                  ) : (
                    t('servicesPage.configureService')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;
