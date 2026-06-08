import React from 'react';

/** Same crop / zoom rendering as photo-theme `DraggableCropImage`. */
export function cropImageDisplayStyle(
  cropX: number,
  cropY: number,
  zoom = 1,
  fit: 'cover' | 'contain' | 'fill' = 'cover',
): React.CSSProperties {
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: fit,
    objectPosition: `${cropX}% ${cropY}%`,
  };
  if (zoom !== 1) {
    style.transform = `scale(${zoom})`;
    style.transformOrigin = 'center center';
  }
  return style;
}

type CropImageDisplayProps = {
  src: string;
  alt?: string;
  cropX?: number;
  cropY?: number;
  zoom?: number;
  fit?: 'cover' | 'contain' | 'fill';
  className?: string;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
};

/** Static image — builder preview, PDF, non-interactive canvas. */
export function CropImageDisplay({
  src,
  alt = '',
  cropX = 50,
  cropY = 50,
  zoom = 1,
  fit = 'cover',
  className = '',
  crossOrigin = 'anonymous',
}: CropImageDisplayProps) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      crossOrigin={crossOrigin || undefined}
      className={className}
      style={cropImageDisplayStyle(cropX, cropY, zoom, fit)}
    />
  );
}

type DraggableCropImageProps = CropImageDisplayProps & {
  onCropChange?: (cropX: number, cropY: number) => void;
};

/** Interactive crop pan — same drag math as photo-theme album builder. */
export function DraggableCropImage({
  src,
  alt = '',
  cropX = 50,
  cropY = 50,
  zoom = 1,
  fit = 'cover',
  className = '',
  crossOrigin = 'anonymous',
  onCropChange,
}: DraggableCropImageProps) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [liveCrop, setLiveCrop] = React.useState({ x: cropX, y: cropY });
  const liveCropRef = React.useRef(liveCrop);
  const dragRef = React.useRef<{ startX: number; startY: number; startCrop: { x: number; y: number } } | null>(null);

  React.useEffect(() => {
    const next = { x: cropX, y: cropY };
    setLiveCrop(next);
    liveCropRef.current = next;
  }, [cropX, cropY]);

  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    if (!onCropChange) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startCrop: { ...liveCrop } };
    setDragging(true);
  }, [liveCrop, onCropChange]);

  const onPointerMove = React.useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * -100;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * -100;
    const nx = Math.max(0, Math.min(100, dragRef.current.startCrop.x + dx));
    const ny = Math.max(0, Math.min(100, dragRef.current.startCrop.y + dy));
    const next = { x: nx, y: ny };
    setLiveCrop(next);
    liveCropRef.current = next;
  }, []);

  const endDrag = React.useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    onCropChange?.(liveCropRef.current.x, liveCropRef.current.y);
  }, [onCropChange]);

  return (
    <div
      ref={frameRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        crossOrigin={crossOrigin || undefined}
        className="absolute inset-0 h-full w-full select-none"
        style={{
          ...cropImageDisplayStyle(liveCrop.x, liveCrop.y, zoom, fit),
          cursor: onCropChange ? (dragging ? 'grabbing' : 'grab') : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      {onCropChange && !dragging && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-1 opacity-0 transition-opacity group-hover/crop:opacity-100">
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
            Drag to reposition
          </span>
        </div>
      )}
    </div>
  );
}
