import type { ImageVariants } from '../../utils/progressiveImageVariants';
import type { FamilyRelationship } from '../../types/user';

export type MyImagesViewMode = 'my' | 'invited';

export interface MyImage {
  id?: number | string;
  previewUrl: string;
  filename: string;
  downloadUrl: string;
  thumbnailUrl: string;
  enabledServices: Record<string, string>;
  uploadTime: string;
  fileType: string;
  variants?: ImageVariants;
}

export interface MyImagesPageResponse {
  totalImages: number;
  images: MyImage[];
  page?: number;
  size?: number;
  totalPages?: number;
}

export interface GalleryImageRow {
  image: MyImage;
  index: number;
}

export interface GalleryDayGroup {
  dayKey: string;
  dayLabel: string;
  items: GalleryImageRow[];
}

export interface ShareContact {
  id: string;
  email?: string;
  mobile?: string;
  countryCode?: string;
  displayName?: string;
}

export interface MyImagesSourceOption {
  id: string;
  label: string;
  initials: string;
  active: boolean;
  kind: 'self' | 'family';
  member?: FamilyRelationship;
}
