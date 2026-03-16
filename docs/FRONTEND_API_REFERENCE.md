# Frontend API Reference

This document lists backend API names, endpoints, and request/response shapes for frontend integration. Base URL: `{API_BASE}` (e.g. `http://192.168.1.40:9090`).

**Auth:** Most endpoints use `Authorization: Bearer <token>` or `Authorization: Token <token>` or `X-API-KEY: <token>`. Query param `token` is used where noted.

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
