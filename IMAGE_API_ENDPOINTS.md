# Image Service API Endpoints

This document outlines the new API endpoints for handling image uploads, downloads, and permissions with dynamic user data integration.

## Base URL
```
/api/images
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <user_token>
```

## Endpoints

### 1. Upload Image
**POST** `/api/images/upload`

Upload an image to the user's account with permission validation.

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with `file` field
- Optional: `targetUserId` for family member uploads

**Response:**
```json
{
  "success": true,
  "image": {
    "id": "uuid",
    "filename": "generated_filename.jpg",
    "originalName": "original_name.jpg",
    "size": 1024000,
    "mimeType": "image/jpeg",
    "uploadedAt": "2024-01-15T10:30:00Z",
    "uploadedBy": "user_id",
    "permissions": {
      "canView": true,
      "canUpload": true,
      "canDownload": true,
      "canDelete": true,
      "canManageAlbums": false
    },
    "downloadUrl": "https://api.example.com/api/images/uuid/download",
    "thumbnailUrl": "https://api.example.com/api/images/uuid/thumbnail"
  },
  "message": "Image uploaded successfully"
}
```

### 2. Get User Images
**GET** `/api/images/user`

Retrieve user's images with pagination and permission filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "images": [
    {
      "id": "uuid",
      "filename": "generated_filename.jpg",
      "originalName": "original_name.jpg",
      "size": 1024000,
      "mimeType": "image/jpeg",
      "uploadedAt": "2024-01-15T10:30:00Z",
      "uploadedBy": "user_id",
      "permissions": {
        "canView": true,
        "canUpload": true,
        "canDownload": true,
        "canDelete": true,
        "canManageAlbums": false
      }
    }
  ],
  "total": 150,
  "hasMore": true
}
```

### 3. Get Image Details
**GET** `/api/images/{imageId}`

Get detailed information about a specific image.

**Response:**
```json
{
  "id": "uuid",
  "filename": "generated_filename.jpg",
  "originalName": "original_name.jpg",
  "size": 1024000,
  "mimeType": "image/jpeg",
  "uploadedAt": "2024-01-15T10:30:00Z",
  "uploadedBy": "user_id",
  "permissions": {
    "canView": true,
    "canUpload": true,
    "canDownload": true,
    "canDelete": true,
    "canManageAlbums": false
  },
  "downloadUrl": "https://api.example.com/api/images/uuid/download",
  "thumbnailUrl": "https://api.example.com/api/images/uuid/thumbnail"
}
```

### 4. Request Download
**POST** `/api/images/{imageId}/download`

Request download permission and get a temporary download URL.

**Response:**
```json
{
  "success": true,
  "downloadUrl": "https://api.example.com/api/images/uuid/download?token=temporary_token",
  "expiresAt": "2024-01-15T11:30:00Z",
  "message": "Download URL generated successfully"
}
```

### 5. Check Download Permission
**GET** `/api/images/{imageId}/permissions`

Check if the current user can download a specific image.

**Response:**
```json
{
  "canDownload": true,
  "reason": "User has download permission"
}
```

**Error Response:**
```json
{
  "canDownload": false,
  "reason": "User does not have download permission for this image"
}
```

### 6. Delete Image
**DELETE** `/api/images/{imageId}`

Delete an image (if user has permission).

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### 7. Get Storage Usage
**GET** `/api/images/storage-usage`

Get user's current storage usage statistics.

**Response:**
```json
{
  "used": 250.5,
  "total": 1000,
  "percentage": 25.05,
  "imagesCount": 45
}
```

### 8. Get Family Member Images
**GET** `/api/images/family/{familyMemberId}`

Get images from a family member's account (if user has family access).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "images": [
    {
      "id": "uuid",
      "filename": "generated_filename.jpg",
      "originalName": "original_name.jpg",
      "size": 1024000,
      "mimeType": "image/jpeg",
      "uploadedAt": "2024-01-15T10:30:00Z",
      "uploadedBy": "family_member_id",
      "permissions": {
        "canView": true,
        "canUpload": false,
        "canDownload": true,
        "canDelete": false,
        "canManageAlbums": false
      }
    }
  ],
  "total": 25,
  "hasMore": false,
  "memberInfo": {
    "id": 123,
    "firstName": "John",
    "lastName": "Doe",
    "relationshipType": "spouse"
  }
}
```

### 9. Upload to Family Member
**POST** `/api/images/upload-family`

Upload an image to a family member's account.

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with `file` and `familyMemberId` fields

**Response:**
```json
{
  "success": true,
  "image": {
    "id": "uuid",
    "filename": "generated_filename.jpg",
    "originalName": "original_name.jpg",
    "size": 1024000,
    "mimeType": "image/jpeg",
    "uploadedAt": "2024-01-15T10:30:00Z",
    "uploadedBy": "current_user_id",
    "targetUserId": "family_member_id",
    "permissions": {
      "canView": true,
      "canUpload": true,
      "canDownload": true,
      "canDelete": false,
      "canManageAlbums": false
    }
  },
  "message": "Image uploaded to family member's account successfully"
}
```

### 10. Get Upload Permissions
**GET** `/api/images/upload-permissions`

Get user's current upload permissions and limits.

**Response:**
```json
{
  "canUpload": true,
  "allowedFileTypes": ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"],
  "maxFileSizeMB": 10,
  "storageQuotaMB": 1000,
  "usedStorageMB": 250.5,
  "remainingStorageMB": 749.5
}
```

## User Profile API Integration

### Get User Profile
**GET** `/api/auth/profile`

Returns comprehensive user data including permissions:

```json
{
  "id": 12,
  "username": "SnsGajendraTest",
  "email": "snssystem.SnsGajendraTest@gmail.com",
  "firstName": "Gajendra",
  "lastName": "Rawat",
  "phone": "9009659717",
  "accountType": "FREE",
  "status": "ACTIVE",
  "createdAt": "2025-08-28T14:34:56",
  "lastLoginAt": "2025-10-01T12:30:17",
  "updatedAt": "2025-10-01T12:30:17",
  "company": "",
  "role": "",
  "department": "subscribed",
  "storageQuotaMB": 100,
  "allowedFileTypes": "jpg,jpeg,png,gif,pdf,doc,docx",
  "maxFileSizeMB": 10,
  "twoFactorEnabled": false,
  "failedLoginAttempts": 0,
  "hasFamilyAccess": true,
  "familyRelationships": [
    {
      "inviterId": 15,
      "inviterApiToken": "family_token_here",
      "inviterUsername": "family_member",
      "inviterFirstName": "Jane",
      "inviterLastName": "Doe",
      "relationshipType": "spouse",
      "relationshipNotes": "My spouse",
      "canViewImages": true,
      "canUploadImages": true,
      "canDeleteImages": false,
      "canDownloadImages": true,
      "canManageAlbums": false
    }
  ]
}
```

## Permission System

### Permission Types
- **canView**: Can view images
- **canUpload**: Can upload new images
- **canDownload**: Can download images
- **canDelete**: Can delete images
- **canManageAlbums**: Can create/manage albums

### Permission Logic
1. **Account Status**: User must be ACTIVE or VERIFIED
2. **File Type**: Must be in allowedFileTypes list
3. **File Size**: Must not exceed maxFileSizeMB
4. **Storage**: Must not exceed storageQuotaMB
5. **Family Access**: Family permissions override user permissions for family member operations

### Error Responses

**403 Forbidden:**
```json
{
  "error": "Insufficient permissions",
  "message": "You do not have permission to perform this action",
  "requiredPermission": "canDownload"
}
```

**413 Payload Too Large:**
```json
{
  "error": "File too large",
  "message": "File size exceeds maximum allowed size",
  "maxSizeMB": 10,
  "actualSizeMB": 15.5
}
```

**415 Unsupported Media Type:**
```json
{
  "error": "Unsupported file type",
  "message": "File type not allowed",
  "allowedTypes": ["jpg", "jpeg", "png", "gif", "pdf"],
  "providedType": "exe"
}
```

**507 Insufficient Storage:**
```json
{
  "error": "Insufficient storage",
  "message": "Not enough storage space available",
  "availableMB": 5.2,
  "requiredMB": 10.0
}
```

## Implementation Notes

1. **Dynamic Permissions**: All permissions are fetched dynamically from the user profile
2. **Real-time Validation**: File validation happens on both client and server side
3. **Family Access**: Family relationships include specific permissions for each member
4. **Storage Tracking**: Real-time storage usage tracking with quota enforcement
5. **Download Security**: Temporary download URLs with expiration for security
6. **Progress Tracking**: Upload progress tracking for better UX

## Frontend Integration

The frontend uses React Query for caching and real-time updates:

```typescript
// Fetch user profile
const { data: userProfile } = useQuery({
  queryKey: ['userProfile'],
  queryFn: () => api.get('/api/auth/profile').then(res => res.data),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Fetch upload permissions
const { data: uploadPermissions } = useQuery({
  queryKey: ['uploadPermissions'],
  queryFn: () => imageService.getUploadPermissions(),
  staleTime: 2 * 60 * 1000, // 2 minutes
});

// Fetch storage usage
const { data: storageUsage } = useQuery({
  queryKey: ['storageUsage'],
  queryFn: () => imageService.getStorageUsage(),
  staleTime: 1 * 60 * 1000, // 1 minute
});
```

This implementation provides a comprehensive, permission-based image management system with dynamic user data integration.




