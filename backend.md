# Backend API notes (Photo Book / Theme Covers)

This document describes what the **filevault** React app expects from the API for photobooks, covers, and images. Use it when aligning or extending your backend to match the current frontend behavior.

---

## Changes summary (old vs new)

This section is a **quick diff** for backend developers. “Old/existing” means the API behavior that already existed in the app; “New” means what was added/relied on by the latest frontend updates.

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

## Optional backend enhancements (not required for current app)

The **text page / glass panel** settings (gradient vs image behind text, blur, glass opacity, tint, optional **text-leaf background image id**) are currently **persisted only in the browser (`localStorage`) per photobook** because they are not part of the cover payload above.

If you want these **server-side** and synced across devices, extend your cover-side model with optional fields, for example:

| Suggested field | Type | Purpose |
|-----------------|------|--------|
| `textLeafBgMode` | `"gradient"` \| `"image"` | |
| `textLeafBgGradient` | string | CSS gradient when mode is gradient. |
| `textLeafBgImageId` | number | FK to images table; 0 = none. |
| `textPanelBlurPx` | number | Frosted panel blur. |
| `textPanelGlassOpacity` | number | 0–100. |
| `textPanelGlassColor` | string | Hex tint for glass. |

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

---

*Generated for alignment with the filevault frontend (Photo theme category page, PhotoBook hub, album builder). Update this file when API contracts change.*
