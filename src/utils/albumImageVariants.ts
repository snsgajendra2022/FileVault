import type { ImageVariants } from './progressiveImageVariants';
import { getThumbnailSrc } from './progressiveImageVariants';
import { isHlsStreamUrl } from './videoPlayback';

/** Minimal shape for album API images with optional variants. */
export interface AlbumImageLike {
  id: number | string;
  originalFilename?: string;
  filename?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  uploadTime?: string;
  fileType?: string;
  mediaType?: string;
  videoId?: number | string;
  variants?: ImageVariants;
}

/** Img tags cannot send Authorization — attach JWT when video thumb lacks query auth. */
export function ensureVideoThumbnailAuth(url: string | null | undefined): string | null {
  if (!url || isHlsStreamUrl(url)) return null;
  if (/\/api\/videos\/\d+\/thumbnail(\?|$)/i.test(url) && !/[?&](token|shareToken)=/i.test(url)) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}token=${encodeURIComponent(token)}`;
    }
  }
  return url;
}

export function toProgressiveImage(image: AlbumImageLike, fileType = 'jpg') {
  const filename = image.originalFilename || image.filename || 'image';
  const thumbnailUrl = ensureVideoThumbnailAuth(image.thumbnailUrl) || image.thumbnailUrl || '';
  return {
    id: image.id,
    previewUrl: image.previewUrl || '',
    filename,
    downloadUrl: image.downloadUrl || image.previewUrl || '',
    thumbnailUrl,
    uploadTime: image.uploadTime || '',
    fileType: image.fileType || fileType,
    mediaType: image.mediaType,
    videoId: image.videoId,
    variants: image.variants,
  };
}

export function getAlbumThumbnailUrl(image: AlbumImageLike, fileType = 'jpg'): string | null {
  const progressive = toProgressiveImage(image, fileType);
  const fromVariants = getThumbnailSrc(progressive);
  if (fromVariants) return ensureVideoThumbnailAuth(fromVariants) || fromVariants;
  if (image.thumbnailUrl) return ensureVideoThumbnailAuth(image.thumbnailUrl) || image.thumbnailUrl;
  // Never use HLS stream URLs as image thumbnails
  if (image.previewUrl && !isHlsStreamUrl(image.previewUrl)) return image.previewUrl;
  if (image.downloadUrl && !isHlsStreamUrl(image.downloadUrl)) return image.downloadUrl;
  return null;
}
