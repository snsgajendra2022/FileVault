import { useDroppable } from '@dnd-kit/core'
import React from 'react'
import type { PhotoBookPhoto, PhotoBookSpread, PhotoBookSpreadLayout } from '../../types/photobook'
import { Decorations } from './Decorations'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function Slot({
  spreadIndex,
  slotId,
  assignedPhoto,
  selectedPhotoId,
  onAssignSelected,
  onClear,
  roundedClassName,
  hideFooterOverlay,
  imageAdjust,
  active,
  onActivate,
  onUpdateAdjust,
  onRemovePhoto,
}: {
  spreadIndex: number
  slotId: string
  assignedPhoto: PhotoBookPhoto | null
  selectedPhotoId: string | null
  onAssignSelected: () => void
  onClear: () => void
  roundedClassName?: string
  hideFooterOverlay?: boolean
  imageAdjust?: { scale?: number; x?: number; y?: number }
  active?: boolean
  onActivate?: () => void
  onUpdateAdjust?: (patch: Partial<{ scale: number; x: number; y: number }>) => void
  onRemovePhoto?: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot:${spreadIndex}:${slotId}`,
    data: { type: 'slot' as const, spreadIndex, slotId },
  })

  const scale = clamp(imageAdjust?.scale ?? 1, 1, 3)
  const maxT = (scale - 1) * 50
  const x = clamp(imageAdjust?.x ?? 0, -maxT, maxT)
  const y = clamp(imageAdjust?.y ?? 0, -maxT, maxT)

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={[
        `relative flex min-h-0 min-w-0 flex-1 overflow-hidden border transition ${roundedClassName ?? 'rounded-xl'}`,
        assignedPhoto ? 'border-slate-200 bg-white' : 'border-dashed border-slate-300 bg-white/60',
        isOver ? 'ring-2 ring-sky-400/60' : '',
      ].join(' ')}
      onClick={() => {
        if (selectedPhotoId) {
          onAssignSelected()
          return
        }
        if (assignedPhoto) {
          onActivate?.()
          return
        }
        onClear()
      }}
    >
      {assignedPhoto ? (
        <>
          <div className="absolute inset-0 min-h-0 min-w-full">
            <img
              src={assignedPhoto.dataUrl}
              alt={assignedPhoto.name}
              className="block h-full w-full select-none object-cover object-center"
              draggable={false}
              style={{
                transform: `translate(${x}%, ${y}%) scale(${scale})`,
                transformOrigin: 'center',
                willChange: active ? 'transform' : undefined,
                minWidth: '100%',
                minHeight: '100%',
              }}
            />
          </div>

          {active ? (
            <div
              className="absolute inset-0"
              onPointerDown={(e) => {
                // Drag to reposition (crop)
                if (!onUpdateAdjust) return
                e.preventDefault()
                e.stopPropagation()
                const el = e.currentTarget as HTMLDivElement
                const rect = el.getBoundingClientRect()
                const startX = e.clientX
                const startY = e.clientY
                const startXPct = x
                const startYPct = y

                const onMove = (ev: PointerEvent) => {
                  const dx = ev.clientX - startX
                  const dy = ev.clientY - startY
                  const nextX = clamp(startXPct + (dx / rect.width) * 100, -maxT, maxT)
                  const nextY = clamp(startYPct + (dy / rect.height) * 100, -maxT, maxT)
                  onUpdateAdjust({ x: nextX, y: nextY })
                }
                const onUp = () => {
                  window.removeEventListener('pointermove', onMove)
                  window.removeEventListener('pointerup', onUp)
                }
                window.addEventListener('pointermove', onMove)
                window.addEventListener('pointerup', onUp)
              }}
              title="Drag to crop/position"
            />
          ) : null}

          {active ? (
            <div className="absolute inset-x-2 bottom-2 z-10 rounded-xl bg-black/40 p-2 text-white backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold">Crop</div>
                <div className="flex items-center gap-2">
                  {/* removed buttons per request */}
                </div>
              </div>
              <div className="mt-1 text-[10px] opacity-90">Mouse wheel to zoom • Zoom {scale.toFixed(2)}×</div>
            </div>
          ) : null}

          {!hideFooterOverlay ? (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/35 px-2 py-1 text-left text-[11px] text-white">
              <div className="min-w-0 flex-1 truncate">{assignedPhoto.name}</div>
              <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 text-[10px]">click to clear</span>
            </div>
          ) : null}
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
  onChangeText: (patch: { headline?: string; subheadline?: string; body?: string; style?: any }) => void
  onAssignPhoto: (slotId: string, photoId: string) => void
  onClearSlot: (slotId: string) => void
}) {
  const headline = spread.text?.headline ?? ''
  const subheadline = spread.text?.subheadline ?? ''
  const body = spread.text?.body ?? ''
  const style = spread.text?.style ?? {}
  const isWedding = layout.style?.background === 'wedding'
  const isWeddingCoverPage = layout.id === 'cover-wedding-hero'
  const [activeSlotId, setActiveSlotId] = React.useState<string | null>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  const backgroundClass =
    layout.style?.background === 'party'
      ? 'photobook-bg-party'
      : isWedding
        ? 'photobook-bg-wedding-cover'
        : 'bg-slate-50'

  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const onWheel = (ev: WheelEvent) => {
      const target = ev.target as HTMLElement | null
      const slotEl = target?.closest?.('[data-slot-id]') as HTMLElement | null
      const slotId = slotEl?.dataset?.slotId
      if (!slotId) return
      const photoId = spread.slotPhotoIds[slotId]
      if (!photoId) return

      ev.preventDefault()
      ev.stopPropagation()

      const adj = spread.slotImageAdjust?.[slotId] ?? {}
      const curScale = clamp(adj.scale ?? 1, 1, 3)
      const curMaxT = (curScale - 1) * 50
      const curX = clamp(adj.x ?? 0, -curMaxT, curMaxT)
      const curY = clamp(adj.y ?? 0, -curMaxT, curMaxT)

      const delta = ev.deltaY
      const zoomIntensity = 0.0018
      const nextScale = clamp(curScale * Math.exp(-delta * zoomIntensity), 1, 3)
      const nextMaxT = (nextScale - 1) * 50

      setActiveSlotId(slotId)
      ;(window as any).__pb_setSlotImageAdjust?.(spreadIndex, slotId, {
        scale: nextScale,
        x: clamp(curX, -nextMaxT, nextMaxT),
        y: clamp(curY, -nextMaxT, nextMaxT),
      })
    }

    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel as any)
  }, [spreadIndex, spread.slotImageAdjust, spread.slotPhotoIds])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Spread</div>
          <div className="text-xs text-slate-600">{layout.name}</div>
        </div>
        <div className="text-xs text-slate-500">
          {layout.slots.length > 1
            ? 'Tip: Drag photos to slots, or select multiple (Ctrl+Click) and use Fill empty slots in the tray.'
            : 'Tip: Drag a photo onto the slot or click-select then click the slot.'}
        </div>
      </div>

      <div className="mt-4">
        <div className="relative w-full" style={{ minWidth: 0 }}>
          <div
            className="w-full rounded-xl overflow-hidden"
            style={{ aspectRatio: '2 / 1', minHeight: 120 }}
          >
            <div
              ref={rootRef}
              className={['grid h-full w-full gap-2 p-3', backgroundClass].join(' ')}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
                minHeight: 0,
                maxHeight: '100%',
                transition: 'grid-template-columns 0.3s ease-out, grid-template-rows 0.3s ease-out',
              }}
            >
              {layout.slots.map((slot) => {
                const photoId = spread.slotPhotoIds[slot.id]
                const assignedPhoto = photoId ? photosById[photoId] ?? null : null
                const imgAdj = spread.slotImageAdjust?.[slot.id]
                return (
                  <div
                    key={slot.id}
                    data-slot-id={slot.id}
                    className="flex min-h-0 min-w-0 overflow-hidden"
                    style={{
                      gridColumn: `${slot.col} / span ${slot.colSpan}`,
                      gridRow: `${slot.row} / span ${slot.rowSpan}`,
                      minHeight: 0,
                      minWidth: 0,
                      alignSelf: 'stretch',
                      justifySelf: 'stretch',
                      transition: 'grid-column 0.3s ease-out, grid-row 0.3s ease-out',
                    }}
                  >
                  <Slot
                    spreadIndex={spreadIndex}
                    slotId={slot.id}
                    assignedPhoto={assignedPhoto}
                    selectedPhotoId={selectedPhotoId}
                    roundedClassName={isWedding && isWeddingCoverPage ? 'rounded-full ring-2 ring-white/70 shadow-sm' : undefined}
                    hideFooterOverlay={isWedding && isWeddingCoverPage}
                    imageAdjust={imgAdj}
                    active={activeSlotId === slot.id}
                    onActivate={() => setActiveSlotId((cur) => (cur === slot.id ? null : slot.id))}
                    onUpdateAdjust={(patch) => {
                      // NOTE: parent must provide a store action; for now keep local no-op if missing.
                      // We rely on onChangeText to persist text only.
                      // Slot crop persistence is handled via a custom event for now.
                      ;(window as any).__pb_setSlotImageAdjust?.(spreadIndex, slot.id, patch)
                    }}
                    onRemovePhoto={() => {
                      setActiveSlotId(null)
                      onClearSlot(slot.id)
                    }}
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
          </div>

          <Decorations decorations={layout.decorations} />

          {showTextEditor ? (
            isWedding && isWeddingCoverPage ? (
              <div className="pointer-events-none absolute inset-0">
                <div
                  className="pointer-events-auto absolute"
                  style={{
                    left: '52%',
                    top: '22%',
                    width: '44%',
                    textAlign: style.align ?? 'left',
                    fontFamily: style.fontFamily ?? 'Cinzel',
                  }}
                >
                  <textarea
                    value={headline}
                    onChange={(e) => onChangeText({ headline: e.target.value })}
                    placeholder="WEDDING&#10;THEME"
                    rows={2}
                    className="w-full resize-none bg-transparent tracking-tight outline-none"
                    style={{
                      fontFamily: style.fontFamily ?? 'Cinzel',
                      fontSize: style.headlineSize ?? 54,
                      fontWeight: style.headlineWeight ?? 800,
                      color: style.headlineColor ?? '#b7791f',
                      lineHeight: 1.05,
                    }}
                  />
                  <input
                    value={subheadline}
                    onChange={(e) => onChangeText({ subheadline: e.target.value })}
                    placeholder="This is a sample text that you can edit."
                    className="mt-2 w-full bg-transparent outline-none"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: style.subheadlineSize ?? 13,
                      fontWeight: style.subheadlineWeight ?? 500,
                      color: style.subheadlineColor ?? '#475569',
                    }}
                  />
                  <textarea
                    value={body}
                    onChange={(e) => onChangeText({ body: e.target.value })}
                    placeholder="You can change font (size, color, name), or apply any desired formatting."
                    rows={3}
                    className="mt-2 w-full resize-none bg-transparent outline-none"
                    style={{
                      fontFamily: 'Poppins',
                      fontSize: style.bodySize ?? 12,
                      fontWeight: style.bodyWeight ?? 400,
                      color: style.bodyColor ?? '#475569',
                      lineHeight: 1.35,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <div className="pointer-events-auto w-full max-w-lg rounded-2xl border-2 border-white/90 bg-white/80 p-5 shadow-xl backdrop-blur-md">
                  <div className="mb-3 h-0.5 w-12 rounded-full bg-gradient-to-r from-transparent via-slate-300 to-transparent mx-auto" />
                  <input
                    value={headline}
                    onChange={(e) => onChangeText({ headline: e.target.value })}
                    placeholder="Your book title"
                    className="w-full bg-transparent text-center text-2xl font-bold tracking-tight text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <textarea
                    value={subheadline}
                    onChange={(e) => onChangeText({ subheadline: e.target.value })}
                    placeholder="Subtitle or date"
                    rows={2}
                    className="mt-3 w-full resize-none bg-transparent text-center text-sm font-medium text-slate-600 outline-none placeholder:text-slate-400"
                  />
                  <div className="mt-3 h-0.5 w-12 rounded-full bg-gradient-to-r from-transparent via-slate-300 to-transparent mx-auto" />
                </div>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}
