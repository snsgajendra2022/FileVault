// Simple encryption/decryption utility for image IDs in URLs

const ENCRYPTION_KEY = 'filevault_image_ids_2024';

/**
 * Encrypts image IDs array to a string for URL parameter
 * @param imageIds Array of image IDs
 * @returns Encrypted string
 */
export const encryptImageIds = (imageIds: number[]): string => {
  try {
    // Convert array to comma-separated string
    const idsString = imageIds.join(',');
    
    // Simple encryption: base64 encode with key obfuscation
    // Add a simple XOR cipher for extra obfuscation
    let encrypted = '';
    for (let i = 0; i < idsString.length; i++) {
      const charCode = idsString.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      encrypted += String.fromCharCode(charCode);
    }
    
    // Base64 encode
    const base64 = btoa(encrypted);
    
    // URL-safe base64 (replace + with -, / with _, remove padding)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('Encryption error:', error);
    // Fallback to simple base64 if encryption fails
    return btoa(imageIds.join(',')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
};

/**
 * Decrypts encrypted image IDs string back to array
 * @param encryptedString Encrypted string from URL
 * @returns Array of image IDs
 */
export const decryptImageIds = (encryptedString: string): number[] => {
  try {
    // Restore URL-safe base64 to standard base64
    let base64 = encryptedString.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode base64
    const decoded = atob(base64);
    
    // Decrypt XOR cipher
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      decrypted += String.fromCharCode(charCode);
    }
    
    // Convert back to array of numbers
    return decrypted.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
  } catch (error) {
    console.error('Decryption error:', error);
    // Try fallback: simple base64 decode
    try {
      let base64 = encryptedString.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const decoded = atob(base64);
      return decoded.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    } catch (fallbackError) {
      console.error('Fallback decryption error:', fallbackError);
      return [];
    }
  }
};

