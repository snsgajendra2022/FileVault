# Backend: OM Assistant (OpenClaw + WhatsApp + API tools)

This document is the **implementation contract** for your Java/API server (`REACT_APP_API_URL`, e.g. `https://backendstudio.mytiny.us`) so the Filevault React app can run a **voice + action assistant** in the browser and on **WhatsApp**, using one logical “OM” brain.

The React SPA **never** holds OpenClaw Gateway credentials. All secrets stay server-side.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Filevault React SPA                       │
│  /studio/openclaw (voice, chat, UI actions)                      │
│  /studio/whatsapp (link QR, config, message log)                 │
└───────────────┬─────────────────────────────┬───────────────────┘
                │ Bearer JWT                  │ Bearer JWT
                ▼                             ▼
┌───────────────────────────────────────────────────────────────────┐
│              Your API (REACT_APP_API_URL)                          │
│  POST /api/openclaw/chat|voice|image|session                       │
│  GET/POST /api/whatsapp/*                                          │
│  Forwards to OpenClaw Gateway and/or runs OM tools on REST APIs    │
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
                ▼                             ▼
     OpenClaw Gateway (Node ≥22)      Filevault REST (existing)
     WhatsApp / agent / tools        /api/memories, /api/images, …
```

**Local dev (this repo):** `npm start` runs `server/openclaw-dev-server.js` on port **9093** with the same JSON shapes. CRA proxies `/api/whatsapp` to 9093 via `src/setupProxy.js`. OpenClaw chat uses `REACT_APP_OPENCLAW_DEV_URL` when set.

---

## 1. OpenClaw routes (required for production)

Implement on **`REACT_APP_API_URL`** (same auth as the rest of the app).

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/openclaw/session` | `{}` | `{ sessionId?, ok? }` |
| `POST` | `/api/openclaw/chat` | `{ message, sessionId?, userId?, context? }` | See below |
| `POST` | `/api/openclaw/voice` | `{ transcript, sessionId?, userId?, context? }` | Same as chat |
| `POST` | `/api/openclaw/image` | `multipart/form-data`: `file`, optional `sessionId`, `prompt`, `context` (JSON string) | Same as chat |

### Response shape (chat / voice / image)

At least one text field: **`reply`**, **`message`**, or **`text`**.

Optional:

| Field | Type | Purpose |
|-------|------|---------|
| `sessionId` | string | Continue conversation |
| `navigateTo` | string | In-app route (allowlist in `src/utils/openclawNavigation.ts`) |
| `navigation.path` | string | Same as `navigateTo` |
| `action` | string | Single UI action id (e.g. `open_route_memories_events`) |
| `payload` | object | Payload for `action` |
| `actions` | array | `{ id, payload? }[]` for multiple UI steps |
| `error` / `message` | string | Error text |

### `context` from the SPA

```json
{
  "path": "/memories/events/42",
  "memoriesEvent": {
    "id": "42",
    "name": "Wedding",
    "dateTime": "2026-06-01T18:00:00",
    "location": "Jaipur",
    "imageCount": 120
  },
  "channel": "web"
}
```

Pass this into the model/bridge so answers match the open screen.

### Bridge contract (if using OpenClaw Gateway)

Your internal endpoint (e.g. `POST /internal/openclaw-bridge`) receives:

```json
{
  "kind": "chat" | "voice" | "image",
  "message": "…",
  "transcript": "…",
  "prompt": "…",
  "sessionId": "…",
  "userId": "…",
  "context": { }
}
```

Return the same JSON as the table above. Use **`Authorization: Bearer <gateway token>`** toward OpenClaw when required (`openclaw config get gateway.auth.token`).

**Do not** point `OPENCLAW_BRIDGE_URL` at the CRA dev server port (9093) — that causes a loop. The dev server skips self-URLs automatically.

---

## 2. WhatsApp routes (required for `/studio/whatsapp`)

Match `src/api/services/whatsappService.ts`.

| Method | Path | Body / query | Response |
|--------|------|--------------|----------|
| `GET` | `/api/whatsapp/status` | — | `{ configured?, linked?, running?, connected?, lastConnectedAt?, lastMessageAt?, authAgeMs?, lastError? }` |
| `POST` | `/api/whatsapp/login/start` | `{ force?: boolean }` | `{ message?, qrDataUrl? }` — QR as data URL or image URL |
| `POST` | `/api/whatsapp/login/wait` | `{}` | `{ message?, connected? }` |
| `POST` | `/api/whatsapp/logout` | `{}` | `{ message? }` |
| `GET` | `/api/whatsapp/config` | — | Config object (see frontend `WhatsAppConfigValues`) |
| `POST` | `/api/whatsapp/config` | Config object | `{ ok?, error? }` |
| `GET` | `/api/whatsapp/messages` | `limit`, `before?` | Array of log entries (see below) |
| `POST` | `/api/whatsapp/send` | `{ to, text }` | `{ ok?, messageId?, error? }` |

### Message log entry

```json
{
  "id": "string",
  "direction": "inbound" | "outbound",
  "from": "string",
  "to": "string",
  "text": "string",
  "status": "sent" | "delivered" | "read" | "failed" | "pending",
  "timestamp": "ISO-8601",
  "isGroup": false
}
```

### Production WhatsApp linking

Use **OpenClaw Gateway** with the WhatsApp channel:

```bash
npm run openclaw:onboard
npm run openclaw:whatsapp:login
npm run openclaw:channels:status
```

Credentials: `~/.openclaw/credentials/whatsapp/<accountId>/`.

Your Java layer should either:

1. **Proxy** these REST endpoints to a small Node sidecar that wraps OpenClaw CLI/gateway, or  
2. **Re-implement** session/QR/status using the same JSON contract.

### Inbound WhatsApp → OM assistant

When a message arrives on WhatsApp:

1. Resolve **sender phone** → **user account** (respect `dmPolicy`, `allowFrom`, `groupPolicy` from config).
2. Run the **same agent** as `/api/openclaw/chat` with `context.channel = "whatsapp"`.
3. Execute **OM tools** (below) with that user’s JWT or service token.
4. Reply on WhatsApp in plain text (no `navigateTo` in chat).

---

## 3. OM API tools (upload / create / list)

The assistant must call **your existing Filevault APIs** with the user’s Bearer token. The dev server implements this in `server/om-api-tools.js`.

### Built-in tool IDs

| Tool ID | HTTP | Purpose |
|---------|------|---------|
| `list_memories_events` | `GET /api/memories/events` | List events |
| `create_memories_event` | `POST /api/memories/events` | Body: `{ name, dateTime, location, privacy? }` |
| `list_user_images` | `GET /api/images/user/all` | List user images |
| `list_albums` | `GET /api/albums` | List studio albums |
| `list_contacts` | `GET /api/public-share/contacts?limit=50` | Phone book |
| `api_get` | Allowlisted `GET` | `{ path, query? }` |
| `api_post` | Allowlisted `POST` | `{ path, body? }` |

**Allowlist prefix** (extend as needed):

- `/api/memories/events`
- `/api/images/user/all`, `/api/images/upload`
- `/api/albums`
- `/api/public-share/contacts`
- `/api/photobooks`
- `/api/user/profile`

### Model invocation (dev server)

The model may end a reply with:

```text
TOOL:{"id":"list_memories_events","payload":{}}
```

The server runs the tool and appends a short `[Tool results]` block before returning to the client.

### Recommended Java implementation

1. Define the same tool catalog in your bridge service.
2. On tool call, use the authenticated user’s token from the session (never a global admin token unless intended).
3. Log tool calls for audit.
4. Require confirmation for destructive ops (delete, payment, publish).

### Upload from WhatsApp

When the user sends **images** on WhatsApp:

1. Download media from the channel adapter.
2. `POST /api/images/upload` (`multipart`, field `file`).
3. Optionally `POST /api/memories/events/{id}/images` with `{ imageIds: [...] }`.
4. Reply with a short confirmation.

---

## 4. Security checklist

| Item | Requirement |
|------|-------------|
| JWT | All `/api/openclaw/*` and `/api/whatsapp/*` require same auth as the app |
| WhatsApp allowlist | Enforce `allowFrom` / `groupAllowFrom` before running tools |
| Secrets | `OPENAI_API_KEY`, gateway token, bridge URL — **server env only** |
| Tool allowlist | Never expose arbitrary `api_get` paths without prefix check |
| PII | Do not echo tokens/passwords in model context |

---

## 5. Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `REACT_APP_API_URL` | React build | Main API |
| `REACT_APP_OPENCLAW_DEV_URL` | React build | Dev only: `http://host:9093` for chat |
| `REACT_APP_OPENCLAW_ENABLED` | React build | Show assistant UI |
| `OPENCLAW_DEV_PORT` | Node | Default 9093 |
| `OPENCLAW_BRIDGE_URL` | Node | External bridge (not 9093) |
| `OPENCLAW_BRIDGE_TOKEN` | Node | Bearer to gateway/bridge |
| `OPENAI_API_KEY` | Node | Direct LLM in dev |
| `FILEVAULT_API_URL` | Node | API base for tools (defaults to `REACT_APP_API_URL`) |
| `OM_TOOLS_ENABLED` | Node | `true`/`false` — Filevault tool calls |

---

## 6. Local test runbook

1. `npm start` (web + dev server on 9093).
2. Log in to OM in the browser (JWT in `localStorage`).
3. Open `/studio/openclaw` — voice or chat; try “list my events”.
4. Open `/studio/whatsapp` — Show QR → Wait for scan (dev simulation).
5. Add your phone to **Allow From**, save config.
6. Send test message; dev server echoes assistant reply.
7. Optional: `curl -X POST http://localhost:9093/api/whatsapp/simulate-inbound -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"from":"91xxxxxxxxxx","text":"list my events"}'`

Health: `GET http://localhost:9093/api/om/health`

---

## 7. Related files in this repo

| Path | Role |
|------|------|
| `server/openclaw-dev-server.js` | Dev OpenClaw + WhatsApp + pipeline |
| `server/om-api-tools.js` | Filevault API tools |
| `server/whatsapp-routes.js` | WhatsApp REST (dev) |
| `src/api/services/openclawService.ts` | SPA client |
| `src/api/services/whatsappService.ts` | SPA client |
| `src/components/openclaw/OpenClawAssistantPanel.tsx` | Voice + UI actions |
| `OM-ASSISTANT.md` | Persona / behavior |
| `skills/om-assistant/SKILL.md` | OpenClaw skill |
| `backend.md` | General API notes (OpenClaw section links here) |

---

*Update this file when you add tools, routes, or change auth.*
