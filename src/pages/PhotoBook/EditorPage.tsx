import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { PhotoTray } from '../../components/PhotoBook/PhotoTray'
import { FileVaultImagePicker } from '../../components/PhotoBook/FileVaultImagePicker'
import { SpreadCanvas } from '../../components/PhotoBook/SpreadCanvas'
import { SpreadList } from '../../components/PhotoBook/SpreadList'
import { usePhotoBookStore } from '../../store/photobookStore'
import { getPhotoBookLayout, getPhotoBookTemplate, photobookTemplates } from '../../templates/photobookTemplates'

export function PhotoBookEditorPage() {
  const album = usePhotoBookStore((s) => s.album)
  const photos = usePhotoBookStore((s) => s.photos)
  const selectedPhotoId = usePhotoBookStore((s) => s.selectedPhotoId)
  const selectedSpreadIndex = usePhotoBookStore((s) => s.selectedSpreadIndex)
  const setTitle = usePhotoBookStore((s) => s.setTitle)
  const addPhotos = usePhotoBookStore((s) => s.addPhotos)
  const addPhotoDataUrls = usePhotoBookStore((s) => s.addPhotoDataUrls)
  const removePhotosByIds = usePhotoBookStore((s) => s.removePhotosByIds)
  const selectPhoto = usePhotoBookStore((s) => s.selectPhoto)
  const selectSpread = usePhotoBookStore((s) => s.selectSpread)
  const assignPhotoToSlot = usePhotoBookStore((s) => s.assignPhotoToSlot)
  const clearSlot = usePhotoBookStore((s) => s.clearSlot)
  const setSpreadLayout = usePhotoBookStore((s) => s.setSpreadLayout)
  const setSpreadText = usePhotoBookStore((s) => s.setSpreadText)

  const photosById = useMemo(() => Object.fromEntries(photos.map((p) => [p.id, p])), [photos])

  if (!album) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-900">No album yet</div>
        <p className="mt-1 text-sm text-slate-600">Choose a template to start creating your photo book.</p>
        <Link
          to=".."
          relative="path"
          className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Go to templates
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
            <div className="text-sm font-semibold text-slate-900">Album</div>
            <label className="mt-3 block text-xs font-medium text-slate-700">
              Title
              <input
                value={album.title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400"
                placeholder="My Photo Book"
              />
            </label>

            <label className="mt-3 block text-xs font-medium text-slate-700">
              Upload photos
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
              {isDragActive ? 'Drop images here…' : 'Drag & drop images here to upload'}
            </div>

            <div className="mt-3 text-xs text-slate-600">
              Template:{' '}
              <span className="font-semibold text-slate-900">
                {photobookTemplates.find((t) => t.id === album.templateId)?.name ?? album.templateId}
              </span>
            </div>
          </div>

          {isTextPage ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">
                {selectedSpreadIndex === 0 ? 'Cover text' : 'Back cover text'}
              </div>
              <p className="mt-1 text-xs text-slate-600">
                This text is editable and will appear in Preview / Print.
              </p>
              <label className="mt-3 block text-xs font-medium text-slate-700">
                Headline
                <input
                  value={spread.text?.headline ?? ''}
                  onChange={(e) => setSpreadText(selectedSpreadIndex, { headline: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400"
                  placeholder="e.g. Summer in Kyoto"
                />
              </label>
              <label className="mt-3 block text-xs font-medium text-slate-700">
                Subheadline
                <textarea
                  value={spread.text?.subheadline ?? ''}
                  onChange={(e) => setSpreadText(selectedSpreadIndex, { subheadline: e.target.value })}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-slate-400"
                  placeholder="e.g. 2026 • Family Trip"
                />
              </label>
            </div>
          ) : null}

          {/* Album/folder photos tray (shows above picker) */}
          <PhotoTray
            title="Album Photos"
            photos={trayPhotos}
            selectedPhotoId={selectedPhotoId}
            onSelectPhoto={selectPhoto}
            onClearPhotos={() => {
              const ids = trayPhotos.map((p) => p.id)
              removePhotosByIds(ids)
            }}
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
              <div className="text-lg font-semibold text-slate-900">Editor</div>
              <div className="text-sm text-slate-600">
                Spread {selectedSpreadIndex + 1} of {album.spreads.length}
              </div>
            </div>

            {template ? (
              <label className="text-xs font-medium text-slate-700">
                Layout
                <select
                  className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={spread.layoutId}
                  onChange={(e) => setSpreadLayout(selectedSpreadIndex, e.target.value)}
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

          {layout ? (
            <SpreadCanvas
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
              <div className="text-sm text-slate-700">Missing layout: {spread.layoutId}</div>
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
            When you’re ready, go to{' '}
            <Link className="font-semibold text-slate-900 hover:underline" to="../preview" relative="path">
              Preview
            </Link>{' '}
            to print to PDF or export your album.
          </div>
        </div>
      </div>
    </DndContext>
  )
}

