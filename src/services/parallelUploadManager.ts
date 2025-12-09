import chunkedUploadService, { ChunkedUploadOptions } from './chunkedUploadService';
import imageService from './imageService';

export interface ParallelUploadOptions {
  files: File[];
  maxConcurrent?: number; // Default: 5
  useChunked?: boolean; // Auto-detect based on file size
  chunkSizeThreshold?: number; // Use chunked upload for files larger than this (default: 50MB)
  onFileProgress?: (fileIndex: number, progress: number, chunkNumber?: number, totalChunks?: number) => void;
  onFileComplete?: (fileIndex: number, result: any) => void;
  onFileError?: (fileIndex: number, error: Error) => void;
  onOverallProgress?: (progress: number, completed: number, total: number) => void;
}

export interface UploadResult {
  success: boolean;
  fileIndex: number;
  imageId?: number | string;
  error?: string;
  uploadId?: string; // For resuming failed uploads
}

class ParallelUploadManager {
  private maxConcurrent: number = 5;
  private readonly CHUNK_SIZE_THRESHOLD = 50 * 1024 * 1024; // 50MB

  /**
   * Upload multiple files in parallel with chunked upload support
   */
  async uploadFiles(options: ParallelUploadOptions): Promise<UploadResult[]> {
    const {
      files,
      maxConcurrent = this.maxConcurrent,
      useChunked,
      chunkSizeThreshold = this.CHUNK_SIZE_THRESHOLD,
      onFileProgress,
      onFileComplete,
      onFileError,
      onOverallProgress,
    } = options;

    const results: UploadResult[] = new Array(files.length);
    const queue = files.map((file, index) => ({ file, index }));
    const inProgress = new Map<number, Promise<void>>();
    
    let completed = 0;
    const fileProgresses = new Map<number, number>();

    // Determine if chunked upload should be used
    const shouldUseChunked = useChunked !== undefined 
      ? useChunked 
      : files.some(f => f.size > chunkSizeThreshold);

    const updateOverallProgress = () => {
      const totalProgress = Array.from(fileProgresses.values()).reduce((sum, p) => sum + p, 0);
      const overallProgress = totalProgress / files.length;
      onOverallProgress?.(overallProgress, completed, files.length);
    };

    while (queue.length > 0 || inProgress.size > 0) {
      // Start new uploads if we have capacity
      while (inProgress.size < maxConcurrent && queue.length > 0) {
        const { file, index } = queue.shift()!;
        
        const uploadPromise = this.uploadSingleFile(
          file,
          index,
          shouldUseChunked && file.size > chunkSizeThreshold,
          (progress, chunkNumber, totalChunks) => {
            fileProgresses.set(index, progress);
            onFileProgress?.(index, progress, chunkNumber, totalChunks);
            updateOverallProgress();
          }
        )
          .then((result) => {
            results[index] = result;
            completed++;
            fileProgresses.set(index, 100);
            updateOverallProgress();
            onFileComplete?.(index, result);
          })
          .catch((error) => {
            const errorResult: UploadResult = {
              success: false,
              fileIndex: index,
              error: error.message || 'Upload failed',
            };
            results[index] = errorResult;
            completed++;
            fileProgresses.set(index, 0);
            updateOverallProgress();
            onFileError?.(index, error);
          })
          .finally(() => {
            inProgress.delete(index);
          });

        inProgress.set(index, uploadPromise);
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Upload a single file (chunked or regular)
   */
  private async uploadSingleFile(
    file: File,
    fileIndex: number,
    useChunked: boolean,
    onProgress: (progress: number, chunkNumber?: number, totalChunks?: number) => void
  ): Promise<UploadResult> {
    try {
      if (useChunked) {
        // Use chunked upload for large files
        const result = await chunkedUploadService.uploadFile({
          file,
          onProgress: (progress, chunkNumber, totalChunks) => {
            onProgress(progress, chunkNumber, totalChunks);
          },
        });

        if (result.success) {
          return {
            success: true,
            fileIndex,
            imageId: result.imageId,
          };
        } else {
          return {
            success: false,
            fileIndex,
            error: result.error || 'Chunked upload failed',
            uploadId: result.uploadId, // For resuming
          };
        }
      } else {
        // Use regular upload for smaller files
        const result = await imageService.uploadImage(file);
        
        return {
          success: true,
          fileIndex,
          imageId: (result as any).id || (result as any).image?.id,
        };
      }
    } catch (error: any) {
      throw new Error(error.message || 'Upload failed');
    }
  }

  /**
   * Resume failed uploads
   */
  async resumeFailedUploads(
    files: File[],
    failedResults: UploadResult[],
    options?: Omit<ParallelUploadOptions, 'files'>
  ): Promise<UploadResult[]> {
    const filesToResume = failedResults
      .filter(r => !r.success && r.uploadId)
      .map(r => ({ file: files[r.fileIndex], result: r }));

    if (filesToResume.length === 0) {
      return [];
    }

    const resumeResults: UploadResult[] = [];

    for (const { file, result } of filesToResume) {
      try {
        const resumeResult = await chunkedUploadService.uploadFile({
          file,
          uploadId: result.uploadId,
          onProgress: (progress, chunkNumber, totalChunks) => {
            options?.onFileProgress?.(result.fileIndex, progress, chunkNumber, totalChunks);
          },
        });

        resumeResults.push({
          success: resumeResult.success,
          fileIndex: result.fileIndex,
          imageId: resumeResult.imageId,
          error: resumeResult.error,
        });
      } catch (error: any) {
        resumeResults.push({
          success: false,
          fileIndex: result.fileIndex,
          error: error.message,
        });
      }
    }

    return resumeResults;
  }

  /**
   * Set maximum concurrent uploads
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, Math.min(max, 10)); // Limit between 1-10
  }

  /**
   * Get current max concurrent setting
   */
  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }
}

export default new ParallelUploadManager();

