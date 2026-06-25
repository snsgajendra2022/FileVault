# WhatsApp Plugin

A standalone WhatsApp integration module that can be imported into any JavaScript/TypeScript or React project, encapsulating all WhatsApp functionality including QR login, messaging, file sending, and OM AI integration.

## Features

- ✅ **QR Login**: Easy WhatsApp connection via QR code
- ✅ **Messaging**: Send and receive text messages
- ✅ **File Sharing**: Send images, documents, videos, and audio
- ✅ **Multi-tenant Ready**: Each user/tenant can connect independently
- ✅ **Auto-reconnect**: Automatic reconnection with exponential backoff
- ✅ **Environment Configurable**: Configure via env vars or config object
- ✅ **Event-driven**: Clean API with event listeners
- ✅ **Session Persistence**: Automatic session saving/restoring
- ✅ **Lightweight**: Minimal dependencies, works in browser and Node.js

## Installation

```bash
npm install whatsapp-plugin
# or
yarn add whatsapp-plugin
```

## Usage

### Basic Usage (Browser/React)

```javascript
import { WhatsAppPlugin } from 'whatsapp-plugin';

// Initialize the plugin
const whatsapp = new WhatsAppPlugin({
  apiEndpoint: 'https://your-whatsapp-api.example.com', // Optional - uses defaults
  apiKey: process.env.WHATSAPP_API_KEY,
  apiSecret: process.env.WHATSAPP_API_SECRET,
  autoReconnect: true
});

// Event listeners
whatsapp.on('qr-code', (data) => {
  // Display QR code to user
  document.getElementById('qr-code').src = data.qrCode;
  console.log(data.message); // "Scan this QR code with WhatsApp to connect your device"
});

whatsapp.on('connected', () => {
  console.log('WhatsApp connected!');
});

whatsapp.on('message', (message) => {
  console.log('Received message:', message);
});

whatsapp.on('error', (error) => {
  console.error('WhatsApp error:', error);
});

// Connect to WhatsApp
await whatsapp.connect();

// Send a message
await whatsapp.sendMessage('+1234567890', 'Hello from WhatsApp Plugin!');

// Send a file
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];
await whatsapp.sendFile('+1234567890', file, 'Check out this photo!');

// Get connection status
const status = whatsapp.getStatus();
console.log('Connection status:', status);

// Disconnect when done
// await whatsapp.disconnect();
```

### Multi-tenant Usage

```javascript
import { WhatsAppPlugin } from 'whatsapp-plugin';

// Tenant A
const tenantAWhatsApp = WhatsAppPlugin.createInstance('tenant-a', {
  apiKey: process.env.TENA_A_WHATSAPP_KEY,
  apiSecret: process.env.TENA_A_WHATSAPP_SECRET,
  sessionPath: './sessions/tenant-a'
});

// Tenant B
const tenantBWhatsApp = WhatsAppPlugin.createInstance('tenant-b', {
  apiKey: process.env.TENA_B_WHATSAPP_KEY,
  apiSecret: process.env.TENA_B_WHATSAPP_SECRET,
  sessionPath: './sessions/tenant-b'
});

// Both can operate independently
await Promise.all([
  tenantAWhatsApp.connect(),
  tenantBWhatsApp.connect()
]);
```

### React Hook

```javascript
import { useEffect, useState } from 'react';
import { WhatsAppPlugin } from 'whatsapp-plugin';

function useWhatsApp(config) {
  const [whatsapp, setWhatsApp] = useState(null);
  const [status, setStatus] = useState({ connected: false });

  useEffect(() => {
    const instance = new WhatsAppPlugin(config);
    setWhatsApp(instance);
    
    instance.on('status-update', (status) => {
      setStatus(status);
    });
    
    return () => {
      instance.disconnect();
    };
  }, [config]);
  
  return { whatsapp, status };
}
```

## Configuration

The plugin can be configured via constructor options or environment variables:

### Constructor Options

```javascript
const whatsapp = new WhatsAppPlugin({
  apiEndpoint: 'https://whatsapp-business-api.example.com',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  verifyToken: 'your-webhook-verify-token',
  autoReconnect: true,
  reconnectInterval: 5000, // 5 seconds
  maxReconnectAttempts: 10,
  logLevel: 'info',
  tenantId: 'unique-tenant-id'
});
```

### Environment Variables

```
WHATSAPP_PLUGIN_API_ENDPOINT=https://whatsapp-business-api.example.com
WHATSAPP_PLUGIN_API_KEY=your-api-key
WHATSAPP_PLUGIN_API_SECRET=your-api-secret
WHATSAPP_PLUGIN_AUTO_RECONNECT=true
WHATSAPP_PLUGIN_RECONNECT_INTERVAL=5000
WHATSAPP_PLUGIN_LOG_LEVEL=info
WHATSAPP_PLUGIN_TENANT_ID=unique-tenant-id
```

## Events

The plugin emits the following events:

- `connected`: Emitted when connection is established
- `disconnected`: Emitted when connection is lost
- `reconnected`: Emitted after successful reconnection (param: attempt number)
- `qr-code`: Emitted when starting QR login (param: { qrCode, message })
- `message`: Emitted when receiving a message
- `message-sent`: Emitted when a message is sent successfully (param: messageId)
- `error`: Emitted when an error occurs (param: Error object)
- `status-update`: Emitted when connection status changes
- `session-save`: Emitted when session is saved
- `session-load`: Emitted when session is loaded

## API Reference

### `new WhatsAppPlugin(config?)`
Create a new WhatsApp plugin instance.

### `await whatsapp.connect()`
Connect to WhatsApp service. Returns boolean indicating success.

### `await whatsapp.disconnect()`
Disconnect from WhatsApp service.

### `whatsapp.isConnected()`
Check if currently connected to WhatsApp.

### `await whatsapp.startQRLogin()`
Start QR login process. Returns `{ qrCode, message }`.

### `await whatsapp.waitForQRScan()`
Wait for QR code to be scanned. Returns boolean indicating success.

### `await whatsapp.logout()`
Logout from WhatsApp.

### `await whatsapp.sendMessage(to, text)`
Send a text message. Returns `MessageResponse`.

### `await whatsapp.sendFile(to, file, caption?)`
Send a file/media. Returns `MessageResponse`.

### `whatsapp.getStatus()`
Get current connection status.

### `whatsapp.on(event, listener)`
Register an event listener.

### `whatsapp.off(event, listener)`
Remove an event listener.

### `WhatsAppPlugin.createInstance(tenantId, config)`
Create a tenant-isolated instance.

## MessageResponse Interface

```typescript
interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}
```

## WhatsAppStatus Interface

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
```

## Requirements

- Modern browser or Node.js 14+
- WhatsApp Business API access or OpenClaw gateway
- HTTP/HTTPS connectivity

## License

MIT

## Examples

See the `examples/` directory for more detailed usage examples.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For support, please open an issue on the GitHub repository.