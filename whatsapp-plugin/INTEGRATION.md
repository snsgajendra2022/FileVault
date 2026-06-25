# WhatsApp AI — simple library install

Use **one React component** in your project. No login screen. Scan QR → done.

## 1. Install

```bash
# From GitHub (after you push)
npm install github:YOUR_USER/web-whatsapp-ai-pulgin#main

# Or local path while developing
npm install ../web-whatsapp-ai-pulgin/whatsapp-plugin
```

Peer deps (in your main app — you likely already have these):

```bash
npm install react react-dom @tanstack/react-query axios
```

## 2. Run OM server (once per machine / deploy)

In this repo (or your server):

```bash
npm start
# or only: node server/openclaw-dev-server.js  (port 9093)
```

## 3. Use in your React app

```tsx
import { WhatsAppAi } from 'whatsapp-plugin/react';

function MyPage() {
  return (
    <WhatsAppAi
      apiUrl="http://127.0.0.1:9093"
      authToken={localStorage.getItem('token') || undefined}
      userId={currentUser?.id}
      autoConnect
      showHeader
      showMessageLog
      onConnected={(status) => console.log('WhatsApp ready', status)}
      onMessage={(msg) => console.log('New message', msg)}
    />
  );
}
```

That's it. The component handles:

- QR login
- Wait for scan
- Auto bootstrap + link phone
- Auto read your project
- Message log (you + OM only)
- Self-chat only
- Logout / refresh

## Props

| Prop | Default | Description |
|------|---------|-------------|
| `apiUrl` | `http://127.0.0.1:9093` | OM dev server |
| `authToken` | `localStorage.token` | Your app JWT |
| `userId` | linked phone | Tenant id |
| `autoConnect` | `true` | Bootstrap + sync on connect |
| `showHeader` | `true` | Green title bar |
| `showMessageLog` | `true` | Chat log panel |
| `onConnected` | — | Callback when linked |
| `onMessage` | — | New inbound message |
| `onError` | — | API errors |
| `className` | — | Extra CSS classes |

## .env (your main project)

```env
REACT_APP_WHATSAPP_API_URL=http://127.0.0.1:9093
```

Then you can omit `apiUrl`:

```tsx
<WhatsAppAi />
```

## Tailwind

The UI uses Tailwind utility classes. Your app should include Tailwind (most CRA/Vite projects already do).

## Server .env (optional API read)

```env
OM_WHATSAPP_API_TOKEN=your_studio_jwt
```

WhatsApp number = login. No username/password UI.

## Full docs

See `INTEGRATION.md` for GitHub push, gateway, production.
