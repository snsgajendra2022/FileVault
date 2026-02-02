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
    background?: 'default' | 'party'
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
  text?: {
    headline?: string
    subheadline?: string
  }
}

export type PhotoBookAlbum = {
  id: string
  templateId: string
  title: string
  createdAt: string
  updatedAt: string
  spreads: PhotoBookSpread[]
}

