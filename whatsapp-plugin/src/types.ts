// WhatsApp Plugin Types
export interface WhatsAppPluginConfig {
  // Connection settings
  apiEndpoint?: string;
  websocketEndpoint?: string;
  
  // Authentication
  apiKey?: string;
  apiSecret?: string;
  verifyToken?: string;
  
  // Session management
  sessionStorage?: any;
  sessionPath?: string;
  
  // Behavior
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  
  // Logging
  logger?: any;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  
  // Multi-tenant
  tenantId?: string;
  
  // OM AI Integration (optional)
  omApiEndpoint?: string;
  omApiToken?: string;
}

export interface WhatsAppStatus {
  connected: boolean;
  authenticated: boolean;
  phoneNumber?: string;
  tenantId?: string;
  lastConnectedAt?: Date;
  lastError?: string | null;
  reconnectAttempts: number;
}

export interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface WhatsAppEventMap {
  connected: (status: WhatsAppStatus) => void;
  disconnected: (error: string | null) => void;
  reconnected: (attempt: number) => void;
  'qr-code': (data: { qrCode: string; message: string }) => void;
  message: (message: any) => void;
  'message-sent': (messageId: string) => void;
  'message-delivered': (messageId: string) => void;
  'message-read': (messageId: string) => void;
  error: (error: Error) => void;
  'status-update': (status: WhatsAppStatus) => void;
  'session-save': () => void;
  'session-load': () => void;
}

export type WhatsAppEvent = keyof WhatsAppEventMap;