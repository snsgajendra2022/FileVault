# WhatsApp Plugin Module Design

## Overview

A standalone WhatsApp integration module that can be imported into any JavaScript/TypeScript or React project, encapsulating all WhatsApp functionality including QR login, messaging, file sending, and OM AI integration.

## Architecture

### Module Structure
```
whatsapp-plugin/
├── src/
│   ├── index.ts                 # Main export
│   ├── types.ts                 # TypeScript interfaces
│   ├── core/
│   │   ├── WhatsAppClient.ts    # Main client class
│   │   ├── ConnectionManager.ts # Handles connection state & reconnection
│   │   └── EventEmitter.ts      # Internal event system
│   ├── services/
│   │   ├── AuthService.ts       # QR login/authentication
│   │   ├── MessageService.ts    # Send/receive messages
│   │   ├── FileService.ts       # Send/receive files/media
│   │   └── StatusService.ts     # Connection/health status
│   ├── config/
│   │   ├── Config.ts            # Configuration management
│   │   └── defaults.ts          # Default configuration
│   └── utils/
│       ├── logger.ts            # Logging utility
│       └── helpers.ts           # Helper functions
├── dist/                        # Compiled output
├── examples/
│   └── basic-usage.js           # Usage example
├── package.json
├── tsconfig.json
└── README.md
```

## API Interface

### Core Client Class

```typescript
class WhatsAppPlugin {
  constructor(config?: WhatsAppPluginConfig);
  
  // Connection methods
  async connect(): Promise<boolean>;
  async disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Authentication
  async startQRLogin(): Promise<{ qrCode: string; message: string }>;
  async waitForQRScan(): Promise<boolean>;
  async logout(): Promise<void>;
  
  // Messaging
  async sendMessage(to: string, text: string): Promise<MessageResponse>;
  async sendFile(to: string, file: File | Buffer, caption?: string): Promise<MessageResponse>;
  
  // Status & Events
  getStatus(): WhatsAppStatus;
  on(event: WhatsAppEvent, listener: Function): void;
  off(event: WhatsAppEvent, listener: Function): void;
  
  // Multi-tenant support
  static createInstance(tenantId: string, config?: WhatsAppPluginConfig): WhatsAppPlugin;
}
```

### Configuration

```typescript
interface WhatsAppPluginConfig {
  apiEndpoint?: string;
  websocketEndpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  verifyToken?: string;
  sessionStorage?: any;
  sessionPath?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  logger?: any;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  tenantId?: string;
  omApiEndpoint?: string;
  omApiToken?: string;
}
```

### Events

| Event | Description |
|-------|-------------|
| `connected` | Connection established |
| `disconnected` | Connection lost |
| `reconnected` | Successfully reconnected (param: attempt number) |
| `qr-code` | QR code for login (param: { qrCode, message }) |
| `message` | Inbound message received |
| `message-sent` | Outbound message sent (param: messageId) |
| `message-delivered` | Delivery confirmation (param: messageId) |
| `message-read` | Read receipt (param: messageId) |
| `error` | Error occurred (param: Error) |
| `status-update` | Status changed |
| `session-save` | Session persisted |
| `session-load` | Session restored |

### Types

```typescript
interface WhatsAppStatus {
  connected: boolean;
  authenticated: boolean;
  phoneNumber?: string;
  tenantId?: string;
  lastConnectedAt?: Date;
  lastError?: string | null;
  reconnectAttempts: number;
}

interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}
```

## Implementation Approach

### 1. Core Architecture
- **ConnectionManager**: Handles WebSocket/HTTP connections, heartbeat, reconnection logic
- **AuthService**: Manages QR code generation, authentication flow, session persistence
- **MessageService**: Handles sending/receiving messages via WhatsApp Business API
- **FileService**: Manages media upload/download, file type validation
- **StatusService**: Provides real-time status updates and health checks

### 2. Multi-Tenant Support
Each plugin instance is isolated by:
- Tenant ID in configuration
- Separate session storage (localStorage keys, file paths, etc.)
- Independent connection pools
- Isolated event emitters

### 3. Environment Configuration
Supports multiple configuration sources (priority order):
1. Constructor config object (highest priority)
2. Environment variables (`WHATSAPP_PLUGIN_*`)
3. Default values (lowest priority)

### 4. Auto-reconnect & Error Handling
- Exponential backoff reconnection
- Connection health checks (ping/pong)
- Error categorization and retry logic
- Graceful degradation when offline
- Comprehensive error reporting via events

### 5. Session Persistence
- Automatic session saving on state changes
- Manual session save/load methods
- Support for various storage mechanisms:
  - Browser: localStorage, sessionStorage, IndexedDB
  - Node.js: File system, Redis, database
  - Custom: Developer-provided storage adapter

## Integration with Existing Codebase

The plugin is designed to work with the existing Filevault/OpenClaw infrastructure:

- **OpenClaw Gateway**: The plugin can use the gateway client from `server/openclaw-gateway-client.js` for real WhatsApp operations
- **OM AI Integration**: Optional `omApiEndpoint` and `omApiToken` config for Filevault OM tools
- **Relay Plugin**: Compatible with the existing `om-whatsapp-relay` OpenClaw extension

## Development Roadmap

1. ✅ Core connection and authentication
2. ✅ Messaging capabilities (text, media)
3. ✅ Multi-tenant isolation
4. ✅ Configuration system
5. ✅ Auto-reconnect and error handling
6. ✅ Session persistence
7. ✅ Documentation and examples
8. ⬜ Real WhatsApp API integration (swap simulated calls)
9. ⬜ Webhook listener for inbound messages
10. ⬜ React hook (`useWhatsApp`)
11. ⬜ npm publishing
