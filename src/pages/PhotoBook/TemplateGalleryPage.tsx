import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { photobookTemplates } from '../../templates/photobookTemplates'
import { usePhotoBookStore } from '../../store/photobookStore'

export function PhotoBookTemplateGalleryPage() {
  const navigate = useNavigate()
  const startNewAlbum = usePhotoBookStore((s) => s.startNewAlbum)

  const items = useMemo(() => photobookTemplates, [])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create a PhotoBook</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose a template, then upload photos and drag them into the spreads.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((t) => (
          <button
            key={t.id}
            type="button"
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => {
              startNewAlbum(t.id)
              navigate('editor')
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">{t.name}</div>
                <div className="mt-1 text-sm text-slate-600">{t.description}</div>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                Use template
              </span>
            </div>

            <div className="mt-4 grid grid-cols-12 gap-2 rounded-xl bg-slate-50 p-3">
              {t.layouts
                .find((l) => l.id === t.coverLayoutId)
                ?.slots.slice(0, 4)
                .map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-slate-200 bg-white shadow-sm"
                    style={{
                      gridColumn: `${s.col} / span ${s.colSpan}`,
                      gridRow: `${s.row} / span ${s.rowSpan}`,
                      minHeight: 14,
                    }}
                  />
                ))}
              <div className="col-span-12 mt-2 text-xs text-slate-500">
                {t.defaultSpreads.length} starter spreads · drag & drop editor
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

