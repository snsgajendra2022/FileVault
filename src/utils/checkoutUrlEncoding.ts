/**
 * Encode/decode checkout file list for short public URLs.
 * Uses gzip + base64 when supported (Chrome, Safari 16+, Firefox 113+).
 * Falls back to raw comma-separated list if compression is not available.
 */

const FILES_THRESHOLD = 20; // Use compressed param when file count exceeds this
const URL_LENGTH_THRESHOLD = 1500; // Or when files= string would exceed this length

export function shouldUseCompressedFileList(fileNames: string[]): boolean {
  if (fileNames.length > FILES_THRESHOLD) return true;
  const joined = fileNames.join(',');
  return joined.length > URL_LENGTH_THRESHOLD;
}

/** Base64 → base64url (URL-safe, shorter in URLs: no + / so no %2B %2F). */
function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Base64url → base64 for atob(). */
function fromBase64Url(urlSafe: string): string {
  let base64 = urlSafe.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  return base64;
}

/** Compress file list to a short base64url string (URL-safe, shorter when used in query). Returns null if compression not supported. */
export async function compressFileList(fileNames: string[]): Promise<string | null> {
  const raw = fileNames.join(',');
  if (!raw) return '';
  try {
    const CompressionStreamCtor = (globalThis as unknown as { CompressionStream?: new (format: string) => TransformStream }).CompressionStream;
    if (!CompressionStreamCtor) return null;
    const blob = new Blob([raw], { type: 'text/plain' });
    const stream = blob.stream().pipeThrough(new CompressionStreamCtor('gzip'));
    const compressed = await new Response(stream).arrayBuffer();
    const bytes = new Uint8Array(compressed);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    return toBase64Url(base64);
  } catch {
    return null;
  }
}

/** Decompress file list from base64url gzip string. Returns [] on error or unsupported. */
export async function decompressFileList(encoded: string): Promise<string[]> {
  if (!encoded || !encoded.trim()) return [];
  try {
    const DecompressionStreamCtor = (globalThis as unknown as { DecompressionStream?: new (format: string) => TransformStream }).DecompressionStream;
    if (!DecompressionStreamCtor) return [];
    const base64 = fromBase64Url(encoded.trim());
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStreamCtor('gzip'));
    const decompressed = await new Response(stream).text();
    return decompressed.split(',').map((f) => f.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
