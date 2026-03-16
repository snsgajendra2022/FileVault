# Public URL Verification & Share – Requirements

## Overview

This document describes the requirements for:
1. **Share flow** – Sending the public URL to recipients (existing users or by email/mobile) from the studio.
2. **Verification flow** – When a user opens a public URL, verifying identity (existing user vs new user with OTP) before showing images.

---

## 1. Share Flow (Photographer / Studio Side)

### 1.1 Trigger
- User selects **images** and/or **albums** at the chosen location (e.g. Studio Checkout / Selection).
- User clicks **Share** (e.g. Share button that already exists or will be added).

### 1.2 Share Modal
- A **modal** opens after clicking Share.
- The modal must:
  - **Display existing users** from “my protocol” (current system / contact list).
  - Provide **inputs** to enter **email** and/or **mobile number** for recipients not in the list.
  - Allow sending a **message** (optional text) along with the share.
  - **Send** the **public URL** (checkout/selection link) to selected recipients via:
    - **Email**, and/or
    - **SMS** (mobile number).

### 1.3 Behaviour
- Photographer can:
  - Select one or more **existing users** from the list and send them the public URL (by email and/or SMS).
  - Add **new recipients** by entering email or mobile number; then send the public URL to them.
- The system sends the **public URL** and optional message to each chosen channel (email / SMS).

### 1.4 Out of scope (to be clarified)
- Exact source of “existing users” (API, local list, etc.).
- Whether “message” is one per share or per recipient.

---

## 2. Public URL Verification Flow (Viewer Side)

When a user **opens a public URL** (e.g. `/public/checkout?q=...` or `/public/selection?q=...`):

### 2.1 Step 1 – Check if user exists in “my protocol”
- System checks whether the **current visitor** is already an **existing user** in “my protocol” (e.g. by session, cookie, or identifier).
- **If user already exists:**
  - Directly **send** them an **SMS** or **email** (e.g. with a verification link or code, or for audit).
  - Then **allow access** and **display the images** (no OTP step).
- **If user does NOT exist:**  
  Go to Step 2.

### 2.2 Step 2 – Collect email and/or mobile (new visitor)
- Show a **popup** (or inline form) with:
  - **Email** input.
  - **Country code** selector (e.g. +91, +1, +44).
  - **Mobile number** input.
- User must enter at least one (email or mobile) as per business rules.
- On submit, **check** if this **email/mobile is the same as an existing user** in the system (dedupe / match).
  - If **matched to existing user:** treat as existing user (e.g. send SMS/email and show images).
  - If **not matched:** continue to Step 3.

### 2.3 Step 3 – OTP send and verify (new user)
- System **sends an OTP** to the provided **email** and/or **mobile** (as per design).
- Show **OTP input** in the popup.
- User enters the **OTP**.
- System **verifies** the OTP.
- **If verification succeeds:**  
  **Display the images** (grant access to the public checkout/selection content).
- **If verification fails:**  
  Show error and allow retry (resend OTP, re-enter OTP, etc.).

### 2.4 Summary flow (viewer)


---
## 3. Terminology
| Term | Meaning |
|------|--------|
| **Public URL** | Link to `/public/checkout` or `/public/selection` (with `q`, `sid`, or token/albumId). |
| **My protocol** | Your existing system / database of users (contacts) identifiable by email/mobile or session. |
| **Existing user** | A user already known in “my protocol” (e.g. by prior login, invite, or contact list). |
| **OTP** | One-time password sent via SMS and/or email for verification. |
---
## 4. Open Points / To Define
- **Existing users source:** Which API or store provides “existing users” in the Share modal?
- **Session on public page:** How do we “know” the current visitor (cookie, token, device id)?
- **OTP channel:** SMS only, email only, or both (and who chooses)?
- **Dedupe rule:** How exactly to match “same as existing user” (email match, mobile match, both)?
- **Copy:** Exact texts for popups, errors, and emails/SMS.
- **Backend:** Endpoints for send message, send OTP, verify OTP, and “user exists” check.

**Backend API spec:** [BACKEND_API_PUBLIC_SHARE_VERIFICATION.md](BACKEND_API_PUBLIC_SHARE_VERIFICATION.md)