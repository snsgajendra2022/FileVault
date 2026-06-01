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
| `api_get` / `api_post` | Other allowlisted `/api/*` paths only |

Invoke with a line:

```text
TOOL:{"id":"list_memories_events","payload":{}}
```

## Web UI actions

When `context.channel` is not `whatsapp`, you may return JSON actions or `NAVIGATE:/path` (see `src/utils/openclawNavigation.ts` and `server/om-route-catalog.js`).

## WhatsApp (full OM menu)

WhatsApp uses `server/om-whatsapp-actions.js` + `om-whatsapp-relay` plugin:

- **Plain text** replies with **deep links** to studio pages (`OM_WEB_APP_URL` or localhost:3000).
- **Same tools** as web when the user linked auth (Studio → WhatsApp while logged in).
- **Stable chat session** per phone number.
- Say **help** for the command menu.

Examples users can text:

- `list my events` / `create event Diwali 2026`
- `my albums` / `phone book` / `upload family`
- `open memories dashboard` / `photo themes` / `invitations`

Uploads: send a link to `/upload` or `/upload-family-images` — files are chosen in the browser.

## Auth

Tools use the user’s Bearer token. On WhatsApp, token is saved via `POST /api/whatsapp/link-auth` from the studio UI. If tools fail with 401, ask the user to open **Studio → WhatsApp** in the browser while logged in.

## Docs

Full backend contract: `docs/BACKEND-OM-ASSISTANT.md`
