import JSZip from 'jszip';
import api from '../api/client/axiosInstance';

/**
 * Resolve relative URL to absolute URL
 */
export const resolveToAbsoluteUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  const baseTrim = (base || '').trim().replace(/\/+$/, '');
  if (!baseTrim) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseTrim}${path}`;
};

/**
 * Trigger browser download for a blob
 */
export const triggerDownloadBlob = (blob: Blob, filename: string) => {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2500);
};

/**
 * Force download a single image (not preview)
 * Fetches as blob and triggers download
 */
export const downloadSingleImage = async (url: string, filename: string): Promise<void> => {
  if (!url) throw new Error('No URL provided');
  
  const absoluteUrl = resolveToAbsoluteUrl(url);
  
  try {
    const response = await fetch(absoluteUrl);
    if (!response.ok) throw new Error(`Failed to fetch image (${response.status})`);
    
    const blob = await response.blob();
    triggerDownloadBlob(blob, filename);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};

/**
 * Download multiple images as a ZIP file
 */
export const downloadImagesAsZip = async (
  images: Array<{ downloadUrl?: string; previewUrl?: string; originalFilename?: string; filename?: string; id?: number }>,
  zipNameBase: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> => {
  if (!images || images.length === 0) {
    throw new Error('No images to download');
  }

  const zip = new JSZip();
  let added = 0;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const urlRaw = img.downloadUrl || img.previewUrl || '';
    if (!urlRaw) continue;

    const url = resolveToAbsoluteUrl(urlRaw);
    const nameBase = img.originalFilename || img.filename || `image-${i + 1}`;
    const safeName = nameBase.replace(/[\\/:"*?<>|]+/g, '_').trim() || `image-${i + 1}`;

    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blob = res.data as Blob;
      if (!blob || !(blob instanceof Blob)) continue;
      
      zip.file(safeName, blob);
      added += 1;
      
      if (onProgress) {
        onProgress(added, images.length);
      }
    } catch (error) {
      console.error(`Failed to download image ${safeName}:`, error);
      // Continue with other images
    }
  }

  if (added === 0) {
    throw new Error('No images could be downloaded');
  }

  const outBlob = await zip.generateAsync({ type: 'blob' });
  const date = new Date();
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  triggerDownloadBlob(outBlob, `${zipNameBase || 'images'}-${stamp}.zip`);
};
