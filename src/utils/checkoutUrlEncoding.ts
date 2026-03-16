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

/** Compress file list to a short base64 string. Returns null if compression not supported. */
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
    return btoa(binary);
  } catch {
    return null;
  }
}

/** Decompress file list from base64 gzip string. Returns [] on error or unsupported. */
export async function decompressFileList(encoded: string): Promise<string[]> {
  if (!encoded || !encoded.trim()) return [];
  try {
    const DecompressionStreamCtor = (globalThis as unknown as { DecompressionStream?: new (format: string) => TransformStream }).DecompressionStream;
    if (!DecompressionStreamCtor) return [];
    const binary = atob(encoded.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStreamCtor('gzip'));
    const decompressed = await new Response(stream).text();
    return decompressed.split(',').map((f) => f.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
