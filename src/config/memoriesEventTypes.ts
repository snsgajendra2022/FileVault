/** Curated preview imagery per event type (deterministic Picsum seeds — no API keys). */

export const MEMORIES_EVENT_TYPE_IDS = ['wedding', 'birthday', 'corporate', 'family', 'other'] as const;
export type MemoriesEventTypeId = (typeof MEMORIES_EVENT_TYPE_IDS)[number];

const PREVIEW_SEEDS: Record<MemoriesEventTypeId, [string, string, string]> = {
  wedding: ['om-wed-a', 'om-wed-b', 'om-wed-c'],
  birthday: ['om-bday-a', 'om-bday-b', 'om-bday-c'],
  corporate: ['om-corp-a', 'om-corp-b', 'om-corp-c'],
  family: ['om-fam-a', 'om-fam-b', 'om-fam-c'],
  other: ['om-gen-a', 'om-gen-b', 'om-gen-c'],
};

export function normalizeMemoriesEventType(raw?: string | null): MemoriesEventTypeId {
  const s = String(raw ?? '')
    .toLowerCase()
    .trim();
  return (MEMORIES_EVENT_TYPE_IDS as readonly string[]).includes(s)
    ? (s as MemoriesEventTypeId)
    : 'other';
}

/** Static preview URLs for create page + guest welcome (480×640). */
export function getMemoriesEventTypePreviewUrls(type: MemoriesEventTypeId): string[] {
  return PREVIEW_SEEDS[type].map(
    (seed) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/480/640`
  );
}
