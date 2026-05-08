import React, { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SpreadPreviewCanvas } from '../../components/PhotoBook/SpreadPreviewCanvas'
import { usePhotoBookStore } from '../../state/stores/photobookStore'
import { getPhotoBookLayout, getPhotoBookTemplate } from '../../templates/photobookTemplates'
import { downloadTextFile } from '../../utils/photobookDownload'

export function PhotoBookPreviewPage() {
  const { t } = useTranslation()
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
        <div className="text-lg font-semibold text-slate-900">{t('photoBookPreview.emptyTitle')}</div>
        <p className="mt-1 text-sm text-slate-600">{t('photoBookPreview.emptyBody')}</p>
        <Link
          to="../editor"
          relative="path"
          className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {t('photoBookPreview.goEditor')}
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
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t('photoBookPreview.heading')}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {t('photoBookPreview.sub')}
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
              {editMode ? t('photoBookPreview.editingOn') : t('photoBookPreview.editInPreview')}
            </button>
            <button
              type="button"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={() => window.print()}
            >
              {t('photoBookPreview.printPdf')}
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => downloadTextFile(`${album.title || 'photobook'}.json`, exportJson())}
            >
              {t('photoBookPreview.exportJson')}
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => fileInputRef.current?.click()}
            >
              {t('photoBookPreview.importJson')}
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
            {t('photoBookPreview.metaTemplate', { name: template?.name ?? album.templateId, n: album.spreads.length })}
          </div>
          {editMode ? (
            <div className="mt-2 text-xs text-slate-600">
              {t('photoBookPreview.editTip')}
            </div>
          ) : null}
        </div>

        <div className="mx-auto max-w-3xl space-y-6">
          {album.spreads.map((sp, idx) => {
            const layout = template ? getPhotoBookLayout(template, sp.layoutId) : null
            const isTextPage = idx === 0 || idx === Math.max(0, album.spreads.length - 1)
            const isFrontCover = idx === 0
            const isBackCover = idx === Math.max(0, album.spreads.length - 1) && album.spreads.length > 1
            return (
              <div
                key={sp.id}
                className={`break-inside-avoid rounded-2xl shadow-lg print:shadow-none overflow-hidden ${
                  isFrontCover
                    ? 'border-2 border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-white'
                    : isBackCover
                    ? 'border-2 border-slate-200/80 bg-gradient-to-b from-slate-50/50 to-white'
                    : 'border border-slate-200 bg-white'
                }`}
              >
                <div
                  className={`flex items-center justify-between px-4 py-2.5 ${
                    isFrontCover
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                      : isBackCover
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="text-sm font-bold tracking-tight">
                    {isFrontCover ? t('photoBookEditor.frontCover') : isBackCover ? t('photoBookEditor.backCover') : t('photoBookPreview.spreadLabel', { n: idx + 1 })}
                  </span>
                  {layout ? (
                    <span className={`text-xs font-medium ${isFrontCover || isBackCover ? 'text-white/90' : 'text-slate-500'}`}>
                      {layout.name}
                    </span>
                  ) : null}
                </div>
                <div className="p-4">
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
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    {t('photoBookPreview.missingLayout', { id: sp.layoutId })}
                  </div>
                )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
