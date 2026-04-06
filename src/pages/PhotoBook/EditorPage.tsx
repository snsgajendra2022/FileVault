import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { PhotoTray } from '../../components/PhotoBook/PhotoTray'
import { FileVaultImagePicker } from '../../components/PhotoBook/FileVaultImagePicker'
import { SpreadCanvas } from '../../components/PhotoBook/SpreadCanvas'
import { SpreadList } from '../../components/PhotoBook/SpreadList'
import { usePhotoBookStore } from '../../store/photobookStore'
import { getPhotoBookLayout, getPhotoBookTemplate, photobookTemplates } from '../../templates/photobookTemplates'

export function PhotoBookEditorPage() {
  const { t } = useTranslation()
  const album = usePhotoBookStore((s) => s.album)
  const photos = usePhotoBookStore((s) => s.photos)
  const selectedPhotoId = usePhotoBookStore((s) => s.selectedPhotoId)
  const selectedPhotoIds = usePhotoBookStore((s) => s.selectedPhotoIds)
  const selectedSpreadIndex = usePhotoBookStore((s) => s.selectedSpreadIndex)
  const setTitle = usePhotoBookStore((s) => s.setTitle)
  const addPhotos = usePhotoBookStore((s) => s.addPhotos)
  const addPhotoDataUrls = usePhotoBookStore((s) => s.addPhotoDataUrls)
  const removePhotosByIds = usePhotoBookStore((s) => s.removePhotosByIds)
  const selectPhoto = usePhotoBookStore((s) => s.selectPhoto)
  const togglePhotoInSelection = usePhotoBookStore((s) => s.togglePhotoInSelection)
  const fillEmptySlotsForSpread = usePhotoBookStore((s) => s.fillEmptySlotsForSpread)
  const selectSpread = usePhotoBookStore((s) => s.selectSpread)
  const assignPhotoToSlot = usePhotoBookStore((s) => s.assignPhotoToSlot)
  const clearSlot = usePhotoBookStore((s) => s.clearSlot)
  const setSpreadLayout = usePhotoBookStore((s) => s.setSpreadLayout)
  const setSpreadText = usePhotoBookStore((s) => s.setSpreadText)
  const setSlotImageAdjust = usePhotoBookStore((s) => (s as any).setSlotImageAdjust)

  const photosById = useMemo(() => Object.fromEntries(photos.map((p) => [p.id, p])), [photos])

  // Bridge for Slot crop tool inside SpreadCanvas (keeps changes persisted in store).
  // This avoids threading more props through the app right now.
  ;(window as any).__pb_setSlotImageAdjust = (spreadIndex: number, slotId: string, patch: any) => {
    try {
      setSlotImageAdjust?.(spreadIndex, slotId, patch)
    } catch (_) {
      // ignore
    }
  }

  if (!album) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-900">{t('photoBookEditor.noAlbumTitle')}</div>
        <p className="mt-1 text-sm text-slate-600">{t('photoBookEditor.noAlbumBody')}</p>
        <Link
          to=".."
          relative="path"
          className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {t('photoBookEditor.goTemplates')}
        </Link>
      </div>
    )
  }

  const template = getPhotoBookTemplate(album.templateId)
  const spread = album.spreads[Math.min(selectedSpreadIndex, album.spreads.length - 1)]
  const layout = template ? getPhotoBookLayout(template, spread.layoutId) : null
  const isTextPage = selectedSpreadIndex === 0 || selectedSpreadIndex === Math.max(0, album.spreads.length - 1)

  const trayPhotos = photos.filter((p) => p.source !== 'filevault')

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })

  const fetchAsDataUrl = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`)
    const blob = await res.blob()
    return blobToDataUrl(blob)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (accepted) => {
      if (!accepted.length) return
      void addPhotos(accepted)
    },
  })

  return (
    <DndContext
      onDragEnd={(event: DragEndEvent) => {
        const activeType = (event.active.data.current as any)?.type as string | undefined
        const overId = event.over?.id ? String(event.over.id) : null
        if (!overId?.startsWith('slot:')) return

        const [, spreadIndexStr, slotId] = overId.split(':')
        const spreadIndex = Number(spreadIndexStr)
        if (!Number.isFinite(spreadIndex) || !slotId) return

        if (activeType === 'filevault') {
          const data = (event.active.data.current as any) as { url?: string; filename?: string }
          const url = data?.url
          const filename = data?.filename ?? 'filevault-image'
          if (!url) return

          void (async () => {
            try {
              const dataUrl = await fetchAsDataUrl(url)
              const ids = await addPhotoDataUrls([{ name: filename, dataUrl }], { source: 'filevault' })
              const newId = ids[0]
              if (!newId) return
              assignPhotoToSlot(spreadIndex, slotId, newId)
              selectPhoto(newId)
            } catch (_) {
              // ignore drop failures
            }
          })()
          return
        }

        const photoId = String(event.active.id)
        assignPhotoToSlot(spreadIndex, slotId, photoId)
        selectPhoto(photoId)
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[340px_1fr_340px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">{t('photoBookEditor.album')}</div>
            <label className="mt-3 block text-xs font-medium text-slate-700">
              {t('photoBookEditor.titleLabel')}
              <input
                value={album.title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400"
                placeholder={t('photoBookEditor.titlePlaceholder')}
              />
            </label>

            <label className="mt-3 block text-xs font-medium text-slate-700">
              {t('photoBookEditor.uploadPhotos')}
              <input
                type="file"
                multiple
                accept="image/*"
                className="mt-1 block w-full text-sm"
                onChange={(e) => {
                  if (!e.target.files) return
                  void addPhotos(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>

            {/* Drag & drop upload */}
            <div
              {...getRootProps()}
              className={[
                'mt-3 rounded-xl border-2 border-dashed p-4 text-center text-sm transition',
                isDragActive ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-600',
              ].join(' ')}
            >
              <input {...getInputProps()} />
              {isDragActive ? t('photoBookEditor.dropHere') : t('photoBookEditor.dragDropUpload')}
            </div>

            <div className="mt-3 text-xs text-slate-600">
              {t('photoBookEditor.templateLabel')}{' '}
              <span className="font-semibold text-slate-900">
                {photobookTemplates.find((tmpl) => tmpl.id === album.templateId)?.name ?? album.templateId}
              </span>
            </div>
          </div>

          {isTextPage ? (
            <div
              className={`relative overflow-hidden rounded-2xl shadow-lg ${
                selectedSpreadIndex === 0
                  ? 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white'
                  : 'bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 text-white'
              }`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.15),transparent)]" />
              <div className="relative p-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      selectedSpreadIndex === 0 ? 'bg-white/20' : 'bg-white/15'
                    }`}
                  >
                    <span className="text-2xl" aria-hidden>
                      {selectedSpreadIndex === 0 ? '📖' : '📕'}
                    </span>
                  </div>
                  <div>
                    <div className="text-lg font-bold tracking-tight">
                      {selectedSpreadIndex === 0 ? t('photoBookEditor.frontCover') : t('photoBookEditor.backCover')}
                    </div>
                    <p className="mt-0.5 text-xs text-white/80">
                      {t('photoBookEditor.coverHint')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/90">
                      {t('photoBookEditor.headline')}
                    </span>
                    <input
                      value={spread.text?.headline ?? ''}
                      onChange={(e) => setSpreadText(selectedSpreadIndex, { headline: e.target.value })}
                      className="w-full rounded-xl border-0 bg-white/95 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-white/50"
                      placeholder={t('photoBookEditor.headlinePh')}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/90">
                      {t('photoBookEditor.subheadline')}
                    </span>
                    <textarea
                      value={spread.text?.subheadline ?? ''}
                      onChange={(e) => setSpreadText(selectedSpreadIndex, { subheadline: e.target.value })}
                      rows={2}
                      className="w-full resize-none rounded-xl border-0 bg-white/95 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-white/50"
                      placeholder={t('photoBookEditor.subheadlinePh')}
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {/* Album/folder photos tray (shows above picker) */}
          <PhotoTray
            title={t('photoBookEditor.trayTitle')}
            photos={trayPhotos}
            selectedPhotoId={selectedPhotoId}
            selectedPhotoIds={selectedPhotoIds}
            onSelectPhoto={selectPhoto}
            onToggleMultiSelect={togglePhotoInSelection}
            onClearPhotos={() => {
              const ids = trayPhotos.map((p) => p.id)
              removePhotosByIds(ids)
            }}
            onFillEmptySlots={() => fillEmptySlotsForSpread(selectedSpreadIndex)}
            canFillEmptySlots={
              !!layout &&
              layout.slots.length > 1 &&
              layout.slots.some((slot) => !spread.slotPhotoIds[slot.id])
            }
          />

          <FileVaultImagePicker
            onPick={async (picked) => {
              // User request: picking from FileVault should NOT add into the Photos tray.
              // We still add it to the store (source=filevault) so it can be used/dragged if needed,
              // but the tray filters it out.
              const ids = await addPhotoDataUrls([picked], { source: 'filevault' })
              selectPhoto(ids[0] ?? null)
            }}
            onDropFiles={async (files) => {
              // Enable drag & drop upload inside the picker area too.
              await addPhotos(files)
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">{t('photoBookEditor.editor')}</div>
              <div className="text-sm text-slate-600">
                {t('photoBookEditor.spreadOf', { current: selectedSpreadIndex + 1, total: album.spreads.length })}
              </div>
            </div>

            {template ? (
              <label className="text-xs font-medium text-slate-700">
                {t('photoBookEditor.layoutLabel')}
                <select
                  className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={spread.layoutId}
                  onChange={(e) => {
                    const layoutId = e.target.value
                    if (layoutId) setSpreadLayout(selectedSpreadIndex, layoutId)
                  }}
                >
                  {template.layouts.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {layout && layout.slots.length > 1 ? (
            <div className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-xs text-sky-800">
              {t('photoBookEditor.multiHint')}
            </div>
          ) : null}

          {layout ? (
            <SpreadCanvas
              key={`spread-${selectedSpreadIndex}`}
              layout={layout}
              spread={spread}
              spreadIndex={selectedSpreadIndex}
              photosById={photosById}
              selectedPhotoId={selectedPhotoId}
              showTextEditor={isTextPage}
              onChangeText={(patch) => setSpreadText(selectedSpreadIndex, patch)}
              onAssignPhoto={(slotId, photoId) => assignPhotoToSlot(selectedSpreadIndex, slotId, photoId)}
              onClearSlot={(slotId) => clearSlot(selectedSpreadIndex, slotId)}
            />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm text-slate-700">{t('photoBookEditor.missingLayout', { id: spread.layoutId })}</div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {template ? (
            <SpreadList
              spreads={album.spreads}
              selectedIndex={selectedSpreadIndex}
              getLayoutForSpread={(sp) => getPhotoBookLayout(template, sp.layoutId)}
              photosById={photosById}
              onSelect={selectSpread}
            />
          ) : null}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            {t('photoBookEditor.previewCta')}{' '}
            <Link className="font-semibold text-slate-900 hover:underline" to="../preview" relative="path">
              {t('photoBookEditor.previewLink')}
            </Link>{' '}
            {t('photoBookEditor.previewTail')}
          </div>
        </div>
      </div>
    </DndContext>
  )
}

