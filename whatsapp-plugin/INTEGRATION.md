# OM WhatsApp Plugin — Use in Any Project

This repo is now a **WhatsApp-only** demo app + reusable npm plugin.

## What stayed in this app

| Route | Screen |
|-------|--------|
| `/login` | Login (your backend API via `REACT_APP_API_URL`) |
| `/whatsapp` | WhatsApp connect, QR, messages, OM AI |

All other `src/pages/*` screens were removed.

---

## 1. Run this demo app

```bash
# .env
REACT_APP_API_URL=http://your-backend:9090
REACT_APP_WHATSAPP_API_URL=http://127.0.0.1:9093

npm install
npm start
```

1. Open `http://localhost:3000/login`
2. Sign in with your project account
3. Go to `/whatsapp` → scan QR → connect WhatsApp

---

## 2. Install plugin in another React / Node project

### Option A — copy from this monorepo

```bash
# In your other project
npm install ../web-whatsapp-ai-pulgin/whatsapp-plugin
```

### Option B — after publish

```bash
npm install whatsapp-plugin
```

### Browser / React (HTTP relay)

Point at your OM dev server or API that exposes `/api/whatsapp/*`:

```typescript
import { WhatsAppPlugin } from 'whatsapp-plugin';

const wa = new WhatsAppPlugin({
  apiEndpoint: process.env.REACT_APP_WHATSAPP_API_URL, // e.g. http://127.0.0.1:9093
  tenantId: 'project-a-user-123',  // isolate per SaaS user
  autoReconnect: true,
});

wa.on('qr-code', ({ qrCode }) => {
  // show QR in your UI
});

wa.on('message', (msg) => {
  console.log('Inbound:', msg);
});

await wa.connect();
await wa.startQRLogin();
await wa.waitForQRScan();
await wa.sendMessage('+919876543210', 'Hello from my SaaS app');
```

### Node.js (direct OpenClaw gateway)

When `server/openclaw-gateway-client.js` is available, the plugin auto-uses the real gateway.

```typescript
import { WhatsAppPlugin } from 'whatsapp-plugin';

const wa = WhatsAppPlugin.createInstance('tenant-b', {
  sessionPath: './sessions/tenant-b',
});

await wa.connect();
```

---

## 3. Multi-tenant SaaS pattern

One WhatsApp session per user/project:

```typescript
const sessions = new Map<string, WhatsAppPlugin>();

export function getWhatsAppForUser(userId: string) {
  if (!sessions.has(userId)) {
    sessions.set(
      userId,
      WhatsAppPlugin.createInstance(userId, {
        apiEndpoint: process.env.WHATSAPP_PLUGIN_API_ENDPOINT,
        sessionPath: `./data/wa-sessions/${userId}`,
      }),
    );
  }
  return sessions.get(userId)!;
}

// In your API route
await getWhatsAppForUser(req.user.id).sendMessage(to, text);
```

---

## 4. Environment variables

| Variable | Purpose |
|----------|---------|
| `REACT_APP_API_URL` | Your main backend (login, JWT) |
| `REACT_APP_WHATSAPP_API_URL` | WhatsApp relay (port 9093) |
| `WHATSAPP_PLUGIN_API_ENDPOINT` | Plugin HTTP adapter base URL |
| `WHATSAPP_PLUGIN_API_KEY` | Optional bearer for relay |
| `WHATSAPP_PLUGIN_TENANT_ID` | Default tenant id |

---

## 5. Plugin API (quick reference)

```typescript
await wa.connect();
await wa.startQRLogin(force?: boolean);
await wa.waitForQRScan();
await wa.sendMessage(to, text);
await wa.sendFile(to, file, caption?);
wa.getStatus();
wa.on('connected' | 'message' | 'qr-code' | 'error', handler);
await wa.logout();
```

Gateway type error (`HttpGatewayAdapter` vs `IGatewayAdapter`) is fixed — all credential methods return `Promise<boolean>`.
