Today’s work — 13 Apr 2026

Photobook scoping: when a photobook is selected, pages and covers load and save only for that photobookId.

No fallback to GET /api/album-pages?userId&templateId or GET /api/covers?userId&templateId in that case, so another book’s legacy rows are not merged in.

PhotoThemeAlbumBuilderPage: useSearchParams for deep links /photo-themes/{categorySlug}/album?photobookId=…&templateId=….

Initial dbTemplateId and photobookId: navigation state (dbTemplateId, templateId, photobookId), then query params, then localStorage photobook_{categorySlug}.

If only photobookId is known, GET /api/photobooks/{id} fills templateId.

by-category recovery skips when photobookId is set but template is still missing, so a deep link is not replaced by the latest book in the category.

Load: if photobookId then only GET /api/photobooks/{id}/pages (empty allowed); else if dbTemplateId then GET /api/album-pages?userId&templateId.

Covers: photobook path only GET /api/photobooks/{id}/covers; else GET /api/covers with userId and templateId.

Save: only POST /api/photobooks/{id}/pages; removed POST /api/album-pages/bulk fallback. Best-effort PUT /api/photobooks/{id} unchanged.

PhotoThemeCategoryPage: with photobookId, only GET /api/photobooks/{id}/covers for saved covers; no /api/covers fallback when editing a book.

Without photobookId but with activeTemplateId, legacy GET /api/covers. activeTemplateIdRef added with photobookIdRef for stale request guards.

PhotoStudioAlbum: added bulk images download as a ZIP file button.

ZIP download: downloads images for the selected album(s) (top toolbar) or the currently open album (album detail view), fetches blobs via axios api client, zips with JSZip, and triggers a browser download.

Our Memories: pickTokenForMemoriesGuestLinkUrl uses localStorage token when present else event guest token for share URL, QR, publicUrl on MemoriesEventManagePage; API still uses event accessToken where required.

addImagesToMemoriesEvent: optional token in JSON body from localStorage; optional bearerToken for Authorization on guest uploads.

Earlier baseline (9 Apr): guest token and t on query and APIs; getMemoriesShareAccessTokenFromSearchParams; manage mints access token when missing; guest gallery URL normalization; backend.md Our Memories; glass hero, thumbnails, MemoriesLightbox, imageGroups, shareId, guest welcome, en and hi.

Replace this file next session with that day’s notes.
