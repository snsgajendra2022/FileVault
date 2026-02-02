import type { PhotoBookPhoto, PhotoBookSpread, PhotoBookSpreadLayout } from '../../types/photobook'

function SpreadThumb({
  layout,
  spread,
  photosById,
}: {
  layout: PhotoBookSpreadLayout
  spread: PhotoBookSpread
  photosById: Record<string, PhotoBookPhoto>
}) {
  return (
    <div
      className="grid w-full gap-[2px] overflow-hidden rounded-lg bg-slate-100 p-1"
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
            className="overflow-hidden rounded bg-white"
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
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function SpreadList({
  spreads,
  selectedIndex,
  getLayoutForSpread,
  photosById,
  onSelect,
}: {
  spreads: PhotoBookSpread[]
  selectedIndex: number
  getLayoutForSpread: (spread: PhotoBookSpread) => PhotoBookSpreadLayout | null
  photosById: Record<string, PhotoBookPhoto>
  onSelect: (index: number) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">Spreads</div>
      <div className="mt-3 space-y-2">
        {spreads.map((sp, idx) => {
          const layout = getLayoutForSpread(sp)
          return (
            <button
              key={sp.id}
              type="button"
              onClick={() => onSelect(idx)}
              className={[
                'w-full rounded-xl border p-2 text-left transition',
                idx === selectedIndex
                  ? 'border-slate-900 bg-slate-900/5'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-800">#{idx + 1}</div>
                <div className="min-w-0 flex-1 truncate text-right text-xs text-slate-600">
                  {layout?.name ?? sp.layoutId}
                </div>
              </div>
              <div className="mt-2">
                {layout ? <SpreadThumb layout={layout} spread={sp} photosById={photosById} /> : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

