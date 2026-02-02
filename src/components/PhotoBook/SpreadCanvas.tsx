import { useDroppable } from '@dnd-kit/core'
import type { PhotoBookPhoto, PhotoBookSpread, PhotoBookSpreadLayout } from '../../types/photobook'
import { Decorations } from './Decorations'

function Slot({
  spreadIndex,
  slotId,
  assignedPhoto,
  selectedPhotoId,
  onAssignSelected,
  onClear,
}: {
  spreadIndex: number
  slotId: string
  assignedPhoto: PhotoBookPhoto | null
  selectedPhotoId: string | null
  onAssignSelected: () => void
  onClear: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot:${spreadIndex}:${slotId}`,
    data: { type: 'slot' as const, spreadIndex, slotId },
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => {
        if (selectedPhotoId) onAssignSelected()
        else onClear()
      }}
      className={[
        'relative overflow-hidden rounded-xl border transition',
        assignedPhoto ? 'border-slate-200 bg-white' : 'border-dashed border-slate-300 bg-white/60',
        isOver ? 'ring-2 ring-sky-400/60' : '',
      ].join(' ')}
    >
      {assignedPhoto ? (
        <>
          <img
            src={assignedPhoto.dataUrl}
            alt={assignedPhoto.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/35 px-2 py-1 text-left text-[11px] text-white">
            <div className="min-w-0 flex-1 truncate">{assignedPhoto.name}</div>
            <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 text-[10px]">
              click to clear
            </span>
          </div>
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-medium text-slate-500">
          {selectedPhotoId ? 'Click to place selected photo' : 'Drop a photo here'}
        </div>
      )}
    </button>
  )
}

export function SpreadCanvas({
  layout,
  spread,
  spreadIndex,
  photosById,
  selectedPhotoId,
  showTextEditor,
  onChangeText,
  onAssignPhoto,
  onClearSlot,
}: {
  layout: PhotoBookSpreadLayout
  spread: PhotoBookSpread
  spreadIndex: number
  photosById: Record<string, PhotoBookPhoto>
  selectedPhotoId: string | null
  showTextEditor: boolean
  onChangeText: (patch: { headline?: string; subheadline?: string }) => void
  onAssignPhoto: (slotId: string, photoId: string) => void
  onClearSlot: (slotId: string) => void
}) {
  const headline = spread.text?.headline ?? ''
  const subheadline = spread.text?.subheadline ?? ''

  const backgroundClass =
    layout.style?.background === 'party'
      ? 'bg-gradient-to-br from-fuchsia-50 via-white to-sky-50'
      : 'bg-slate-50'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Spread</div>
          <div className="text-xs text-slate-600">{layout.name}</div>
        </div>
        <div className="text-xs text-slate-500">
          Tip: drag photos from the tray or click-select then click a slot.
        </div>
      </div>

      <div className="mt-4">
        <div className="relative w-full">
          <div
            className={['grid w-full gap-2 rounded-xl p-3', backgroundClass].join(' ')}
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
                  style={{
                    gridColumn: `${slot.col} / span ${slot.colSpan}`,
                    gridRow: `${slot.row} / span ${slot.rowSpan}`,
                  }}
                >
                  <Slot
                    spreadIndex={spreadIndex}
                    slotId={slot.id}
                    assignedPhoto={assignedPhoto}
                    selectedPhotoId={selectedPhotoId}
                    onAssignSelected={() => {
                      if (!selectedPhotoId) return
                      onAssignPhoto(slot.id, selectedPhotoId)
                    }}
                    onClear={() => onClearSlot(slot.id)}
                  />
                </div>
              )
            })}
          </div>

          <Decorations decorations={layout.decorations} />

          {showTextEditor ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div className="pointer-events-auto w-full max-w-lg rounded-2xl bg-white/65 p-4 backdrop-blur shadow-sm ring-1 ring-black/5">
                <input
                  value={headline}
                  onChange={(e) => onChangeText({ headline: e.target.value })}
                  placeholder="Cover / back cover headline"
                  className="w-full bg-transparent text-center text-2xl font-semibold tracking-tight text-slate-900 outline-none placeholder:text-slate-400"
                />
                <textarea
                  value={subheadline}
                  onChange={(e) => onChangeText({ subheadline: e.target.value })}
                  placeholder="Optional subtitle or date"
                  rows={2}
                  className="mt-2 w-full resize-none bg-transparent text-center text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

