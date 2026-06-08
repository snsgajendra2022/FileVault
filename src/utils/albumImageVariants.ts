import type { ImageVariants } from './progressiveImageVariants';
import { getOriginalViewSrc, getThumbnailSrc } from './progressiveImageVariants';

/** Minimal shape for album API images with optional variants. */
export interface AlbumImageLike {
  id: number | string;
  originalFilename?: string;
  filename?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  s3PublicUrl?: string | null;
  b2PublicUrl?: string | null;
  googleDriveViewUrl?: string | null;
  uploadTime?: string;
  fileType?: string;
  variants?: ImageVariants;
  likes?: number;
  comments?: Array<{ id?: string | number; text?: string; createdAt?: string }>;
}

export function getAlbumImageFileType(image: AlbumImageLike): string {
  const filename = image.originalFilename || image.filename || '';
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return extension || image.fileType || 'jpg';
}

export function getAlbumHdUrl(image: AlbumImageLike, fileType?: string): string {
  const ft = fileType ?? getAlbumImageFileType(image);
  const progressive = toProgressiveImage(image, ft);
  const fromVariants = getOriginalViewSrc(progressive);
  if (fromVariants) return fromVariants;
  if (image.previewUrl) return image.previewUrl;
  if (image.downloadUrl) return image.downloadUrl;
  if (image.s3PublicUrl) return image.s3PublicUrl;
  if (image.b2PublicUrl) return image.b2PublicUrl;
  if (image.googleDriveViewUrl) return image.googleDriveViewUrl;
  return getAlbumThumbnailUrl(image, ft) || '';
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
  if (image.previewUrl) return image.previewUrl;
  if (image.downloadUrl) return image.downloadUrl;
  return null;
}
