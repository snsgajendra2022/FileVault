export type PhotoBookPhoto = {
  id: string
  name: string
  dataUrl: string
  /**
   * Used to control which UI section shows the photo.
   * - album: transferred from FileVault Albums
   * - local: uploaded from device in PhotoBook
   * - filevault: picked from FileVault picker (not shown in tray per UX request)
   */
  source?: 'album' | 'local' | 'filevault'
}

export type PhotoBookSlotDef = {
  id: string
  col: number
  row: number
  colSpan: number
  rowSpan: number
}

export type PhotoBookDecorationIcon = 'confetti' | 'balloon' | 'cake' | 'sparkle'

export type PhotoBookDecoration = {
  id: string
  icon: PhotoBookDecorationIcon
  /**
   * Percentage-based positioning relative to the spread canvas box.
   * Example: x=10 means "10% from left".
   */
  x: number
  y: number
  w: number
  h: number
  rotate?: number
  opacity?: number
  color?: string
}

export type PhotoBookSpreadLayout = {
  id: string
  name: string
  cols: number
  rows: number
  slots: PhotoBookSlotDef[]
  style?: {
    background?: 'default' | 'party' | 'wedding'
    variant?: 'default' | 'cover'
  }
  decorations?: PhotoBookDecoration[]
}

export type PhotoBookTemplate = {
  id: string
  name: string
  description: string
  coverLayoutId: string
  layouts: PhotoBookSpreadLayout[]
  defaultSpreads: { layoutId: string }[]
}

export type PhotoBookSpread = {
  id: string
  layoutId: string
  slotPhotoIds: Record<string, string | undefined>
  /**
   * Per-slot crop/position settings (for in-frame image adjustment).
   * x/y are percentage offsets relative to the slot box.
   */
  slotImageAdjust?: Record<
    string,
    {
      scale?: number
      x?: number
      y?: number
    }
  >
  text?: {
    headline?: string
    subheadline?: string
    body?: string
    style?: {
      fontFamily?: string
      align?: 'left' | 'center' | 'right'
      headlineSize?: number
      headlineWeight?: number
      headlineColor?: string
      subheadlineSize?: number
      subheadlineWeight?: number
      subheadlineColor?: string
      bodySize?: number
      bodyWeight?: number
      bodyColor?: string
      hideBanner?: boolean
    }
  }
}

export type PhotoBookAlbum = {
  id: string
  templateId: string
  title: string
  createdAt: string
  updatedAt: string
  spreads: PhotoBookSpread[]
  /**
   * Optional theme/category metadata for higher-level flows (e.g. Photo Themes).
   */
  category?: string
  description?: string
}

