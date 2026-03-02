import React from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useDropzone } from 'react-dropzone'
import { useDraggable } from '@dnd-kit/core'
import type { CSSProperties } from 'react'

type UserImage = {
  id: number
  previewUrl: string
  filename: string
  downloadUrl: string
  uploadTime: string
  fileType: string
}

type UserImagesResponse = {
  totalImages: number
  images: UserImage[]
}

function FileVaultThumb({
  img,
  busy,
  selected,
  onClick,
}: {
  img: UserImage
  busy: boolean
  selected?: boolean
  onClick: () => Promise<void>
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `filevault:${img.previewUrl}`,
    data: { type: 'filevault' as const, url: img.previewUrl, filename: img.filename },
  })

  const style: CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={[
        'group relative aspect-square overflow-hidden rounded-xl border-2 bg-slate-50 shadow-sm transition-all hover:shadow-lg hover:scale-[1.03]',
        busy ? 'opacity-60' : '',
        isDragging ? 'opacity-40' : '',
        selected ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-indigo-200' : 'border-transparent hover:border-slate-200',
      ].join(' ')}
      style={style}
      disabled={busy}
      onClick={() => void onClick()}
      title={img.filename}
      {...listeners}
      {...attributes}
    >
      <img
        src={img.previewUrl}
        alt={img.filename}
        className="h-full w-full object-cover"
        draggable={false}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.opacity = '0.2'
        }}
      />
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shadow-md">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5 text-left text-[10px] text-white font-medium opacity-0 transition group-hover:opacity-100">
        {img.filename}
      </div>
    </button>
  )
}

export type PickedImage = { name: string; dataUrl: string; imageId?: number }

export function FileVaultImagePicker({
  onPick,
  onPickMany,
  allowMultiSelect = false,
  onDropFiles,
  maxInitial = 24,
}: {
  onPick: (picked: PickedImage) => Promise<void> | void
  onPickMany?: (picked: PickedImage[]) => Promise<void> | void
  allowMultiSelect?: boolean
  onDropFiles?: (files: File[]) => Promise<void> | void
  maxInitial?: number
}) {
  const [limit, setLimit] = React.useState(maxInitial)
  const [busyUrl, setBusyUrl] = React.useState<string | null>(null)
  const [selectedUrls, setSelectedUrls] = React.useState<Set<string>>(new Set())

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: (accepted) => {
      if (!accepted.length) return
      void onDropFiles?.(accepted)
    },
  })

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['photobookFileVaultImages'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const response = await api.get(`/api/images/user/all?token=${token}`)
      return response.data as UserImagesResponse
    },
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const images = (data?.images ?? []).filter((img) => img.fileType.toLowerCase().match(/^(png|jpg|jpeg|gif|webp)$/))

  return (
    <div>
      {/* Upload zone — compact */}
      {onDropFiles && (
        <div
          {...getRootProps()}
          className={[
            'rounded-xl border-2 border-dashed p-3 text-center text-xs transition mb-3',
            isDragActive
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:border-slate-300',
          ].join(' ')}
        >
          <input {...getInputProps()} />
          {isDragActive ? 'Drop images here…' : 'Drag & drop to upload new images'}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="aspect-square rounded-xl bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <p className="text-xs text-slate-400 font-medium">Loading your library...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-8">
          <p className="text-sm text-red-600">Failed to load images</p>
          <button type="button" onClick={() => refetch()} className="mt-2 text-xs text-indigo-600 hover:underline font-semibold">Retry</button>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <p className="text-sm text-slate-500">No images in your library yet</p>
        </div>
      ) : (
        <>
          {/* Image count + refresh */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 font-medium">{images.length} image{images.length !== 1 ? 's' : ''} in your library</span>
            <button type="button" onClick={() => refetch()} className="text-[10px] text-indigo-600 hover:underline font-semibold">Refresh</button>
          </div>

          {/* Image grid — 3 columns, larger thumbnails */}
          <div className="grid grid-cols-3 gap-2.5">
            {images.slice(0, limit).map((img) => (
              <FileVaultThumb
                key={img.previewUrl}
                img={img}
                busy={busyUrl === img.previewUrl}
                selected={allowMultiSelect && selectedUrls.has(img.previewUrl)}
                onClick={async () => {
                  if (allowMultiSelect && onPickMany) {
                    setSelectedUrls((prev) => {
                      const next = new Set(prev)
                      if (next.has(img.previewUrl)) next.delete(img.previewUrl)
                      else next.add(img.previewUrl)
                      return next
                    })
                    return
                  }
                  try {
                    setBusyUrl(img.previewUrl)
                    await onPick({ name: img.filename, dataUrl: img.previewUrl, imageId: img.id })
                  } finally {
                    setBusyUrl(null)
                  }
                }}
              />
            ))}
          </div>

          {/* Load more */}
          {images.length > limit && (
            <button
              type="button"
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setLimit((v) => v + maxInitial)}
            >
              Show more ({Math.min(images.length, limit + maxInitial)} / {images.length})
            </button>
          )}

          {/* Multi-select action bar */}
          {allowMultiSelect && onPickMany && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-2.5">
              <span className="text-xs text-indigo-700 font-medium">
                {selectedUrls.size > 0
                  ? `${selectedUrls.size} photo${selectedUrls.size > 1 ? 's' : ''} selected`
                  : 'Tap images to select'}
              </span>
              <button
                type="button"
                disabled={selectedUrls.size === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={async () => {
                  if (selectedUrls.size === 0) return
                  const chosen = images.filter((img) => selectedUrls.has(img.previewUrl))
                  try {
                    setBusyUrl('bulk')
                    const picked = chosen.map((img) => ({
                      name: img.filename,
                      dataUrl: img.previewUrl,
                      imageId: img.id,
                    }))
                    await onPickMany(picked)
                    setSelectedUrls(new Set())
                  } finally {
                    setBusyUrl(null)
                  }
                }}
              >
                Add {selectedUrls.size > 0 ? selectedUrls.size : ''} Photo{selectedUrls.size !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

