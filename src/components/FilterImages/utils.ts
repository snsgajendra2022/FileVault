import type { FaceSyncPerson, FaceSyncPhoto, SuggestionItem } from '../../api/services/faceSyncService';
import { photoAssetUrl, resolveFaceSyncUrl } from '../../api/services/faceSyncService';

export type ImageContext = 'gallery' | 'person' | 'lightbox';

export function getImageSource(
  p: FaceSyncPerson | FaceSyncPhoto | string | null | undefined,
  context: ImageContext = 'gallery'
): string {
  if (!p) return '';

  let thumb = '';
  let preview = '';
  let url = '';
  let imgUrl = '';
  let orig = '';

  if (typeof p === 'string') {
    const parts = p.split('/api/album/photo/');
    if (parts.length > 1) {
      const subParts = parts[1].split('/');
      const personId = subParts[0];
      let filename = subParts.slice(1).join('/');
      if (filename.startsWith('thumbs/')) {
        filename = filename.substring('thumbs/'.length);
        if (filename.endsWith('.webp')) filename = filename.slice(0, -5);
      } else if (filename.startsWith('preview/')) {
        filename = filename.substring('preview/'.length);
        if (filename.endsWith('.webp')) filename = filename.slice(0, -5);
      }
      thumb = photoAssetUrl(personId, `thumbs/${filename}.webp`);
      preview = photoAssetUrl(personId, `preview/${filename}.webp`);
      url = photoAssetUrl(personId, filename);
      imgUrl = url;
      orig = url;
    } else {
      return p.startsWith('/') ? resolveFaceSyncUrl(p) : p;
    }
  } else {
    thumb = p.thumbnail_url || (p as FaceSyncPerson).thumbnail || '';
    preview = p.preview_url || '';
    url = p.url || '';
    imgUrl = (p as FaceSyncPhoto).image_url || p.url || '';
    orig = p.original_url || '';
  }

  const clean = (val: string) => {
    if (!val || val === 'undefined' || val === 'null') return '';
    const t = val.trim();
    if (!t) return '';
    if (t.startsWith('/')) return resolveFaceSyncUrl(t);
    return t;
  };

  thumb = clean(thumb);
  preview = clean(preview);
  url = clean(url);
  imgUrl = clean(imgUrl);
  orig = clean(orig);

  let candidates: string[];
  if (context === 'gallery') candidates = [thumb, preview, url, imgUrl, orig];
  else if (context === 'person') candidates = [thumb, imgUrl, url, preview, orig];
  else if (context === 'lightbox') candidates = [preview, orig, url];
  else candidates = [thumb, preview, url, imgUrl, orig];

  for (const c of candidates) {
    if (c) return c;
  }
  return '';
}

export function photoKey(personId: string, filename: string): string {
  return `${personId || 'Unknown'}::${filename}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function confidencePct(s: SuggestionItem): number {
  const ev = s.evidence as Record<string, unknown> | undefined;
  const dai = ev?.duplicate_ai as { merge_confidence?: number } | undefined;
  if (dai?.merge_confidence != null && !Number.isNaN(Number(dai.merge_confidence))) {
    return Math.max(0, Math.min(100, Math.round(Number(dai.merge_confidence) * 100)));
  }
  const mp = ev?.merge_preview as { merge_confidence?: number } | undefined;
  const val = mp?.merge_confidence ?? (ev?.confidence as number) ?? 0;
  return Math.max(0, Math.min(100, Math.round(Number(val) * 100)));
}

export function maturityBadgeClass(m: string): string {
  const low = m.toLowerCase();
  if (low === 'stable') return 'badge-stable';
  if (low === 'new') return 'badge-priority-low';
  return 'badge-priority-mid';
}

export function qualityPillClasses(level: string): string {
  const lvl = level.toLowerCase();
  if (lvl === 'high') return 'border-emerald-200/90 bg-emerald-50/95 text-emerald-900';
  if (lvl === 'medium') return 'border-sky-200/90 bg-sky-50/95 text-sky-900';
  if (lvl === 'low') return 'border-amber-200/90 bg-amber-50/95 text-amber-900';
  return 'border-slate-200/90 bg-white/95 text-slate-700';
}
