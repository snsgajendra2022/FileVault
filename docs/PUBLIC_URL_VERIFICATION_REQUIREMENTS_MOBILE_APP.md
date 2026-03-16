# Public URL Verification & Share – Mobile App Requirements

## Overview
This document describes the **mobile app** requirements for:
1. **Share flow** – Sending the public URL to recipients (existing users or by email/mobile) from the studio in the app.
2. **Verification flow** – When a user opens a public URL in the mobile app, verifying identity (existing user vs new user with OTP) before showing images.
3. **Pagination (infinite scroll)** – Loading albums/images in lists: scroll down → show loading → load more.

All flows below assume **mobile-first UI** and include **mobile number input with country code**.

**Backend API spec:** [BACKEND_API_PUBLIC_SHARE_VERIFICATION.md](BACKEND_API_PUBLIC_SHARE_VERIFICATION.md)  
**Paginated APIs reference:** [FRONTEND_API_REFERENCE.md](FRONTEND_API_REFERENCE.md)

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

### 2.5 Complete verification flow (API-level, mobile app)

Use this as the **single source of truth** for implementing the verification gate when the user opens a public URL (e.g. `/public/checkout` or `/public/selection`) in the mobile app.

**URL params to read:** `sid`, `q`, `token`, `shareId` (optional). Resolve effective `linkId` (token) and optional `shareId` (number) from `sid` or `q` or direct `token`/`shareId` as per backend.

**Step 1 – Initial check (on screen load)**

- **Request:** `POST /api/public-verify/check-user`  
  **Body:**  
  - If URL has `shareId`: `{ "id": shareId }` (number).  
  - Else: `{}` (backend may use session if any).
- **Response fields (use both names for compatibility):**
  - `isExistingUser` or `existingUser` (boolean)
  - `sendNotification` (boolean)
  - `userId` (string, optional)
  - `message` (string, optional)

**Step 2 – Branch on response**

- **If `isExistingUser` / `existingUser` is false**  
  → Show **input screen**: Email and/or Mobile (country code + number).  
  → On submit go to **Step 3 (Submit email/mobile)**.

- **If `isExistingUser` / `existingUser` is true and `sendNotification` is false**  
  → **Do not navigate.**  
  → Show **message only** (use `message` from response; e.g. in a dialog or inline).  
  → User stays on the same verification screen; **do not** grant access to images.

- **If `isExistingUser` / `existingUser` is true and `sendNotification` is true**  
  → If backend returned `userId`:  
    - Call **send OTP** (see below) with `userId` + `linkId` + optional `id: shareId`.  
    - Show **OTP screen**; on success grant access.  
  → If no `userId`: show input screen; on submit call check-user again, then follow same rules (message only vs OTP).

**Step 3 – Submit email/mobile (user entered in form)**

- **Request:** `POST /api/public-verify/check-user`  
  **Body:** `{ "email": "…"?, "mobile": "+…"?, "id": shareId? }` (at least one of email/mobile).
- **Response:** same as Step 1.

  - **If existing user and `sendNotification` false**  
    → Show `message` only; **do not** grant access.  
  - **If existing user and `sendNotification` true**  
    → Call **send OTP** with `email`/`mobile` (and `linkId`, `id` if needed); show **OTP screen**.  
  - **If not existing user**  
    → Call **send OTP** with `email`/`mobile`; show **OTP screen**.

**Step 4 – Send OTP**

- **Request:** `POST /api/public-verify/send-otp`  
  **Body (one of):**  
  - By user id (existing user, sendNotification true):  
    `{ "userId": "<from check-user>", "linkId": "<effectiveToken>", "id": shareId? }`  
  - By email/mobile:  
    `{ "email": "…"?, "mobile": "+…"?, "channel": "sms"|"email", "linkId": "<effectiveToken>", "id": shareId? }`
- **Success:** Show OTP input screen; optionally show “Resend OTP” (same request).

**Step 5 – Verify OTP**

- **Request:** `POST /api/public-verify/verify-otp`  
  **Body:**  
  - If you have `userId` (from send-otp-by-userId flow):  
    `{ "userId": "<userId>", "otp": "123456", "linkId": "<effectiveToken>", "id": shareId? }`  
  - Else:  
    `{ "email": "…"?, "mobile": "+…"?, "otp": "123456", "linkId": "<effectiveToken>", "id": shareId? }`
- **Success (e.g. `response.success === true`):**  
  - Store `accessToken` if returned; use for subsequent album/image API calls.  
  - Mark session as “verified” for this link (e.g. in memory or secure storage).  
  - **Navigate to content** (show albums/images).

**Optional – Notify existing user**

- When you **grant access** to an existing user and `sendNotification` was true, you may call:  
  `POST /api/public-verify/notify-existing-user`  
  **Body:** `{ "userId": "…"?, "publicUrl": "<current page URL>", "channel": "email"|"sms" }`  
  (Backend may send an SMS/email for audit.)

**Resend OTP (mobile)**

- If current flow used `userId`: resend with same send-otp body (userId + linkId + id).  
- If current flow used email/mobile: resend with same send-otp body (email/mobile + channel + linkId + id).

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
## 4. Pagination (infinite scroll) – mobile app

List screens (albums, images, shared albums) should use **infinite scroll**: as the user scrolls down and reaches the end of the current list, the app shows a **loading** indicator, fetches the **next page**, then **appends** the new items and hides loading. No “Previous/Next” buttons; just “scroll down → load more.”

### 4.1 Behaviour

1. **Initial load:** Request **first page** with `page=0` and `size=20` (or your chosen page size, max 100).
2. **Display:** Render the returned items in the list (e.g. `FlatList` / `RecyclerView`).
3. **Scroll:** When the user **scrolls near the bottom** (e.g. last item visible or within a small threshold):
   - Show a **loading indicator** (e.g. spinner or “Loading…” at the bottom).
   - If there is a **next page** (`page + 1 < totalPages`), call the **same API** with `page = currentPage + 1` and same `size`.
   - **Append** the new items to the list.
   - Hide the loading indicator.
4. **Stop:** When `page + 1 >= totalPages` or `totalPages === 0`, do not request more; optionally show “No more items” or nothing.

### 4.2 APIs that support pagination

Use query params **`page`** (0-based) and **`size`** (default 20, max 100). Response includes **`page`**, **`size`**, **`totalPages`**, and either **`total`** or **`totalImages`**.

| Use case | Method | Path | Auth | Response list field | Total field |
|----------|--------|------|------|---------------------|-------------|
| User albums | GET | `/api/albums` | Required (header) | `albums` | `total` |
| All user images | GET | `/api/images/user/all` | `token` (query) | `images` | `totalImages` |
| Shared albums | GET | `/api/simple-invitations/shared-albums` | Required (header) | `sharedAlbums` | `total` |
| Shared album images | GET | `/api/simple-invitations/albums/{albumId}/images` | Required (header) | `images` | `totalImages` |

**Example – first page:**  
`GET /api/albums?page=0&size=20`  
**Example – next page (infinite scroll):**  
`GET /api/albums?page=1&size=20`

**Example – user images (with token):**  
`GET /api/images/user/all?token=YOUR_TOKEN&page=0&size=20`  
Next: `page=1`, same `size` and `token`.

### 4.3 Pseudocode (infinite scroll)

```
state: items = [], page = 0, totalPages = 1, loading = false

onMount:
  loadPage(0)

onScrollNearBottom():
  if loading or (page + 1 >= totalPages): return
  loading = true
  showLoadingIndicator()
  loadPage(page + 1)

loadPage(nextPage):
  response = API.get(path, { params: { page: nextPage, size: 20 } })
  if nextPage === 0:
    items = response.data.<listField>   // e.g. albums, images
  else:
    items = items.concat(response.data.<listField>)
  page = response.data.page
  totalPages = response.data.totalPages
  loading = false
  hideLoadingIndicator()
  render(items)
```

Replace `<listField>` with the correct key for that API (`albums`, `images`, `sharedAlbums`, etc.).

### 4.4 UI summary

| Element | Requirement |
|--------|-------------|
| **List** | Use a virtualized list (e.g. `FlatList`, `RecyclerView`) that supports onEndReached / onScroll. |
| **Loading** | When fetching next page, show a small spinner or “Loading…” at the bottom of the list. |
| **End** | When no more pages, optionally show “No more items” or nothing; do not show loading. |

---
## 5. Terminology
| Term | Meaning |
|------|---------|
| **Public URL** | Link to public checkout/selection (with `q`, `sid`, or token/albumId); openable in app via deep link. |
| **My protocol** | Your system’s set of users (contacts) identifiable by email/mobile or session. |
| **Existing user** | User already known in “my protocol” (e.g. by app login or contact list). |
| **OTP** | One-time password sent via SMS and/or email. |
| **Country code** | Prefix for mobile number (e.g. +91 for India, +1 for US). |
---
## 6. Open Points / To Define (Mobile)
- **Existing users source:** Which API provides “existing users” in the Share screen?
- **Session in app:** How does the app know “current user” on the public URL screen (token, device id)?
- **Country code list:** Full list vs top N + search; default country (e.g. +91).
- **OTP channel:** SMS only, email only, or both (and who chooses).
- **Dedupe rule:** Match by full mobile (country code + number) and/or email.
- **Deep linking:** Exact URL scheme/path for opening public URLs in the app.
- **Copy:** Exact texts for screens, errors, and SMS/email.
- **Backend:** Endpoints for send message, send OTP, verify OTP, “user exists” check (same as web or mobile-specific).

**Backend API spec:** [BACKEND_API_PUBLIC_SHARE_VERIFICATION.md](BACKEND_API_PUBLIC_SHARE_VERIFICATION.md)


# Frontend API Reference

This document lists backend API names, endpoints, and request/response shapes for frontend integration. Base URL: `{API_BASE}` (e.g. `http://192.168.1.40:9090`).

**Auth:** Most endpoints use `Authorization: Bearer <token>` or `Authorization: Token <token>` or `X-API-KEY: <token>`. Query param `token` is used where noted.

**Pagination:** The following list APIs support pagination. Always send `page` (0-based) and `size` (default **20**, max 100). Response bodies include:
- `page`, `size`, `totalPages`
- `total` (for albums) or `totalImages` (for images)

Use these for "Load more" buttons or page-number UI. First page: `?page=0&size=20`.

---

## 1. Paginated APIs (Albums & Images)

All list endpoints support **pagination** with query params `page` (0-based) and `size` (default **20**). Responses include `total`, `page`, `size`, `totalPages`.

### 1.1 Get User Albums

| API Name | Method | Path | Auth |
|----------|--------|------|------|
| Get User Albums | GET | `/api/albums` | Required (header) |

**Query params**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 0 | Page index (0-based) |
| `size` | number | 20 | Page size (max 100) |

**Response (200)**

```json
{
  "albums": [
    {
      "id": 1,
      "name": "Album name",
      "description": "...",
      "imageCount": 5,
      "images": [...],
      "coverImageId": 2,
      "coverImageUrl": "https://...",
      "isPublic": false,
      "isPhotoFromAlbumEnabled": true,
      "perAlbumPrice": 100,
      "perPhotoPrice": 10,
      "createdAt": "2025-01-15T10:00:00",
      "updatedAt": "2025-01-15T10:00:00"
    }
  ],
  "total": 25,
  "page": 0,
  "size": 20,
  "totalPages": 2
}
```

**Frontend usage:** Use `page` and `size` for “Load more” or page numbers. First load: `?page=0&size=20`.

---

### 1.2 Get All User Images

| API Name | Method | Path | Auth |
|----------|--------|------|------|
| Get All User Images | GET | `/api/images/user/all` | Token in query |

**Query params**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `token` | string | Yes | — | API token |
| `page` | number | No | 0 | Page index (0-based) |
| `size` | number | No | 20 | Page size (max 100) |

**Response (200)**

```json
{
  "images": [
    {
      "id": 14,
      "previewUrl": "https://.../api/images/14/preview?token=...",
      "thumbnailUrl": "https://.../api/images/14/thumbnail?token=...",
      "downloadUrl": "https://.../api/images/14/download?token=...",
      "enabledServices": { "googleDrive": "enabled", "backblazeB2": "enabled", "s3": "enabled" },
      "cloudLinks": { ... },
      "thumbnailCloudLinks": { ... },
      "filename": "image.png",
      "fileType": "png",
      "uploadTime": "2025-08-25T16:07:16",
      "hasThumbnail": true
    }
  ],
  "totalImages": 45,
  "page": 0,
  "size": 20,
  "totalPages": 3
}
```

**Frontend usage:** First load: `?token=YOUR_TOKEN&page=0&size=20`. Use `totalImages` and `totalPages` for pagination UI.

---

### 1.3 Get Shared Albums

| API Name | Method | Path | Auth |
|----------|--------|------|------|
| Get Shared Albums | GET | `/api/simple-invitations/shared-albums` | Required (header) |

**Query params**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 0 | Page index (0-based) |
| `size` | number | 20 | Page size (max 100) |

**Response (200)**

```json
{
  "success": true,
  "message": "Shared albums retrieved successfully",
  "sharedAlbums": [
    {
      "albumId": 1,
      "albumName": "Shared Album",
      "sharedByUserId": 2,
      "sharedByUsername": "user2",
      "sharedByEmail": "user2@example.com",
      "sharedAt": "2025-01-15T10:00:00"
    }
  ],
  "total": 5,
  "page": 0,
  "size": 20,
  "totalPages": 1
}
```

---

### 1.4 Get Shared Album Images

| API Name | Method | Path | Auth |
|----------|--------|------|------|
| Get Shared Album Images | GET | `/api/simple-invitations/albums/{albumId}/images` | Required (header) |

**Path**

| Param | Type | Description |
|-------|------|-------------|
| `albumId` | number | Album ID |

**Query params**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 0 | Page index (0-based) |
| `size` | number | 20 | Page size (max 100) |

**Response (200)**

```json
{
  "success": true,
  "message": "Album images retrieved successfully",
  "albumId": 1,
  "albumName": "Album name",
  "images": [
    {
      "id": 10,
      "originalFilename": "photo.jpg",
      "storedFilename": "...",
      "uploadTime": "2025-01-15T10:00:00",
      "previewUrl": "https://...",
      "downloadUrl": "https://...",
      "thumbnailUrl": "https://...",
      "googleDriveViewUrl": "...",
      "b2PublicUrl": "...",
      "s3PublicUrl": "..."
    }
  ],
  "totalImages": 50,
  "page": 0,
  "size": 20,
  "totalPages": 3
}
```

---
