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

## Auth

Tools use the user’s Bearer token from the session. If tools fail with 401, ask the user to log in on the web app first.

## Docs

Full backend contract: `docs/BACKEND-OM-ASSISTANT.md`
