import { useDraggable } from '@dnd-kit/core'
import type { CSSProperties } from 'react'
import type { PhotoBookPhoto } from '../../types/photobook'

export function DraggablePhoto({
  photo,
  selected,
  onClick,
}: {
  photo: PhotoBookPhoto
  selected: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: photo.id,
    data: { type: 'photo' as const },
  })

  const style: CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={[
        'group relative aspect-square w-20 overflow-hidden rounded-xl border bg-white shadow-sm transition',
        selected
          ? 'border-slate-900 ring-2 ring-slate-900/20'
          : 'border-slate-200 hover:border-slate-300',
        isDragging ? 'opacity-40' : '',
      ].join(' ')}
      style={style}
      onClick={onClick}
      {...listeners}
      {...attributes}
    >
      <img
        src={photo.dataUrl}
        alt={photo.name}
        className="h-full w-full object-cover"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/40 px-2 py-1 text-left text-[10px] text-white opacity-0 transition group-hover:opacity-100">
        {photo.name}
      </div>
    </button>
  )
}

