import type { PhotoBookPhoto } from '../../types/photobook'
import { DraggablePhoto } from './DraggablePhoto'

export function PhotoTray({
  title = 'Photos',
  photos,
  selectedPhotoId,
  onSelectPhoto,
  onClearPhotos,
}: {
  title?: string
  photos: PhotoBookPhoto[]
  selectedPhotoId: string | null
  onSelectPhoto: (photoId: string | null) => void
  onClearPhotos?: () => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {(onClearPhotos || selectedPhotoId) ? (
          <button
            type="button"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
            onClick={() => {
              // One button only:
              // - If something is selected → clear selection
              // - Else clear the section (if provided)
              if (selectedPhotoId) onSelectPhoto(null)
              else onClearPhotos?.()
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      {photos.length === 0 ? (
        <div className="mt-2 text-sm text-slate-600">
          Upload a few photos, then drag them onto the page.
        </div>
      ) : (
        <div className="mt-3 grid max-h-80 grid-cols-4 gap-2 overflow-y-auto pb-1 sm:grid-cols-5">
          {photos.map((p) => (
            <DraggablePhoto
              key={p.id}
              photo={p}
              selected={selectedPhotoId === p.id}
              onClick={() => onSelectPhoto(selectedPhotoId === p.id ? null : p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

