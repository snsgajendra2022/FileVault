# Fix: `openclaw channels login --channel whatsapp` fails

## Errors you saw

```
Failed to install @openclaw/whatsapp: plugin already exists ... (delete it first)
Channel login failed: Error: Channel whatsapp does not support login
```

## Causes

1. **Version mismatch** — project had `openclaw@2026.5.7` but `@openclaw/whatsapp@2026.5.19` requires `openclaw >= 2026.5.19`. The plugin does not load, so CLI thinks WhatsApp has no login.
2. **Stale plugin copy** — half-installed plugin at `~/.openclaw/npm/node_modules/@openclaw/whatsapp` blocks reinstall.
3. **Gateway not running** — `openclaw channels status` needs the gateway on `ws://127.0.0.1:18789` (see `~/.openclaw/openclaw.json`).
4. **`protocol mismatch` (1002)** — usually an **old** `openclaw-gateway` on **18789** started before you upgraded openclaw, OR gateway port in config was **9093** (same as dev server). Fix: set `gateway.port` to **18789** in `.openclaw/openclaw.json`, kill old gateway, restart from filevault.
5. **Wrong API for WhatsApp page** — Java on **9090** returns a **fake** QR. Real QR needs **openclaw-dev-server (9093)** + gateway on **18789**.

## Fix (run in order)

### 0. Fix `protocol mismatch` (most common)

macOS may run an **old** gateway via LaunchAgent (`ai.openclaw.gateway`, often **v2026.4.10**) while filevault uses **openclaw 2026.5.19**:

```bash
launchctl bootout "gui/$(id -u)" ~/Library/LaunchAgents/ai.openclaw.gateway.plist
pkill -f openclaw-gateway || true
cd /Users/gajendrarawat/filevault
OPENCLAW_CONFIG=$PWD/.openclaw/openclaw.json npx openclaw gateway run --force
```

Reinstall the service on the new version when ready: `npx openclaw doctor --repair` (optional).

Ensure `.openclaw/openclaw.json` has `gateway.port: 18789` (not **9093** — that port is `openclaw-dev-server`).

### 1. Stop the old gateway and fix ports

```bash
# Kill stale gateway (protocol mismatch = version/port conflict)
pkill -f openclaw-gateway || true
lsof -i :18789   # should be empty before restart
```

**Ports:** **18789** = OpenClaw Gateway only. **9093** = `openclaw-dev-server.js` only. Never set both to 9093 in `.openclaw/openclaw.json`.

### 2. Upgrade OpenClaw in filevault

```bash
cd /Users/gajendrarawat/filevault
rm -rf node_modules/.cache
npm install
```

### 3. Remove broken WhatsApp plugin copy

```bash
rm -rf ~/.openclaw/npm/node_modules/@openclaw/whatsapp
```

### 4. Install / enable WhatsApp plugin (matching version)

```bash
cd /Users/gajendrarawat/filevault
npx openclaw plugins install @openclaw/whatsapp
```

Or enable in `~/.openclaw/openclaw.json`:

```json
"plugins": {
  "entries": {
    "openai": { "enabled": true },
    "whatsapp": { "enabled": true }
  }
}
```

### 5. Start OpenClaw Gateway (terminal 1 — keep open)

```bash
cd /Users/gajendrarawat/filevault
npx openclaw gateway run --force
```

Must show WebSocket gateway on **18789**. If you see `protocol mismatch`, kill whatever else uses 18789 and run this again.

### 6. Start OM dev server (terminal 2)

```bash
cd /Users/gajendrarawat/filevault
npm run openclaw-server
```

Listens on **9093** and proxies WhatsApp login to the gateway.

### 7. Point the React app at 9093 for WhatsApp

In `.env`:

```env
REACT_APP_WHATSAPP_API_URL=http://127.0.0.1:9093
```

Restart `npm run start:web` (or `npm start`).

### 8. Open `/studio/whatsapp` → Show QR

- Scan with **WhatsApp on your phone** (Linked devices).
- Same QR as terminal login when gateway is healthy.
- Click **Wait for scan** after scanning.

### 9. Verify

```bash
npm run openclaw:channels:status
```

## Note on `/studio/whatsapp` in the browser

- **Invalid QR in WhatsApp app** = you scanned the old **fake** dev code from Java (9090) or gateway was offline.
- **Valid flow** = gateway on 18789 + dev server 9093 + `REACT_APP_WHATSAPP_API_URL` → page shows **real** QR (`source: openclaw-gateway` in network response).

## Still broken?

- Node **≥ 22.12**: `node -v`
- `openclaw --version` should be **2026.5.19** or newer
- Check plugin: `npx openclaw plugins list | grep -i whatsapp`
