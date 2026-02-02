import type { PhotoBookPhoto, PhotoBookSpread, PhotoBookSpreadLayout } from '../../types/photobook'
import { Decorations } from './Decorations'

export function SpreadPreviewCanvas({
  layout,
  spread,
  photosById,
  showText,
}: {
  layout: PhotoBookSpreadLayout
  spread: PhotoBookSpread
  photosById: Record<string, PhotoBookPhoto>
  showText: boolean
}) {
  const headline = spread.text?.headline ?? ''
  const subheadline = spread.text?.subheadline ?? ''
  const backgroundClass =
    layout.style?.background === 'party'
      ? 'bg-gradient-to-br from-fuchsia-50 via-white to-sky-50'
      : 'bg-white'

  return (
    <div className="relative w-full">
      <div
        className={[
          'grid w-full gap-2 rounded-xl border border-slate-200 p-3 shadow-sm',
          backgroundClass,
        ].join(' ')}
        style={{
          gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
          aspectRatio: '2 / 1',
        }}
      >
        {layout.slots.map((slot) => {
          const photoId = spread.slotPhotoIds[slot.id]
          const assignedPhoto = photoId ? photosById[photoId] ?? null : null
          return (
            <div
              key={slot.id}
              className="overflow-hidden rounded-lg bg-slate-50"
              style={{
                gridColumn: `${slot.col} / span ${slot.colSpan}`,
                gridRow: `${slot.row} / span ${slot.rowSpan}`,
              }}
            >
              {assignedPhoto ? (
                <img
                  src={assignedPhoto.dataUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
                  Empty
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Decorations decorations={layout.decorations} />

      {showText && (headline.trim() || subheadline.trim()) ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-lg rounded-2xl bg-white/70 p-4 text-center backdrop-blur ring-1 ring-black/5">
            {headline.trim() ? (
              <div className="text-2xl font-semibold tracking-tight text-slate-900">{headline}</div>
            ) : null}
            {subheadline.trim() ? (
              <div className="mt-1 text-sm text-slate-700">{subheadline}</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

