import api from './api';

export interface ImagePermission {
  canView: boolean;
  canUpload: boolean;
  canDownload: boolean;
  canDelete: boolean;
  canManageAlbums: boolean;
}

export interface ImageInfo {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  permissions: ImagePermission;
  downloadUrl?: string;
  thumbnailUrl?: string;
}

export interface CloudUploadS3Response {
  filename: string;
  fileId: string;
  size: number;
  status: string;
  url: string;
  deduplicated: boolean;
  directUrl: string;
  downloadUrl: string;
  fileType: string;
  id: number;
  message: string;
}

export interface UploadResponse {
  success?: boolean;
  id?: number | string;
  image?: ImageInfo;
  message?: string;
  cloudUploads?: {
    s3?: CloudUploadS3Response;
  };
}

export interface DownloadResponse {
  success: boolean;
  downloadUrl: string;
  expiresAt: string;
  message: string;
}

class ImageService {
  /** Upload timeout: 5 minutes per image (avoids load/errors on large batches) */
  private readonly UPLOAD_TIMEOUT_MS = 0;
  private readonly UPLOAD_MAX_RETRIES = 3;
  private readonly UPLOAD_RETRY_DELAY_MS = 1500;

  /**
   * Upload an image with permission validation.
   * Uses long timeout and retries to avoid load/errors when uploading many images.
   */
  async uploadImage(file: File, targetUserId?: number): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (targetUserId) {
      formData.append('targetUserId', targetUserId.toString());
    }

    let lastError: any;
    for (let attempt = 1; attempt <= this.UPLOAD_MAX_RETRIES; attempt++) {
      try {
        const response = await api.post('/api/images/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: this.UPLOAD_TIMEOUT_MS,
        });
        return response.data || response;
      } catch (err: any) {
        lastError = err;
        const isRetryable =
          err.code === 'ECONNABORTED' ||
          err.code === 'ERR_NETWORK' ||
          (err.response?.status >= 500 && err.response?.status < 600);
        if (attempt < this.UPLOAD_MAX_RETRIES && isRetryable) {
          await new Promise((r) => setTimeout(r, this.UPLOAD_RETRY_DELAY_MS));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  /**
   * Get user's images with permission filtering
   */
  async getUserImages(page = 1, limit = 20): Promise<{ images: ImageInfo[]; total: number; hasMore: boolean }> {
    const response = await api.get('/api/images/user', {
      params: { page, limit }
    });

    return response.data;
  }

  /**
   * Get image details with permission check
   */
  async getImageDetails(imageId: string): Promise<ImageInfo> {
    const response = await api.get(`/api/images/${imageId}`);
    return response.data;
  }

  /**
   * Request download permission and get download URL
   */
  async requestDownload(imageId: string): Promise<DownloadResponse> {
    const response = await api.post(`/api/images/${imageId}/download`);
    return response.data;
  }

  /**
   * Check if user can download a specific image
   */
  async checkDownloadPermission(imageId: string): Promise<{ canDownload: boolean; reason?: string }> {
    try {
      const response = await api.get(`/api/images/${imageId}/permissions`);
      return response.data;
    } catch (error: any) {
      return {
        canDownload: false,
        reason: error.response?.data?.message || 'Permission check failed'
      };
    }
  }

  /**
   * Delete an image (if user has permission)
   */
  async deleteImage(imageId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/api/images/${imageId}`);
    return response.data;
  }

  /**
   * Get user's storage usage
   */
  async getStorageUsage(): Promise<{
    used: number;
    total: number;
    percentage: number;
    imagesCount: number;
  }> {
    // const response = await api.get('/api/images/storage-usage');
    return {
      used: 0,
      total: 0,
      percentage: 0,
      imagesCount: 0
    };
  }

  /**
   * Get family member images (if user has family access)
   */
  async getFamilyImages(familyMemberId: number, page = 1, limit = 20): Promise<{
    images: ImageInfo[];
    total: number;
    hasMore: boolean;
    memberInfo: {
      id: number;
      firstName: string;
      lastName: string;
      relationshipType: string;
    };
  }> {
    const response = await api.get(`/api/images/family/${familyMemberId}`, {
      params: { page, limit }
    });

    return response.data;
  }

  /**
   * Upload image to family member's account (same timeout/retry as uploadImage)
   */
  async uploadToFamilyMember(file: File, familyMemberId: number): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('familyMemberId', familyMemberId.toString());

    let lastError: any;
    for (let attempt = 1; attempt <= this.UPLOAD_MAX_RETRIES; attempt++) {
      try {
        const response = await api.post('/api/images/upload-family', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: this.UPLOAD_TIMEOUT_MS,
        });
        return response.data;
      } catch (err: any) {
        lastError = err;
        const isRetryable =
          err.code === 'ECONNABORTED' ||
          err.code === 'ERR_NETWORK' ||
          (err.response?.status >= 500 && err.response?.status < 600);
        if (attempt < this.UPLOAD_MAX_RETRIES && isRetryable) {
          await new Promise((r) => setTimeout(r, this.UPLOAD_RETRY_DELAY_MS));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  /**
   * Get user's upload permissions
   */
  async getUploadPermissions(): Promise<{
    canUpload: boolean;
    allowedFileTypes: string[];
    maxFileSizeMB: number;
    storageQuotaMB: number;
    usedStorageMB: number;
    remainingStorageMB: number;
  }> {
    const response = await api.get('/api/images/upload-permissions');
    return response.data;
  }
}

export default new ImageService();




