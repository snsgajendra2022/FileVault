import type { EventType, FlipbookTheme, ThemeId } from '../types';

export const STUDIO_THEMES: Record<ThemeId, FlipbookTheme> = {
  wedding_royal: {
    id: 'wedding_royal',
    name: 'Wedding Royal',
    eventTypes: ['wedding', 'engagement', 'reception'],
    backgroundColor: '#4a0e1a',
    accentColor: '#c9a227',
    secondaryColor: '#f5e6d3',
    textColor: '#f5e6d3',
    titleFont: '"Playfair Display", Georgia, serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    borderStyle: '2px solid #c9a227',
    defaultLayouts: [
      'wedding_story_cover',
      'royal_wedding_red_gold',
      'hero_circular_highlights',
      'full_bleed_ceremony',
      'three_image_collage',
      'closing_thank_you',
    ],
  },
  wedding_modern: {
    id: 'wedding_modern',
    name: 'Wedding Modern',
    eventTypes: ['wedding', 'engagement', 'reception'],
    backgroundColor: '#faf8f5',
    accentColor: '#b8860b',
    secondaryColor: '#e8e0d5',
    textColor: '#2c2c2c',
    titleFont: '"Cormorant Garamond", Georgia, serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    borderStyle: '1px solid #b8860b',
    defaultLayouts: [
      'wedding_story_cover',
      'modern_luxury_white',
      'hero_circular_highlights',
      'three_image_collage',
      'full_bleed_ceremony',
      'closing_thank_you',
    ],
  },
  cinematic_black: {
    id: 'cinematic_black',
    name: 'Cinematic Black',
    eventTypes: ['wedding', 'engagement', 'corporate', 'general'],
    backgroundColor: '#0d0d0d',
    accentColor: '#d4af37',
    secondaryColor: '#1a1a1a',
    textColor: '#f0f0f0',
    titleFont: '"Playfair Display", Georgia, serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    borderStyle: '1px solid #d4af37',
    defaultLayouts: [
      'wedding_story_cover',
      'cinematic_black_gold',
      'full_bleed_ceremony',
      'hero_circular_highlights',
      'closing_thank_you',
    ],
  },
  anniversary_romantic: {
    id: 'anniversary_romantic',
    name: 'Anniversary Romantic',
    eventTypes: ['anniversary', 'engagement'],
    backgroundColor: '#fdf2f4',
    accentColor: '#be185d',
    secondaryColor: '#fce7f3',
    textColor: '#4a1942',
    titleFont: '"Dancing Script", cursive',
    bodyFont: '"Inter", system-ui, sans-serif',
    borderStyle: '1px solid #f9a8d4',
    defaultLayouts: [
      'anniversary_romantic',
      'hero_circular_highlights',
      'three_image_collage',
      'closing_thank_you',
    ],
  },
  birthday_party: {
    id: 'birthday_party',
    name: 'Birthday Party',
    eventTypes: ['birthday', 'party', 'baby_shower'],
    backgroundColor: 'linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #dbeafe 100%)',
    accentColor: '#7c3aed',
    secondaryColor: '#fbbf24',
    textColor: '#1e1b4b',
    titleFont: '"Fredoka", system-ui, sans-serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    borderStyle: 'none',
    defaultLayouts: [
      'birthday_party',
      'four_image_studio',
      'three_image_collage',
      'closing_thank_you',
    ],
  },
  family_classic: {
    id: 'family_classic',
    name: 'Family Classic',
    eventTypes: ['family', 'general', 'corporate'],
    backgroundColor: '#f5f0e8',
    accentColor: '#8b7355',
    secondaryColor: '#e8dfd0',
    textColor: '#3d3428',
    titleFont: '"Merriweather", Georgia, serif',
    bodyFont: '"Inter", system-ui, sans-serif',
    borderStyle: '1px solid #c4b5a0',
    defaultLayouts: [
      'family_classic',
      'three_image_collage',
      'four_image_studio',
      'closing_thank_you',
    ],
  },
};

export function pickThemeForEvent(eventType: EventType): ThemeId {
  const match = (Object.values(STUDIO_THEMES) as FlipbookTheme[]).find((t) =>
    t.eventTypes.includes(eventType)
  );
  return match?.id ?? 'family_classic';
}

export function getTheme(id: ThemeId): FlipbookTheme {
  return STUDIO_THEMES[id];
}
