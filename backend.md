# Backend API notes (Photo Book / Theme Covers)

This document describes what the **filevault** React app expects from the API for photobooks, covers, and images. Use it when aligning or extending your backend to match the current frontend behavior.

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
| `fontFamily` | string | May be empty; client sends CSS stack strings sometimes. |
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

### `logoPosition` (important for recent UI)

The client normalizes several formats. Backend should **accept and return** consistent strings; recommended canonical values:

- `top-left`, `top-center`, `top-right`, `bottom-center`

The app also tolerates legacy/API variants like `TOP_LEFT`, `TOP_CENTER`, etc., and maps them. If you store enums, prefer **lowercase with hyphens** in JSON responses so the client matches without extra mapping.

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

---

*Generated for alignment with the filevault frontend (Photo theme category page, PhotoBook hub, album builder). Update this file when API contracts change.*
