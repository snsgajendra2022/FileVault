import React, { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { SpreadPreviewCanvas } from '../../components/PhotoBook/SpreadPreviewCanvas'
import { usePhotoBookStore } from '../../store/photobookStore'
import { getPhotoBookLayout, getPhotoBookTemplate } from '../../templates/photobookTemplates'
import { downloadTextFile } from '../../utils/photobookDownload'

export function PhotoBookPreviewPage() {
  const album = usePhotoBookStore((s) => s.album)
  const photos = usePhotoBookStore((s) => s.photos)
  const exportJson = usePhotoBookStore((s) => s.exportJson)
  const importJson = usePhotoBookStore((s) => s.importJson)
  const setSlotImageAdjust = usePhotoBookStore((s) => (s as any).setSlotImageAdjust ?? (s as any).setSlotImageAdjust)
  const clearSlot = usePhotoBookStore((s) => s.clearSlot)

  const [editMode, setEditMode] = React.useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const photosById = useMemo(() => Object.fromEntries(photos.map((p) => [p.id, p])), [photos])

  if (!album) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-900">Nothing to preview</div>
        <p className="mt-1 text-sm text-slate-600">Create an album in the editor first.</p>
        <Link
          to="../editor"
          relative="path"
          className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Go to editor
        </Link>
      </div>
    )
  }

  const template = getPhotoBookTemplate(album.templateId)

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          header { display: none !important; }
          .no-print { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Preview</h1>
            <p className="mt-1 text-sm text-slate-600">
              Print this page to save a PDF. You can also export/import JSON.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={[
                'rounded-xl px-4 py-2 text-sm font-semibold shadow-sm',
                editMode ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => setEditMode((v) => !v)}
            >
              {editMode ? 'Editing: ON' : 'Edit in preview'}
            </button>
            <button
              type="button"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={() => window.print()}
            >
              Print / Save PDF
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => downloadTextFile(`${album.title || 'photobook'}.json`, exportJson())}
            >
              Export JSON
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => fileInputRef.current?.click()}
            >
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  importJson(String(reader.result))
                }
                reader.readAsText(file)
                e.target.value = ''
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">{album.title}</div>
          <div className="mt-1 text-xs text-slate-600">
            Template: {template?.name ?? album.templateId} · Spreads: {album.spreads.length}
          </div>
          {editMode ? (
            <div className="mt-2 text-xs text-slate-600">
              Tip: Click a photo to select it, then drag to crop/position and use the zoom slider.
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {album.spreads.map((sp, idx) => {
            const layout = template ? getPhotoBookLayout(template, sp.layoutId) : null
            const isTextPage = idx === 0 || idx === Math.max(0, album.spreads.length - 1)
            return (
              <div key={sp.id} className="break-inside-avoid">
                <div className="mb-2 text-xs font-semibold text-slate-600">
                  Spread {idx + 1} {layout ? `· ${layout.name}` : ''}
                </div>
                {layout ? (
                  <SpreadPreviewCanvas
                    layout={layout}
                    spread={sp}
                    photosById={photosById}
                    showText={isTextPage}
                    editable={editMode}
                    onSetSlotImageAdjust={(slotId, patch) => setSlotImageAdjust?.(idx, slotId, patch)}
                    onClearSlot={(slotId) => clearSlot(idx, slotId)}
                  />
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    Missing layout: {sp.layoutId}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

