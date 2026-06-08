/** Design canvas — fixed 16:10 ratio per AlbumToFlipBook.md */

export const DESIGN_CANVAS = {
  width: 1600,
  height: 1000,
  aspectRatio: 16 / 10,
} as const;

/** Outer safe margin: 4–6% of canvas width */
export const SAFE_MARGIN_PCT = 5;

/** Inner gap between images: 1.5–2.5% */
export const IMAGE_GAP_PCT = 2;

/** Decorative border inset in px on design canvas */
export const BORDER_INSET_PX = 32;

/** 12-column grid */
export const GRID_COLS = 12;

/** 8px base spacing system */
export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

/** Typography scale on design canvas (px) */
export const TYPOGRAPHY = {
  albumTitle: { min: 48, max: 72 },
  coupleName: { min: 56, max: 90 },
  pageHeading: { min: 32, max: 48 },
  caption: { min: 18, max: 26 },
  dateVenue: { min: 16, max: 22 },
  decorativeLabel: { min: 14, max: 18 },
} as const;

/** Builder panel widths */
export const BUILDER_LAYOUT = {
  leftPanelWidth: 280,
  rightPanelWidth: 320,
  topBarHeight: 68,
  thumbnailGap: 14,
} as const;

/** Convert design px to percent of canvas */
export function pxToPctX(px: number): number {
  return (px / DESIGN_CANVAS.width) * 100;
}

export function pxToPctY(px: number): number {
  return (px / DESIGN_CANVAS.height) * 100;
}
