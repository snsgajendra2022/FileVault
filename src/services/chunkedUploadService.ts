import api from './api';

export interface ChunkedUploadOptions {
  file: File;
  chunkSize?: number; // Default: 5MB
  onProgress?: (progress: number, chunkNumber: number, totalChunks: number) => void;
  onChunkComplete?: (chunkNumber: number, totalChunks: number) => void;
  uploadId?: string; // For resuming
}

export interface ChunkedUploadResponse {
  success: boolean;
  uploadId?: string;
  imageId?: number | string;
  message?: string;
  error?: string;
}

export interface UploadStatus {
  uploadId: string;
  uploadedChunks: number[];
  totalChunks: number;
  isComplete: boolean;
  filename: string;
}

class ChunkedUploadService {
  private CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks (adjustable)
  private readonly STORAGE_KEY_PREFIX = 'chunked_upload_';

  /**
   * Initialize a chunked upload session
   */
  async initializeUpload(file: File): Promise<{ uploadId: string; chunkSize: number }> {
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    
    try {
      // Try to use chunked upload API if available
      const response = await api.post('/api/images/upload-chunk/init', {
        filename: file.name,
        totalSize: file.size,
        totalChunks,
        mimeType: file.type,
      });
      
      return {
        uploadId: response.data.uploadId,
        chunkSize: response.data.chunkSize || this.CHUNK_SIZE,
      };
    } catch (error: any) {
      // Fallback: Generate local upload ID if backend doesn't support chunked uploads yet
      const uploadId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.saveUploadMetadata(uploadId, {
        filename: file.name,
        totalSize: file.size,
        totalChunks,
        mimeType: file.type,
        uploadedChunks: [],
      });
      
      return {
        uploadId,
        chunkSize: this.CHUNK_SIZE,
      };
    }
  }

  /**
   * Upload a file using chunked upload
   */
  async uploadFile(options: ChunkedUploadOptions): Promise<ChunkedUploadResponse> {
    const { file, chunkSize: initialChunkSize = this.CHUNK_SIZE, onProgress, onChunkComplete, uploadId: existingUploadId } = options;
    
    let uploadId = existingUploadId;
    let chunkSize = initialChunkSize;
    let totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedChunks: number[] = [];

    // Initialize upload if not resuming
    if (!uploadId) {
      const initResult = await this.initializeUpload(file);
      uploadId = initResult.uploadId;
      chunkSize = initResult.chunkSize;
      totalChunks = Math.ceil(file.size / chunkSize);
    } else {
      // Check status for resume
      const status = await this.getUploadStatus(uploadId);
      if (status) {
        uploadedChunks = status.uploadedChunks;
        totalChunks = status.totalChunks;
      }
    }

    try {
      // Upload chunks
      for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
        // Skip already uploaded chunks
        if (uploadedChunks.includes(chunkNumber)) {
          const progress = ((chunkNumber + 1) / totalChunks) * 100;
          onProgress?.(progress, chunkNumber + 1, totalChunks);
          continue;
        }

        const start = chunkNumber * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        try {
          // Try backend chunked upload API
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('chunkNumber', chunkNumber.toString());
          formData.append('totalChunks', totalChunks.toString());
          formData.append('uploadId', uploadId);

          await api.post(`/api/images/upload-chunk/${uploadId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300000, // 5 minutes timeout per chunk
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const chunkProgress = (progressEvent.loaded / progressEvent.total) * 100;
                const overallProgress = ((chunkNumber + chunkProgress / 100) / totalChunks) * 100;
                onProgress?.(overallProgress, chunkNumber + 1, totalChunks);
              }
            },
          });

          uploadedChunks.push(chunkNumber);
          this.updateUploadMetadata(uploadId, { uploadedChunks });
          onChunkComplete?.(chunkNumber + 1, totalChunks);

        } catch (chunkError: any) {
          console.error(`Error uploading chunk ${chunkNumber}:`, chunkError);
          
          // If backend doesn't support chunked uploads, fall back to regular upload
          if (chunkError.response?.status === 404 || chunkError.response?.status === 501) {
            console.log('Chunked upload not supported, falling back to regular upload');
            // Adapt onProgress callback signature for fallback
            const adaptedProgress = onProgress ? (progress: number) => {
              onProgress(progress, chunkNumber + 1, totalChunks);
            } : undefined;
            return await this.fallbackToRegularUpload(file, adaptedProgress);
          }
          
          // Save progress and throw error for retry
          this.updateUploadMetadata(uploadId, { uploadedChunks });
          throw new Error(`Failed to upload chunk ${chunkNumber + 1}/${totalChunks}: ${chunkError.message}`);
        }
      }

      // Complete upload
      try {
        const completeResponse = await api.post(`/api/images/upload-chunk/${uploadId}/complete`, {
          uploadId,
        });
        
        this.clearUploadMetadata(uploadId);
        
        return {
          success: true,
          imageId: completeResponse.data.imageId || completeResponse.data.id,
          message: completeResponse.data.message || 'Upload completed successfully',
        };
      } catch (completeError: any) {
        // If complete endpoint doesn't exist, try to reconstruct file and upload normally
        console.log('Complete endpoint not available, using fallback');
        // Adapt onProgress callback signature for fallback
        const adaptedProgress = onProgress ? (progress: number) => {
          onProgress(progress, totalChunks, totalChunks);
        } : undefined;
        return await this.fallbackToRegularUpload(file, adaptedProgress);
      }

    } catch (error: any) {
      // Save progress for resume
      this.updateUploadMetadata(uploadId, { uploadedChunks });
      
      return {
        success: false,
        uploadId,
        error: error.message || 'Upload failed',
      };
    }
  }

  /**
   * Fallback to regular upload for smaller files or when chunked upload is not supported
   */
  private async fallbackToRegularUpload(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ChunkedUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000, // 10 minutes for large files
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(progress);
          }
        },
      });

      return {
        success: true,
        imageId: response.data.id || response.data.image?.id,
        message: response.data.message || 'Upload completed successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Upload failed',
      };
    }
  }

  /**
   * Get upload status for resuming
   */
  async getUploadStatus(uploadId: string): Promise<UploadStatus | null> {
    try {
      const response = await api.get(`/api/images/upload-chunk/${uploadId}/status`);
      return response.data;
    } catch (error: any) {
      // Fallback to local storage
      const metadata = this.getUploadMetadata(uploadId);
      if (metadata) {
        return {
          uploadId,
          uploadedChunks: metadata.uploadedChunks || [],
          totalChunks: metadata.totalChunks || 0,
          isComplete: false,
          filename: metadata.filename || '',
        };
      }
      return null;
    }
  }

  /**
   * Cancel/reset an upload
   */
  async cancelUpload(uploadId: string): Promise<void> {
    try {
      await api.delete(`/api/images/upload-chunk/${uploadId}`);
    } catch (error) {
      console.error('Error canceling upload:', error);
    } finally {
      this.clearUploadMetadata(uploadId);
    }
  }

  /**
   * Save upload metadata to localStorage for resume capability
   */
  private saveUploadMetadata(uploadId: string, metadata: any): void {
    try {
      localStorage.setItem(
        `${this.STORAGE_KEY_PREFIX}${uploadId}`,
        JSON.stringify({ ...metadata, timestamp: Date.now() })
      );
    } catch (error) {
      console.error('Error saving upload metadata:', error);
    }
  }

  /**
   * Get upload metadata from localStorage
   */
  private getUploadMetadata(uploadId: string): any | null {
    try {
      const data = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${uploadId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting upload metadata:', error);
      return null;
    }
  }

  /**
   * Update upload metadata
   */
  private updateUploadMetadata(uploadId: string, updates: Partial<any>): void {
    const existing = this.getUploadMetadata(uploadId);
    if (existing) {
      this.saveUploadMetadata(uploadId, { ...existing, ...updates });
    }
  }

  /**
   * Clear upload metadata
   */
  private clearUploadMetadata(uploadId: string): void {
    try {
      localStorage.removeItem(`${this.STORAGE_KEY_PREFIX}${uploadId}`);
    } catch (error) {
      console.error('Error clearing upload metadata:', error);
    }
  }

  /**
   * Clean up old upload metadata (older than 24 hours)
   */
  cleanupOldMetadata(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_KEY_PREFIX)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.timestamp && (now - data.timestamp) > maxAge) {
              localStorage.removeItem(key);
            }
          } catch (error) {
            // Invalid data, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning up metadata:', error);
    }
  }
}

export default new ChunkedUploadService();

