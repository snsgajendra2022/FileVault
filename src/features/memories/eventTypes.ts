/** Event “theme” for Our Memories — drives guest intro imagery. Persisted as `eventType` on the API. */

export const MEMORIES_EVENT_TYPE_IDS = [
  'wedding',
  'birthday',
  'celebration',
  'family',
  'corporate',
  'general',
] as const;

export type MemoriesEventTypeId = (typeof MEMORIES_EVENT_TYPE_IDS)[number];

export function normalizeMemoriesEventType(raw: string | undefined | null): MemoriesEventTypeId {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  return (MEMORIES_EVENT_TYPE_IDS as readonly string[]).includes(v) ? (v as MemoriesEventTypeId) : 'general';
}

/** Curated Unsplash URLs (static, no repo binaries). */
export const MEMORIES_EVENT_TYPE_IMAGES: Record<MemoriesEventTypeId, readonly [string, string, string]> = {
  wedding: [
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80',
  ],
  birthday: [
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=800&q=80',
  ],
  celebration: [
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=800&q=80',
  ],
  family: [
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1609220136736-443140cffec6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?auto=format&fit=crop&w=800&q=80',
  ],
  corporate: [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1521737711867-e3b75d770b55?auto=format&fit=crop&w=800&q=80',
  ],
  general: [
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
  ],
};

export function getGuestIntroHeroImageUrls(
  eventType: MemoriesEventTypeId | undefined,
  coverImageUrl?: string
): string[] {
  const type = normalizeMemoriesEventType(eventType);
  const pack = [...MEMORIES_EVENT_TYPE_IMAGES[type]];
  const cover = coverImageUrl?.trim();
  if (cover) {
    return [cover, pack[1]!, pack[2]!];
  }
  return pack;
}
