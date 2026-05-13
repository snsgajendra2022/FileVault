# Backend API notes (Photo Book / Theme Covers)

This document describes what the **filevault** React app expects from the API for photobooks, covers, images, **Photo Phone Book contacts**, **Our Memories** sharing, and **Studio** album/checkout flows. Use it when aligning or extending your backend to match the current frontend behavior.

---

## Changes summary (old vs new)

This section is a **quick diff** for backend developers. “Old/existing” means the API behavior that already existed in the app; “New” means what was added/relied on by the latest frontend updates.

### New backend work to implement (Photo Phone Book — contacts)

The **Phone Book** UI (`/phonebook`, create/edit/detail) calls a **REST API under `/api/public-share/contacts`**. If your backend does not expose these routes yet, implement them so the app can persist contacts server-side.

| Area | What to build |
|------|----------------|
| **List** | `GET /api/public-share/contacts?search=&limit=&offset=` — returns `{ contacts: [...], total?: number }` or a bare array (see `phoneBookService.ts`). |
| **Get by id** | `GET /api/public-share/contacts/{id}` — returns `{ contact: {...} }` or the contact object; used by detail/edit. If missing, the client falls back to listing (limit 200). |
| **Create** | `POST /api/public-share/contacts` — body with `displayName`, optional `email`, `mobile`, `countryCode`, `avatarUrl`, `notes` (see [Notes + embedded `meta`](#notes--embedded-meta-fv_phonebook_meta)). Response: `{ contact: {...} }` or contact object. |
| **Update** | `PUT /api/public-share/contacts/{id}` — same fields as create (partial updates allowed). |
| **Delete** | `DELETE /api/public-share/contacts/{id}` |

**Auth**: same as the rest of the app (`X-API-KEY` / token via `api` client). Scope contacts to the **authenticated photographer/user**.

**Favorites / recent** in the current app are **client-only** (`phoneBookPrefsStore`); no backend required unless you want sync across devices.

### Studio albums + checkout (usually already implemented)

- **Photo Albums** (`PhotoStudioAlbum.tsx`) and **Studio Checkout** (`StudioCheckout.tsx`) both load albums via **`GET /api/albums`**. Checkout uses a **non-paginated** call; the album page uses **`page`** and **`size`** query params with responses that may be a bare array or `{ albums, page, totalPages }` (and optionally `total`). Backend should accept both styles or document one canonical shape.
- **Per-album images**: `GET /api/albums/{id}/images`, with fallbacks described in the frontend (`405` → alternate routes). See existing app behavior; no new contract beyond what those pages already call.
- **UPI / flags**: `GET/POST/DELETE /api/upi`, `GET /api/flags` — already referenced elsewhere; checkout depends on them for pricing and share channels.

UI-only changes (loading skeletons, spinners) **do not** require new APIs.

### Old / existing behavior (already used)

- **Photobooks list**
  - **API**: `GET /api/photobooks/by-category/{categorySlug}`
  - **Used for**: showing “My Albums”, `templateId` recovery, `hasCovers`, progress info.
- **Template-level covers**
  - **API**: `GET /api/covers?userId=&templateId=`
  - **Used for**: loading saved cover theme records per user + template.
- **Saving covers (legacy)**
  - **API**: `POST /api/covers`
  - **Used for**: saving `{ templateId, frontCover, backCover }` (fallback save path).
- **Image preview**
  - **API**: `GET /api/images/{id}/preview`
  - **Used for**: rendering cover photos/logos via `imageId` (preferred over raw `imageUrl`).

### New changes (added / now required by latest frontend)

- **Per-photobook covers preferred**
  - **API**: `GET /api/photobooks/{id}/covers`, `POST /api/photobooks/{id}/covers`
  - **Behavior**: frontend loads/saves covers **per album** first; template covers are a fallback.
- **Fallback load when photobook covers are empty**
  - **API**: `GET /api/photobooks/{id}/covers` then (if empty) `GET /api/covers?userId=&templateId=`
  - **Behavior**: if both sides have no text and no image, frontend treats it as “empty” and falls back to template record.
- **Authenticated `<img src>` preview**
  - **API**: `GET /api/images/{id}/preview?token=...`
  - **Behavior**: browser image tags cannot send headers; preview endpoint should accept a `token` query param.
- **`logoPosition` supports `top-center`**
  - **API fields**: `frontCover.logoPosition`, `backCover.logoPosition`
  - **Behavior**: new UI exposes **Top Center** and expects backend to accept/return it (hyphenated lowercase recommended).
- **Font family preset expansion**
  - **API field**: `fontFamily`
  - **Behavior**: UI now offers more presets, but backend still stores a **single string** (full CSS stack). See [Font family (cover text)](#font-family-cover-text).
- **Emoji in cover text**
  - **API fields**: `headline`, `subheadline`, `description`
  - **Behavior**: emojis are inserted into the same strings and must be stored/returned correctly (UTF‑8 / utf8mb4).
- **Text-leaf “glass & background” (currently client-side only)**
  - **No API yet** (stored in browser `localStorage` per photobook)
  - **Optional backend extension**: see [Optional backend enhancements](#optional-backend-enhancements-not-required-for-current-app).
- **Floating text labels on the text-side preview (currently client-side only)**
  - **Storage**: same `localStorage` blob as text-leaf extras — key `filevault_cover_leaf_v1_{photobookId}`, JSON `{ front: { …style }, back: { …style } }`.
  - **Field**: `style.textSideOverlays` — array of draggable overlay objects (not sent on `POST` cover APIs today).
  - **UI**: user can add multiple labels, type text, drag via handle, and set font family (CSS stack), weight, size, color, alignment, italic, letter spacing, line height, text shadow.
  - **Optional backend extension**: persist as JSON on each cover side — see [Optional backend enhancements](#optional-backend-enhancements-not-required-for-current-app).

---

## Authentication

- Most requests send **`X-API-KEY: <token>`** (see `getStoredToken()` in the app).
- Some legacy cover writes also send **`Authorization`** — keep accepting both if you already do.
- **Image preview in `<img src>`** cannot send headers. The app appends **`?token=<url-encoded-token>`** to preview URLs such as:
  - `GET /api/images/{imageId}/preview?token=...`
- Your preview endpoint should accept **token query** (and/or session) so browser-loaded images work cross-origin.

---

## Endpoints used by the theme / cover flows

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/photobooks/by-category/{categorySlug}` | List albums for a theme category (cards, `hasCovers`, `templateId`, etc.). |
| `POST` | `/api/photobooks` | Create photobook. Body includes `templateId`, `categorySlug`, `title`. |
| `DELETE` | `/api/photobooks/{id}` | Delete album (cascade pages/covers as you define). |
| `GET` | `/api/photobooks/{id}/covers` | **Preferred** source for saved front/back cover for that album. |
| `POST` | `/api/photobooks/{id}/covers` | **Preferred** save path: body `{ frontCover, backCover }`. |
| `GET` | `/api/covers?userId=&templateId=` | Template-level / user cover rows (used when photobook covers are missing or empty). |
| `POST` | `/api/covers` | **Fallback** save when photobook-scoped POST fails; includes `templateId`, `frontCover`, `backCover`. |
| `GET` | `/api/images/{id}/preview` | Raster preview for `imageId` (used for cover photo, logo, optional text-leaf BG). |

The UI tries **`POST /api/photobooks/{id}/covers` first**, then falls back to **`POST /api/covers`**.

---

## Cover side payload (`frontCover` / `backCover`)

Each side is one object. The frontend maps to/from this shape (see `ApiCoverSide` and `mapPageStateToApiFormat` in `src/pages/PhotoThemeCategoryPage.tsx`).

### Fields the client sends (save)

| Field | Type | Notes |
|-------|------|--------|
| `headline` | string | |
| `subheadline` | string | |
| `description` | string | Optional longer text. |
| `fontSize` | number | Default ~20. |
| `fontWeight` | string | e.g. `"700"`. |
| `align` | `"left"` \| `"center"` \| `"right"` | |
| `position` | `"top"` \| `"center"` \| `"bottom"` | Vertical placement of text block. |
| `fontFamily` | string | **Free-form CSS `font-family` value** (see [Font family (cover text)](#font-family-cover-text) below). Empty string or omitted = browser default (“System”). |
| `headlineColor` | string | Hex, e.g. `#ffffff`. |
| `subheadlineColor` | string | Hex. |
| `imageId` | number | **0** if none. Main cover/last-page **photo** asset. |
| `imageZoom` | number | Scale ~0.8–1.6. |
| `overlayOpacity` | number | 0–100 style range in UI; stored as sent. |
| `gradient` | string | CSS gradient string (client composes from overlay + direction). |
| `overlayColor` | string | Hex. |
| `backgroundBlur` | boolean | |
| `backgroundVignette` | boolean | |
| `backgroundDarkMode` | boolean | |
| `backgroundAnimation` | boolean | |
| `logoImageId` | number | **0** if none. |
| `logoPosition` | string | See below. |
| `logoSize` | number | Pixel-ish scale in UI (e.g. 60). |

### Text fields and emojis

- `headline`, `subheadline`, and `description` are **plain Unicode strings**.
- The UI includes “quick emoji insert” buttons; the backend does **not** receive a separate emoji field — emojis are stored **inside** the same text strings (e.g. `"SNS System ✨📸"`).
- Recommended: store as **UTF‑8**, do not strip non-ASCII, and ensure any DB column/collation supports emoji (e.g. `utf8mb4` on MySQL).

### `logoPosition` (important for recent UI)

The client normalizes several formats. Backend should **accept and return** consistent strings; recommended canonical values:

- `top-left`, `top-center`, `top-right`, `bottom-center`

The app also tolerates legacy/API variants like `TOP_LEFT`, `TOP_CENTER`, etc., and maps them. If you store enums, prefer **lowercase with hyphens** in JSON responses so the client matches without extra mapping.

### Font family (cover text)

- The API should treat **`fontFamily` as an opaque string**: persist whatever the client sends and return it on **GET** unchanged (UTF-8; may contain commas, quotes, and spaces).
- The web UI offers named presets; each preset maps to a **fixed CSS font stack** string. The client **does not** send preset keys (`sans`, `rounded`, …) to the API — it sends the **full stack** below. If you add server-side validation, allow any reasonable length string (e.g. ≤ 500 chars).

| UI label (reference) | Example `fontFamily` value stored/sent |
|----------------------|------------------------------------------|
| System | *(empty or omit — default sans-serif in browser)* |
| Sans-serif | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| Serif | `Georgia, Cambria, "Times New Roman", serif` |
| Monospace | `"SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` |
| Rounded (Nunito-style) | `"Nunito", "Segoe UI", "Helvetica Neue", Arial, sans-serif` |
| Display (condensed) | `"Oswald", "Arial Narrow", "Franklin Gothic Medium", "Helvetica Neue", sans-serif` |
| Elegant serif | `"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif` |
| Script / handwriting | `"Brush Script MT", "Segoe Script", "Lucida Handwriting", "Apple Chancery", cursive` |
| Slab / Rockwell | `Rockwell, "Courier New", "Courier Bold", "Rockwell Nova", serif` |

- **Rendering PDFs or server thumbnails:** resolve these stacks on your stack (e.g. embed fonts or map known stacks to your font files). Named fonts (Nunito, Oswald, …) may fall back on systems where they are not installed; the client relies on normal CSS fallback behavior.
- **Legacy rows:** If you return a custom `fontFamily` that does not exactly match a preset string, the UI still applies it; the dropdown may show the closest matching preset when the user re-opens the editor (`PhotoThemeCategoryPage.tsx`: `FONT_FAMILY_PRESETS` / `fontFamilyStoredToPreset`).

### Fields the client expects when loading (GET)

Same fields as above, plus optional:

| Field | Notes |
|-------|--------|
| `imageUrl` | Optional; client prefers **`imageId`** and builds `/api/images/{id}/preview` because some `imageUrl` values may point at **`.enc`** or non-browser formats. |
| `logoImageUrl` | Optional; same caveat — **`logoImageId`** preferred. |

---

## `GET /api/covers` response shape

- The app calls with **`userId`** and **`templateId`** (string query params).
- Response may be **an array of records** or a single record; the client uses **`response.data[0]`** when it needs one template row.
- Each record should include **`frontCover`** and **`backCover`** objects compatible with the table above.

This is used to:

1. List “user themes” in the category page.
2. **Fallback** when `/api/photobooks/{id}/covers` is missing or both sides are effectively empty (no text and no image).

---

## `GET /api/photobooks/by-category/{slug}`

The list items should include at least:

- `id`, `templateId`, `categorySlug`, `title`, `hasCovers`, `savedPagesCount`, `createdAt`, `updatedAt`, `status`, `currentStep`, `pageCount` (as the UI types expect).

Used for “My albums” and continuing an album with the correct `templateId` for cover fallback.

---

## Image URLs and `.enc`

- For thumbnails and previews, expose **`imageId`** whenever possible.
- If **`imageUrl`** points to encrypted or non-web formats, the **web client will not** use it for `<img>`; it will use **`/api/images/{id}/preview`** instead.

---

## Client-only `localStorage` blob (`filevault_cover_leaf_v1_{photobookId}`)

The theme category editor persists **extras that are not in the standard `ApiCoverSide` payload** in browser storage so the UI can reload them for that album:

- **Shape**: `{ front: Partial<style>, back: Partial<style> }` where `style` matches the rich editor state in `PhotoThemeCategoryPage.tsx` (`pickLeafStyleForStorage` filters what is written).
- **Included today** (non-exhaustive): text-leaf background mode/gradient/image id, glass blur/opacity/tint, and **`textSideOverlays`** (floating labels).
- **Not synced** across devices or browsers until the backend stores equivalent fields.

---

## Optional backend enhancements (not required for current app)

The **text page / glass panel** settings (gradient vs image behind text, blur, glass opacity, tint, optional **text-leaf background image id**) and **floating text overlays** are currently **persisted only in the browser (`localStorage`) per photobook** because they are not part of the cover payload above.

If you want these **server-side** and synced across devices, extend your cover-side model with optional fields, for example:

| Suggested field | Type | Purpose |
|-----------------|------|--------|
| `textLeafBgMode` | `"gradient"` \| `"image"` | |
| `textLeafBgGradient` | string | CSS gradient when mode is gradient. |
| `textLeafBgImageId` | number | FK to images table; 0 = none. |
| `textPanelBlurPx` | number | Frosted panel blur. |
| `textPanelGlassOpacity` | number | 0–100. |
| `textPanelGlassColor` | string | Hex tint for glass. |
| `textSideOverlays` | array | Free-position labels on the **text side** preview. See table below. |

### Suggested `textSideOverlays[]` item shape (if you add it to the API)

Each element mirrors the frontend `TextSideOverlay` type:

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | Stable id for edits (client generates e.g. `tx_<timestamp>_<random>`). |
| `text` | string | UTF-8; may include emoji. |
| `x`, `y` | number | Position as **percent** (0–100) of the text-side preview box (anchor center). |
| `fontSize` | number | e.g. 8–40. |
| `color` | string | Hex (e.g. `#f8fafc`). |
| `fontFamily` | string | Optional; **full CSS `font-family` stack** (same convention as main `fontFamily` on the cover). |
| `fontWeight` | number | e.g. 400, 600, 700, 800. |
| `fontStyle` | `"normal"` \| `"italic"` | |
| `textAlign` | `"left"` \| `"center"` \| `"right"` | |
| `letterSpacing` | number | CSS px-ish value (UI uses roughly −2…8). |
| `lineHeight` | number | e.g. 1–2.5. |
| `textShadow` | boolean | Whether to draw a soft shadow for legibility. |

Then update the React app to read/write these in `mapPageStateToApiFormat` / `mapApiSideToEditableState` and remove or reduce reliance on `localStorage` for `filevault_cover_leaf_v1_*`.

---

## Quick checklist for backend implementers

1. **`POST /api/photobooks/{id}/covers`** accepts JSON `{ frontCover, backCover }` with the fields in the table.
2. **`GET`** the same shape back for that photobook.
3. **`GET /api/covers?userId=&templateId=`** returns cover pairs for fallback and theme editing.
4. **`logoPosition`** supports **`top-center`** (and hyphenated lowercase variants).
5. **Image previews** work via **`GET /api/images/{id}/preview`** with optional **`token`** query for auth.
6. Prefer **`imageId`** over opaque **`imageUrl`** for web previews.
7. **`fontFamily`:** store and return the **full CSS stack string**; do not require enum values — see [Font family (cover text)](#font-family-cover-text).
8. **Floating overlays** are **not** in the current cover JSON contract; they live in **`localStorage`** until you add optional `textSideOverlays` (see [Optional backend enhancements](#optional-backend-enhancements-not-required-for-current-app)).
9. **Photo Phone Book:** implement **`/api/public-share/contacts`** CRUD as in [Photo Phone Book (contacts API)](#photo-phone-book-contacts-api) (list supports `search`, `limit`, `offset`).
10. **Albums for Studio:** support **`GET /api/albums`** with or without pagination (`page`, `size`) and a response that is either an **array of albums** or **`{ albums, page?, totalPages?, total? }`**.

---

## Photo Phone Book (contacts API)

Source of truth in the repo: `src/services/phoneBookService.ts`. Implement these routes for the Phone Book pages (`/phonebook`, `/phonebook/new`, `/phonebook/:id`, edit).

### Endpoints

| Method | Path | Query / body | Response (typical) |
|--------|------|----------------|-------------------|
| `GET` | `/api/public-share/contacts` | `search` (optional), `limit` (default 50), `offset` (default 0) | `{ contacts: Contact[], total?: number }` **or** a JSON array of contacts |
| `GET` | `/api/public-share/contacts/{id}` | — | `{ contact: Contact }` **or** `Contact` |
| `POST` | `/api/public-share/contacts` | JSON body (see below) | `{ contact: Contact }` **or** `Contact` |
| `PUT` | `/api/public-share/contacts/{id}` | Partial body (same fields as create) | `{ contact: Contact }` **or** `Contact` |
| `DELETE` | `/api/public-share/contacts/{id}` | — | `204` or success body |

All routes should be **authenticated** and return only contacts belonging to the current user/tenant.

### `Contact` fields (normalized on the client)

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | Stable id (stringified if numeric from DB). |
| `displayName` | string | Required. |
| `email`, `mobile`, `countryCode` | string | Optional. |
| `avatarUrl` | string | Optional URL. |
| `notes` | string | **User-visible notes only** when `meta` is stored separately; see [Notes + embedded `meta`](#notes--embedded-meta-fv_phonebook_meta). |
| `meta` | object | Optional; see below. Returned by unpacking `notes` if embedded. |
| `createdAt`, `updatedAt` | string | ISO strings optional. |

### `meta` object (optional)

The TypeScript type `PhoneBookContactMeta` includes:

| Field | Purpose |
|-------|--------|
| `whatsapp` | Optional WhatsApp number override. |
| `address`, `city`, `state` | Address fields. |
| `contactType` | One of: `Client`, `Family`, `Bride/Groom`, `Event Organizer`, `Photographer`, `Staff`, `VIP Customer`, `Other`. |
| `tags` | `string[]` (comma-separated in UI). |
| `inviteStatus` | `not_invited` \| `invited` \| `accepted` \| `rejected` (UI labels). |
| `favorite`, `linkedEventIds` | Reserved for future use; may be client-only today. |

### Notes + embedded `meta` (`FV_PHONEBOOK_META:`)

If you prefer **one column** in the database, the frontend can pack `meta` into `notes`:

- Human-readable notes first, then a blank line, then the literal prefix **`FV_PHONEBOOK_META:`** and a **JSON** blob for `meta`.
- On read, `unpackPhoneBookNotes` splits user notes vs meta. On write, `packPhoneBookNotes` merges them.
- Alternatively, store **`meta` as a proper JSON column** on the server and return it in API responses; then you can ignore the embedded format or map it when migrating.

Either way, preserve **UTF-8** for names and notes.

### Public share / invite pickers

Phone book contacts are intended to line up with **recipient pickers** (e.g. Studio Checkout share, memories share) when those flows use **`clientIds`** or contact ids from this service. Keep **id** types consistent (`string` in JSON) so selection sets match.

---

## Our Memories — share with invited users (event gallery)

The React app mirrors the **album share** pattern (`POST /api/simple-invitations/share-album` with `clientIds`).

| `POST` | `/api/simple-invitations/share-memories-event` | Body: `{ eventId, slug, accessToken, clientIds: number[] }` — grant invited users access to this memories event. |
| `GET` | `/api/simple-invitations/shared-memories-events` | Return events shared **with the current user** (invitee). Response may use `sharedMemoriesEvents`, `sharedEvents`, or a bare array; see `memoriesShareService.ts`. |
| `GET` | `/api/simple-invitations/memories-event-guest` | Query: **`slug`** (required), optional **`token`** or **`t`** (gallery access token; client sends both names in API params when present), optional **`shareId`** (recipient share batch id from email/SMS links). Guest URLs should include both when the backend issues per-recipient shares, e.g. `/memories/e/1?guest=1&shareId=38&token=<token>`. |

Invitees open **`/memories/e/{slug}?token={token}`** (legacy **`t=`** still read by the app) from the shared list; the guest endpoint supplies data when local demo storage is empty.

When the host sends share notifications via **`POST /api/public-share/send`** from the event manage modal, the body may include optional booleans **`allowImageUpload`** and **`allowViewEventImages`** (UI: “Images upload” / “View Event Images”). The backend may ignore them until guest permissions are modeled.

Share links built in the app also append **`guest=1`**, **`allowImageUpload=0|1`**, and **`allowViewEventImages=0|1`** so the guest page can show the intro → upload → gallery flow. If the backend replaces `publicUrl` when emailing, it should preserve these query params (and **`shareId`** when present).

**Guest upload (Our Memories public page):** For each file the client calls **`POST /api/images/upload`** (`multipart/form-data`, field **`file`**). When the response returns an **`imageId`**, **if the guest entered an upload note** the client then calls **`POST /api/memories/events/{eventId}/image`** with JSON **`{ "imageId", "comments" }`** and **`POST /api/memories/events/{eventId}/images/{imageId}/comments`** with **`{ "text": "<same note>" }`**, both with **`Authorization: Bearer`** from the share link’s **`token`** (or legacy **`t`**) query when the user is not logged in. If the note is empty, only the image upload runs (link the image to the event another way if your backend requires it).

Event payloads may include **`description`** / **`summary`** (or **`details`** / **`subtitle`**) for the guest intro screen, and optional **`eventType`** (or **`type`** / **`eventCategory`**) — string such as `wedding` | `birthday` | `corporate` | `family` | `other` — used for welcome-screen imagery.

---

## Our Memories — event CRUD (host dashboard)

The Memories photographer dashboard pages (`src/pages/memories/*`) now expect **API-backed events** (not browser-only demo data).

### Endpoints (host)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/memories/events` | List events for the current authenticated host. Response may be `{ events: [...] }` or a bare array. |
<<<<<<< HEAD
| `POST` | `/api/memories/events` | Create event. Body: `{ name, dateTime, location, privacy }`. Response: `{ event: ... }` or event object. |
| `GET` | `/api/memories/events/{id}` | Fetch one event with images. Response: `{ event: ... }` or event object. |
| `PUT` | `/api/memories/events/{id}` | Update event fields (`name`, `dateTime`, `location`, `privacy`, optional `coverImageUrl`). |
=======
| `POST` | `/api/memories/events` | Create event. Body: `{ name, dateTime, location, privacy? }` (UI defaults **`privacy` to `invite`**), optional **`summary`**, **`description`**, **`eventType`**, **`coverImageUrl`**, **`photobookNeeded`** (default false), **`photobookTemplateId`** (valid `photo_themes` / photobook template id), **`photobookThankYouMessage`**. Response: `{ event: ... }` or event object. |
| `GET` | `/api/memories/events/{id}` | Fetch one event with images. Response: `{ event: ... }` or event object. Optional query: **`token`** or **`t`** (access token; client may send both), **`shareId`** — used when opening a numeric guest URL so unauthenticated clients can load the event. |
| `PUT` | `/api/memories/events/{id}` | Partial update: `name`, `dateTime`, `location`, `privacy`, `coverImageUrl`, optional `summary`, `description`, `eventType`, `photobookNeeded`, `photobookTemplateId` (null clears when turning photobook off), `photobookThankYouMessage` (empty string clears thank-you per API rules). |
>>>>>>> 7afa926ef02389846adaefa80bb2f779124d6050
| `DELETE` | `/api/memories/events/{id}` | Delete event. |
| `POST` | `/api/memories/events/{id}/images` | Attach uploaded images to event. Body: `{ imageIds: (number|string)[] }`. |

### Images in event payload

The UI expects each image to provide (names are flexible; the client maps several aliases):

- `id`
- `thumbUrl` (or `thumbnailUrl` / `previewUrl`)
- `hdUrl` (or `fullUrl` / `downloadUrl`)
- `likes` (or `likeCount`) optional

### Notes

<<<<<<< HEAD
=======
- **Guest gallery URL (`/memories/e/{slug}`):** The host app includes **`token`** and legacy **`t`** (same value) plus `guest`, `allowImageUpload`, and `allowViewEventImages`. If **`POST /api/public-share/send`** (or email/SMS templates) append **`shareId`**, they must **merge** into the existing query string and **must not drop** `token` / `t`. When **`slug` is numeric** (e.g. `/memories/e/3`), the client **only** calls **`GET /api/memories/events/{id}?t=<token>&token=<token>&shareId=<id>`** (query params only for that GET — same whether the site is opened on `localhost` or a LAN/public URL). Non-numeric slugs use **`GET /api/simple-invitations/memories-event-guest`**.
>>>>>>> 7afa926ef02389846adaefa80bb2f779124d6050
- **Privacy** is shown in the events list via icon (`public` / `invite` / `private`). Backend can store `privacy` as a string field.
- **Likes & comments** are still client-only for now; if you want persistence, add endpoints under `/api/memories/...` and return `likes` / `comments` on each image.

## Likes & comments in Our Memories (current status)

- **Likes**: currently stored client-side in Zustand/localStorage for demo events (`toggleLike` in `memoriesStore.ts`). Not persisted for remote guest-loaded events.
- **Comments**: currently client-side only (`addComment` in `memoriesStore.ts`). No backend API is implemented yet.

If you want backend persistence later, add endpoints like:
- `POST /api/memories/events/{eventId}/images/{imageId}/likes`
- `GET /api/memories/events/{eventId}/images/{imageId}/comments`
- `POST /api/memories/events/{eventId}/images/{imageId}/comments`

### Payloads (frontend expectation)

#### `POST /api/memories/events/{eventId}/images/{imageId}/likes`

- **Body**: `{ "delta": 1 }` to like, `{ "delta": -1 }` to unlike (dislike)
- **Response (200)**: `{ "success": true, "likes": 12 }` (or any shape; client only needs success)

#### `GET /api/memories/events/{eventId}/images/{imageId}/comments`

- **Response (200)**:

```json
{
  "comments": [
    { "id": "c_1", "text": "Nice!", "createdAt": "2026-04-08T14:28:00.000Z" }
  ]
}
```

#### `POST /api/memories/events/{eventId}/images/{imageId}/comments`

- **Body**: `{ "text": "Nice!" }`
- **Response (200)**:

```json
{
  "comment": { "id": "c_1", "text": "Nice!", "createdAt": "2026-04-08T14:28:00.000Z" }
}
```

---

## OpenClaw assistant (optional)

The React app can show **`/studio/openclaw`** when `REACT_APP_OPENCLAW_ENABLED=true`. The SPA **never** talks to the OpenClaw Gateway directly; it uses the same **`api` axios client** (`REACT_APP_API_URL`) and expects your backend to proxy to the Gateway (WebSocket or HTTP, per your deployment).

Configurable path prefixes (defaults below) come from `.env` — see `.env.example`.

| Method | Path (default) | Purpose |
|--------|----------------|---------|
| `POST` | `/api/openclaw/chat` | Body: `{ message: string, sessionId?: string, context?: object }`. Response: include assistant text as **`reply`** or **`message`** or **`text`**, and optionally **`sessionId`**. |
| `POST` | `/api/openclaw/voice` | Same as chat; body uses **`transcript`** instead of `message` (frontend sends STT text). |
| `POST` | `/api/openclaw/image` | `multipart/form-data` with field **`file`**; optional **`sessionId`**, **`prompt`**, **`context`** (JSON string of the same object as chat). Response: same text fields as chat. |
| `POST` | `/api/openclaw/session` | Create or reset server-side session; response: **`sessionId`** (optional). |

**`context` (live UI data from the SPA)**  
The client may send **`context`**: `{ path: string, memoriesEvent?: { id, name, dateTime, location, imageCount } }` when the user is on a Memories event detail page (`/memories/events/:id`). Your bridge or server can pass this into the model so answers match the open event. The dev server (`openclaw-dev-server.js`) appends it to OpenAI user messages when **`OPENAI_API_KEY`** is set.

**Optional navigation (assistant → in-app routes)**  
If the JSON body includes **`navigateTo`** (string path starting with `/`, on the allowlist enforced in the SPA — see `src/utils/openclawNavigation.ts`; includes e.g. `/memories/events`, `/studio/albums`), the React app navigates there after showing the reply. Same for nested **`navigation.path`**. The dev mock server sets `navigateTo` from common phrases (e.g. “events”, “event get”). Your real OpenClaw/backend proxy can return `navigateTo` when the agent decides to open a screen.

**Auth**: use the same Bearer token as other authenticated routes. If a route is missing, the UI shows an error string from **`error`** or **`message`** in the JSON body when possible.

### Local development (this repo)

`npm start` runs **Create React App** and **`server/openclaw-dev-server.js`** together (via `concurrently`). Set **`REACT_APP_OPENCLAW_DEV_URL=http://localhost:9093`** (and **`OPENCLAW_DEV_PORT=9093`** if you change the port) so the SPA sends OpenClaw requests to this Node helper while **`REACT_APP_API_URL`** stays your main backend for the rest of the app. Remove **`REACT_APP_OPENCLAW_DEV_URL`** for production builds so OpenClaw calls go to **`REACT_APP_API_URL`** only.

The **OpenClaw CLI** is listed in **`package.json`** as dependency **`openclaw`** (use a real release such as **`2026.4.9`**; **`0.0.1`** on npm is an unrelated empty placeholder with no binary). Run it from the repo with **`npm run openclaw:onboard`** or **`npm run openclaw -- <args>`**; the CLI currently requires **Node.js ≥ 22.12** (upgrade if `openclaw` exits asking for a newer Node).

### Real assistant (not “demo” text)

The browser **cannot** run the OpenClaw Gateway; something **server-side** must talk to your model or to [OpenClaw](https://docs.openclaw.ai/). Use one of these:

**A — `OPENCLAW_BRIDGE_URL` (recommended for OpenClaw / your Java API)**  
Set in **`.env`** next to the dev server (or your production Node layer):

- **`OPENCLAW_BRIDGE_URL`** — full URL to **your** HTTP endpoint, e.g. `http://127.0.0.1:8080/internal/openclaw-bridge`. **Do not** set this to `http://localhost:9093` (that is the CRA companion dev server itself, not the bridge).
- Optional **`OPENCLAW_BRIDGE_TOKEN`** — the dev server sends it as `Authorization: Bearer …` on every bridge POST (the SPA’s `Authorization` header overrides when present). After **`openclaw onboard`**, read the gateway token with **`openclaw config get gateway.auth.token`** ([OpenClaw config](https://docs.openclaw.ai/gateway/configuration)); use that string here **only if** your bridge validates the same secret. Otherwise leave empty.

**POST body** (JSON) from `server/openclaw-dev-server.js`:

```json
{
  "kind": "chat" | "voice" | "image",
  "message": "…",
  "transcript": "…",
  "prompt": "…",
  "sessionId": "…",
  "context": { }
}
```

**Response** (JSON): at least one of **`reply`**, **`message`**, or **`text`**, plus optional **`sessionId`**, **`navigateTo`**, or **`navigation.path`** (same allowlist as the SPA).

Your bridge implementation should call the OpenClaw Gateway (WebSocket / CLI / whatever you run), execute tools (e.g. upload images, call your REST APIs), and return natural language + optional `navigateTo`.

**B — `OPENAI_API_KEY` (quick real LLM without OpenClaw)**  
If set, the dev server calls **OpenAI Chat Completions** (`OPENAI_MODEL`, default `gpt-4o-mini`; optional **`OPENAI_API_BASE`** for Azure or proxies). It uses a short system prompt about OM routes. The model may end its reply with a line `NAVIGATE:/memories/events` (only allowed paths); the server strips that line and sets **`navigateTo`**. Image uploads use **vision** on the same model when the file is present.

**C — Production**  
Implement **`POST /api/openclaw/*`** on **`REACT_APP_API_URL`** the same way as the bridge contract above, and **do not** set `REACT_APP_OPENCLAW_DEV_URL` in the build env.

**Security**: never expose `OPENAI_API_KEY` or OpenClaw tokens to the React bundle — only in server env.

*Generated for alignment with the filevault frontend (Photo theme category page, PhotoBook hub, album builder, Photo Phone Book, Studio checkout, Our Memories). Update this file when API contracts change.*
