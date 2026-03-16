# Public URL Verification & Share – Mobile App Requirements
## Overview
This document describes the **mobile app** requirements for:
1. **Share flow** – Sending the public URL to recipients (existing users or by email/mobile) from the studio in the app.
2. **Verification flow** – When a user opens a public URL in the mobile app, verifying identity (existing user vs new user with OTP) before showing images.
All flows below assume **mobile-first UI** and include **mobile number input with country code**.
---
## 1. Share Flow (Photographer / Studio Side – Mobile App)
### 1.1 Trigger
- User selects **images** and/or **albums** in the app (e.g. Studio Checkout / Selection screen).
- User taps **Share** (e.g. Share button in app).
### 1.2 Share Screen / Modal (Mobile UI)
- A **full-screen sheet**, **bottom sheet**, or **modal** opens after tapping Share.
- The screen must:
  - **Display existing users** from “my protocol” (scrollable list, search if needed).
  - Provide **inputs** for recipients not in the list:
    - **Mobile number** input **with country code** (e.g. country code selector/dropdown + phone number field).
    - **Email** input (optional or required as per business rules).
  - Allow sending a **message** (optional text) along with the share.
  - **Send** the **public URL** to selected recipients via **SMS** and/or **Email**.
### 1.3 Mobile number input with country code
- **Country code:** Use a **picker / dropdown** or **tap-to-select** control (e.g. +91, +1, +44, etc.) so the user selects the country code.
- **Phone number:** A separate **numeric input** for the rest of the mobile number (no country code typed here).
- Combined value sent to backend: **country code + number** (e.g. +919876543210).
- UI: Single logical “Mobile number” field built from [Country code selector] + [Number input].
### 1.4 Behaviour
- Photographer can:
  - Select one or more **existing users** and send them the public URL (SMS and/or email).
  - Add **new recipients** by entering **mobile number (with country code)** and/or email; then send the public URL.
- System sends the public URL and optional message via SMS and/or email.
---
## 2. Public URL Verification Flow (Viewer – Mobile App)
When a user **opens a public URL in the mobile app** (e.g. deep link to `/public/checkout?q=...` or `/public/selection?q=...`):
### 2.1 Step 1 – Check if user exists in “my protocol”
- App checks whether the **current user** is already an **existing user** (e.g. by app session, token, or stored identifier).
- **If user already exists:**
  - Optionally **send** them an **SMS** or **email** (e.g. verification link or audit).
  - Then **allow access** and **display the images** (no OTP step).
- **If user does NOT exist:**  
  Go to Step 2.
### 2.2 Step 2 – Collect email and/or mobile (new visitor) – Mobile UI
- Show a **popup / bottom sheet / full-screen form** with:
  - **Mobile number with country code:**
    - **Country code** selector (e.g. +91, +1, +44).
    - **Phone number** input (numeric).
  - **Email** input (if required or optional).
- User must enter at least **mobile number (with country code)** or email as per business rules.
- On submit, **check** if this **email/mobile matches an existing user** (dedupe).
  - If **matched:** treat as existing user (e.g. send SMS/email and show images).
  - If **not matched:** continue to Step 3.
### 2.3 Step 3 – OTP send and verify (new user) – Mobile UI
- System **sends an OTP** to the provided **mobile** (SMS) and/or **email**.
- Show **OTP input** in the same or next screen (e.g. 4–6 digit boxes or single field).
- User enters the **OTP**.
- System **verifies** the OTP.
- **If verification succeeds:**  
  **Display the images** (grant access to the public content).
- **If verification fails:**  
  Show error and allow retry (resend OTP, re-enter OTP).
### 2.4 Summary flow (viewer – mobile app)
Open public URL in app → User exists in protocol? → Yes: send SMS/email (optional) → show images → No: show form with [Country code + Mobile number] + Email → Submit → same as existing user? → Yes: send SMS/email → show images → No: send OTP → user enters OTP → verify → Success: show images → Fail: show error, retry

---
## 3. Mobile App UI Requirements Summary
| Element | Requirement |
|--------|-------------|
| **Mobile number (Share & Verification)** | Always use **country code selector** + **phone number input**. |
| **Country code** | Picker/dropdown with common codes (e.g. +91, +1, +44, +971, etc.); extendable list. |
| **Phone input** | Numeric keyboard; format/validate per country if needed. |
| **Share modal/sheet** | Existing users list + inputs for new recipients (mobile with country code, email). |
| **Verification popup/sheet** | Email + [Country code + Mobile number]; then OTP screen. |
| **OTP input** | Mobile-friendly (e.g. digit boxes or single field, resend button). |
---
## 4. Terminology
| Term | Meaning |
|------|---------|
| **Public URL** | Link to public checkout/selection (with `q`, `sid`, or token/albumId); openable in app via deep link. |
| **My protocol** | Your system’s set of users (contacts) identifiable by email/mobile or session. |
| **Existing user** | User already known in “my protocol” (e.g. by app login or contact list). |
| **OTP** | One-time password sent via SMS and/or email. |
| **Country code** | Prefix for mobile number (e.g. +91 for India, +1 for US). |
---
## 5. Open Points / To Define (Mobile)
- **Existing users source:** Which API provides “existing users” in the Share screen?
- **Session in app:** How does the app know “current user” on the public URL screen (token, device id)?
- **Country code list:** Full list vs top N + search; default country (e.g. +91).
- **OTP channel:** SMS only, email only, or both (and who chooses).
- **Dedupe rule:** Match by full mobile (country code + number) and/or email.
- **Deep linking:** Exact URL scheme/path for opening public URLs in the app.
- **Copy:** Exact texts for screens, errors, and SMS/email.
- **Backend:** Endpoints for send message, send OTP, verify OTP, “user exists” check (same as web or mobile-specific).

**Backend API spec:** [BACKEND_API_PUBLIC_SHARE_VERIFICATION.md](BACKEND_API_PUBLIC_SHARE_VERIFICATION.md)


