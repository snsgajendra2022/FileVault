/** Backend media upload / video streaming types */

export type MediaType = 'IMAGE' | 'VIDEO';

export type VideoProcessingStatus = 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED' | 'DELETED';

export interface MediaUploadResult {
  mediaType: MediaType;
  id: number;
  /** Set for image uploads only */
  imageId?: number;
  /** Set for video uploads only */
  videoId?: number;
  streamUrl?: string;
  statusPollUrl?: string;
  thumbnailUrl?: string;
  status?: string;
  message?: string;
}

export interface VideoPlaybackSource {
  /** HLS master playlist URL */
  streamUrl?: string;
  /** Direct MP4 / legacy preview when HLS is unavailable */
  fallbackSrc?: string;
  posterUrl?: string;
  shareToken?: string;
  videoId?: number;
  statusPollUrl?: string;
  processingStatus?: VideoProcessingStatus | string;
}

export interface VideoStatusResponse {
  id: number;
  status: VideoProcessingStatus;
  processingError?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
}
