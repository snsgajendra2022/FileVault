import React from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useDropzone } from 'react-dropzone'
import { useDraggable } from '@dnd-kit/core'
import type { CSSProperties } from 'react'

type UserImage = {
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
        'group relative aspect-square overflow-hidden rounded-xl border bg-slate-50 shadow-sm transition hover:shadow-md',
        busy ? 'opacity-60' : '',
        isDragging ? 'opacity-40' : '',
        selected ? 'ring-2 ring-indigo-500 border-indigo-500' : '',
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
      <div className="absolute inset-x-0 bottom-0 truncate bg-black/40 px-2 py-1 text-left text-[10px] text-white opacity-0 transition group-hover:opacity-100">
        {img.filename}
      </div>
    </button>
  )
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`)
  const blob = await res.blob()
  return blobToDataUrl(blob)
}

export function FileVaultImagePicker({
  onPick,
  onPickMany,
  allowMultiSelect = false,
  onDropFiles,
  maxInitial = 24,
}: {
  onPick: (picked: { name: string; dataUrl: string }) => Promise<void> | void
  onPickMany?: (picked: { name: string; dataUrl: string }[]) => Promise<void> | void
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Pick from FileVault</div>
          <div className="mt-1 text-xs text-slate-600">
            Click an image to add it into the PhotoBook tray.
          </div>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          onClick={() => refetch()}
        >
          Refresh
        </button>
      </div>

      {/* Drag & drop upload (same behavior as upload) */}
      <div
        {...getRootProps()}
        className={[
          'mt-3 rounded-xl border-2 border-dashed p-4 text-center text-sm transition',
          onDropFiles
            ? isDragActive
              ? 'border-sky-400 bg-sky-50 text-sky-700'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            : 'border-slate-200 bg-slate-50 text-slate-400',
        ].join(' ')}
        title={onDropFiles ? 'Drop images here to upload' : 'Upload not available here'}
      >
        <input {...getInputProps()} />
        {onDropFiles ? (isDragActive ? 'Drop images here…' : 'Drag & drop images here to upload') : 'Drag & drop disabled'}
      </div>

      {isLoading ? (
        <div className="mt-3 text-sm text-slate-600">Loading your images…</div>
      ) : isError ? (
        <div className="mt-3 text-sm text-red-700">
          Failed to load images. {(error as Error)?.message ?? ''}
        </div>
      ) : images.length === 0 ? (
        <div className="mt-3 text-sm text-slate-600">No images found in your FileVault library.</div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2">
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
                      if (next.has(img.previewUrl)) {
                        next.delete(img.previewUrl)
                      } else {
                        next.add(img.previewUrl)
                      }
                      return next
                    })
                    return
                  }
                  try {
                    setBusyUrl(img.previewUrl)
                    const dataUrl = await fetchAsDataUrl(img.previewUrl)
                    await onPick({ name: img.filename, dataUrl })
                  } finally {
                    setBusyUrl(null)
                  }
                }}
              />
            ))}
          </div>
          {images.length > limit ? (
            <div className="mt-3">
              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => setLimit((v) => v + maxInitial)}
              >
                Show more ({Math.min(images.length, limit + maxInitial)} / {images.length})
              </button>
            </div>
          ) : null}
          {allowMultiSelect && onPickMany ? (
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
              <span>
                {selectedUrls.size > 0
                  ? `${selectedUrls.size} image${selectedUrls.size > 1 ? 's' : ''} selected`
                  : 'Click images to select multiple.'}
              </span>
              <button
                type="button"
                disabled={selectedUrls.size === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={async () => {
                  if (selectedUrls.size === 0) return
                  const chosen = images.filter((img) => selectedUrls.has(img.previewUrl))
                  try {
                    setBusyUrl('bulk')
                    const picked = await Promise.all(
                      chosen.map(async (img) => {
                        const dataUrl = await fetchAsDataUrl(img.previewUrl)
                        return { name: img.filename, dataUrl }
                      }),
                    )
                    await onPickMany(picked)
                    setSelectedUrls(new Set())
                  } finally {
                    setBusyUrl(null)
                  }
                }}
              >
                Add selected
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

