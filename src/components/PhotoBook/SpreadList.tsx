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
        display: 'grid',
        gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
        aspectRatio: '2 / 1',
        minHeight: 0,
      }}
    >
      {layout.slots.map((slot) => {
        const photoId = spread.slotPhotoIds[slot.id]
        const assignedPhoto = photoId ? photosById[photoId] ?? null : null
        return (
          <div
            key={slot.id}
            className="overflow-hidden rounded bg-white min-h-0 min-w-0"
            style={{
              gridColumn: `${slot.col} / span ${slot.colSpan}`,
              gridRow: `${slot.row} / span ${slot.rowSpan}`,
              minHeight: 0,
              minWidth: 0,
            }}
          >
            {assignedPhoto ? (
              <img
                src={assignedPhoto.dataUrl}
                alt=""
                className="block h-full w-full object-cover object-center"
                draggable={false}
                style={{ minWidth: '100%', minHeight: '100%' }}
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
          const isFront = idx === 0
          const isBack = idx === spreads.length - 1 && spreads.length > 1
          const label = isFront ? 'Front Cover' : isBack ? 'Back Cover' : `#${idx + 1}`
          return (
            <button
              key={sp.id}
              type="button"
              onClick={() => onSelect(idx)}
              className={[
                'w-full rounded-xl border p-2 text-left transition',
                idx === selectedIndex
                  ? 'border-slate-900 bg-slate-900/5 ring-2 ring-slate-900/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-bold ${
                    isFront
                      ? 'rounded-md bg-amber-500/20 px-2 py-0.5 text-amber-800'
                      : isBack
                      ? 'rounded-md bg-slate-600/20 px-2 py-0.5 text-slate-700'
                      : 'text-slate-800'
                  }`}
                >
                  {label}
                </span>
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

