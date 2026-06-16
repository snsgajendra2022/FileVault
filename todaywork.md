# Today's Work — 13 Apr 2026

## Photobook — load and save by book ID

- When a photobook is selected, pages and covers load and save only for that `photobookId`.
- We no longer mix in data from other books via old album-page or cover APIs.
- Save uses only `POST /api/photobooks/{id}/pages` (no bulk album-pages fallback).
- `PUT /api/photobooks/{id}` for book details is unchanged.

### Deep links

- URL pattern: `/photo-themes/{categorySlug}/album?photobookId=…&templateId=…`
- `photobookId` and `templateId` come from (in order): navigation state → URL params → `localStorage` (`photobook_{categorySlug}`).
- If only `photobookId` is in the URL, `GET /api/photobooks/{id}` fills in `templateId`.
- Category recovery is skipped when `photobookId` is set but template is still missing — so a deep link is not replaced by the latest book in that category.

### Load rules

| Case | Pages | Covers |
|------|-------|--------|
| Has `photobookId` | `GET /api/photobooks/{id}/pages` | `GET /api/photobooks/{id}/covers` |
| No book, has `dbTemplateId` | `GET /api/album-pages?userId&templateId` | `GET /api/covers?userId&templateId` |

### PhotoThemeCategoryPage

- With `photobookId`: covers only from `GET /api/photobooks/{id}/covers`.
- Without `photobookId` but with `activeTemplateId`: legacy `GET /api/covers`.
- Added `activeTemplateIdRef` (with `photobookIdRef`) to avoid stale API responses.

---

## PhotoStudioAlbum — ZIP download

- New button to download album images as a ZIP.
- Works for selected albums (toolbar) or the open album (detail view).
- Fetches images with axios, builds ZIP with JSZip, triggers browser download.

---

## Our Memories — guest links and uploads

- Share URL, QR, and `publicUrl` use localStorage token when present; otherwise event guest token.
- `addImagesToMemoriesEvent`: optional token in JSON body; optional `bearerToken` for guest uploads.
- Event APIs still use `accessToken` where required.

---

## Earlier baseline (9 Apr)

- Guest token and `t` on query and APIs.
- `getMemoriesShareAccessTokenFromSearchParams`.
- Manage page mints access token when missing.
- Guest gallery URL normalization.
- `backend.md` Our Memories section.
- Glass hero, thumbnails, MemoriesLightbox, imageGroups, shareId, guest welcome (en + hi).

---

*Replace this file next session with that day’s notes.*
