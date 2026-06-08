import type { AlbumImageMeta, ImageOrientation } from '../types';

export function detectOrientation(width?: number, height?: number): ImageOrientation {
  if (!width || !height || width <= 0 || height <= 0) return 'landscape';
  const ratio = width / height;
  if (ratio > 1.15) return 'landscape';
  if (ratio < 0.87) return 'portrait';
  return 'square';
}

export function toAlbumImageMeta(img: {
  id: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  url?: string;
  width?: number;
  height?: number;
  sortOrder?: number;
}): AlbumImageMeta {
  const w = img.width;
  const h = img.height;
  const orientation = detectOrientation(w, h);
  const aspectRatio = w && h ? w / h : orientation === 'landscape' ? 1.5 : 0.75;
  const pixels = (w ?? 800) * (h ?? 600);
  return {
    id: img.id,
    imageUrl: img.imageUrl ?? img.url ?? '',
    thumbnailUrl: img.thumbnailUrl,
    width: w,
    height: h,
    aspectRatio,
    orientation,
    qualityScore: Math.min(100, Math.round(pixels / 10000)),
    sortOrder: img.sortOrder,
  };
}

export function sortImagesForLayout(images: AlbumImageMeta[]): AlbumImageMeta[] {
  return [...images].sort((a, b) => {
    const qDiff = (b.qualityScore ?? 0) - (a.qualityScore ?? 0);
    if (qDiff !== 0) return qDiff;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

export function groupByOrientation(images: AlbumImageMeta[]) {
  return {
    landscape: images.filter((i) => i.orientation === 'landscape'),
    portrait: images.filter((i) => i.orientation === 'portrait'),
    square: images.filter((i) => i.orientation === 'square'),
  };
}
