---
name: om-assistant
description: Operate Our Memories (Filevault) studio via the OpenClaw dev server on port 9093. Use for events, images, albums, contacts, WhatsApp, OM API, or debugging assistant routes. Persona: OM-ASSISTANT.md in repo root.
user-invocable: true
---

# OM Assistant skill

Use when the user asks to manage **Our Memories / Filevault / studio** data: events, uploads, albums, phone book, or WhatsApp.

## Tools (server-side)

The bridge or dev server (`server/om-api-tools.js`) exposes:

| Tool | Use when |
|------|----------|
| `list_memories_events` | User asks what events exist, counts, names |
| `create_memories_event` | User clearly wants a new event (need name; optional date/location) |
| `list_user_images` | “My images”, library size |
| `list_albums` | Studio albums |
| `list_contacts` | Phone book |
| `upload_image` | Server has a local `filePath` (WhatsApp media on disk) — uploads to `/api/images/upload` |
| `link_image_to_event` | `eventId`, `imageId`, optional `comment` — POST `/api/memories/events/{id}/images` |
| `api_get` / `api_post` | Other allowlisted `/api/*` paths (includes `/api/images/upload` metadata via POST body on server) |

Invoke with a line:

```text
TOOL:{"id":"list_memories_events","payload":{}}
```

## Web UI actions

When `context.channel` is not `whatsapp`, you may return JSON actions or `NAVIGATE:/path` (see `src/utils/openclawNavigation.ts` and `server/om-route-catalog.js`).

## WhatsApp (full access — no webhook needed)

Pipeline is **live**:

1. User sends **photo, screenshot, video, voice note, or document** on WhatsApp → OpenClaw saves media → `om-whatsapp-relay` → `POST /api/whatsapp/relay-inbound`
2. Dev server uploads to **`POST /api/images/upload`** (Filevault API accepts all file types) with linked JWT
3. Optional caption **`for event NAME`** or **`event #12`** → links file to that event

Also: `POST /api/whatsapp/upload` (multipart `file`) for direct tests.

**Do not** tell developers to build webhooks or ask for upload endpoint URLs — use the tools above.

- Plain text + **deep links** (`OM_WEB_APP_URL`)
- **Same tools** when auth linked (Studio → WhatsApp while logged in, or `OM_WHATSAPP_API_TOKEN` in `.env`)
- Say **help** for the command menu

Examples:

- Send **photo / video / voice / document** (instant upload)
- Media + caption: `for event Diwali 2026`
- `list my events` / `create event Summer Party`
- `my albums` / `phone book`

## Auth

Tools use the user’s Bearer token. On WhatsApp, token is saved via `POST /api/whatsapp/link-auth` from the studio UI. Service account: `OM_WHATSAPP_API_TOKEN` or `FILEVAULT_WHATSAPP_BEARER` in `.env`. If tools fail with 401, ask the user to open **Studio → WhatsApp** while logged in.

## Docs

Full backend contract: `docs/BACKEND-OM-ASSISTANT.md`
