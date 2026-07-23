import type { ImageVariants } from './progressiveImageVariants';
import { getThumbnailSrc } from './progressiveImageVariants';

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
  variants?: ImageVariants;
}

export function toProgressiveImage(image: AlbumImageLike, fileType = 'jpg') {
  const filename = image.originalFilename || image.filename || 'image';
  return {
    id: image.id,
    previewUrl: image.previewUrl || '',
    filename,
    downloadUrl: image.downloadUrl || image.previewUrl || '',
    thumbnailUrl: image.thumbnailUrl || '',
    uploadTime: image.uploadTime || '',
    fileType: image.fileType || fileType,
    variants: image.variants,
  };
}

export function getAlbumThumbnailUrl(image: AlbumImageLike, fileType = 'jpg'): string | null {
  const progressive = toProgressiveImage(image, fileType);
  const fromVariants = getThumbnailSrc(progressive);
  if (fromVariants) return fromVariants;
  if (image.thumbnailUrl) return image.thumbnailUrl;
  // Never use HLS stream URLs as image thumbnails
  if (image.previewUrl && !/\.m3u8(\?|$)/i.test(image.previewUrl)) return image.previewUrl;
  if (image.downloadUrl && !/\.m3u8(\?|$)/i.test(image.downloadUrl)) return image.downloadUrl;
  return null;
}
