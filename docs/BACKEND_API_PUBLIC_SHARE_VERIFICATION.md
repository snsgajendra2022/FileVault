# Backend API – Public Share & Verification

This document defines the **backend API endpoints** required to implement the [Public URL Verification & Share](PUBLIC_URL_VERIFICATION_REQUIREMENTS.md) (web) and [Mobile App](PUBLIC_URL_VERIFICATION_REQUIREMENTS_MOBILE_APP.md) requirements.

**Base URL:** `{API_BASE}` (e.g. `https://api.example.com` or same origin as frontend).  
**Auth:** Endpoints that need the photographer’s auth use `Authorization: Bearer <token>`. Public/verification endpoints may use no auth or a short-lived token.

---

## 1. Share Flow (Photographer / Studio)

Used when the photographer shares the public URL from the studio (web or mobile app).

### 1.1 List existing users / contacts

Returns the list of “existing users” (contacts) that can be selected in the Share modal.

| Field | Value |
|-------|--------|
| **Method** | `GET` |
| **Path** | `/api/public-share/contacts` |
| **Auth** | Required (photographer token) |
| **Query** | Optional: `?search=...` (filter by name/email/mobile), `?limit=50&offset=0` |

**Response (200):**

```json
{
  "contacts": [
    {
      "id": "uuid-or-number",
      "email": "guest@example.com",
      "mobile": "+919876543210",
      "countryCode": "+91",
      "displayName": "Guest User",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 100
}
```

- `mobile`: full E.164 (country code + number) preferred.
- `countryCode`: optional, for display in UI.

**Used by:** Web Share modal, Mobile Share screen.

---

### 1.2 Send share (public URL + message via email/SMS)

Sends the public URL (and optional message) to selected existing contacts and/or new email/mobile recipients.

| Field | Value |
|-------|--------|
| **Method** | `POST` |
| **Path** | `/api/public-share/send` |
| **Auth** | Required (photographer token) |
| **Body** | JSON (see below) |

**Request body:**

```json
{
  "publicUrl": "https://example.com/public/checkout?q=Ab3x...",
  "message": "Optional text message to include in email/SMS",
  "sendTo": {
    "contactIds": ["uuid-1", "uuid-2"],
    "emails": ["new@example.com"],
    "mobiles": ["+919876543210", "+14155551234"]
  },
  "channels": ["email", "sms"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `publicUrl` | string | Full public checkout or selection URL to share. |
| `message` | string | Optional message body. |
| `sendTo.contactIds` | string[] | IDs from `/api/public-share/contacts` (existing users). |
| `sendTo.emails` | string[] | New recipient emails (not in contacts). |
| `sendTo.mobiles` | string[] | New recipient mobiles in E.164 (e.g. `+919876543210`). Mobile app sends country code + number. |
| `channels` | string[] | `"email"`, `"sms"`, or both – how to send for each recipient (can be applied per recipient in a future version). |

**Response (200):**

```json
{
  "success": true,
  "sent": {
    "email": 2,
    "sms": 1
  },
  "failed": []
}
```

**Response (207 or 200 with partial failures):**

```json
{
  "success": true,
  "sent": { "email": 1, "sms": 0 },
  "failed": [
    { "email": "bad@", "reason": "Invalid email" }
  ]
}
```

**Used by:** Web Share modal, Mobile Share screen.

**Storage:** Each successful send (per email and per mobile) is stored in the `public_share_sent` table (see [Share sent storage](#share-sent-storage)) so the UI can check “already sent to this email/mobile” before or after sending.

---

### 1.3 Check recipient (already sent?)

Returns whether the photographer has **already shared** to the given email or mobile. Use this when the user types an email (or mobile) in the Share modal to show e.g. “Already shared to this email” or to allow resend.

| Field | Value |
|-------|--------|
| **Method** | `GET` |
| **Path** | `/api/public-share/check-recipient` |
| **Auth** | Required (photographer token) |
| **Query** | `email` and/or `mobile` (at least one required). Optional: `publicUrl` to scope to “this link only”. |

**Query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | No* | Recipient email to check. |
| `mobile` | string | No* | Recipient mobile (E.164) to check. |
| `publicUrl` | string | No | If provided, `alreadySent` is true only when we have a previous send to this email/mobile **for this exact URL**. If omitted, we check any previous send by this photographer to this email/mobile. |

\* At least one of `email` or `mobile` is required.

**Response (200):**

```json
{
  "alreadySent": true,
  "email": "guest@example.com",
  "mobile": null,
  "publicUrl": "https://example.com/public/checkout?q=Ab3x..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `alreadySent` | boolean | `true` if we have a record of this photographer sharing to this email or mobile (and to this `publicUrl` if provided). |
| `email` | string \| null | The email that was checked (trimmed). |
| `mobile` | string \| null | The mobile that was checked (normalized). |
| `publicUrl` | string \| null | The `publicUrl` used for the check, if provided. |

**Errors:**

- **401** – Missing or invalid photographer token.
- **400** – Neither `email` nor `mobile` provided: `{ "error": "Provide email or mobile" }`.

**Used by:** Web Share modal (e.g. on blur or before send), Mobile Share screen.

---

### Share sent storage

- **Table:** `public_share_sent`. Migration: `database_public_share_sent_migration.sql`.
- **When:** After each successful email or SMS in `POST /api/public-share/send`, one row is inserted per recipient (per email, per mobile).
- **Columns:** `user_id` (photographer), `recipient_email`, `recipient_mobile`, `public_url`, `message`, `created_at`.
- **Purpose:** Support “already sent to this email/mobile” checks via `GET /api/public-share/check-recipient` (optionally scoped by `publicUrl` for “this particular request”).

---

## 2. Verification Flow (Viewer – Public URL)

Used when a visitor opens the public URL (web or mobile). Supports “existing user” check, OTP send, and OTP verify.

### 2.1 Check if current visitor is existing user

Called with the visitor’s session/token or with email/mobile to see if they are already a known user. If the client has no session, the client can call this **after** collecting email/mobile (see 2.2).

| Field | Value |
|-------|--------|
| **Method** | `POST` |
| **Path** | `/api/public-verify/check-user` |
| **Auth** | Optional. If `Authorization: Bearer <token>` is sent, backend may treat as “logged-in” visitor. |
| **Body** | JSON (see below) |

**Request body (option A – session only):**

```json
{}
```

- Backend uses session/token/cookie to identify the user.  
- Response indicates whether that user is a known “protocol” user for this share/album context.

**Request body (option B – email/mobile lookup):**

```json
{
  "email": "guest@example.com",
  "mobile": "+919876543210"
}
```

- Send at least one of `email` or `mobile`.  
- `mobile`: E.164 (country code + number), e.g. `+919876543210`.

**Response (200):**

```json
{
  "isExistingUser": true,
  "userId": "optional-uuid",
  "sendNotification": true
}
```

- `isExistingUser`: if `true`, client can skip OTP and show images (optionally after sending SMS/email via 2.4).  
- `sendNotification`: if `true`, client may call 2.4 to send a one-time SMS/email for audit.

**Used by:** Web public page, Mobile app (after opening public URL or after user enters email/mobile).

---

### 2.2 Send OTP (new or unverified visitor)

Sends an OTP to the given email and/or mobile. Used when the visitor is not an existing user or must verify.

| Field | Value |
|-------|--------|
| **Method** | `POST` |
| **Path** | `/api/public-verify/send-otp` |
| **Auth** | Not required (public). Optional: pass public link token or `linkId` so OTP is tied to this share. |
| **Body** | JSON (see below) |

**Request body:**

```json
{
  "email": "guest@example.com",
  "mobile": "+919876543210",
  "linkId": "optional-share-link-id-or-token",
  "channel": "sms"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | Send OTP to this email. |
| `mobile` | string | E.164 (e.g. `+919876543210`). Send OTP via SMS. |
| `linkId` | string | Optional: share link id / public token so backend can scope OTP to this link. |
| `channel` | string | `"sms"` or `"email"` – which channel to use for this request (if both email and mobile provided, backend may send to one or both per policy). |

- At least one of `email` or `mobile` is required.

**Response (200):**

```json
{
  "success": true,
  "expiresInSeconds": 300,
  "maskedMobile": "+91******3210",
  "maskedEmail": "g***t@example.com"
}
```

**Response (429):**

```json
{
  "success": false,
  "reason": "TOO_MANY_ATTEMPTS",
  "retryAfterSeconds": 60
}
```

**Used by:** Web verification popup, Mobile OTP screen.

---

### 2.3 Verify OTP

Verifies the OTP entered by the user. On success, the client can show the images and optionally store a short-lived access token.

| Field | Value |
|-------|--------|
| **Method** | `POST` |
| **Path** | `/api/public-verify/verify-otp` |
| **Auth** | Not required (public). |
| **Body** | JSON (see below) |

**Request body:**

```json
{
  "email": "guest@example.com",
  "mobile": "+919876543210",
  "otp": "123456",
  "linkId": "optional-share-link-id-or-token"
}
```

- Send the same `email` or `mobile` used in send-otp.  
- `otp`: 4–6 digit string.

**Response (200):**

```json
{
  "success": true,
  "accessToken": "short-lived-jwt-or-opaque-token",
  "expiresInSeconds": 3600,
  "userId": "optional-uuid"
}
```

- `accessToken`: use in subsequent requests to the same public content (e.g. `Authorization: Bearer <accessToken>` or as query param for album/checkout APIs).  
- Client should store this and send it when loading albums/images on the public page.

**Response (400):**

```json
{
  "success": false,
  "reason": "INVALID_OTP"
}
```

**Used by:** Web verification popup, Mobile OTP screen.

---

### 2.4 Send notification to existing user (optional)

When the visitor is an existing user, the client may call this to send an SMS or email (e.g. “You opened a link to …”) for audit or UX.

| Field | Value |
|-------|--------|
| **Method** | `POST` |
| **Path** | `/api/public-verify/notify-existing-user` |
| **Auth** | Optional (session or short-lived token). |
| **Body** | JSON (see below) |

**Request body:**

```json
{
  "userId": "optional-from-check-user",
  "email": "guest@example.com",
  "mobile": "+919876543210",
  "publicUrl": "https://example.com/public/checkout?q=...",
  "channel": "sms"
}
```

- At least one of `userId`, `email`, or `mobile`.  
- `channel`: `"sms"` or `"email"`.

**Response (200):**

```json
{
  "success": true
}
```

**Used by:** Web public page, Mobile app (after “existing user” is detected).

---

## 3. Short share link (existing / optional)

If you use short links with `sid`, these endpoints store and resolve the payload (token, albumId, fileNames).

### 3.1 Create short share link

| Field | Value |
|-------|--------|
| **Method** | `POST` |
| **Path** | `/api/public/share-link` |
| **Auth** | Required (photographer token) |
| **Body** | `{ "token": string, "albumId?: number", "fileNames": string[] }` |
| **Response (200)** | `{ "id": string }` (short id for `?sid=...`) |

### 3.2 Resolve short share link

| Field | Value |
|-------|--------|
| **Method** | `GET` |
| **Path** | `/api/public/share-link/:id` |
| **Auth** | Not required (public) |
| **Response (200)** | `{ "token": string, "albumId?: number | null", "fileNames": string[] }` |

---

## 4. Summary table

| # | Method | Path | Purpose | Used by |
|---|--------|------|---------|--------|
| 1.1 | GET | `/api/public-share/contacts` | List existing users for Share modal | Web, Mobile |
| 1.2 | POST | `/api/public-share/send` | Send public URL + message via email/SMS | Web, Mobile |
| 2.1 | POST | `/api/public-verify/check-user` | Check if visitor is existing user | Web, Mobile |
| 2.2 | POST | `/api/public-verify/send-otp` | Send OTP to email/mobile | Web, Mobile |
| 2.3 | POST | `/api/public-verify/verify-otp` | Verify OTP, return access token | Web, Mobile |
| 2.4 | POST | `/api/public-verify/notify-existing-user` | Notify existing user (SMS/email) | Web, Mobile |
| 3.1 | POST | `/api/public/share-link` | Create short link (optional) | Web |
| 3.2 | GET | `/api/public/share-link/:id` | Resolve short link (optional) | Web, Mobile |

---

## 5. Mobile-specific notes

- **Mobile number:** Always send as E.164 from mobile app (e.g. `+919876543210`). Backend should accept and store without leading zero or space. Country code comes from the app’s country code selector.
- **Share send:** Same `POST /api/public-share/send` with `sendTo.mobiles` as E.164.
- **OTP:** Same send-otp and verify-otp; mobile sends `mobile` with country code.
- **Deep link:** Backend does not need to implement deep link URLs; the app opens the same public URL (e.g. `https://example.com/public/checkout?q=...`) and the verification flow is the same.

---

## 6. Security and rate limits

- **OTP:** Rate limit send-otp per email/mobile (e.g. 3 per 15 minutes). Expire OTP after 5–10 minutes.
- **verify-otp:** Rate limit attempts (e.g. 5 wrong OTPs then block for 15 minutes).
- **check-user:** Rate limit by IP or fingerprint to avoid enumeration.
- **contacts:** Require photographer auth; return only contacts the photographer is allowed to see.
- **CORS:** Allow public endpoints from your web and mobile app origins.

---

## 7. References

- [PUBLIC_URL_VERIFICATION_REQUIREMENTS.md](PUBLIC_URL_VERIFICATION_REQUIREMENTS.md) – Web flow
- [PUBLIC_URL_VERIFICATION_REQUIREMENTS_MOBILE_APP.md](PUBLIC_URL_VERIFICATION_REQUIREMENTS_MOBILE_APP.md) – Mobile flow and UI (including country code)
