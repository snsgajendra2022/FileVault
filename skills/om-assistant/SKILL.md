---
name: om-assistant
description: Operate Our Memories (Filevault) studio via the OpenClaw dev server on port 9093. Auto-reads project on WhatsApp connect. Use for events, images, albums, contacts, WhatsApp, OM API, or debugging assistant routes. Persona: OM-ASSISTANT.md in repo root.
user-invocable: true
---

# OM Assistant skill

Use when the user asks to manage **Our Memories / Filevault / studio** data: events, uploads, albums, phone book, or WhatsApp.

## Auto-connect + auto-read project

When WhatsApp links (QR scan + bootstrap), the dev server **automatically**:

1. Resolves the user/tenant (JWT, `X-User-Id`, or device session).
2. Calls Filevault APIs: events, albums, images, contacts, profile.
3. Caches a **project snapshot** per tenant (`server/whatsapp-project-sync.js`).
4. Sends a short WhatsApp summary to **Message yourself** (self-chat only).
5. Injects the snapshot into every OM reply so the AI already knows the project.

No login screen is required if server env is set:

```env
OM_WHATSAPP_AUTO_USER=your_api_username
OM_WHATSAPP_AUTO_PASSWORD=your_api_password
```

Or pass a real Bearer JWT via `link-auth` / `localStorage.token` when embedding in another app.

Manual refresh: `POST /api/whatsapp/sync-project` (optional `notify: true` to WhatsApp).

## Tools (server-side)

The bridge or dev server (`server/om-api-tools.js`) exposes:

| Tool | Use when |
|------|----------|
| `list_memories_events` | User asks what events exist, counts, names |
| `create_memories_event` | User clearly wants a new event (need name; optional date/location) |
| `list_user_images` | “My images”, library size |
| `list_albums` | Studio albums |
| `list_contacts` | Phone book / leads |
| `api_get` / `api_post` | Other allowlisted `/api/*` paths only |

Invoke with a line:

```text
TOOL:{"id":"list_memories_events","payload":{}}
```

## Web-only UI actions

When `context.channel` is not `whatsapp`, you may return:

```json
{"action":"open_route_memories_events","payload":{}}
```

or `NAVIGATE:/memories/events` as the last line.

Allowed route opens: see `src/utils/openclawNavigation.ts`.

## WhatsApp

- Reply in short plain text.
- No `NAVIGATE` lines.
- Use tools for data; confirm uploads/creates in one sentence.
- **Self-chat only** — linked phone “Message yourself”; other chats ignored.
- On connect, greet with project counts from the cached snapshot.

## Auth

Tools use the tenant Bearer token (linked on connect). If tools fail with 401:

- Set `OM_WHATSAPP_AUTO_USER` + `OM_WHATSAPP_AUTO_PASSWORD` in `.env`, or
- Embed the plugin in a host app that passes the user JWT to `link-auth`.

Each user/tenant sees **only their own** messages and project data.

## Docs

Full backend contract: `docs/BACKEND-OM-ASSISTANT.md`
