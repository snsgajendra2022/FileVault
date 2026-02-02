import React from 'react'
import type { PhotoBookPhoto, PhotoBookSpread, PhotoBookSpreadLayout } from '../../types/photobook'
import { Decorations } from './Decorations'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function SpreadPreviewCanvas({
  layout,
  spread,
  photosById,
  showText,
  editable,
  onSetSlotImageAdjust,
  onClearSlot,
}: {
  layout: PhotoBookSpreadLayout
  spread: PhotoBookSpread
  photosById: Record<string, PhotoBookPhoto>
  showText: boolean
  editable?: boolean
  onSetSlotImageAdjust?: (slotId: string, patch: Partial<{ scale: number; x: number; y: number }>) => void
  onClearSlot?: (slotId: string) => void
}) {
  const headline = spread.text?.headline ?? ''
  const subheadline = spread.text?.subheadline ?? ''
  const body = spread.text?.body ?? ''
  const style = spread.text?.style ?? {}
  const isWedding = layout.style?.background === 'wedding'
  const isWeddingCoverPage = layout.id === 'cover-wedding-hero'
  const [activeSlotId, setActiveSlotId] = React.useState<string | null>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  const dragRef = React.useRef<
    | {
        active: true
        pointerId: number
        slotId: string
        startClientX: number
        startClientY: number
        startXPct: number
        startYPct: number
        rectW: number
        rectH: number
      }
    | { active: false }
  >({ active: false })

  const rafRef = React.useRef<number | null>(null)
  const pendingRef = React.useRef<{ slotId: string; patch: Partial<{ scale: number; x: number; y: number }> } | null>(
    null,
  )

  const flushPending = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    onSetSlotImageAdjust?.(pending.slotId, pending.patch)
  }, [onSetSlotImageAdjust])

  const queuePatch = React.useCallback(
    (slotId: string, patch: Partial<{ scale: number; x: number; y: number }>) => {
      const prev = pendingRef.current
      pendingRef.current = {
        slotId,
        patch: prev?.slotId === slotId ? { ...prev.patch, ...patch } : patch,
      }
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          const p = pendingRef.current
          if (!p) return
          pendingRef.current = null
          onSetSlotImageAdjust?.(p.slotId, p.patch)
        })
      }
    },
    [onSetSlotImageAdjust],
  )

  // Smooth zoom with mouse wheel (non-passive) when cursor is over a slot.
  React.useEffect(() => {
    if (!editable) return
    const root = rootRef.current
    if (!root) return

    const onWheel = (ev: WheelEvent) => {
      const target = ev.target as HTMLElement | null
      const slotEl = target?.closest?.('[data-slot-id]') as HTMLElement | null
      const slotId = slotEl?.dataset?.slotId
      if (!slotId) return
      const photoId = spread.slotPhotoIds[slotId]
      if (!photoId) return

      // Prevent page scroll while zooming.
      ev.preventDefault()
      ev.stopPropagation()

      // Smooth exponential zoom.
      const adj = spread.slotImageAdjust?.[slotId] ?? {}
      const curScale = clamp(adj.scale ?? 1, 1, 3)
      const curMaxT = (curScale - 1) * 50
      const curX = clamp(adj.x ?? 0, -curMaxT, curMaxT)
      const curY = clamp(adj.y ?? 0, -curMaxT, curMaxT)

      // Normalize delta. deltaY > 0 means scroll down (zoom out).
      const delta = ev.deltaY
      const zoomIntensity = 0.0018
      const nextScale = clamp(curScale * Math.exp(-delta * zoomIntensity), 1, 3)
      const nextMaxT = (nextScale - 1) * 50

      setActiveSlotId(slotId)
      queuePatch(slotId, {
        scale: nextScale,
        x: clamp(curX, -nextMaxT, nextMaxT),
        y: clamp(curY, -nextMaxT, nextMaxT),
      })
    }

    root.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      root.removeEventListener('wheel', onWheel as any)
    }
  }, [editable, queuePatch, spread.slotImageAdjust, spread.slotPhotoIds])
  const backgroundClass =
    layout.style?.background === 'party'
      ? 'photobook-bg-party'
      : isWedding
        ? 'photobook-bg-wedding-cover'
        : 'bg-white'

  return (
    <div className="relative w-full">
      <div
        ref={rootRef}
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
          const adj = spread.slotImageAdjust?.[slot.id] ?? {}
          const scale = Math.min(3, Math.max(1, adj.scale ?? 1))
          const maxT = (scale - 1) * 50 // at scale=1 → 0, scale=3 → 100
          const x = clamp(adj.x ?? 0, -maxT, maxT)
          const y = clamp(adj.y ?? 0, -maxT, maxT)
          return (
            <div
              key={slot.id}
              data-slot-id={slot.id}
              className={['overflow-hidden bg-slate-50', isWedding && isWeddingCoverPage ? 'rounded-full' : 'rounded-lg'].join(' ')}
              style={{
                gridColumn: `${slot.col} / span ${slot.colSpan}`,
                gridRow: `${slot.row} / span ${slot.rowSpan}`,
                position: 'relative',
                outline:
                  editable && activeSlotId === slot.id ? '2px solid rgba(16, 185, 129, 0.9)' : '2px solid transparent',
                outlineOffset: 2,
              }}
            >
              {assignedPhoto ? (
                <>
                  <img
                    src={assignedPhoto.dataUrl}
                    alt=""
                    className="h-full w-full select-none object-cover"
                    draggable={false}
                    onClick={() => {
                      if (!editable) return
                      setActiveSlotId((cur) => (cur === slot.id ? null : slot.id))
                    }}
                    style={{
                      transform: `translate(${x}%, ${y}%) scale(${scale})`,
                      transformOrigin: 'center',
                      willChange: editable && activeSlotId === slot.id ? 'transform' : undefined,
                      cursor: editable ? 'pointer' : undefined,
                    }}
                  />

                  {editable && activeSlotId === slot.id ? (
                    <>
                      <div
                        className="no-print absolute inset-0"
                        onPointerDown={(e) => {
                          if (!onSetSlotImageAdjust) return
                          e.preventDefault()
                          e.stopPropagation()
                          const el = e.currentTarget as HTMLDivElement
                          const rect = el.getBoundingClientRect()
                          el.setPointerCapture(e.pointerId)
                          dragRef.current = {
                            active: true,
                            pointerId: e.pointerId,
                            slotId: slot.id,
                            startClientX: e.clientX,
                            startClientY: e.clientY,
                            startXPct: x,
                            startYPct: y,
                            rectW: rect.width,
                            rectH: rect.height,
                          }
                        }}
                        onPointerMove={(e) => {
                          const st = dragRef.current
                          if (!st.active || st.pointerId !== e.pointerId) return
                          e.preventDefault()
                          const dx = e.clientX - st.startClientX
                          const dy = e.clientY - st.startClientY
                          const nextMaxTLocal = (scale - 1) * 50
                          const nextX = clamp(st.startXPct + (dx / st.rectW) * 100, -nextMaxTLocal, nextMaxTLocal)
                          const nextY = clamp(st.startYPct + (dy / st.rectH) * 100, -nextMaxTLocal, nextMaxTLocal)
                          queuePatch(st.slotId, { x: nextX, y: nextY })
                        }}
                        onPointerUp={(e) => {
                          const st = dragRef.current
                          if (!st.active || st.pointerId !== e.pointerId) return
                          e.preventDefault()
                          dragRef.current = { active: false }
                          flushPending()
                        }}
                        onPointerCancel={(e) => {
                          const st = dragRef.current
                          if (!st.active || st.pointerId !== e.pointerId) return
                          dragRef.current = { active: false }
                          flushPending()
                        }}
                        style={{ touchAction: 'none', cursor: 'grab' }}
                        title="Drag to crop/position"
                      />
                    </>
                  ) : null}
                </>
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

      {showText && (headline.trim() || subheadline.trim() || body.trim()) ? (
        isWedding && isWeddingCoverPage ? (
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute"
              style={{
                left: '52%',
                top: '22%',
                width: '44%',
                textAlign: style.align ?? 'left',
                fontFamily: style.fontFamily ?? 'Cinzel',
              }}
            >
              {headline.trim() ? (
                <div
                  style={{
                    whiteSpace: 'pre-line',
                    fontFamily: style.fontFamily ?? 'Cinzel',
                    fontSize: style.headlineSize ?? 54,
                    fontWeight: style.headlineWeight ?? 800,
                    color: style.headlineColor ?? '#b7791f',
                    lineHeight: 1.05,
                  }}
                >
                  {headline}
                </div>
              ) : null}
              {subheadline.trim() ? (
                <div
                  className="mt-2"
                  style={{
                    fontFamily: 'Poppins',
                    fontSize: style.subheadlineSize ?? 13,
                    fontWeight: style.subheadlineWeight ?? 500,
                    color: style.subheadlineColor ?? '#475569',
                  }}
                >
                  {subheadline}
                </div>
              ) : null}
              {body.trim() ? (
                <div
                  className="mt-2"
                  style={{
                    fontFamily: 'Poppins',
                    fontSize: style.bodySize ?? 12,
                    fontWeight: style.bodyWeight ?? 400,
                    color: style.bodyColor ?? '#475569',
                    lineHeight: 1.35,
                  }}
                >
                  {body}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
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
        )
      ) : null}
    </div>
  )
}

