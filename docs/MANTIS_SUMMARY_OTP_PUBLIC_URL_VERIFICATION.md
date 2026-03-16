# Mantis Summary: OTP & Public URL Verification System

Use the content below in Mantis (title, description, steps to reproduce / scope, or as a parent ticket with subtasks).

---

## Suggested title (short)

```
OTP and public URL verification system – Share flow + verification gate
```

---

## Description (paste into Mantis)

### Summary
Implement a verification and share system around public checkout/selection URLs: (1) photographers can share the public URL to existing contacts or new email/mobile via a Share modal; (2) when a viewer opens the public URL, the system verifies them (existing user → direct access or notify; new user → collect email/mobile, send OTP, verify OTP) before showing images.

### Scope

1. Share flow (photographer / studio – web & mobile)  
- From studio (after selecting images/albums), user clicks Share → modal/screen opens.  
- Modal shows existing users (from contacts/protocol) and inputs for email and/or mobile number (with country code on mobile).  
- User can add optional message.  
- System sends the public URL (and message) via email and/or SMS to selected contacts and/or new recipients.

2. Public URL verification flow (viewer – web & mobile)  
- When someone opens the public URL (e.g. `/public/checkout?q=...` or `/public/selection?q=...`):  
  - If user already exists in the system (session / protocol): send SMS/email if needed → show images.  
  - If user does NOT exist: show popup/form to enter email and/or mobile (with country code on mobile) → check if same as existing user → if not, send OTP → user enters OTP → verify OTP → on success show images.

3. Backend APIs  
- Share: list contacts, send share (public URL + message to email/SMS).  
- Verification: check existing user, send OTP, verify OTP, optional notify existing user.  
- See project docs for full API spec.

### Docs in repo
- `docs/PUBLIC_URL_VERIFICATION_REQUIREMENTS.md` – Web requirements  
- `docs/PUBLIC_URL_VERIFICATION_REQUIREMENTS_MOBILE_APP.md` – Mobile app requirements (incl. mobile number + country code)  
- `docs/BACKEND_API_PUBLIC_SHARE_VERIFICATION.md` – Backend API endpoints

### Acceptance criteria (high level)
- [ ] Share modal/screen: list existing users, input email/mobile (with country code on mobile), optional message, send public URL via email/SMS.  
- [ ] Public URL open: if existing user → allow access (optionally send notification).  
- [ ] Public URL open: if new visitor → collect email/mobile → send OTP → verify OTP → then show images.  
- [ ] Backend: endpoints for contacts, send share, check-user, send-otp, verify-otp (and optional notify-existing-user) implemented per API doc.  
- [ ] Mobile: mobile number input includes country code selector; same flows as web where applicable.

---

## Short one-paragraph version (for Mantis summary field)

```
OTP & public URL verification: (1) Share flow – from studio, Share modal lists existing users and allows entering email/mobile (with country code on mobile); send public URL + optional message via email/SMS. (2) Verification flow – on opening public URL, if existing user then show images (optionally notify); if new visitor then collect email/mobile, send OTP, verify OTP, then show images. Backend APIs: contacts list, send share, check-user, send-otp, verify-otp. See docs/PUBLIC_URL_VERIFICATION_REQUIREMENTS.md, PUBLIC_URL_VERIFICATION_REQUIREMENTS_MOBILE_APP.md, BACKEND_API_PUBLIC_SHARE_VERIFICATION.md.
```

---

## Optional subtasks (create as separate Mantis issues if needed)

| # | Subtask | Category |
|---|---------|----------|
| 1 | Backend: GET /api/public-share/contacts | Backend |
| 2 | Backend: POST /api/public-share/send | Backend |
| 3 | Backend: POST /api/public-verify/check-user | Backend |
| 4 | Backend: POST /api/public-verify/send-otp | Backend |
| 5 | Backend: POST /api/public-verify/verify-otp | Backend |
| 6 | Backend: POST /api/public-verify/notify-existing-user (optional) | Backend |
| 7 | Web: Share modal (existing users + email/mobile + message, send URL) | Frontend – Web |
| 8 | Web: Public URL verification gate (existing user check, collect email/mobile, OTP send/verify, then show images) | Frontend – Web |
| 9 | Mobile: Share screen (same as web + country code for mobile) | Frontend – Mobile |
| 10 | Mobile: Public URL verification (same flow + country code input, OTP screen) | Frontend – Mobile |
