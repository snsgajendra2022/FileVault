export type ServiceType = 'S3' | 'B2' | 'GOOGLE_DRIVE';

export interface ServiceForm {
  serviceType: ServiceType;
  serviceDisplayName: string;
  description: string;
  requiredFields: FormField[];
  optionalFields: FormField[];
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  description?: string;
  options?: string[];
}

export interface ServiceSubscription {
  id: number;
  serviceType: ServiceType;
  isConfigured: boolean;
  isEnabled: boolean;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'FAILED';
  lastTested: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserServicesResponse {
  summary: {
    totalSubscriptions: number;
    enabledSubscriptions: number;
    connectedServices: number;
    failedConnections: number;
  };
  subscriptions: ServiceSubscription[];
}

export interface S3Configuration {
  accessKey: string;
  secretKey: string;
  bucketName: string;
  region: string;
  endpoint?: string;
}

export interface B2Configuration {
  applicationKeyId: string;
  applicationKey: string;
  bucketName: string;
  bucketId: string;
}

export interface GoogleDriveConfiguration {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId?: string;
}
