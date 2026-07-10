import type { MediaUploadResult, VideoPlaybackSource } from '../types/video';

const HLS_PATH_RE = /\.m3u8(\?|$)/i;

type MediaLike = Record<string, unknown>;

function asMedia(item: object): MediaLike {
  return item as MediaLike;
}

function apiBase(): string {
  return (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
}

export function isHlsStreamUrl(url: string | undefined | null): boolean {
  return !!url && HLS_PATH_RE.test(url);
}

export function isVideoMediaItem(item: object): boolean {
  const d = asMedia(item);
  if (d.mediaType === 'VIDEO') return true;
  if (d.videoId != null) return true;
  const fileType = String(d.fileType || '').toLowerCase();
  const filename = String(d.originalFilename || d.filename || '').toLowerCase();
  const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];
  if (videoExts.includes(fileType)) return true;
  const ext = filename.split('.').pop() || '';
  return videoExts.includes(ext);
}

export function appendShareToken(url: string, shareToken?: string): string {
  if (!shareToken || url.includes('shareToken=')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}shareToken=${encodeURIComponent(shareToken)}`;
}

/** Build HLS stream URL from video id when only id is known */
export function buildVideoStreamUrl(videoId: number | string, shareToken?: string): string {
  const base = apiBase();
  const path = `/api/videos/${videoId}/stream/master.m3u8`;
  const url = base ? `${base}${path}` : path;
  return shareToken ? appendShareToken(url, shareToken) : url;
}

export function buildVideoStatusPollUrl(videoId: number | string): string {
  const base = apiBase();
  const path = `/api/videos/${videoId}/status`;
  return base ? `${base}${path}` : path;
}

/**
 * Resolve how a gallery/album item should be played.
 * Prefers HLS streamUrl; falls back to direct preview/download for legacy image-stored videos.
 */
export function resolveVideoPlayback(item: object): VideoPlaybackSource {
  const d = asMedia(item);
  const streamUrl = typeof d.streamUrl === 'string' ? d.streamUrl : undefined;
  const previewUrl =
    (typeof d.previewUrl === 'string' ? d.previewUrl : undefined) ||
    (typeof d.downloadUrl === 'string' ? d.downloadUrl : undefined);
  const posterUrl =
    (typeof d.thumbnailUrl === 'string' ? d.thumbnailUrl : undefined) ||
    previewUrl;
  const shareToken = typeof d.shareToken === 'string' ? d.shareToken : undefined;
  const statusPollUrl =
    typeof d.statusPollUrl === 'string' ? d.statusPollUrl : undefined;
  const processingStatus =
    typeof d.videoStatus === 'string'
      ? d.videoStatus
      : typeof d.status === 'string'
        ? d.status
        : undefined;

  const mediaType = d.mediaType;
  const linkedVideoId = d.videoId;
  const rawId = linkedVideoId ?? (mediaType === 'VIDEO' ? d.id : undefined);
  const videoId =
    typeof rawId === 'number' ? rawId : typeof rawId === 'string' ? Number(rawId) : undefined;

  if (streamUrl) {
    return {
      streamUrl: appendShareToken(streamUrl, shareToken),
      fallbackSrc: previewUrl,
      posterUrl,
      shareToken,
      videoId: Number.isFinite(videoId) ? videoId : undefined,
      statusPollUrl,
      processingStatus,
    };
  }

  if (mediaType === 'VIDEO' && videoId != null && Number.isFinite(videoId)) {
    return {
      streamUrl: buildVideoStreamUrl(videoId, shareToken),
      fallbackSrc: previewUrl,
      posterUrl,
      shareToken,
      videoId,
      statusPollUrl: statusPollUrl || buildVideoStatusPollUrl(videoId),
      processingStatus,
    };
  }

  if (previewUrl && isHlsStreamUrl(previewUrl)) {
    return {
      streamUrl: appendShareToken(previewUrl, shareToken),
      posterUrl,
      shareToken,
      videoId: Number.isFinite(videoId) ? videoId : undefined,
      statusPollUrl,
      processingStatus,
    };
  }

  return {
    fallbackSrc: previewUrl,
    posterUrl,
    shareToken,
    videoId: Number.isFinite(videoId) ? videoId : undefined,
    statusPollUrl,
    processingStatus,
  };
}

/** Parse unified upload API response (images/upload or media/upload) */
export function parseMediaUploadResponse(data: unknown): MediaUploadResult {
  const d = (data && typeof data === 'object' ? data : {}) as MediaLike;
  const mediaType = d.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE';
  const rawImageId = d.imageId ?? (mediaType === 'IMAGE' ? d.id : undefined);
  const rawVideoId = d.videoId ?? (mediaType === 'VIDEO' && rawImageId == null ? d.id : undefined);
  const imageId = rawImageId != null ? Number(rawImageId) : undefined;
  const videoId = rawVideoId != null ? Number(rawVideoId) : undefined;
  const galleryId = imageId ?? videoId ?? Number(d.id);

  return {
    mediaType,
    id: Number.isFinite(galleryId) ? galleryId : Number(d.id),
    imageId: Number.isFinite(imageId) ? imageId : undefined,
    videoId: Number.isFinite(videoId) ? videoId : undefined,
    streamUrl: typeof d.streamUrl === 'string' ? d.streamUrl : undefined,
    statusPollUrl: typeof d.statusPollUrl === 'string' ? d.statusPollUrl : undefined,
    thumbnailUrl: typeof d.thumbnailUrl === 'string' ? d.thumbnailUrl : undefined,
    status: typeof d.status === 'string' ? d.status : undefined,
    message: typeof d.message === 'string' ? d.message : undefined,
  };
}

export function isVideoProcessing(source: VideoPlaybackSource): boolean {
  const s = source.processingStatus;
  return s === 'PROCESSING' || s === 'UPLOADED';
}
