import api from '../client/axiosInstance';
import type { ImageVariants } from '../../utils/progressiveImageVariants';
import { getStoredToken } from '../../utils/authUtils';

const API_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

/** `<img src>` cannot send Authorization — append token query param when missing. */
export function appendPreviewToken(url: string): string {
  const token = getStoredToken();
  if (!token || !url || url.startsWith('data:')) return url;
  if (/[?&]token=/.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

/** Prefix relative media paths with the main API host and attach preview token. */
export function resolveMediaUrl(pathOrUrl: string | undefined | null): string {
  if (!pathOrUrl) return '';
  const trimmed = pathOrUrl.trim();
  let absolute: string;
  if (/^https?:\/\//i.test(trimmed)) {
    absolute = trimmed;
  } else if (!API_BASE) {
    absolute = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  } else {
    absolute = `${API_BASE}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
  }
  return appendPreviewToken(absolute);
}

export type FacePersonMaturity = 'stable' | 'new' | string;

export interface FacePerson {
  personId: string;
  displayName: string;
  confidence: number;
  matchedImages: number;
  maturity: FacePersonMaturity;
  personThumbnailUrl: string;
  isNewPerson: boolean;
  imageCount: number;
}

export interface FacePersonsResponse {
  userId: number;
  username: string;
  fullName: string;
  totalPersons: number;
  persons: FacePerson[];
}

export interface FacePersonImageFace {
  thumbnailUrl?: string;
  previewUrl?: string;
  confidence?: number;
  faceCount?: number;
  status?: string;
}

export interface FacePersonImage {
  imageId: number;
  sourceImageId: number;
  personId: string;
  filename: string;
  previewUrl: string;
  downloadUrl: string;
  thumbnailUrl: string;
  variants?: ImageVariants;
  face?: FacePersonImageFace;
}

export interface FacePersonImagesResponse {
  userId: number;
  person: {
    personId: string;
    displayName: string;
    confidence: number;
    imageCount: number;
  };
  totalImages: number;
  imageIds: number[];
  images: FacePersonImage[];
}

function normalizeVariants(variants?: ImageVariants): ImageVariants | undefined {
  if (!variants) return undefined;
  return {
    ...variants,
    thumbnailUrl: variants.thumbnailUrl ? resolveMediaUrl(variants.thumbnailUrl) : undefined,
    recommendedUrl: variants.recommendedUrl ? resolveMediaUrl(variants.recommendedUrl) : undefined,
    previewFallbackUrl: variants.previewFallbackUrl
      ? resolveMediaUrl(variants.previewFallbackUrl)
      : undefined,
    autoUrl: variants.autoUrl ? resolveMediaUrl(variants.autoUrl) : undefined,
    tiers: variants.tiers
      ? Object.fromEntries(
          Object.entries(variants.tiers).map(([key, tier]) => [
            key,
            {
              ...tier,
              url: tier?.url ? resolveMediaUrl(tier.url) : tier?.url,
            },
          ])
        )
      : undefined,
  };
}

/** Map API image row → gallery shape with resolved tier URLs (s01 → … → original). */
export function mapFaceImageToGallery(img: FacePersonImage) {
  return {
    id: img.imageId,
    previewUrl: resolveMediaUrl(img.previewUrl),
    filename: img.filename || `image-${img.imageId}`,
    downloadUrl: resolveMediaUrl(img.downloadUrl),
    thumbnailUrl: resolveMediaUrl(
      img.thumbnailUrl || img.variants?.thumbnailUrl || img.variants?.tiers?.s01?.url || ''
    ),
    enabledServices: {} as Record<string, string>,
    uploadTime: '',
    fileType: (img.filename || '').split('.').pop()?.toLowerCase() || 'jpg',
    variants: normalizeVariants(img.variants),
  };
}

function normalizePersonsResponse(data: FacePersonsResponse): FacePersonsResponse {
  const persons = Array.isArray(data.persons) ? data.persons : [];
  return {
    ...data,
    persons,
    totalPersons:
      typeof data.totalPersons === 'number' ? data.totalPersons : persons.length,
  };
}

function normalizeImagesResponse(data: FacePersonImagesResponse): FacePersonImagesResponse {
  const images = Array.isArray(data.images) ? data.images : [];
  return {
    ...data,
    images,
    totalImages: typeof data.totalImages === 'number' ? data.totalImages : images.length,
    imageIds: Array.isArray(data.imageIds) ? data.imageIds : images.map((i) => i.imageId),
  };
}

export async function fetchFacePersons(userId: number): Promise<FacePersonsResponse> {
  const { data } = await api.get<FacePersonsResponse>(
    `/api/face-recognition/users/${userId}/persons`
  );
  return normalizePersonsResponse(data);
}

export async function fetchFacePersonImages(
  userId: number,
  personId: string
): Promise<FacePersonImagesResponse> {
  const { data } = await api.get<FacePersonImagesResponse>(
    `/api/face-recognition/users/${userId}/persons/${encodeURIComponent(personId)}/images`
  );
  return normalizeImagesResponse(data);
}
