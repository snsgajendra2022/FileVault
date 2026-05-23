import type { MyImage } from './types';

export function getMyImageKey(image: MyImage): string {
  if (image.id != null && image.id !== '') return String(image.id);
  return image.previewUrl || image.filename || '';
}

export function myImageDedupeKey(image: MyImage): string {
  if (image.id != null && image.id !== '') return `id:${image.id}`;
  return `f:${image.previewUrl}|${image.filename}|${image.uploadTime}`;
}

export function parseUploadTime(raw: string | number | undefined | null): Date | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') {
    const ms = raw > 9_999_999_999 ? raw : raw * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const str = String(raw).trim();
  const asNum = Number(str);
  if (!Number.isNaN(asNum) && asNum > 1_000_000_000) {
    const d = new Date(asNum > 9_999_999_999 ? asNum : asNum * 1000);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatMyImageDate(dateString: string): string {
  const d = parseUploadTime(dateString);
  if (!d) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function uploadDayKey(dateString: string): string {
  const d = parseUploadTime(dateString);
  if (!d) return 'invalid';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDayKeyLabel(dayKey: string, invalidLabel: string): string {
  if (dayKey === 'invalid') return invalidLabel;
  const parts = dayKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return invalidLabel;
  const [y, m, day] = parts;
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isMyImageType(fileType: string, filename?: string): boolean {
  if (/^(png|jpg|jpeg|gif|webp)$/i.test(fileType)) return true;
  if (String(fileType).toLowerCase() === 'unknown' && filename) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
  }
  return false;
}

export function isMyVideoType(fileType: string, filename?: string): boolean {
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  const videoExt = ['mov', 'mp4', 'avi', 'mkv', 'webm', 'm4v'];
  if (videoExt.includes(ext)) return true;
  if (/^(mp4|mov|webm|avi|mkv|m4v)$/i.test(fileType)) return true;
  if (String(fileType).toLowerCase() === 'unknown') return videoExt.includes(ext);
  return false;
}

export function resolveImageIdForDelete(image: MyImage): string | undefined {
  if (image.id != null && image.id !== '') return String(image.id);
  const match =
    image.downloadUrl.match(/\/api\/images\/(\d+)(?:\/|$|\?)/) ??
    image.downloadUrl.match(/\/images\/(\d+)(?:\/|$|\?)/);
  return match ? match[1] : undefined;
}

export function fileExtensionLabel(fileType: string, filename?: string): string {
  if (fileType && fileType !== 'unknown') return fileType.toUpperCase().slice(0, 4);
  const ext = filename?.split('.').pop()?.toUpperCase();
  return ext?.slice(0, 4) || 'FILE';
}
