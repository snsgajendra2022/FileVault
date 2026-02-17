import type { PhotoBookPhoto } from '../../types/photobook'
import { DraggablePhoto } from './DraggablePhoto'

export function PhotoTray({
  title = 'Photos',
  photos,
  selectedPhotoId,
  selectedPhotoIds = [],
  onSelectPhoto,
  onToggleMultiSelect,
  onClearPhotos,
  onFillEmptySlots,
  canFillEmptySlots = false,
}: {
  title?: string
  photos: PhotoBookPhoto[]
  selectedPhotoId: string | null
  selectedPhotoIds?: string[]
  onSelectPhoto: (photoId: string | null) => void
  onToggleMultiSelect?: (photoId: string) => void
  onClearPhotos?: () => void
  onFillEmptySlots?: () => void
  canFillEmptySlots?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="flex items-center gap-2">
          {canFillEmptySlots && selectedPhotoIds.length > 0 && onFillEmptySlots ? (
            <button
              type="button"
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
              onClick={onFillEmptySlots}
            >
              Fill empty slots ({selectedPhotoIds.length} selected)
            </button>
          ) : null}
          {(onClearPhotos || selectedPhotoId || selectedPhotoIds.length > 0) ? (
            <button
              type="button"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900"
              onClick={() => {
                if (selectedPhotoId || selectedPhotoIds.length > 0) onSelectPhoto(null)
                else onClearPhotos?.()
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
      {photos.length === 0 ? (
        <div className="mt-2 text-sm text-slate-600">
          Upload a few photos, then drag them onto the page.
        </div>
      ) : (
        <>
          {onToggleMultiSelect ? (
            <p className="mt-2 text-[11px] text-slate-500">
              Click to select one · Ctrl+Click to select multiple · Use &quot;Fill empty slots&quot; for this spread.
            </p>
          ) : null}
          <div className="mt-3 grid max-h-80 grid-cols-4 gap-2 overflow-y-auto pb-1 sm:grid-cols-5">
            {photos.map((p) => (
              <DraggablePhoto
                key={p.id}
                photo={p}
                selected={selectedPhotoId === p.id || selectedPhotoIds.includes(p.id)}
                multiSelected={selectedPhotoIds.includes(p.id)}
                onClick={(e) => {
                  if (onToggleMultiSelect && e.ctrlKey) {
                    e.preventDefault()
                    onToggleMultiSelect(p.id)
                    return
                  }
                  onSelectPhoto(selectedPhotoId === p.id ? null : p.id)
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

