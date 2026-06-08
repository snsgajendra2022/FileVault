/** Studio Album Flipbook — core types (see docs/AlbumToFlipBook.md) */

export type EventType =
  | 'wedding'
  | 'engagement'
  | 'anniversary'
  | 'birthday'
  | 'party'
  | 'reception'
  | 'baby_shower'
  | 'family'
  | 'corporate'
  | 'general';

export type FlipbookStatus = 'draft' | 'published';

export type ThemeId =
  | 'wedding_royal'
  | 'wedding_modern'
  | 'cinematic_black'
  | 'anniversary_romantic'
  | 'birthday_party'
  | 'family_classic';

export type PageType = 'cover' | 'inner' | 'closing';

export type LayoutType =
  | 'wedding_story_cover'
  | 'hero_circular_highlights'
  | 'modern_luxury_white'
  | 'three_image_collage'
  | 'four_image_studio'
  | 'full_bleed_ceremony'
  | 'royal_wedding_red_gold'
  | 'cinematic_black_gold'
  | 'anniversary_romantic'
  | 'birthday_party'
  | 'family_classic'
  | 'closing_thank_you';

export type BackgroundType =
  | 'solid'
  | 'gradient'
  | 'image'
  | 'blurred_image'
  | 'pattern'
  | 'ornamental'
  | 'floral'
  | 'paper_texture'
  | 'cinematic_dark'
  | 'luxury_light';

export type ElementType = 'image' | 'text' | 'shape' | 'decorative';

export type FrameType =
  | 'none'
  | 'rectangle'
  | 'rounded'
  | 'circle'
  | 'oval'
  | 'polaroid'
  | 'border'
  | 'golden'
  | 'soft_shadow'
  | 'full_bleed'
  | 'diagonal'
  | 'overlapping'
  | 'blended'
  | 'grayscale_fade';

export type FitMode = 'cover' | 'contain' | 'fill';

export type ImageOrientation = 'portrait' | 'landscape' | 'square';

/** Percent-based rect on 1600×1000 design canvas */
export type SlotRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextSlotDef = SlotRect & {
  id: string;
  role: 'title' | 'subtitle' | 'caption' | 'date' | 'quote' | 'thank_you' | 'custom';
  defaultContent?: string;
  fontSizePx: number;
  fontFamily?: string;
  fontWeight?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
  shadow?: string;
};

export type ImageSlotDef = SlotRect & {
  id: string;
  role: 'hero' | 'supporting' | 'circle' | 'decorative' | 'background';
  borderRadius?: number;
  frameType?: FrameType;
  fitMode?: FitMode;
  zIndex?: number;
  shadow?: string;
  opacity?: number;
};

export type DecorativeSlotDef = SlotRect & {
  id: string;
  kind: 'border' | 'corner_floral' | 'divider' | 'confetti' | 'heart' | 'ornament';
  zIndex?: number;
};

export type PageBackground = {
  type: BackgroundType;
  value: string;
  overlayGradient?: string;
};

export type StudioPageTemplate = {
  id: LayoutType;
  name: string;
  pageType: PageType;
  eventTypes: EventType[];
  imageSlots: ImageSlotDef[];
  textSlots: TextSlotDef[];
  decorativeSlots?: DecorativeSlotDef[];
  background: PageBackground;
  minImages: number;
  maxImages: number;
  preferredOrientations?: ImageOrientation[];
};

export type AlbumImageMeta = {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  orientation: ImageOrientation;
  qualityScore?: number;
  sortOrder?: number;
};

export type GeneratedPageElement = {
  elementType: ElementType;
  albumImageId?: number;
  content?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  opacity?: number;
  maskType?: string;
  frameType?: FrameType;
  fitMode?: FitMode;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  styleJson?: Record<string, unknown>;
};

export type GeneratedPage = {
  pageNumber: number;
  pageType: PageType;
  layoutType: LayoutType;
  backgroundType: BackgroundType;
  backgroundValue: string;
  themeVariant?: ThemeId;
  settingsJson?: Record<string, unknown>;
  elements: GeneratedPageElement[];
};

export type FlipbookTheme = {
  id: ThemeId;
  name: string;
  eventTypes: EventType[];
  backgroundColor: string;
  accentColor: string;
  secondaryColor: string;
  textColor: string;
  titleFont: string;
  bodyFont: string;
  borderStyle: string;
  defaultLayouts: LayoutType[];
};

export type FlipbookDraft = {
  id?: number;
  albumId: number;
  title: string;
  eventType: EventType;
  theme: ThemeId;
  status: FlipbookStatus;
  pages: GeneratedPage[];
};
