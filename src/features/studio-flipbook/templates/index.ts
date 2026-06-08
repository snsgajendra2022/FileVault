import { SAFE_MARGIN_PCT } from '../constants/canvas';
import type { LayoutType, StudioPageTemplate } from '../types';

const M = SAFE_MARGIN_PCT;

/** All 12 studio album page templates — percent-based slots on 1600×1000 canvas */
export const STUDIO_PAGE_TEMPLATES: Record<LayoutType, StudioPageTemplate> = {
  wedding_story_cover: {
    id: 'wedding_story_cover',
    name: 'Wedding Story Cover',
    pageType: 'cover',
    eventTypes: ['wedding', 'engagement', 'reception', 'anniversary', 'general'],
    minImages: 1,
    maxImages: 2,
    preferredOrientations: ['landscape'],
    background: {
      type: 'image',
      value: '',
      overlayGradient: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.65) 100%)',
    },
    imageSlots: [
      { id: 'hero', role: 'background', x: 0, y: 0, width: 100, height: 100, frameType: 'full_bleed', fitMode: 'cover', zIndex: 0 },
      { id: 'circle', role: 'circle', x: M, y: 58, width: 18, height: 28.8, borderRadius: 50, frameType: 'circle', fitMode: 'cover', zIndex: 2, shadow: '0 8px 32px rgba(0,0,0,0.35)' },
    ],
    textSlots: [
      { id: 'title', role: 'title', x: M + 22, y: 62, width: 100 - M * 2 - 22, height: 18, fontSizePx: 64, fontWeight: 700, color: '#ffffff', align: 'left', lineHeight: 1.15, shadow: '0 2px 12px rgba(0,0,0,0.5)' },
      { id: 'date', role: 'date', x: M + 22, y: 82, width: 40, height: 6, fontSizePx: 20, fontWeight: 400, color: '#e5e7eb', align: 'left', lineHeight: 1.4 },
    ],
  },

  hero_circular_highlights: {
    id: 'hero_circular_highlights',
    name: 'Hero With Circular Highlights',
    pageType: 'inner',
    eventTypes: ['wedding', 'engagement', 'anniversary'],
    minImages: 3,
    maxImages: 4,
    preferredOrientations: ['landscape', 'portrait'],
    background: { type: 'luxury_light', value: '#faf8f5' },
    imageSlots: [
      { id: 'hero', role: 'hero', x: M, y: M, width: 65, height: 100 - M * 2, borderRadius: 12, frameType: 'soft_shadow', fitMode: 'cover', zIndex: 1, shadow: '0 12px 40px rgba(0,0,0,0.12)' },
      { id: 'circle1', role: 'circle', x: 72, y: M + 2, width: 16, height: 25.6, borderRadius: 50, frameType: 'circle', fitMode: 'cover', zIndex: 2, shadow: '0 4px 16px rgba(0,0,0,0.15)' },
      { id: 'circle2', role: 'circle', x: 72, y: 42, width: 16, height: 25.6, borderRadius: 50, frameType: 'circle', fitMode: 'cover', zIndex: 2, shadow: '0 4px 16px rgba(0,0,0,0.15)' },
      { id: 'fade', role: 'decorative', x: 72, y: 68, width: 22, height: 22, borderRadius: 8, frameType: 'grayscale_fade', fitMode: 'cover', zIndex: 1, opacity: 0.45 },
    ],
    textSlots: [
      { id: 'heading', role: 'title', x: 72, y: M, width: 23, height: 12, fontSizePx: 36, fontWeight: 600, color: '#2c2c2c', align: 'left', lineHeight: 1.2 },
      { id: 'caption', role: 'caption', x: 72, y: 16, width: 23, height: 8, fontSizePx: 18, fontWeight: 400, color: '#6b7280', align: 'left', lineHeight: 1.5 },
    ],
    decorativeSlots: [
      { id: 'divider', kind: 'divider', x: 72, y: 14, width: 20, height: 0.4, zIndex: 3 },
    ],
  },

  modern_luxury_white: {
    id: 'modern_luxury_white',
    name: 'Modern Luxury White Gold',
    pageType: 'inner',
    eventTypes: ['wedding', 'engagement', 'corporate', 'general'],
    minImages: 3,
    maxImages: 3,
    background: { type: 'luxury_light', value: '#faf8f5' },
    imageSlots: [
      { id: 'hero', role: 'hero', x: M, y: M, width: 58, height: 100 - M * 2, borderRadius: 24, frameType: 'border', fitMode: 'cover', zIndex: 1, shadow: '0 8px 32px rgba(0,0,0,0.08)' },
      { id: 'support1', role: 'supporting', x: 66, y: M, width: 29, height: 42, borderRadius: 20, frameType: 'soft_shadow', fitMode: 'cover', zIndex: 1 },
      { id: 'support2', role: 'supporting', x: 66, y: 50, width: 29, height: 42, borderRadius: 20, frameType: 'soft_shadow', fitMode: 'cover', zIndex: 1 },
    ],
    textSlots: [
      { id: 'caption', role: 'caption', x: 66, y: 94, width: 29, height: 4, fontSizePx: 16, fontWeight: 500, color: '#8b7355', align: 'center', lineHeight: 1.4, letterSpacing: 2 },
    ],
    decorativeSlots: [
      { id: 'line1', kind: 'divider', x: 64, y: 48, width: 0.3, height: 4, zIndex: 2 },
    ],
  },

  three_image_collage: {
    id: 'three_image_collage',
    name: 'Three Image Premium Collage',
    pageType: 'inner',
    eventTypes: ['wedding', 'anniversary', 'family', 'general'],
    minImages: 3,
    maxImages: 3,
    background: { type: 'paper_texture', value: '#f8f6f2' },
    imageSlots: [
      { id: 'hero', role: 'hero', x: M, y: M, width: 58, height: 100 - M * 2, borderRadius: 16, frameType: 'soft_shadow', fitMode: 'cover', zIndex: 1, shadow: '0 10px 36px rgba(0,0,0,0.1)' },
      { id: 'small1', role: 'supporting', x: 66, y: M, width: 29, height: 42, borderRadius: 14, frameType: 'rounded', fitMode: 'cover', zIndex: 1 },
      { id: 'small2', role: 'supporting', x: 66, y: 52, width: 29, height: 42, borderRadius: 14, frameType: 'rounded', fitMode: 'cover', zIndex: 1 },
    ],
    textSlots: [
      { id: 'caption', role: 'caption', x: M, y: 92, width: 58, height: 5, fontSizePx: 20, fontWeight: 400, color: '#4b5563', align: 'left', lineHeight: 1.5 },
    ],
  },

  four_image_studio: {
    id: 'four_image_studio',
    name: 'Four Image Studio Grid',
    pageType: 'inner',
    eventTypes: ['birthday', 'party', 'family', 'general'],
    minImages: 4,
    maxImages: 4,
    background: { type: 'solid', value: '#faf8f5' },
    imageSlots: [
      { id: 'featured', role: 'hero', x: M, y: M, width: 48, height: 58, borderRadius: 16, frameType: 'soft_shadow', fitMode: 'cover', zIndex: 1 },
      { id: 'img2', role: 'supporting', x: 55, y: M, width: 40, height: 28, borderRadius: 12, frameType: 'rounded', fitMode: 'cover', zIndex: 1 },
      { id: 'img3', role: 'supporting', x: 55, y: 32, width: 40, height: 28, borderRadius: 12, frameType: 'rounded', fitMode: 'cover', zIndex: 1 },
      { id: 'img4', role: 'supporting', x: M, y: 68, width: 88, height: 26, borderRadius: 12, frameType: 'rounded', fitMode: 'cover', zIndex: 1 },
    ],
    textSlots: [
      { id: 'label', role: 'caption', x: M, y: 6, width: 50, height: 6, fontSizePx: 28, fontWeight: 600, color: '#374151', align: 'left', lineHeight: 1.2 },
    ],
  },

  full_bleed_ceremony: {
    id: 'full_bleed_ceremony',
    name: 'Full-Bleed Ceremony Page',
    pageType: 'inner',
    eventTypes: ['wedding', 'engagement', 'reception', 'corporate'],
    minImages: 1,
    maxImages: 1,
    preferredOrientations: ['landscape'],
    background: { type: 'image', value: '', overlayGradient: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 35%)' },
    imageSlots: [
      { id: 'hero', role: 'background', x: 0, y: 0, width: 100, height: 100, frameType: 'full_bleed', fitMode: 'cover', zIndex: 0 },
    ],
    textSlots: [
      { id: 'title', role: 'title', x: M, y: 82, width: 60, height: 10, fontSizePx: 40, fontWeight: 600, color: '#ffffff', align: 'left', lineHeight: 1.15, shadow: '0 2px 8px rgba(0,0,0,0.4)' },
      { id: 'date', role: 'date', x: M, y: 92, width: 40, height: 5, fontSizePx: 18, fontWeight: 400, color: '#e5e7eb', align: 'left', lineHeight: 1.4 },
    ],
  },

  royal_wedding_red_gold: {
    id: 'royal_wedding_red_gold',
    name: 'Royal Wedding Red Gold',
    pageType: 'inner',
    eventTypes: ['wedding', 'engagement', 'reception'],
    minImages: 2,
    maxImages: 3,
    background: { type: 'gradient', value: 'linear-gradient(160deg, #4a0e1a 0%, #2d0a12 100%)' },
    imageSlots: [
      { id: 'hero', role: 'hero', x: M + 2, y: M + 4, width: 52, height: 72, borderRadius: 8, frameType: 'golden', fitMode: 'cover', zIndex: 1, shadow: '0 12px 40px rgba(0,0,0,0.3)' },
      { id: 'circle1', role: 'circle', x: 62, y: M + 6, width: 15, height: 24, borderRadius: 50, frameType: 'golden', fitMode: 'cover', zIndex: 2 },
      { id: 'circle2', role: 'circle', x: 62, y: 52, width: 15, height: 24, borderRadius: 50, frameType: 'golden', fitMode: 'cover', zIndex: 2 },
    ],
    textSlots: [
      { id: 'heading', role: 'title', x: 62, y: M + 2, width: 30, height: 10, fontSizePx: 32, fontWeight: 600, color: '#f5e6d3', align: 'left', lineHeight: 1.2 },
      { id: 'caption', role: 'caption', x: 62, y: 80, width: 30, height: 8, fontSizePx: 16, fontWeight: 400, color: '#c9a227', align: 'left', lineHeight: 1.5 },
    ],
    decorativeSlots: [
      { id: 'border', kind: 'border', x: 3, y: 3, width: 94, height: 94, zIndex: 0 },
      { id: 'corner_tl', kind: 'corner_floral', x: 4, y: 4, width: 8, height: 8, zIndex: 3 },
      { id: 'corner_br', kind: 'corner_floral', x: 88, y: 88, width: 8, height: 8, zIndex: 3 },
    ],
  },

  cinematic_black_gold: {
    id: 'cinematic_black_gold',
    name: 'Cinematic Black Gold',
    pageType: 'inner',
    eventTypes: ['wedding', 'engagement', 'corporate'],
    minImages: 2,
    maxImages: 2,
    background: { type: 'cinematic_dark', value: '#0d0d0d' },
    imageSlots: [
      { id: 'hero', role: 'hero', x: M, y: M, width: 62, height: 100 - M * 2, borderRadius: 4, frameType: 'none', fitMode: 'cover', zIndex: 1 },
      { id: 'side', role: 'supporting', x: 70, y: 55, width: 22, height: 35, borderRadius: 4, frameType: 'border', fitMode: 'cover', zIndex: 1 },
    ],
    textSlots: [
      { id: 'title', role: 'title', x: 70, y: M, width: 25, height: 14, fontSizePx: 42, fontWeight: 700, color: '#d4af37', align: 'left', lineHeight: 1.1, letterSpacing: 1 },
      { id: 'caption', role: 'caption', x: 70, y: 22, width: 25, height: 10, fontSizePx: 16, fontWeight: 400, color: '#a3a3a3', align: 'left', lineHeight: 1.5 },
    ],
  },

  anniversary_romantic: {
    id: 'anniversary_romantic',
    name: 'Anniversary Romantic',
    pageType: 'inner',
    eventTypes: ['anniversary', 'engagement'],
    minImages: 1,
    maxImages: 2,
    background: { type: 'gradient', value: 'linear-gradient(180deg, #fdf2f4 0%, #fce7f3 100%)' },
    imageSlots: [
      { id: 'hero', role: 'hero', x: 20, y: M + 4, width: 60, height: 65, borderRadius: 20, frameType: 'soft_shadow', fitMode: 'cover', zIndex: 1, shadow: '0 12px 40px rgba(190,24,93,0.15)' },
      { id: 'circle', role: 'circle', x: M, y: 58, width: 16, height: 25.6, borderRadius: 50, frameType: 'circle', fitMode: 'cover', zIndex: 2 },
    ],
    textSlots: [
      { id: 'title', role: 'title', x: M, y: M, width: 50, height: 12, fontSizePx: 48, fontWeight: 400, color: '#be185d', align: 'left', lineHeight: 1.2 },
      { id: 'quote', role: 'quote', x: M, y: 88, width: 80, height: 8, fontSizePx: 18, fontWeight: 400, color: '#9d174d', align: 'center', lineHeight: 1.6, defaultContent: 'Forever & Always' },
    ],
    decorativeSlots: [
      { id: 'heart', kind: 'heart', x: 78, y: 8, width: 6, height: 6, zIndex: 2 },
    ],
  },

  birthday_party: {
    id: 'birthday_party',
    name: 'Birthday Party',
    pageType: 'inner',
    eventTypes: ['birthday', 'party', 'baby_shower'],
    minImages: 2,
    maxImages: 4,
    background: { type: 'gradient', value: 'linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #dbeafe 100%)' },
    imageSlots: [
      { id: 'hero', role: 'hero', x: M, y: 18, width: 55, height: 55, borderRadius: 20, frameType: 'soft_shadow', fitMode: 'cover', zIndex: 1 },
      { id: 'small1', role: 'supporting', x: 62, y: 22, width: 30, height: 24, borderRadius: 16, frameType: 'rounded', fitMode: 'cover', zIndex: 1 },
      { id: 'small2', role: 'supporting', x: 62, y: 50, width: 30, height: 24, borderRadius: 16, frameType: 'rounded', fitMode: 'cover', zIndex: 1 },
    ],
    textSlots: [
      { id: 'title', role: 'title', x: M, y: M, width: 70, height: 12, fontSizePx: 56, fontWeight: 700, color: '#7c3aed', align: 'left', lineHeight: 1.1 },
      { id: 'caption', role: 'caption', x: M, y: 78, width: 55, height: 8, fontSizePx: 20, fontWeight: 500, color: '#4c1d95', align: 'left', lineHeight: 1.4 },
    ],
    decorativeSlots: [
      { id: 'confetti', kind: 'confetti', x: 75, y: 5, width: 20, height: 12, zIndex: 0 },
    ],
  },

  family_classic: {
    id: 'family_classic',
    name: 'Family Classic',
    pageType: 'inner',
    eventTypes: ['family', 'general', 'corporate'],
    minImages: 2,
    maxImages: 4,
    background: { type: 'solid', value: '#f5f0e8' },
    imageSlots: [
      { id: 'hero', role: 'hero', x: M, y: M, width: 100 - M * 2, height: 52, borderRadius: 12, frameType: 'soft_shadow', fitMode: 'cover', zIndex: 1 },
      { id: 'small1', role: 'supporting', x: M, y: 62, width: 28, height: 32, borderRadius: 10, frameType: 'rounded', fitMode: 'cover', zIndex: 1 },
      { id: 'small2', role: 'supporting', x: 36, y: 62, width: 28, height: 32, borderRadius: 10, frameType: 'rounded', fitMode: 'cover', zIndex: 1 },
      { id: 'small3', role: 'supporting', x: 67, y: 62, width: 28, height: 32, borderRadius: 10, frameType: 'rounded', fitMode: 'cover', zIndex: 1 },
    ],
    textSlots: [
      { id: 'caption', role: 'caption', x: M, y: 6, width: 60, height: 6, fontSizePx: 28, fontWeight: 600, color: '#3d3428', align: 'left', lineHeight: 1.2 },
    ],
  },

  closing_thank_you: {
    id: 'closing_thank_you',
    name: 'Closing Thank You',
    pageType: 'closing',
    eventTypes: ['wedding', 'engagement', 'anniversary', 'birthday', 'party', 'family', 'general'],
    minImages: 1,
    maxImages: 1,
    background: { type: 'luxury_light', value: '#faf8f5' },
    imageSlots: [
      { id: 'hero', role: 'hero', x: 25, y: M, width: 50, height: 50, borderRadius: 16, frameType: 'soft_shadow', fitMode: 'cover', zIndex: 1 },
    ],
    textSlots: [
      { id: 'thanks', role: 'thank_you', x: 15, y: 62, width: 70, height: 12, fontSizePx: 40, fontWeight: 600, color: '#2c2c2c', align: 'center', lineHeight: 1.2, defaultContent: 'Thank You' },
      { id: 'message', role: 'quote', x: 20, y: 76, width: 60, height: 10, fontSizePx: 18, fontWeight: 400, color: '#6b7280', align: 'center', lineHeight: 1.6 },
      { id: 'date', role: 'date', x: 30, y: 90, width: 40, height: 5, fontSizePx: 16, fontWeight: 400, color: '#9ca3af', align: 'center', lineHeight: 1.4 },
    ],
  },
};

export function getTemplate(id: LayoutType): StudioPageTemplate {
  return STUDIO_PAGE_TEMPLATES[id];
}

export function listTemplatesForEvent(eventType: string): StudioPageTemplate[] {
  return Object.values(STUDIO_PAGE_TEMPLATES).filter((t) =>
    t.eventTypes.includes(eventType as StudioPageTemplate['eventTypes'][number])
  );
}

export const ALL_LAYOUT_TYPES = Object.keys(STUDIO_PAGE_TEMPLATES) as LayoutType[];
