import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaCheck, 
  FaUpload, 
  FaExclamationTriangle,
  FaArrowLeft,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import servicesData from '../data/services.json';

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
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [configData, setConfigData] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);

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
              Service not found. Please check the URL and try again.
            </span>
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Available Services:</h3>
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
            Back to Services
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
                    Popular
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Setup Progress
              </span>
              <span className="text-sm text-gray-500">
                {completedSteps.length} of {service.setupSteps.length} steps completed
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
                  Setup Steps
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
                            Step {step.step}: {step.title}
                          </h3>
                          {isStepCompleted(index) && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{step.description}</p>
                        <div className="bg-gray-50 p-3 rounded-md mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Action Required:</p>
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
                              Open Google Cloud Console
                            </button>
                            <div className="mt-3">
                              <img 
                                src="/drive-service-connect-images/Click get start.png" 
                                alt="Google Cloud Console - Get Started"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm"
                              />
                            </div>
                          </div>
                        )}
                        
                        {service.id === 'google-drive' && step.step === 2 && (
                          <div className="mt-3">
                            <div className="bg-blue-50 p-3 rounded-md mb-3">
                              <p className="text-sm text-blue-700">
                                <strong>Tip:</strong> If you don't have a project, click "New Project" and follow the setup wizard.
                              </p>
                            </div>
                            <img 
                              src="/drive-service-connect-images/project configuration complte.png" 
                              alt="Project Configuration Complete"
                              className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm"
                            />
                          </div>
                        )}
                        
                        {service.id === 'google-drive' && step.step === 3 && (
                          <div className="mt-3">
                            <div className="space-y-3">
                              <img 
                                src="/drive-service-connect-images/Drive-library-select.png" 
                                alt="Select Google Drive API from Library"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm"
                              />
                              <img 
                                src="/drive-service-connect-images/Enable google drive api .png" 
                                alt="Enable Google Drive API"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm"
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
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm"
                              />
                              <img 
                                src="/drive-service-connect-images/Click OAuth client ID.png" 
                                alt="Click OAuth Client ID"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm"
                              />
                            </div>
                          </div>
                        )}
                        
                        {service.id === 'google-drive' && step.step === 5 && (
                          <div className="mt-3">
                            <img 
                              src="/drive-service-connect-images/click configure consent screen.png" 
                              alt="Configure OAuth Consent Screen"
                              className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm"
                            />
                          </div>
                        )}
                        
                        {service.id === 'google-drive' && step.step === 6 && (
                          <div className="mt-3">
                            <div className="bg-yellow-50 p-3 rounded-md mb-3">
                              <p className="text-sm text-yellow-700">
                                <strong>Important:</strong> Make sure to add the exact redirect URI: <code className="bg-yellow-100 px-1 rounded">http://localhost:9090/api/drive/oauth/callback</code>
                              </p>
                            </div>
                            <img 
                              src="/drive-service-connect-images/Create OAuth client ID for Web.png" 
                              alt="Create OAuth Client ID for Web"
                              className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm"
                            />
                          </div>
                        )}
                        
                        {service.id === 'google-drive' && step.step === 7 && (
                          <div className="mt-3">
                            <div className="bg-green-50 p-3 rounded-md mb-3">
                              <p className="text-sm text-green-700 mb-2">
                                <strong>Success!</strong> Your OAuth client has been created. Now copy your Client ID and Client Secret.
                              </p>
                              <p className="text-xs text-green-600">
                                Use these credentials in the configuration form below to complete the setup.
                              </p>
                            </div>
                            <div className="space-y-3">
                              <img 
                                src="/drive-service-connect-images/OAuth Client Created Successfully Downloadded json file.png" 
                                alt="OAuth Client Created Successfully"
                                className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm"
                              />
                              <div className="bg-blue-50 p-3 rounded-md">
                                <p className="text-sm text-blue-700 mb-2">
                                  <strong>Next:</strong> Copy your Client ID and Client Secret from the Google Cloud Console.
                                </p>
                                <p className="text-xs text-blue-600">
                                  You can find these in your OAuth 2.0 Client ID details page.
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
                            Mark as Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuration Form */}
            {service.id === 'google-drive' && (
              <div className="bg-white rounded-lg shadow-md mt-6">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Configure Google Drive</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Need help?</span>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        Check the documentation for setup instructions
                      </button>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        View Docs
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Required Configuration */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Required Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Client ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={configData.clientId || ''}
                          onChange={(e) => handleConfigChange('clientId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your Google OAuth client ID from Google Cloud Console"
                        />
                        <p className="text-xs text-gray-500 mt-1">Your Google OAuth client ID from Google Cloud Console</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Client Secret <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets.clientSecret ? 'text' : 'password'}
                            value={configData.clientSecret || ''}
                            onChange={(e) => handleConfigChange('clientSecret', e.target.value)}
                            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your Google OAuth client secret from Google Cloud Console"
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => toggleSecretVisibility('clientSecret')}
                            >
                              {showSecrets.clientSecret ? (
                                <FaEyeSlash className="h-4 w-4" />
                              ) : (
                                <FaEye className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => copyToClipboard(configData.clientSecret || '')}
                            >
                              <span className="text-sm">📋</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Your Google OAuth client secret from Google Cloud Console</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Redirect URI <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={configData.redirectUri || 'http://localhost:9090/api/drive/oauth/callback'}
                          onChange={(e) => handleConfigChange('redirectUri', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your redirect URI"
                        />
                        <p className="text-xs text-gray-500 mt-1">The redirect URI for OAuth callback (e.g., http://localhost:9090/api/drive/oauth/callback)</p>
                      </div>
                    </div>
                  </div>

                  {/* Optional Configuration */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Optional Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Folder Name
                        </label>
                        <input
                          type="text"
                          value={configData.folderName || 'FileVault'}
                          onChange={(e) => handleConfigChange('folderName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter folder name (default: FileVault)"
                        />
                        <p className="text-xs text-gray-500 mt-1">The folder name in Google Drive</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Share Email
                        </label>
                        <input
                          type="email"
                          value={configData.shareEmail || ''}
                          onChange={(e) => handleConfigChange('shareEmail', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter email to share with"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email address to share the folder with (optional)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {service.id === 'dropbox' && (
              <div className="bg-white rounded-lg shadow-md mt-6">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Configure Dropbox</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Need help?</span>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        Check the documentation for setup instructions
                      </button>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        View Docs
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Required Configuration */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Required Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Access Token <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets.accessToken ? 'text' : 'password'}
                            value={configData.accessToken || ''}
                            onChange={(e) => handleConfigChange('accessToken', e.target.value)}
                            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your Dropbox access token"
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => toggleSecretVisibility('accessToken')}
                            >
                              {showSecrets.accessToken ? (
                                <FaEyeSlash className="h-4 w-4" />
                              ) : (
                                <FaEye className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => copyToClipboard(configData.accessToken || '')}
                            >
                              <span className="text-sm">📋</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Your Dropbox app access token from the App Console</p>
                      </div>
                    </div>
                  </div>

                  {/* Optional Configuration */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Optional Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Folder Name
                        </label>
                        <input
                          type="text"
                          value={configData.folderName || 'FileVault'}
                          onChange={(e) => handleConfigChange('folderName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter folder name (default: FileVault)"
                        />
                        <p className="text-xs text-gray-500 mt-1">The folder name in Dropbox</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {service.id === 'onedrive' && (
              <div className="bg-white rounded-lg shadow-md mt-6">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Configure OneDrive</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Need help?</span>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        Check the documentation for setup instructions
                      </button>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        View Docs
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Required Configuration */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Required Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Client ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={configData.clientId || ''}
                          onChange={(e) => handleConfigChange('clientId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your Azure app registration Client ID"
                        />
                        <p className="text-xs text-gray-500 mt-1">Your Azure app registration Client ID</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Client Secret <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets.clientSecret ? 'text' : 'password'}
                            value={configData.clientSecret || ''}
                            onChange={(e) => handleConfigChange('clientSecret', e.target.value)}
                            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your Azure app registration Client Secret"
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => toggleSecretVisibility('clientSecret')}
                            >
                              {showSecrets.clientSecret ? (
                                <FaEyeSlash className="h-4 w-4" />
                              ) : (
                                <FaEye className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => copyToClipboard(configData.clientSecret || '')}
                            >
                              <span className="text-sm">📋</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Your Azure app registration Client Secret</p>
                      </div>
                    </div>
                  </div>

                  {/* Optional Configuration */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Optional Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Folder Name
                        </label>
                        <input
                          type="text"
                          value={configData.folderName || 'FileVault'}
                          onChange={(e) => handleConfigChange('folderName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter folder name (default: FileVault)"
                        />
                        <p className="text-xs text-gray-500 mt-1">The folder name in OneDrive</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {service.id === 'aws-s3' && (
              <div className="bg-white rounded-lg shadow-md mt-6">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Configure Amazon S3</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Need help?</span>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        Check the documentation for setup instructions
                      </button>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        View Docs
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Required Configuration */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Required Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Access Key ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={configData.accessKeyId || ''}
                          onChange={(e) => handleConfigChange('accessKeyId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your AWS Access Key ID"
                        />
                        <p className="text-xs text-gray-500 mt-1">Your AWS IAM user Access Key ID</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Secret Access Key <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets.secretAccessKey ? 'text' : 'password'}
                            value={configData.secretAccessKey || ''}
                            onChange={(e) => handleConfigChange('secretAccessKey', e.target.value)}
                            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your AWS Secret Access Key"
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => toggleSecretVisibility('secretAccessKey')}
                            >
                              {showSecrets.secretAccessKey ? (
                                <FaEyeSlash className="h-4 w-4" />
                              ) : (
                                <FaEye className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => copyToClipboard(configData.secretAccessKey || '')}
                            >
                              <span className="text-sm">📋</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Your AWS IAM user Secret Access Key</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bucket Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={configData.bucketName || ''}
                          onChange={(e) => handleConfigChange('bucketName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your S3 bucket name"
                        />
                        <p className="text-xs text-gray-500 mt-1">The name of your S3 bucket</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Region <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={configData.region || 'us-east-1'}
                          onChange={(e) => handleConfigChange('region', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="us-east-1">US East (N. Virginia)</option>
                          <option value="us-west-2">US West (Oregon)</option>
                          <option value="eu-west-1">Europe (Ireland)</option>
                          <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">The AWS region where your bucket is located</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {service.id === 'github' && (
              <div className="bg-white rounded-lg shadow-md mt-6">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Configure GitHub</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Need help?</span>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        Check the documentation for setup instructions
                      </button>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        View Docs
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Required Configuration */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Required Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Username <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={configData.username || ''}
                          onChange={(e) => handleConfigChange('username', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your GitHub username"
                        />
                        <p className="text-xs text-gray-500 mt-1">Your GitHub username</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Personal Access Token <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets.personalAccessToken ? 'text' : 'password'}
                            value={configData.personalAccessToken || ''}
                            onChange={(e) => handleConfigChange('personalAccessToken', e.target.value)}
                            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your GitHub Personal Access Token"
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => toggleSecretVisibility('personalAccessToken')}
                            >
                              {showSecrets.personalAccessToken ? (
                                <FaEyeSlash className="h-4 w-4" />
                              ) : (
                                <FaEye className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => copyToClipboard(configData.personalAccessToken || '')}
                            >
                              <span className="text-sm">📋</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Your GitHub Personal Access Token with 'repo' scope</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Repository Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={configData.repositoryName || ''}
                          onChange={(e) => handleConfigChange('repositoryName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your GitHub repository name"
                        />
                        <p className="text-xs text-gray-500 mt-1">The name of your GitHub repository</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {service.id === 'backblaze-b2' && (
              <div className="bg-white rounded-lg shadow-md mt-6">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Configure Backblaze B2</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Need help?</span>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        Check the documentation for setup instructions
                      </button>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        View Docs
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Required Configuration */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Required Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Application Key ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={configData.applicationKeyId || ''}
                          onChange={(e) => handleConfigChange('applicationKeyId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your B2 Application Key ID"
                        />
                        <p className="text-xs text-gray-500 mt-1">Your Backblaze B2 Application Key ID</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Application Key <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets.applicationKey ? 'text' : 'password'}
                            value={configData.applicationKey || ''}
                            onChange={(e) => handleConfigChange('applicationKey', e.target.value)}
                            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your B2 Application Key"
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => toggleSecretVisibility('applicationKey')}
                            >
                              {showSecrets.applicationKey ? (
                                <FaEyeSlash className="h-4 w-4" />
                              ) : (
                                <FaEye className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => copyToClipboard(configData.applicationKey || '')}
                            >
                              <span className="text-sm">📋</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Your Backblaze B2 Application Key</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bucket Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={configData.bucketName || ''}
                          onChange={(e) => handleConfigChange('bucketName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your B2 bucket name"
                        />
                        <p className="text-xs text-gray-500 mt-1">The name of your B2 bucket</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {service.id === 'azure-blob' && (
              <div className="bg-white rounded-lg shadow-md mt-6">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Configure Azure Blob Storage</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Need help?</span>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        Check the documentation for setup instructions
                      </button>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        View Docs
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Required Configuration */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Required Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={configData.accountName || ''}
                          onChange={(e) => handleConfigChange('accountName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your Azure Storage Account Name"
                        />
                        <p className="text-xs text-gray-500 mt-1">Your Azure Storage Account Name</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Access Key <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets.accessKey ? 'text' : 'password'}
                            value={configData.accessKey || ''}
                            onChange={(e) => handleConfigChange('accessKey', e.target.value)}
                            className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your Azure Storage Access Key"
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => toggleSecretVisibility('accessKey')}
                            >
                              {showSecrets.accessKey ? (
                                <FaEyeSlash className="h-4 w-4" />
                              ) : (
                                <FaEye className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              onClick={() => copyToClipboard(configData.accessKey || '')}
                            >
                              <span className="text-sm">📋</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Your Azure Storage Account Access Key</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Container Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={configData.containerName || ''}
                          onChange={(e) => handleConfigChange('containerName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Your Azure Blob Container Name"
                        />
                        <p className="text-xs text-gray-500 mt-1">The name of your Azure Blob container</p>
                      </div>
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
                    <h3 className="text-lg font-semibold text-gray-900">Configure {service.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Need help?</span>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        Check the documentation for setup instructions
                      </button>
                      <button className="text-sm text-blue-600 hover:text-blue-800 underline">
                        View Docs
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <FaExclamationTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">Configuration Form Not Available</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          The configuration form for {service.name} is not yet implemented. Please use the setup steps above to configure this service manually.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Manual Configuration</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Please follow the setup steps above to configure {service.name}. Once you have completed the setup, you can manually enter your configuration details below.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Configuration Data
                        </label>
                        <textarea
                          value={configData.manualConfig || ''}
                          onChange={(e) => handleConfigChange('manualConfig', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={4}
                          placeholder="Enter your configuration data (JSON format recommended)"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter your configuration data in JSON format or as key-value pairs</p>
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
                <h3 className="text-lg font-semibold text-gray-900">Features</h3>
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
                <h3 className="text-lg font-semibold text-gray-900">Requirements</h3>
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
                <h3 className="text-lg font-semibold text-gray-900">Troubleshooting</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {service.troubleshooting.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        {item.issue}
                      </p>
                      <p className="text-sm text-gray-600">
                        {item.solution}
                      </p>
                    </div>
                  ))}
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
                      Creating Service...
                    </>
                  ) : (
                    'Create Service'
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Complete all steps to create and configure your service
                </p>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  This will create the service connection and save your configuration
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceConfigPage;
