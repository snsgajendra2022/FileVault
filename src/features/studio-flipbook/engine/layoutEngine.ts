import { getTheme, pickThemeForEvent } from '../themes';
import { getTemplate, STUDIO_PAGE_TEMPLATES } from '../templates';
import { groupByOrientation, sortImagesForLayout, toAlbumImageMeta } from './imageAnalysis';
import type {
  AlbumImageMeta,
  EventType,
  GeneratedPage,
  GeneratedPageElement,
  LayoutType,
  StudioPageTemplate,
  ThemeId,
} from '../types';

export type LayoutEngineInput = {
  albumId: number;
  title: string;
  eventType: EventType;
  theme?: ThemeId;
  thankYouMessage?: string;
  coupleName?: string;
  eventDate?: string;
  images: Array<{
    id: number;
    imageUrl?: string;
    thumbnailUrl?: string;
    url?: string;
    width?: number;
    height?: number;
    sortOrder?: number;
  }>;
};

/** Inner layout sequence — varied, not repetitive */
const INNER_LAYOUT_POOL: LayoutType[] = [
  'hero_circular_highlights',
  'full_bleed_ceremony',
  'three_image_collage',
  'modern_luxury_white',
  'royal_wedding_red_gold',
  'cinematic_black_gold',
  'four_image_studio',
  'family_classic',
  'anniversary_romantic',
  'birthday_party',
];

function pickInnerLayouts(eventType: EventType, themeId: ThemeId, count: number): LayoutType[] {
  const theme = getTheme(themeId);
  const pool = [
    ...theme.defaultLayouts.filter((l) => l !== 'wedding_story_cover' && l !== 'closing_thank_you'),
    ...INNER_LAYOUT_POOL,
  ];
  const unique = Array.from(new Set(pool)).filter((l) => {
    const t = STUDIO_PAGE_TEMPLATES[l];
    return t && t.eventTypes.includes(eventType) && t.pageType === 'inner';
  });

  const result: LayoutType[] = [];
  let idx = 0;
  while (result.length < count && unique.length > 0) {
    result.push(unique[idx % unique.length]);
    idx += 1;
  }
  return result;
}

function assignImagesToTemplate(
  template: StudioPageTemplate,
  images: AlbumImageMeta[],
  usedIds: Set<number>
): { imageMap: Map<string, AlbumImageMeta>; remaining: AlbumImageMeta[] } {
  const available = images.filter((i) => !usedIds.has(i.id));
  const byOrient = groupByOrientation(available);
  const imageMap = new Map<string, AlbumImageMeta>();
  const slots = template.imageSlots.filter((s) => s.role !== 'decorative');

  for (const slot of slots) {
    let pick: AlbumImageMeta | undefined;
    if (slot.role === 'background' || slot.role === 'hero') {
      pick = byOrient.landscape[0] ?? byOrient.square[0] ?? byOrient.portrait[0] ?? available[0];
    } else if (slot.role === 'circle' || slot.frameType === 'circle') {
      pick = byOrient.portrait[0] ?? byOrient.square[0] ?? available[0];
    } else {
      pick = available.find((i) => !imageMap.has(String(i.id))) ?? available[0];
    }
    if (pick) {
      imageMap.set(slot.id, pick);
      usedIds.add(pick.id);
      const remove = (arr: AlbumImageMeta[]) => {
        const i = arr.indexOf(pick!);
        if (i >= 0) arr.splice(i, 1);
      };
      remove(byOrient.landscape);
      remove(byOrient.portrait);
      remove(byOrient.square);
      const ai = available.indexOf(pick);
      if (ai >= 0) available.splice(ai, 1);
    }
  }

  return { imageMap, remaining: available };
}

function templateToElements(
  template: StudioPageTemplate,
  imageMap: Map<string, AlbumImageMeta>,
  textOverrides: Record<string, string>
): GeneratedPageElement[] {
  const elements: GeneratedPageElement[] = [];

  for (const slot of template.imageSlots) {
    const img = imageMap.get(slot.id);
    if (!img && slot.role !== 'decorative') continue;
    elements.push({
      elementType: slot.role === 'decorative' ? 'decorative' : 'image',
      albumImageId: img?.id,
      x: slot.x,
      y: slot.y,
      width: slot.width,
      height: slot.height,
      rotation: 0,
      zIndex: slot.zIndex ?? 1,
      opacity: slot.opacity,
      frameType: slot.frameType,
      fitMode: slot.fitMode ?? 'cover',
      styleJson: {
        borderRadius: slot.borderRadius,
        shadow: slot.shadow,
        role: slot.role,
      },
    });
  }

  for (const slot of template.textSlots) {
    const content = textOverrides[slot.id] ?? slot.defaultContent ?? '';
    elements.push({
      elementType: 'text',
      content,
      x: slot.x,
      y: slot.y,
      width: slot.width,
      height: slot.height,
      zIndex: 10,
      styleJson: {
        role: slot.role,
        fontSizePx: slot.fontSizePx,
        fontFamily: slot.fontFamily,
        fontWeight: slot.fontWeight,
        color: slot.color,
        align: slot.align,
        letterSpacing: slot.letterSpacing,
        lineHeight: slot.lineHeight,
        shadow: slot.shadow,
      },
    });
  }

  for (const dec of template.decorativeSlots ?? []) {
    elements.push({
      elementType: 'decorative',
      x: dec.x,
      y: dec.y,
      width: dec.width,
      height: dec.height,
      zIndex: dec.zIndex ?? 5,
      styleJson: { kind: dec.kind },
    });
  }

  return elements;
}

function imagesPerPage(template: StudioPageTemplate): number {
  return template.imageSlots.filter((s) => s.role !== 'decorative').length;
}

/**
 * Auto-generate studio album pages from album images.
 * Picks templates by orientation, count, and event theme — avoids duplicate images.
 */
export function generateStudioFlipbook(input: LayoutEngineInput): GeneratedPage[] {
  const themeId = input.theme ?? pickThemeForEvent(input.eventType);
  const sorted = sortImagesForLayout(input.images.map(toAlbumImageMeta));
  if (sorted.length === 0) return [];

  const usedIds = new Set<number>();
  const pages: GeneratedPage[] = [];
  let pageNum = 1;

  const textBase: Record<string, string> = {
    title: input.coupleName ?? input.title,
    coupleName: input.coupleName ?? input.title,
    date: input.eventDate ?? '',
    thanks: 'Thank You',
    message: input.thankYouMessage ?? 'Thank you for sharing these beautiful memories with us.',
    heading: input.title,
    caption: '',
  };

  // Cover
  const coverTemplate = getTemplate('wedding_story_cover');
  const coverAssign = assignImagesToTemplate(coverTemplate, sorted, usedIds);
  pages.push({
    pageNumber: pageNum++,
    pageType: 'cover',
    layoutType: 'wedding_story_cover',
    backgroundType: coverTemplate.background.type,
    backgroundValue: coverTemplate.background.value,
    themeVariant: themeId,
    settingsJson: { overlayGradient: coverTemplate.background.overlayGradient },
    elements: templateToElements(coverTemplate, coverAssign.imageMap, textBase),
  });

  // Inner pages — budget ~1 image slot group per 2–3 photos
  const remaining = sorted.filter((i) => !usedIds.has(i.id));
  const innerCount = Math.min(
    16,
    Math.max(2, Math.ceil(remaining.length / 2.5))
  );
  const innerLayouts = pickInnerLayouts(input.eventType, themeId, innerCount);
  let pool = [...remaining];

  for (const layoutId of innerLayouts) {
    if (pool.length === 0) break;
    const template = getTemplate(layoutId);
    const need = Math.min(imagesPerPage(template), pool.length);
    if (need < template.minImages) continue;

    const batch = sortImagesForLayout(pool).slice(0, need);
    const imageMap = new Map<string, AlbumImageMeta>();
    template.imageSlots
      .filter((s) => s.role !== 'decorative')
      .forEach((slot, i) => {
        if (batch[i]) {
          imageMap.set(slot.id, batch[i]);
          usedIds.add(batch[i].id);
        }
      });
    pool = pool.filter((i) => !usedIds.has(i.id));

    pages.push({
      pageNumber: pageNum++,
      pageType: 'inner',
      layoutType: layoutId,
      backgroundType: template.background.type,
      backgroundValue: template.background.value,
      themeVariant: themeId,
      settingsJson: { overlayGradient: template.background.overlayGradient },
      elements: templateToElements(template, imageMap, textBase),
    });
  }

  // Closing
  const closingTemplate = getTemplate('closing_thank_you');
  const closingPool = sorted.filter((i) => !usedIds.has(i.id));
  const closingImg = closingPool[0] ?? sorted[sorted.length - 1];
  const closingMap = new Map<string, AlbumImageMeta>();
  if (closingImg) closingMap.set('hero', closingImg);

  pages.push({
    pageNumber: pageNum,
    pageType: 'closing',
    layoutType: 'closing_thank_you',
    backgroundType: closingTemplate.background.type,
    backgroundValue: closingTemplate.background.value,
    themeVariant: themeId,
    elements: templateToElements(closingTemplate, closingMap, textBase),
  });

  return pages;
}
