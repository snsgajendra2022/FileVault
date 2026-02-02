import type { PhotoBookAlbum, PhotoBookSpreadLayout, PhotoBookTemplate } from '../types/photobook'
import { newPhotoBookId } from '../utils/photobookId'

const GRID = { cols: 12, rows: 6 } as const

function layout(partial: Omit<PhotoBookSpreadLayout, 'cols' | 'rows'>): PhotoBookSpreadLayout {
  return { ...GRID, ...partial }
}

export const photobookTemplates: PhotoBookTemplate[] = [
  {
    id: 'classic',
    name: 'Classic Story',
    description: 'Big moments + supporting shots. Great for travel and events.',
    coverLayoutId: 'cover-full',
    layouts: [
      layout({
        id: 'cover-full',
        name: 'Cover (Full Bleed)',
        slots: [{ id: 'c1', col: 1, row: 1, colSpan: 12, rowSpan: 6 }],
      }),
      layout({
        id: 'full-bleed',
        name: 'Full Bleed',
        slots: [{ id: 's1', col: 1, row: 1, colSpan: 12, rowSpan: 6 }],
      }),
      layout({
        id: 'two-up',
        name: 'Two Up',
        slots: [
          { id: 's1', col: 1, row: 1, colSpan: 6, rowSpan: 6 },
          { id: 's2', col: 7, row: 1, colSpan: 6, rowSpan: 6 },
        ],
      }),
      layout({
        id: 'hero-plus-two',
        name: 'Hero + Two',
        slots: [
          { id: 's1', col: 1, row: 1, colSpan: 7, rowSpan: 6 },
          { id: 's2', col: 8, row: 1, colSpan: 5, rowSpan: 3 },
          { id: 's3', col: 8, row: 4, colSpan: 5, rowSpan: 3 },
        ],
      }),
      layout({
        id: 'four-grid',
        name: 'Four Grid',
        slots: [
          { id: 's1', col: 1, row: 1, colSpan: 6, rowSpan: 3 },
          { id: 's2', col: 7, row: 1, colSpan: 6, rowSpan: 3 },
          { id: 's3', col: 1, row: 4, colSpan: 6, rowSpan: 3 },
          { id: 's4', col: 7, row: 4, colSpan: 6, rowSpan: 3 },
        ],
      }),
    ],
    defaultSpreads: [
      { layoutId: 'cover-full' },
      { layoutId: 'hero-plus-two' },
      { layoutId: 'two-up' },
      { layoutId: 'four-grid' },
      { layoutId: 'full-bleed' },
      { layoutId: 'two-up' },
    ],
  },
  {
    id: 'grid',
    name: 'Modern Grid',
    description: 'Clean, consistent grids for lots of photos (family, yearbook, etc.).',
    coverLayoutId: 'cover-center',
    layouts: [
      layout({
        id: 'cover-center',
        name: 'Cover (Centered)',
        slots: [{ id: 'c1', col: 3, row: 1, colSpan: 8, rowSpan: 6 }],
      }),
      layout({
        id: 'nine-grid',
        name: 'Nine Grid',
        slots: [
          { id: 's1', col: 1, row: 1, colSpan: 4, rowSpan: 2 },
          { id: 's2', col: 5, row: 1, colSpan: 4, rowSpan: 2 },
          { id: 's3', col: 9, row: 1, colSpan: 4, rowSpan: 2 },
          { id: 's4', col: 1, row: 3, colSpan: 4, rowSpan: 2 },
          { id: 's5', col: 5, row: 3, colSpan: 4, rowSpan: 2 },
          { id: 's6', col: 9, row: 3, colSpan: 4, rowSpan: 2 },
          { id: 's7', col: 1, row: 5, colSpan: 4, rowSpan: 2 },
          { id: 's8', col: 5, row: 5, colSpan: 4, rowSpan: 2 },
          { id: 's9', col: 9, row: 5, colSpan: 4, rowSpan: 2 },
        ],
      }),
      layout({
        id: 'three-wide',
        name: 'Three Wide',
        slots: [
          { id: 's1', col: 1, row: 1, colSpan: 4, rowSpan: 6 },
          { id: 's2', col: 5, row: 1, colSpan: 4, rowSpan: 6 },
          { id: 's3', col: 9, row: 1, colSpan: 4, rowSpan: 6 },
        ],
      }),
    ],
    defaultSpreads: [
      { layoutId: 'cover-center' },
      { layoutId: 'three-wide' },
      { layoutId: 'nine-grid' },
      { layoutId: 'nine-grid' },
      { layoutId: 'three-wide' },
    ],
  },
  {
    id: 'wedding',
    name: 'Wedding Elegance',
    description: 'Minimal, romantic layouts with hero moments and detail shots.',
    coverLayoutId: 'cover-wedding-hero',
    layouts: [
      layout({
        id: 'cover-wedding-hero',
        name: 'Cover (Hero + Title Space)',
        // Match sample: circular photo on left, text on right.
        slots: [{ id: 'c1', col: 2, row: 2, colSpan: 4, rowSpan: 4 }],
        style: { background: 'wedding', variant: 'cover' },
      }),
      layout({
        id: 'wedding-full-bleed',
        name: 'Full Bleed',
        slots: [{ id: 's1', col: 1, row: 1, colSpan: 12, rowSpan: 6 }],
        style: { background: 'wedding', variant: 'cover' },
      }),
      layout({
        id: 'wedding-two-up',
        name: 'Two Up',
        slots: [
          { id: 's1', col: 1, row: 1, colSpan: 6, rowSpan: 6 },
          { id: 's2', col: 7, row: 1, colSpan: 6, rowSpan: 6 },
        ],
        style: { background: 'wedding', variant: 'cover' },
      }),
      layout({
        id: 'wedding-hero-plus-three',
        name: 'Hero + Three',
        slots: [
          { id: 's1', col: 1, row: 1, colSpan: 12, rowSpan: 4 },
          { id: 's2', col: 1, row: 5, colSpan: 4, rowSpan: 2 },
          { id: 's3', col: 5, row: 5, colSpan: 4, rowSpan: 2 },
          { id: 's4', col: 9, row: 5, colSpan: 4, rowSpan: 2 },
        ],
        style: { background: 'wedding', variant: 'cover' },
      }),
      layout({
        id: 'wedding-details',
        name: 'Details (1 + 4)',
        slots: [
          { id: 's1', col: 1, row: 1, colSpan: 7, rowSpan: 6 },
          { id: 's2', col: 8, row: 1, colSpan: 5, rowSpan: 2 },
          { id: 's3', col: 8, row: 3, colSpan: 5, rowSpan: 2 },
          { id: 's4', col: 8, row: 5, colSpan: 5, rowSpan: 1 },
          { id: 's5', col: 8, row: 6, colSpan: 5, rowSpan: 1 },
        ],
        style: { background: 'wedding', variant: 'cover' },
      }),
    ],
    defaultSpreads: [
      { layoutId: 'cover-wedding-hero' },
      { layoutId: 'wedding-full-bleed' },
      { layoutId: 'wedding-two-up' },
      { layoutId: 'wedding-hero-plus-three' },
      { layoutId: 'wedding-details' },
      { layoutId: 'wedding-two-up' }, // back cover
    ],
  },
  {
    id: 'birthday',
    name: 'Birthday Party',
    description: 'Modern party vibe with playful icons + clean collages.',
    coverLayoutId: 'cover-birthday-spotlight',
    layouts: [
      layout({
        id: 'cover-birthday-spotlight',
        name: 'Cover (Spotlight + Icons)',
        slots: [{ id: 'c1', col: 3, row: 1, colSpan: 8, rowSpan: 6 }],
        style: { background: 'party' },
        decorations: [
          {
            id: 'd-confetti-1',
            icon: 'confetti',
            x: 10,
            y: 18,
            w: 18,
            h: 18,
            rotate: -18,
            opacity: 0.35,
            color: '#f97316',
          },
          {
            id: 'd-sparkle-1',
            icon: 'sparkle',
            x: 88,
            y: 22,
            w: 12,
            h: 12,
            rotate: 12,
            opacity: 0.35,
            color: '#0ea5e9',
          },
          {
            id: 'd-balloon-1',
            icon: 'balloon',
            x: 90,
            y: 70,
            w: 16,
            h: 16,
            rotate: 8,
            opacity: 0.25,
            color: '#a855f7',
          },
          {
            id: 'd-cake-1',
            icon: 'cake',
            x: 14,
            y: 76,
            w: 14,
            h: 14,
            rotate: -6,
            opacity: 0.22,
            color: '#ec4899',
          },
        ],
      }),
      layout({
        id: 'birthday-collage-6',
        name: 'Collage (6)',
        slots: [
          { id: 's1', col: 1, row: 1, colSpan: 4, rowSpan: 3 },
          { id: 's2', col: 5, row: 1, colSpan: 4, rowSpan: 3 },
          { id: 's3', col: 9, row: 1, colSpan: 4, rowSpan: 3 },
          { id: 's4', col: 1, row: 4, colSpan: 4, rowSpan: 3 },
          { id: 's5', col: 5, row: 4, colSpan: 4, rowSpan: 3 },
          { id: 's6', col: 9, row: 4, colSpan: 4, rowSpan: 3 },
        ],
        style: { background: 'party' },
        decorations: [
          {
            id: 'd-sparkle-2',
            icon: 'sparkle',
            x: 8,
            y: 10,
            w: 10,
            h: 10,
            rotate: -10,
            opacity: 0.25,
            color: '#22c55e',
          },
          {
            id: 'd-confetti-2',
            icon: 'confetti',
            x: 92,
            y: 86,
            w: 16,
            h: 16,
            rotate: 20,
            opacity: 0.2,
            color: '#f59e0b',
          },
        ],
      }),
      layout({
        id: 'birthday-strip-4',
        name: 'Photo Strip (4)',
        slots: [
          { id: 's1', col: 1, row: 1, colSpan: 3, rowSpan: 6 },
          { id: 's2', col: 4, row: 1, colSpan: 3, rowSpan: 6 },
          { id: 's3', col: 7, row: 1, colSpan: 3, rowSpan: 6 },
          { id: 's4', col: 10, row: 1, colSpan: 3, rowSpan: 6 },
        ],
        style: { background: 'party' },
        decorations: [
          {
            id: 'd-balloon-2',
            icon: 'balloon',
            x: 6,
            y: 55,
            w: 12,
            h: 12,
            rotate: -8,
            opacity: 0.18,
            color: '#0ea5e9',
          },
        ],
      }),
      layout({
        id: 'birthday-hero-plus-two',
        name: 'Hero + Two',
        slots: [
          { id: 's1', col: 1, row: 1, colSpan: 7, rowSpan: 6 },
          { id: 's2', col: 8, row: 1, colSpan: 5, rowSpan: 3 },
          { id: 's3', col: 8, row: 4, colSpan: 5, rowSpan: 3 },
        ],
        style: { background: 'party' },
      }),
      layout({
        id: 'birthday-four-grid',
        name: 'Four Grid',
        slots: [
          { id: 's1', col: 1, row: 1, colSpan: 6, rowSpan: 3 },
          { id: 's2', col: 7, row: 1, colSpan: 6, rowSpan: 3 },
          { id: 's3', col: 1, row: 4, colSpan: 6, rowSpan: 3 },
          { id: 's4', col: 7, row: 4, colSpan: 6, rowSpan: 3 },
        ],
        style: { background: 'party' },
        decorations: [
          {
            id: 'd-confetti-3',
            icon: 'confetti',
            x: 50,
            y: 8,
            w: 14,
            h: 14,
            rotate: 0,
            opacity: 0.16,
            color: '#a855f7',
          },
        ],
      }),
    ],
    defaultSpreads: [
      { layoutId: 'cover-birthday-spotlight' },
      { layoutId: 'birthday-hero-plus-two' },
      { layoutId: 'birthday-collage-6' },
      { layoutId: 'birthday-strip-4' },
      { layoutId: 'birthday-four-grid' },
      { layoutId: 'birthday-strip-4' }, // back cover
    ],
  },
]

export function getPhotoBookTemplate(templateId: string) {
  return photobookTemplates.find((t) => t.id === templateId) ?? null
}

export function getPhotoBookLayout(template: PhotoBookTemplate, layoutId: string) {
  return template.layouts.find((l) => l.id === layoutId) ?? null
}

export function createPhotoBookAlbumFromTemplate(templateId: string): PhotoBookAlbum {
  const template = getPhotoBookTemplate(templateId)
  if (!template) throw new Error(`Unknown templateId: ${templateId}`)

  const now = new Date().toISOString()

  const album: PhotoBookAlbum = {
    id: newPhotoBookId('album'),
    templateId: template.id,
    title: 'My Photo Book',
    createdAt: now,
    updatedAt: now,
    spreads: template.defaultSpreads.map((s) => {
      const spreadLayout = getPhotoBookLayout(template, s.layoutId)
      if (!spreadLayout) throw new Error(`Missing layout: ${s.layoutId}`)
      const slotPhotoIds: Record<string, string | undefined> = {}
      for (const slot of spreadLayout.slots) slotPhotoIds[slot.id] = undefined
      return { id: newPhotoBookId('spread'), layoutId: s.layoutId, slotPhotoIds }
    }),
  }

  // Default editable text on cover + back cover.
  if (album.spreads.length > 0) {
    album.spreads[0] = {
      ...album.spreads[0],
      text:
        template.id === 'wedding'
          ? {
              headline: 'WEDDING\nTHEME',
              subheadline: 'This is a sample text that you can edit.',
              body: 'You can change font (size, color, name), or apply any desired formatting.',
              style: {
                fontFamily: 'Cinzel',
                align: 'left',
                headlineSize: 54,
                headlineWeight: 800,
                headlineColor: '#b7791f',
                subheadlineSize: 13,
                subheadlineWeight: 500,
                subheadlineColor: '#475569',
                bodySize: 12,
                bodyWeight: 400,
                bodyColor: '#475569',
                hideBanner: true,
              },
            }
          : { headline: album.title, subheadline: '' },
    }
    const last = album.spreads.length - 1
    album.spreads[last] = {
      ...album.spreads[last],
      text: album.spreads[last].text ?? { headline: '', subheadline: '' },
    }
  }

  return album
}

