// src/utils/encryption.ts
const XOR_KEY = process.env.REACT_APP_XOR_KEY || 'default_secret_key_for_xor_encryption_12345';

function xorEncryptDecrypt(input: string, key: string): string {
  let output = '';
  for (let i = 0; i < input.length; i++) {
    output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return output;
}

export function encryptImageIds(imageIds: (number | string)[]): string {
  const idString = imageIds.join(',');
  const encrypted = xorEncryptDecrypt(idString, XOR_KEY);
  // Encode to Base64 and make it URL-safe
  return btoa(encrypted)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, ''); // Remove padding
}

export function decryptImageIds(encryptedString: string): (number | string)[] {
  if (!encryptedString) return [];
  try {
    // Restore padding and decode Base64
    const padded = encryptedString.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(padded + '==='.slice((padded.length + 3) % 4)); // Add padding back
    const decrypted = xorEncryptDecrypt(decoded, XOR_KEY);
    return decrypted.split(',').map(id => {
      const numId = parseInt(id, 10);
      return isNaN(numId) ? id : numId; // Return original string if not a number
    }).filter(id => id !== ''); // Filter out empty strings from split
  } catch (e) {
    console.error('Decryption failed:', e);
    return [];
  }
}

/** Payload for public checkout/selection (token + albumId). */
export type CheckoutPayload = { token: string; albumId: number };

function toBase64Url(binary: string): string {
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded + '==='.slice((padded.length + 3) % 4));
}

/** Encrypt token + albumId for use in ?q= URL param (single album minimal link). */
export function encryptCheckoutPayload(payload: CheckoutPayload): string {
  const raw = JSON.stringify({ t: payload.token, a: payload.albumId });
  const encrypted = xorEncryptDecrypt(raw, XOR_KEY);
  return toBase64Url(encrypted);
}

/** Decrypt ?q= param to { token, albumId }. Returns null if invalid. */
export function decryptCheckoutPayload(encoded: string): CheckoutPayload | null {
  if (!encoded || !encoded.trim()) return null;
  try {
    const decoded = fromBase64Url(encoded.trim());
    const decrypted = xorEncryptDecrypt(decoded, XOR_KEY);
    const parsed = JSON.parse(decrypted) as { t?: string; a?: number };
    if (typeof parsed?.t === 'string' && typeof parsed?.a === 'number' && Number.isFinite(parsed.a)) {
      return { token: parsed.t, albumId: parsed.a };
    }
    return null;
  } catch {
    return null;
  }
}

