export function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (s || 'event').slice(0, 48);
}

export function randomToken(length = 14): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Deterministic demo images (picsum) — no upload required for MVP UI. */
export function picsumPair(seed: number): { thumbUrl: string; hdUrl: string } {
  const id = 100 + (seed % 80);
  return {
    thumbUrl: `https://picsum.photos/id/${id}/400/533`,
    hdUrl: `https://picsum.photos/id/${id}/1200/1600`,
  };
}
