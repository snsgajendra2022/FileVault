import type { PhotoBookDecoration, PhotoBookDecorationIcon } from '../../types/photobook'

function Icon({
  name,
  className,
}: {
  name: PhotoBookDecorationIcon
  className?: string
}) {
  switch (name) {
    case 'confetti':
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <path
            d="M10 44c10-8 18-18 22-30 5 12 11 20 22 30-13 2-23 2-44 0Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M16 50c6-4 10-10 12-16 3 6 6 10 12 16-8 2-14 2-24 0Z"
            fill="currentColor"
            opacity="0.55"
          />
          <circle cx="14" cy="22" r="3" fill="currentColor" opacity="0.75" />
          <circle cx="52" cy="24" r="2.5" fill="currentColor" opacity="0.65" />
        </svg>
      )
    case 'balloon':
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <path
            d="M32 8c10 0 18 8 18 18 0 9-6 18-12 22H26c-6-4-12-13-12-22 0-10 8-18 18-18Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M32 48c-2 0-4 2-4 4 0 3 2 4 4 4s4-1 4-4c0-2-2-4-4-4Z"
            fill="currentColor"
            opacity="0.6"
          />
          <path
            d="M32 56c-4 2-6 4-6 6"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.65"
          />
          <path
            d="M24 62c3-2 7-2 10 0"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.55"
          />
        </svg>
      )
    case 'cake':
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <path
            d="M30 10c0-3 2-6 2-6s2 3 2 6-2 6-2 6-2-3-2-6Z"
            fill="currentColor"
            opacity="0.8"
          />
          <path
            d="M20 26c0-7 6-12 12-12s12 5 12 12v6H20v-6Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M16 32h32v18c0 4-3 8-8 8H24c-5 0-8-4-8-8V32Z"
            fill="currentColor"
            opacity="0.7"
          />
          <path
            d="M18 40c4 2 8 2 14 0 6 2 10 2 14 0"
            stroke="white"
            strokeWidth="3"
            opacity="0.55"
          />
        </svg>
      )
    case 'sparkle':
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none">
          <path
            d="M32 8l4 16 16 4-16 4-4 16-4-16-16-4 16-4 4-16Z"
            fill="currentColor"
            opacity="0.85"
          />
          <path
            d="M50 38l2 8 8 2-8 2-2 8-2-8-8-2 8-2 2-8Z"
            fill="currentColor"
            opacity="0.6"
          />
        </svg>
      )
  }
}

export function Decorations({ decorations }: { decorations?: PhotoBookDecoration[] }) {
  if (!decorations?.length) return null

  return (
    <div className="pointer-events-none absolute inset-0">
      {decorations.map((d) => (
        <div
          key={d.id}
          className="absolute"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: `${d.w}%`,
            height: `${d.h}%`,
            transform: `translate(-50%, -50%) rotate(${d.rotate ?? 0}deg)`,
            opacity: d.opacity ?? 0.7,
            color: d.color ?? '#a855f7', // default: purple
            filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.12))',
          }}
        >
          <Icon name={d.icon} className="h-full w-full" />
        </div>
      ))}
    </div>
  )
}

