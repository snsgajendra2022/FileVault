import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  FaCheck, 
  FaUpload, 
  FaExclamationTriangle,
  FaArrowLeft,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import servicesData from '../../data/services.json';

interface ServiceConfigPageProps {}

interface SetupStep {
  step: number;
  title: string;
  description: string;
  action: string;
  details: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  popular: boolean;
  features: string[];
  setupSteps: SetupStep[];
  requirements: string[];
  troubleshooting: Array<{
    issue: string;
    solution: string;
  }>;
}

const ServiceConfigPage: React.FC<ServiceConfigPageProps> = () => {
  const { t } = useTranslation();
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [configData, setConfigData] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (serviceId) {
      // Try to find the service with exact match first
      let foundService = servicesData.services.find(s => s.id === serviceId);
      
      // If not found, try case-insensitive match
      if (!foundService) {
        foundService = servicesData.services.find(s => s.id.toLowerCase() === serviceId.toLowerCase());
      }
      
      // If still not found, try to find by name
      if (!foundService) {
        foundService = servicesData.services.find(s => s.name.toLowerCase().includes(serviceId.toLowerCase()));
      }
      
      setService(foundService || null);
    }
  }, [serviceId]);

  const handleStepComplete = (stepIndex: number) => {
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps([...completedSteps, stepIndex]);
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfigData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      handleStepComplete(5); // Complete the upload step
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const openImageModal = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setIsModalOpen(false);
  };

  const handleSaveConfiguration = async () => {
    setIsConfiguring(true);
    try {
      // Here you would save the configuration to your backend
      console.log('Saving configuration:', configData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate back to services page
      navigate('/services');
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setIsConfiguring(false);
    }
  };

  const getProgressPercentage = () => {
    if (!service) return 0;
    return (completedSteps.length / service.setupSteps.length) * 100;
  };

  const isStepCompleted = (stepIndex: number) => {
    return completedSteps.includes(stepIndex);
  };

  const canProceedToNext = (stepIndex: number) => {
    // Add logic to check if current step can be completed
    return true;
  };

  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <FaExclamationTriangle className="h-4 w-4 text-red-500 mr-2" />
            <span className="text-red-700">
              {t('serviceConfigPage.notFound')}
            </span>
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">{t('serviceConfigPage.availableServices')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {servicesData.services.map((s) => (
                <div key={s.id} className="text-sm text-blue-700">
                  • {s.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/services')}
            className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
          >
            <FaArrowLeft className="h-4 w-4 mr-2" />
            {t('serviceConfigPage.backToServices')}
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: service.color }}
            >
              {service.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{service.name}</h1>
              <p className="text-gray-600">{service.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  {service.category}
                </span>
                {service.popular && (
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                    {t('serviceConfigPage.popular')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {t('serviceConfigPage.setupProgress')}
              </span>
              <span className="text-sm text-gray-500">
                {t('serviceConfigPage.stepsCompleted', {
                  completed: completedSteps.length,
                  total: service.setupSteps.length
                })}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Setup Steps */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">i</span>
                  {t('serviceConfigPage.setupSteps')}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {service.setupSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isStepCompleted(index)
                        ? 'border-green-200 bg-green-50'
                        : currentStep === index
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {isStepCompleted(index) ? (
                          <FaCheck className="h-6 w-6 text-green-500" />
                        ) : (
                          <span className="w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center text-gray-400 text-xs">○</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {t('serviceConfigPage.stepHeading', { step: step.step, title: step.title })}
                          </h3>
                          {isStepCompleted(index) && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              {t('serviceConfigPage.completed')}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{step.description}</p>
                        <div className="bg-gray-50 p-3 rounded-md mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">{t('serviceConfigPage.actionRequired')}</p>
                          <p className="text-sm text-gray-600">{step.action}</p>
                        </div>
                        <p className="text-sm text-gray-500">{step.details}</p>
                        
                        {/* Special handling for different steps - Only for Google Drive */}
                        {service.id === 'google-drive' && step.step === 1 && (
                          <div className="mt-3">
                            <button
                              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors flex items-center"
                              onClick={() => window.open('https://console.cloud.google.com', '_blank')}
                            >
                              <span className="mr-2">🔗</span>
                              {t('serviceConfigPage.openGoogleCloudConsole')}
                            </button>
                            <div className="mt-3">
                              <img 
                                src="/drive-service-connect-images/Click get start.png" 
                                alt="Google Cloud Console - Get Started"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImageModal("/drive-service-connect-images/Click get start.png")}
                              />
                            </div>
                          </div>
                        )}
                        
                        {service.id === 'google-drive' && step.step === 2 && (
                          <div className="mt-3">
                            <div className="bg-blue-50 p-3 rounded-md mb-3">
                              <p className="text-sm text-blue-700">
                                <strong>Tip:</strong> {t('serviceConfigPage.tipNoProject')}
                              </p>
                            </div>
                            <img 
                              src="/drive-service-connect-images/project configuration complte.png" 
                              alt="Project Configuration Complete"
                              className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openImageModal("/drive-service-connect-images/project configuration complte.png")}
                            />
                          </div>
                        )}
                        
                        {service.id === 'google-drive' && step.step === 3 && (
                          <div className="mt-3">
                            <div className="space-y-3">
                              <img 
                                src="/drive-service-connect-images/Drive-library-select.png" 
                                alt="Select Google Drive API from Library"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImageModal("/drive-service-connect-images/Drive-library-select.png")}
                              />
                              <img 
                                src="/drive-service-connect-images/Select Google drive api.png" 
                                alt="Select Google Drive API"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImageModal("/drive-service-connect-images/Select Google drive api.png")}
                              />
                              <img 
                                src="/drive-service-connect-images/Enable google drive api .png" 
                                alt="Enable Google Drive API"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImageModal("/drive-service-connect-images/Enable google drive api .png")}
                              />
                            </div>
                          </div>
                        )}
                        
                        {service.id === 'google-drive' && step.step === 4 && (
                          <div className="mt-3">
                            <div className="space-y-3">
                              <img 
                                src="/drive-service-connect-images/select credentials and create.png" 
                                alt="Select Credentials and Create"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImageModal("/drive-service-connect-images/select credentials and create.png")}
                              />
                              <img 
                                src="/drive-service-connect-images/create Auth clients.png" 
                                alt="Create Auth Clients"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImageModal("/drive-service-connect-images/create Auth clients.png")}
                              />
                              <img 
                                src="/drive-service-connect-images/Click OAuth client ID.png" 
                                alt="Click OAuth Client ID"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImageModal("/drive-service-connect-images/Click OAuth client ID.png")}
                              />
                            </div>
                          </div>
                        )}
                        
                        {service.id === 'google-drive' && step.step === 5 && (
                          <div className="mt-3">
                            <div className="space-y-3">
                              <img 
                                src="/drive-service-connect-images/click configure consent screen.png" 
                                alt="Configure OAuth Consent Screen"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImageModal("/drive-service-connect-images/click configure consent screen.png")}
                              />
                              <img 
                                src="/drive-service-connect-images/create Audience and added users .png" 
                                alt="Create Audience and Added Users"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImageModal("/drive-service-connect-images/create Audience and added users .png")}
                              />
                            </div>
                          </div>
                        )}
                        
                        {service.id === 'google-drive' && step.step === 6 && (
                          <div className="mt-3">
                            <div className="bg-yellow-50 p-3 rounded-md mb-3">
                              <p className="text-sm text-yellow-700">
                                {t('serviceConfigPage.importantRedirect')}{' '}
                                <code className="bg-yellow-100 px-1 rounded">https://filevault.mytiny.us/api/drive/oauth/callback</code>
                              </p>
                            </div>
                            <img 
                              src="/drive-service-connect-images/Create OAuth client ID for Web.png" 
                              alt="Create OAuth Client ID for Web"
                              className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openImageModal("/drive-service-connect-images/Create OAuth client ID for Web.png")}
                            />
                          </div>
                        )}
                        
                        {service.id === 'google-drive' && step.step === 7 && (
                          <div className="mt-3">
                            <div className="bg-green-50 p-3 rounded-md mb-3">
                              <p className="text-sm text-green-700 mb-2">
                                {t('serviceConfigPage.successOAuth')}
                              </p>
                              <p className="text-xs text-green-600">
                                {t('serviceConfigPage.useCredentialsBelow')}
                              </p>
                            </div>
                            <div className="space-y-3">
                              <img 
                                src="/drive-service-connect-images/OAuth Client Created Successfully Downloadded json file.png" 
                                alt="OAuth Client Created Successfully"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => openImageModal("/drive-service-connect-images/OAuth Client Created Successfully Downloadded json file.png")}
                              />
                              <div className="bg-blue-50 p-3 rounded-md">
                                <p className="text-sm text-blue-700 mb-2">
                                  {t('serviceConfigPage.nextCopyCredentials')}
                                </p>
                                <p className="text-xs text-blue-600">
                                  {t('serviceConfigPage.findOAuthDetails')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {!isStepCompleted(index) && canProceedToNext(index) && (
                          <button
                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                            onClick={() => handleStepComplete(index)}
                          >
                            {t('serviceConfigPage.markComplete')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Setup Images Gallery */}
            {service.id === 'google-drive' && (
              <div className="bg-white rounded-lg shadow-md mt-6">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">{t('serviceConfigPage.completeGuideTitle')}</h3>
                  <p className="text-sm text-gray-600 mt-1">{t('serviceConfigPage.clickImageFullSize')}</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Step 1 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{t('serviceConfigPage.galleryStep1')}</h4>
                      <img 
                        src="/drive-service-connect-images/Click get start.png" 
                        alt="Google Cloud Console - Get Started"
                        className="w-full rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal("/drive-service-connect-images/Click get start.png")}
                      />
                    </div>

                    {/* Step 2 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{t('serviceConfigPage.galleryStep2')}</h4>
                      <img 
                        src="/drive-service-connect-images/project configuration complte.png" 
                        alt="Project Configuration Complete"
                        className="w-full rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal("/drive-service-connect-images/project configuration complte.png")}
                      />
                    </div>

                    {/* Step 3 - Image 1 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{t('serviceConfigPage.galleryStep3a')}</h4>
                      <img 
                        src="/drive-service-connect-images/Drive-library-select.png" 
                        alt="Select Google Drive API from Library"
                        className="w-full rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal("/drive-service-connect-images/Drive-library-select.png")}
                      />
                    </div>

                    {/* Step 3 - Image 2 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{t('serviceConfigPage.galleryStep3b')}</h4>
                      <img 
                        src="/drive-service-connect-images/Select Google drive api.png" 
                        alt="Select Google Drive API"
                        className="w-full rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal("/drive-service-connect-images/Select Google drive api.png")}
                      />
                    </div>

                    {/* Step 3 - Image 3 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{t('serviceConfigPage.galleryStep3c')}</h4>
                      <img 
                        src="/drive-service-connect-images/Enable google drive api .png" 
                        alt="Enable Google Drive API"
                        className="w-full rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal("/drive-service-connect-images/Enable google drive api .png")}
                      />
                    </div>

                    {/* Step 4 - Image 1 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{t('serviceConfigPage.galleryStep4a')}</h4>
                      <img 
                        src="/drive-service-connect-images/select credentials and create.png" 
                        alt="Select Credentials and Create"
                        className="w-full rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal("/drive-service-connect-images/select credentials and create.png")}
                      />
                    </div>

                    {/* Step 4 - Image 2 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{t('serviceConfigPage.galleryStep4b')}</h4>
                      <img 
                        src="/drive-service-connect-images/create Auth clients.png" 
                        alt="Create Auth Clients"
                        className="w-full rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal("/drive-service-connect-images/create Auth clients.png")}
                      />
                    </div>

                    {/* Step 4 - Image 3 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{t('serviceConfigPage.galleryStep4c')}</h4>
                      <img 
                        src="/drive-service-connect-images/Click OAuth client ID.png" 
                        alt="Click OAuth Client ID"
                        className="w-full rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal("/drive-service-connect-images/Click OAuth client ID.png")}
                      />
                    </div>

                    {/* Step 5 - Image 1 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{t('serviceConfigPage.galleryStep5a')}</h4>
                      <img 
                        src="/drive-service-connect-images/click configure consent screen.png" 
                        alt="Configure OAuth Consent Screen"
                        className="w-full rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal("/drive-service-connect-images/click configure consent screen.png")}
                      />
                    </div>

                    {/* Step 5 - Image 2 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{t('serviceConfigPage.galleryStep5b')}</h4>
                      <img 
                        src="/drive-service-connect-images/create Audience and added users .png" 
                        alt="Create Audience and Added Users"
                        className="w-full rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal("/drive-service-connect-images/create Audience and added users .png")}
                      />
                    </div>

                    {/* Step 6 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{t('serviceConfigPage.galleryStep6')}</h4>
                      <img 
                        src="/drive-service-connect-images/Create OAuth client ID for Web.png" 
                        alt="Create OAuth Client ID for Web"
                        className="w-full rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal("/drive-service-connect-images/Create OAuth client ID for Web.png")}
                      />
                    </div>

                    {/* Step 7 */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{t('serviceConfigPage.galleryStep7')}</h4>
                      <img 
                        src="/drive-service-connect-images/OAuth Client Created Successfully Downloadded json file.png" 
                        alt="OAuth Client Created Successfully"
                        className="w-full rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageModal("/drive-service-connect-images/OAuth Client Created Successfully Downloadded json file.png")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fallback configuration form for any service without specific form */}
            {service && !['google-drive', 'dropbox', 'onedrive', 'aws-s3', 'github', 'backblaze-b2', 'azure-blob'].includes(service.id) && (
              <div className="bg-white rounded-lg shadow-md mt-6">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{t('serviceConfigPage.configureService', { name: service.name })}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{t('serviceConfigPage.needHelp')}</span>
                      <button type="button" className="text-sm text-blue-600 hover:text-blue-800 underline">
                        {t('serviceConfigPage.checkDocumentation')}
                      </button>
                      <button type="button" className="text-sm text-blue-600 hover:text-blue-800 underline">
                        {t('serviceConfigPage.viewDocs')}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <FaExclamationTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">{t('serviceConfigPage.configUnavailableTitle')}</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          {t('serviceConfigPage.configUnavailableBody', { name: service.name })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">{t('serviceConfigPage.manualConfiguration')}</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('serviceConfigPage.manualConfigurationDesc', { name: service.name })}
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('serviceConfigPage.configurationData')}
                        </label>
                        <textarea
                          value={configData.manualConfig || ''}
                          onChange={(e) => handleConfigChange('manualConfig', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={4}
                          placeholder={t('serviceConfigPage.placeholderManualConfig')}
                        />
                        <p className="text-xs text-gray-500 mt-1">{t('serviceConfigPage.hintConfigFormat')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Features */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{t('serviceConfigPage.features')}</h3>
              </div>
              <div className="p-6">
                <ul className="space-y-2">
                  {service.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <FaCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{t('serviceConfigPage.requirements')}</h3>
              </div>
              <div className="p-6">
                <ul className="space-y-2">
                  {service.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <span className="w-4 h-4 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-500 text-xs flex-shrink-0">●</span>
                      <span>{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{t('serviceConfigPage.troubleshooting')}</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {/* API not enabled */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('serviceConfigPage.troubleApiTitle')}</h4>
                    <p className="text-sm text-gray-600">
                      {t('serviceConfigPage.troubleApiBody')}
                    </p>
                  </div>

                  {/* Invalid Client ID or Secret */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('serviceConfigPage.troubleInvalidTitle')}</h4>
                    <p className="text-sm text-gray-600">
                      {t('serviceConfigPage.troubleInvalidBody')}
                    </p>
                  </div>

                  {/* Redirect URI mismatch - Highlighted */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('serviceConfigPage.troubleRedirectTitle')}</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {t('serviceConfigPage.troubleRedirectBody')}
                    </p>
                    <div className="bg-blue-100 px-3 py-2 rounded-md border border-blue-200">
                      <code className="text-sm font-mono text-blue-800">
                        https://filevault.mytiny.us/api/drive/oauth/callback
                      </code>
                    </div>
                  </div>

                  {/* OAuth consent screen not configured */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('serviceConfigPage.troubleConsentTitle')}</h4>
                    <p className="text-sm text-gray-600">
                      {t('serviceConfigPage.troubleConsentBody')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Configuration */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6">
                <button
                  onClick={handleSaveConfiguration}
                  disabled={isConfiguring || completedSteps.length < service.setupSteps.length}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isConfiguring ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('serviceConfigPage.creatingService')}
                    </>
                  ) : (
                    t('serviceConfigPage.createService')
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {t('serviceConfigPage.completeAllSteps')}
                </p>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  {t('serviceConfigPage.createConnectionHint')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {isModalOpen && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={closeImageModal}>
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={closeImageModal}
              className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedImage}
              alt={t('serviceConfigPage.fullSizeAlt')}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceConfigPage;
