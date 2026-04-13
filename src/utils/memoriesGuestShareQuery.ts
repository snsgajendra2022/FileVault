/** Query params for Our Memories guest share links (`/memories/e/:slug?...`). */

/**
 * Gallery access token from the public share URL.
 * Prefer `token` (e.g. `?token=...&shareId=...`); fall back to legacy `t`.
 */
export function getMemoriesShareAccessTokenFromSearchParams(searchParams: URLSearchParams): string {
  const fromToken = searchParams.get('token')?.trim();
  if (fromToken) return fromToken;
  return searchParams.get('t')?.trim() || '';
}

export type MemoriesGuestSharePermissions = {
  allowImageUpload: boolean;
  allowViewEventImages: boolean;
};

export function parseMemoriesGuestShareSearchParams(searchParams: URLSearchParams): {
  useGuestFlow: boolean;
  allowImageUpload: boolean;
  allowViewEventImages: boolean;
} {
  const sid = searchParams.get('shareId')?.trim() || searchParams.get('sid')?.trim() || '';
  const useGuestFlow = Boolean(sid) || searchParams.get('guest') === '1';

  const parseBool = (key: string, defaultValue: boolean) => {
    const v = searchParams.get(key);
    if (v == null || v === '') return defaultValue;
    const x = v.toLowerCase();
    if (x === '1' || x === 'true' || x === 'yes') return true;
    if (x === '0' || x === 'false' || x === 'no') return false;
    return defaultValue;
  };

  return {
    useGuestFlow,
    allowImageUpload: parseBool('allowImageUpload', true),
    allowViewEventImages: parseBool('allowViewEventImages', true),
  };
}

/** Append `guest=1` and permission flags (used when building links from the host share modal). */
export function applyMemoriesGuestShareQueryParams(
  url: URL,
  permissions: MemoriesGuestSharePermissions
): void {
  url.searchParams.set('guest', '1');
  url.searchParams.set('allowImageUpload', permissions.allowImageUpload ? '1' : '0');
  url.searchParams.set('allowViewEventImages', permissions.allowViewEventImages ? '1' : '0');
}
