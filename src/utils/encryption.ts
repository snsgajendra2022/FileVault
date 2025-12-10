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

