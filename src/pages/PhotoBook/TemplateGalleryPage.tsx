import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { photobookTemplates } from '../../templates/photobookTemplates'
import { usePhotoBookStore } from '../../state/stores/photobookStore'

export function PhotoBookTemplateGalleryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const startNewAlbum = usePhotoBookStore((s) => s.startNewAlbum)

  const items = useMemo(() => photobookTemplates, [])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t('photoBookTemplateGallery.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t('photoBookTemplateGallery.subtitle')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => {
              startNewAlbum(tmpl.id)
              navigate('editor')
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">{tmpl.name}</div>
                <div className="mt-1 text-sm text-slate-600">{tmpl.description}</div>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                {t('photoBookTemplateGallery.useTemplate')}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-12 gap-2 rounded-xl bg-slate-50 p-3">
              {tmpl.layouts
                .find((l) => l.id === tmpl.coverLayoutId)
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
                {t('photoBookTemplateGallery.starterSpreads', { n: tmpl.defaultSpreads.length })}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
