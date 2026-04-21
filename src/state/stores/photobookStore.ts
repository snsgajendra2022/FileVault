import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PhotoBookAlbum, PhotoBookPhoto } from '../../types/photobook'
import {
  createPhotoBookAlbumFromTemplate,
  getPhotoBookLayout,
  getPhotoBookTemplate,
} from '../../templates/photobookTemplates'
import { newPhotoBookId } from '../../utils/photobookId'
import { photobookDbDeletePhoto, photobookDbGetPhoto, photobookDbSetPhoto } from '../../utils/photobookDb'

type PhotoBookState = {
  album: PhotoBookAlbum | null
  photos: PhotoBookPhoto[]
  photoIndex: Array<{ id: string; name: string; source?: 'album' | 'local' | 'filevault' }>
  selectedPhotoId: string | null
  selectedPhotoIds: string[]
  selectedSpreadIndex: number

  startNewAlbum: (templateId: string, opts?: { category?: string; description?: string }) => void
  setTitle: (title: string) => void
  setDescription: (description: string) => void
  addPhotos: (files: FileList | File[]) => Promise<void>
  addPhotoDataUrls: (
    items: Array<{ name: string; dataUrl: string }>,
    opts?: { source?: 'album' | 'local' | 'filevault' },
  ) => Promise<string[]>
  hydratePhotosFromDb: () => Promise<void>
  removePhotosByIds: (photoIds: string[]) => void
  selectPhoto: (photoId: string | null) => void
  togglePhotoInSelection: (photoId: string) => void
  fillEmptySlotsForSpread: (spreadIndex: number) => void
  selectSpread: (index: number) => void
  setSpreadLayout: (spreadIndex: number, layoutId: string) => void
  setSpreadText: (
    spreadIndex: number,
    patch: {
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
    },
  ) => void
  setSlotImageAdjust: (
    spreadIndex: number,
    slotId: string,
    patch: Partial<{ scale: number; x: number; y: number }>,
  ) => void
  assignPhotoToSlot: (spreadIndex: number, slotId: string, photoId: string) => void
  clearSlot: (spreadIndex: number, slotId: string) => void
  exportJson: () => string
  importJson: (jsonText: string) => void
  resetAll: () => void
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// One-time cleanup: old version stored huge data URLs in localStorage and can break the app.
try {
  localStorage.removeItem('photobook_state_v1')
} catch (_) {
  // ignore
}

export const usePhotoBookStore = create<PhotoBookState>()(
  persist(
    (set, get) => ({
      album: null,
      photos: [],
      photoIndex: [],
      selectedPhotoId: null,
      selectedPhotoIds: [],
      selectedSpreadIndex: 0,

      startNewAlbum: (templateId, opts) => {
        set({
          album: createPhotoBookAlbumFromTemplate(templateId, opts),
          photos: [],
          photoIndex: [],
      selectedPhotoId: null,
      selectedPhotoIds: [],
      selectedSpreadIndex: 0,
    })
  },

      setDescription: (description) =>
        set((s) => {
          if (!s.album) return s
          return {
            album: { ...s.album, description, updatedAt: new Date().toISOString() },
          }
        }),

      setTitle: (title) =>
        set((s) => {
          if (!s.album) return s
          return {
            album: { ...s.album, title, updatedAt: new Date().toISOString() },
          }
        }),

      addPhotos: async (files) => {
        const list = Array.from(files)
        const newPhotos: PhotoBookPhoto[] = []
        const newIndex: Array<{ id: string; name: string; source?: 'album' | 'local' | 'filevault' }> = []
        for (const file of list) {
          const id = newPhotoBookId('photo')
          // Note: data URLs can get large; store bytes in IndexedDB, not localStorage.
          const dataUrl = await readAsDataUrl(file)
          await photobookDbSetPhoto(id, { name: file.name, dataUrl, source: 'local' })
          newPhotos.push({ id, name: file.name, dataUrl, source: 'local' })
          newIndex.push({ id, name: file.name, source: 'local' })
        }
        set((s) => ({ photos: [...newPhotos, ...s.photos], photoIndex: [...newIndex, ...s.photoIndex] }))
      },

      addPhotoDataUrls: async (items, opts) => {
        const source = opts?.source ?? 'local'
        const createdIds: string[] = []
        const newPhotos: PhotoBookPhoto[] = []
        const newIndex: Array<{ id: string; name: string; source?: 'album' | 'local' | 'filevault' }> = []

        for (const it of items) {
          const id = newPhotoBookId('photo')
          await photobookDbSetPhoto(id, { name: it.name, dataUrl: it.dataUrl, source })
          createdIds.push(id)
          newPhotos.push({ id, name: it.name, dataUrl: it.dataUrl, source })
          newIndex.push({ id, name: it.name, source })
        }

        set((s) => ({ photos: [...newPhotos, ...s.photos], photoIndex: [...newIndex, ...s.photoIndex] }))
        return createdIds
      },

      hydratePhotosFromDb: async () => {
        const { photoIndex } = get()
        if (!photoIndex.length) {
          set({ photos: [] })
          return
        }
        const photos: PhotoBookPhoto[] = []
        for (const meta of photoIndex) {
          const stored = await photobookDbGetPhoto(meta.id)
          if (!stored?.dataUrl) continue
          photos.push({
            id: meta.id,
            name: stored.name ?? meta.name,
            dataUrl: stored.dataUrl,
            source: stored.source ?? meta.source ?? 'local',
          })
        }
        set({ photos })
      },

      removePhotosByIds: (photoIds) =>
        set((s) => {
          const toRemove = new Set(photoIds)
          // best-effort cleanup in IndexedDB
          void (async () => {
            for (const id of Array.from(toRemove)) {
              try {
                await photobookDbDeletePhoto(id)
              } catch (_) {
                // ignore
              }
            }
          })()
          return {
            photos: s.photos.filter((p) => !toRemove.has(p.id)),
            photoIndex: s.photoIndex.filter((p) => !toRemove.has(p.id)),
            selectedPhotoId: toRemove.has(s.selectedPhotoId ?? '') ? null : s.selectedPhotoId,
            selectedPhotoIds: s.selectedPhotoIds.filter((id) => !toRemove.has(id)),
          }
        }),

      selectPhoto: (photoId) =>
        set({
          selectedPhotoId: photoId,
          selectedPhotoIds: photoId ? [photoId] : [],
        }),

      togglePhotoInSelection: (photoId) =>
        set((s) => {
          const has = s.selectedPhotoIds.includes(photoId)
          const next = has ? s.selectedPhotoIds.filter((id) => id !== photoId) : [...s.selectedPhotoIds, photoId]
          return {
            selectedPhotoIds: next,
            selectedPhotoId: next.length > 0 ? next[next.length - 1] : null,
          }
        }),

      fillEmptySlotsForSpread: (spreadIndex) =>
        set((s) => {
          if (!s.album || !s.selectedPhotoIds.length) return s
          const template = getPhotoBookTemplate(s.album.templateId)
          if (!template) return s
          const spread = s.album.spreads[spreadIndex]
          if (!spread) return s
          const layout = getPhotoBookLayout(template, spread.layoutId)
          if (!layout) return s
          const emptySlots = layout.slots
            .filter((slot) => !spread.slotPhotoIds[slot.id])
            .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col))
          if (emptySlots.length === 0) return s
          const toAssign = s.selectedPhotoIds.slice(0, emptySlots.length)
          const spreads = s.album.spreads.map((sp, idx) => {
            if (idx !== spreadIndex) return sp
            let next = { ...sp.slotPhotoIds }
            toAssign.forEach((photoId, i) => {
              next = { ...next, [emptySlots[i].id]: photoId }
            })
            return { ...sp, slotPhotoIds: next }
          })
          return { album: { ...s.album, spreads, updatedAt: new Date().toISOString() } }
        }),

      selectSpread: (index) =>
        set((s) => {
          if (!s.album) return { selectedSpreadIndex: 0 }
          const clamped = Math.min(Math.max(0, index), Math.max(0, s.album.spreads.length - 1))
          return { selectedSpreadIndex: clamped }
        }),

      setSpreadLayout: (spreadIndex, layoutId) =>
        set((s) => {
          if (!s.album) return s
          const template = getPhotoBookTemplate(s.album.templateId)
          if (!template) return s
          const nextLayout = getPhotoBookLayout(template, layoutId)
          if (!nextLayout) return s

          const spreads = s.album.spreads.map((sp, idx) => {
            if (idx !== spreadIndex) return sp
            const nextSlotPhotoIds: Record<string, string | undefined> = {}
            for (const slot of nextLayout.slots) {
              nextSlotPhotoIds[slot.id] = sp.slotPhotoIds[slot.id]
            }
            return { ...sp, layoutId, slotPhotoIds: nextSlotPhotoIds }
          })

          return { album: { ...s.album, spreads, updatedAt: new Date().toISOString() } }
        }),

      setSpreadText: (spreadIndex, patch) =>
        set((s) => {
          if (!s.album) return s
          const spreads = s.album.spreads.map((sp, idx) => {
            if (idx !== spreadIndex) return sp
            return {
              ...sp,
              text: {
                ...(sp.text ?? {}),
                ...patch,
                style: patch.style ? { ...(sp.text?.style ?? {}), ...patch.style } : sp.text?.style,
              },
            }
          })
          return { album: { ...s.album, spreads, updatedAt: new Date().toISOString() } }
        }),

      setSlotImageAdjust: (spreadIndex, slotId, patch) =>
        set((s) => {
          if (!s.album) return s
          const spreads = s.album.spreads.map((sp, idx) => {
            if (idx !== spreadIndex) return sp
            return {
              ...sp,
              slotImageAdjust: {
                ...(sp.slotImageAdjust ?? {}),
                [slotId]: { ...(sp.slotImageAdjust?.[slotId] ?? {}), ...patch },
              },
            }
          })
          return { album: { ...s.album, spreads, updatedAt: new Date().toISOString() } }
        }),

      assignPhotoToSlot: (spreadIndex, slotId, photoId) =>
        set((s) => {
          if (!s.album) return s
          const spreads = s.album.spreads.map((sp, idx) => {
            if (idx !== spreadIndex) return sp
            return {
              ...sp,
              slotPhotoIds: { ...sp.slotPhotoIds, [slotId]: photoId },
            }
          })
          return { album: { ...s.album, spreads, updatedAt: new Date().toISOString() } }
        }),

      clearSlot: (spreadIndex, slotId) =>
        set((s) => {
          if (!s.album) return s
          const spreads = s.album.spreads.map((sp, idx) => {
            if (idx !== spreadIndex) return sp
            const nextSlotPhotoIds = { ...sp.slotPhotoIds, [slotId]: undefined }
            const nextSlotImageAdjust = { ...sp.slotImageAdjust }
            delete nextSlotImageAdjust[slotId]
            return {
              ...sp,
              slotPhotoIds: nextSlotPhotoIds,
              slotImageAdjust: Object.keys(nextSlotImageAdjust).length ? nextSlotImageAdjust : undefined,
            }
          })
          return { album: { ...s.album, spreads, updatedAt: new Date().toISOString() } }
        }),

      exportJson: () => {
        const { album, photos } = get()
        return JSON.stringify({ album, photos }, null, 2)
      },

      importJson: (jsonText) => {
        const parsed = JSON.parse(jsonText) as { album: PhotoBookAlbum | null; photos: PhotoBookPhoto[] }
        set({
          album: parsed.album,
          photos: parsed.photos ?? [],
          photoIndex: (parsed.photos ?? []).map((p) => ({ id: p.id, name: p.name, source: p.source ?? 'local' })),
          selectedPhotoId: null,
          selectedSpreadIndex: 0,
        })
        // Persist imported photos into IndexedDB (best-effort).
        void (async () => {
          for (const p of parsed.photos ?? []) {
            if (!p?.id || !p?.dataUrl) continue
            try {
              await photobookDbSetPhoto(p.id, { name: p.name, dataUrl: p.dataUrl, source: p.source ?? 'local' })
            } catch (_) {
              // ignore individual failures
            }
          }
        })()
      },

      resetAll: () =>
        set((s) => {
          // best-effort cleanup of stored photo bytes
          void (async () => {
            for (const meta of s.photoIndex) {
              try {
                await photobookDbDeletePhoto(meta.id)
              } catch (_) {
                // ignore
              }
            }
          })()
          return {
            album: null,
            photos: [],
            photoIndex: [],
            selectedPhotoId: null,
            selectedSpreadIndex: 0,
          }
        }),
    }),
    {
      name: 'photobook_state_v2',
      partialize: (s) => ({ album: s.album, photoIndex: s.photoIndex }),
      onRehydrateStorage: () => (state) => {
        // Load photo bytes from IndexedDB after localStorage rehydrate.
        if (!state) return
        void state.hydratePhotosFromDb()
      },
    },
  ),
)

