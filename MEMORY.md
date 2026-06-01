# MEMORY.md — OM Long-Term Memory

## Project: Filevault / Our Memories Studio

- **Workspace:** `/Users/gajendrarawat/filevault`
- **Config:** `.openclaw/openclaw.json` (project), `~/.openclaw/openclaw.json` (home)
- **Model:** `openrouter/owl-alpha`
- **Gateway port:** 18789
- **Dev server port:** 9093
- **Java backend:** 192.168.31.108:9090

## WhatsApp

- **Phone:** +919009659717
- **Agent name:** OM
- **dmPolicy:** allowlist
- **selfChatMode:** true
- **Chat via:** Message yourself on WhatsApp

## Key paths

- OM skill: `filevault/.openclaw/plugin-skills/om-assistant/SKILL.md`
- Persona: `OM-ASSISTANT.md`
- Backend docs: `docs/BACKEND-OM-ASSISTANT.md`
- WhatsApp fix docs: `docs/WHATSAPP-OPENCLAW-FIX.md`

## Lessons learned

- OpenClaw CLI needs `operator.admin` + `operator.pairing` scopes for `web.login.start` (WhatsApp QR). Approve via `npm run openclaw:devices:approve` or open `http://127.0.0.1:18789/`.
- `concurrently` runs shell commands, not npm script names — use `node server/...` not `openclaw:gateway:run`.
- Gateway uses `gateway run --force` to handle config reload restarts.
- WhatsApp auto-reply failed with gateway error `Cannot read properties of undefined (reading 'delete')` on embedded agent (~200ms). Fixes: (1) `openclaw` npm **2026.5.28+** to match `@openclaw/whatsapp` peer dep; (2) `session.dmScope: "main"`; (3) **om-whatsapp-relay** plugin → `POST http://127.0.0.1:9093/api/whatsapp/relay-inbound` (before_dispatch, skips broken embedded path).
