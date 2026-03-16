# Mobile app: Select album and upload images to selected album

Use this as the prompt/spec to implement **album selection** and **upload images to the selected album** in the mobile app, matching the web Upload page behavior.

---

## 1. Requirements

- User can **select an album** (optional) before or when adding files.
- When an album is selected, **new files added to the queue** should be tagged with that album id.
- After each image **upload completes**, add that image to the selected album via the API (if the upload was tagged with an album id).
- User can **create a new album** from the upload screen and then select it.

---

## 2. APIs

**Get current user's albums (list):**
- `GET /api/albums`
- Auth: `Authorization: Bearer <token>` (use same token rules as upload: "My account" = localStorage token; invited user = inviter token when uploading to client account)
- Response shape: `{ albums: [{ id: number, name: string, description?, imageCount?, ... }] }` or array of album objects.

**Create album:**
- `POST /api/albums`
- Body (JSON): `{ name: string, description?: string, isPublic?: boolean, perAlbumPrice?: number, perPhotoPrice?: number }`
- Auth: Bearer token.
- Response: includes `id` of the new album.

**Upload image (to my account):**
- `POST /api/images/upload`
- Body: `multipart/form-data` with `file`.
- Auth: For "My account" use **token from localStorage**. For invited users uploading to their own account, still use localStorage token when destination is "My account".
- Response: `{ id?: number, image?: { id?: number }, imageId?: number, ... }`. Capture the image id for "add to album".

**Add images to album (after upload):**
- `POST /api/albums/{albumId}/images`
- Body (JSON): `{ imageIds: number[] }`
- Auth: Bearer token (same as upload).
- Call this **after each successful upload** for any upload that was associated with this album id (or batch by album and call once per album with all new image ids).

---

## 3. Data to store per upload item

- When user has selected an album and adds files, store **targetAlbumId** (number) on each new upload item.
- When upload completes, read **imageId** from the upload response and **targetAlbumId** from the item; then call `POST /api/albums/{targetAlbumId}/images` with `{ imageIds: [imageId] }`.
- Optionally batch: collect all completed items that have the same targetAlbumId and imageId not yet added, then one POST per album with all those imageIds (and track which imageIds you already added to which album to avoid duplicate calls).

---

## 4. UI flow (match web)

1. **Album section**
   - Show a "Select Album (Optional)" section.
   - Fetch albums with `GET /api/albums` and show a dropdown/picker (or list) of albums (name, optional image count).
   - Option: "No Album" / none selected.
   - Button: "Create Album" → open modal/screen to enter name (and optional description, price); on submit call `POST /api/albums`, then add the new album to the list and optionally auto-select it.
2. **When user selects an album**
   - Store `selectedAlbumId` in state.
   - Show a hint like: "Images can be added to: **Album name**".
3. **When adding files to the queue**
   - Pass `targetAlbumId: selectedAlbumId` (or undefined if no album selected) into the add-files logic so every new file gets that `targetAlbumId`.
4. **When an upload completes**
   - If the completed item has `targetAlbumId` and `imageId`, call `POST /api/albums/{targetAlbumId}/images` with `{ imageIds: [imageId] }`.
   - Track which (albumId, imageId) pairs you already sent to avoid duplicate "add to album" calls (e.g. after app restart or re-render).
5. **Optional manual action**
   - If you have a list of "completed" uploads and a selected album, you can offer a button: "Add X completed image(s) to this album" that calls the same POST with the list of completed image ids (again, avoid re-adding the same ids).

---

## 5. Token rules (reminder)

- **My account** uploads: always use the **token from localStorage** (current user).
- **Client account** uploads: use the selected client's **inviterApiToken** and endpoint/body as per your existing upload-to-family flow.
- Use the same token for `GET /api/albums`, `POST /api/albums`, and `POST /api/albums/{id}/images` as you use for the upload when the user chose "My account".

---

## 6. Checklist for mobile

- [ ] GET /api/albums to load album list.
- [ ] UI to select one album (or none); state: selectedAlbumId.
- [ ] Optional: Create Album (POST /api/albums) and then select the new album.
- [ ] When adding files, set targetAlbumId = selectedAlbumId on each new queue item.
- [ ] When an upload completes with imageId and targetAlbumId, call POST /api/albums/{targetAlbumId}/images with { imageIds: [imageId] } (or batch by album).
- [ ] Avoid duplicate add-to-album calls (track sent (albumId, imageId) pairs).
- [ ] Use localStorage token for "My account" uploads and for all album APIs when in "My account" mode.
