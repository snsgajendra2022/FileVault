# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## OM / Filevault assistant

| Item | Value |
|------|--------|
| Dev assistant server | `http://localhost:9093` (`npm run openclaw-server`) |
| Main API | `REACT_APP_API_URL` in `.env` |
| OpenClaw Gateway | `npm run openclaw:onboard` then `npm run openclaw:whatsapp:login` |
| Backend contract | `docs/BACKEND-OM-ASSISTANT.md` |
| Persona | `OM-ASSISTANT.md` |

### TTS (web assistant)

- Preferred: browser speech synthesis (“Aloud on” in assistant panel)
- Language follows i18n (`en-US` / `hi-IN`)

### WhatsApp

- UI: `/studio/whatsapp`
- Dev: proxied to port 9093; simulated QR until Java/OpenClaw gateway is wired
- Allowlist your number in channel config before testing inbound

## Examples (environment-specific)

```markdown
### SSH / hosts

- studio-api → backendstudio.mytiny.us

### FaceSync

- REACT_APP_FACESYNC_API_URL → http://192.168.1.9:8000
```

Add whatever helps you do your job. This is your cheat sheet.

## Related

- [Agent workspace](/concepts/agent-workspace)
- [Backend OM assistant](docs/BACKEND-OM-ASSISTANT.md)
