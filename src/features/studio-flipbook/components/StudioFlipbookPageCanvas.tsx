import React from 'react';
import { CropImageDisplay, DraggableCropImage } from '../../../components/photo-studio/CropImageDisplay';
import { getTheme } from '../themes';
import type { FitMode, GeneratedPage, GeneratedPageElement, ThemeId } from '../types';
import { DESIGN_CANVAS } from '../constants/canvas';

export type CanvasElement = GeneratedPageElement & { _idx: number };

type Props = {
  page: GeneratedPage;
  imageUrlById: Record<number, string>;
  themeId?: ThemeId;
  className?: string;
  interactive?: boolean;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onElementChange: (index: number, patch: Partial<GeneratedPageElement>) => void;
  onTextDoubleClick?: (index: number) => void;
  displayWidth?: number;
  /** Fill parent box — measures container and scales canvas (flipbook pages) */
  fillParent?: boolean;
  builderZoom?: number;
};

function frameBorderStyle(frameType?: string, accent?: string): React.CSSProperties {
  switch (frameType) {
    case 'golden': return { border: `2px solid ${accent ?? '#c9a227'}` };
    case 'border': return { border: '1px solid rgba(255,255,255,0.85)' };
    case 'circle': return { borderRadius: '50%', overflow: 'hidden' };
    case 'rounded': return { borderRadius: 16, overflow: 'hidden' };
    case 'grayscale_fade': return { filter: 'grayscale(1)' };
    default: return {};
  }
}

function resolveFitMode(fit?: string): FitMode {
  if (fit === 'contain' || fit === 'fill') return fit;
  return 'cover';
}

function PageElementView({
  el, imageUrlById, accent, overlay, fillParent = false,
}: {
  el: CanvasElement;
  imageUrlById: Record<number, string>;
  accent: string;
  overlay?: string;
  fillParent?: boolean;
}) {
  const base: React.CSSProperties = fillParent
    ? {
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        zIndex: el.zIndex, opacity: el.opacity ?? 1,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        pointerEvents: 'none',
      }
    : {
        position: 'absolute',
        left: `${el.x}%`, top: `${el.y}%`,
        width: `${el.width}%`, height: `${el.height}%`,
        zIndex: el.zIndex, opacity: el.opacity ?? 1,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        pointerEvents: 'none',
      };

  if (el.elementType === 'image') {
    const url = el.albumImageId ? imageUrlById[el.albumImageId] : undefined;
    const radius = (el.styleJson?.borderRadius as number) ?? 0;
    const shadow = (el.styleJson?.shadow as string) ?? '';
    const fit = resolveFitMode(el.fitMode);
    return (
      <div
        style={{
          ...base,
          borderRadius: el.frameType === 'circle' ? '50%' : radius ? `${radius}px` : 0,
          overflow: 'hidden',
          ...frameBorderStyle(el.frameType, accent),
          boxShadow: shadow || undefined,
          background: url ? '#111827' : '#f3f4f6',
        }}
      >
        {url ? (
          <CropImageDisplay
            src={url}
            cropX={el.cropX ?? 50}
            cropY={el.cropY ?? 50}
            zoom={(el.styleJson?.imageZoom as number) ?? 1}
            fit={fit}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9ca3af', fontSize: 13, border: '2px dashed #d1d5db',
          }}>
            + Image
          </div>
        )}
      </div>
    );
  }

  if (el.elementType === 'text') {
    const s = el.styleJson ?? {};
    return (
      <div
        style={{
          ...base,
          fontFamily: (s.fontFamily as string) ?? 'inherit',
          fontSize: `${(s.fontSizePx as number) ?? 32}px`,
          fontWeight: (s.fontWeight as number) ?? 400,
          color: (s.color as string) ?? '#ffffff',
          textAlign: (s.align as React.CSSProperties['textAlign']) ?? 'left',
          letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
          lineHeight: (s.lineHeight as number) ?? 1.4,
          textShadow: (s.shadow as string) ?? (overlay ? '0 2px 8px rgba(0,0,0,0.5)' : undefined),
          display: 'flex',
          alignItems: 'center',
          justifyContent: s.align === 'center' ? 'center' : s.align === 'right' ? 'flex-end' : 'flex-start',
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}
      >
        {el.content}
      </div>
    );
  }

  if (el.elementType === 'decorative') {
    const kind = (el.styleJson?.kind as string) ?? '';
    const s: React.CSSProperties = { ...base };
    if (kind === 'divider') return <div style={{ ...s, background: accent, opacity: 0.6 }} />;
    if (kind === 'border') return <div style={{ ...s, border: `1px solid ${accent}`, borderRadius: 4, opacity: 0.5 }} />;
    if (kind === 'corner_floral') return <div style={{ ...s, color: accent, fontSize: 24 }}>✦</div>;
    if (kind === 'heart') return <div style={{ ...s, color: '#be185d', fontSize: 32 }}>♥</div>;
    if (kind === 'confetti') return <div style={{ ...s, opacity: 0.35, fontSize: 10 }}>✨ 🎉 ✨</div>;
  }

  return null;
}

type DragMode = 'none' | 'frame' | 'resize';

function InteractiveElement({
  el, idx, imageUrlById, accent, overlay, selected, scale, builderZoom,
  onSelect, onCommit, onTextDoubleClick,
}: {
  el: CanvasElement;
  idx: number;
  imageUrlById: Record<number, string>;
  accent: string;
  overlay?: string;
  selected: boolean;
  scale: number;
  builderZoom: number;
  onSelect: (i: number) => void;
  onCommit: (i: number, patch: Partial<GeneratedPageElement>) => void;
  onTextDoubleClick?: (i: number) => void;
}) {
  const [dragMode, setDragMode] = React.useState<DragMode>('none');
  const dragStart = React.useRef<{
    mx: number; my: number;
    ex: number; ey: number;
    ew: number; eh: number;
  } | null>(null);

  const isImage = el.elementType === 'image';
  const effectiveScale = scale * builderZoom;
  const canvasW = DESIGN_CANVAS.width * effectiveScale;
  const canvasH = DESIGN_CANVAS.height * effectiveScale;

  const endDrag = React.useCallback(() => {
    setDragMode('none');
    dragStart.current = null;
  }, []);

  const handlePointerMove = React.useCallback((e: PointerEvent) => {
    const start = dragStart.current;
    if (!start || dragMode === 'none') return;

    if (dragMode === 'frame') {
      const dx = ((e.clientX - start.mx) / canvasW) * 100;
      const dy = ((e.clientY - start.my) / canvasH) * 100;
      onCommit(idx, {
        x: Math.max(0, Math.min(100 - el.width, start.ex + dx)),
        y: Math.max(0, Math.min(100 - el.height, start.ey + dy)),
      });
    }

    if (dragMode === 'resize') {
      const dx = ((e.clientX - start.mx) / canvasW) * 100;
      const dy = ((e.clientY - start.my) / canvasH) * 100;
      onCommit(idx, {
        width: Math.max(3, Math.min(100 - el.x, start.ew + dx)),
        height: Math.max(3, Math.min(100 - el.y, start.eh + dy)),
      });
    }
  }, [canvasH, canvasW, dragMode, el.height, el.width, el.x, el.y, idx, onCommit]);

  React.useEffect(() => {
    if (dragMode === 'none') return;
    const onUp = () => endDrag();
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragMode, endDrag, handlePointerMove]);

  const startDrag = (e: React.PointerEvent, mode: DragMode) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(idx);
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      ex: el.x,
      ey: el.y,
      ew: el.width,
      eh: el.height,
    };
    setDragMode(mode);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleTextPointerDown = (e: React.PointerEvent) => {
    if (el.elementType !== 'text') return;
    startDrag(e, 'frame');
  };

  const shell: React.CSSProperties = {
    position: 'absolute',
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.width}%`,
    height: `${el.height}%`,
    zIndex: el.zIndex,
    outline: selected ? `2px solid ${accent}` : undefined,
    outlineOffset: 2,
    cursor: dragMode === 'frame' ? 'grabbing' : isImage ? 'default' : 'grab',
    userSelect: 'none',
    pointerEvents: el.elementType === 'decorative' ? 'none' : 'auto',
  };

  const imageUrl = isImage && el.albumImageId ? imageUrlById[el.albumImageId] : undefined;
  const radius = (el.styleJson?.borderRadius as number) ?? 0;
  const shadow = (el.styleJson?.shadow as string) ?? '';
  const fit = resolveFitMode(el.fitMode);

  return (
    <div
      className={isImage ? 'group/crop' : undefined}
      style={shell}
      onDoubleClick={() => el.elementType === 'text' && onTextDoubleClick?.(idx)}
    >
      {isImage ? (
        <>
          {selected && (
            <div
              className="studio-flipbook-frame-move-handle"
              onPointerDown={(e) => startDrag(e, 'frame')}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 26,
                background: accent,
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                cursor: dragMode === 'frame' ? 'grabbing' : 'grab',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto',
                opacity: 0.92,
              }}
            >
              ↔ Drag to move frame
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              top: selected ? 26 : 0,
              zIndex: 2,
              borderRadius: el.frameType === 'circle' ? '50%' : radius ? `${radius}px` : 0,
              overflow: 'hidden',
              ...frameBorderStyle(el.frameType, accent),
              boxShadow: shadow || undefined,
              background: imageUrl ? '#111827' : '#f3f4f6',
            }}
            onPointerDown={() => onSelect(idx)}
          >
            {imageUrl ? (
              <DraggableCropImage
                src={imageUrl}
                cropX={el.cropX ?? 50}
                cropY={el.cropY ?? 50}
                zoom={(el.styleJson?.imageZoom as number) ?? 1}
                fit={fit}
                onCropChange={(x, y) => onCommit(idx, { cropX: x, cropY: y })}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#9ca3af', fontSize: 13, border: '2px dashed #d1d5db',
              }}>
                + Image
              </div>
            )}
          </div>
        </>
      ) : el.elementType === 'text' ? (
        <div
          onPointerDown={handleTextPointerDown}
          style={{ position: 'absolute', inset: 0, cursor: dragMode === 'frame' ? 'grabbing' : 'grab' }}
        >
          <PageElementView el={el} imageUrlById={imageUrlById} accent={accent} overlay={overlay} fillParent />
        </div>
      ) : (
        <PageElementView el={el} imageUrlById={imageUrlById} accent={accent} overlay={overlay} fillParent />
      )}

      {selected && el.elementType !== 'decorative' && (
        <div
          onPointerDown={(e) => startDrag(e, 'resize')}
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: accent,
            border: '2px solid #fff',
            cursor: 'nwse-resize',
            zIndex: 12,
            pointerEvents: 'auto',
          }}
        />
      )}
    </div>
  );
}

const StudioFlipbookPageCanvas: React.FC<Props> = ({
  page, imageUrlById, themeId, className = '',
  interactive = false, selectedIndex, onSelect, onElementChange,
  onTextDoubleClick, displayWidth, fillParent = false, builderZoom = 1,
}) => {
  const outerRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState({
    w: displayWidth ?? DESIGN_CANVAS.width,
    h: (displayWidth ?? DESIGN_CANVAS.width) * (DESIGN_CANVAS.height / DESIGN_CANVAS.width),
  });

  React.useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const update = (w: number, h: number) => {
      if (w > 0 && h > 0) setBox({ w, h });
    };

    if (fillParent) {
      const ro = new ResizeObserver((entries) => {
        const { width, height } = entries[0]?.contentRect ?? { width: 0, height: 0 };
        update(width, height);
      });
      ro.observe(el);
      return () => ro.disconnect();
    }

    if (displayWidth) {
      update(displayWidth, displayWidth * (DESIGN_CANVAS.height / DESIGN_CANVAS.width));
      return;
    }

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) update(w, w * (DESIGN_CANVAS.height / DESIGN_CANVAS.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [displayWidth, fillParent]);

  const theme = getTheme(themeId ?? page.themeVariant ?? 'wedding_modern');
  const overlay = (page.settingsJson?.overlayGradient as string) ?? undefined;

  const scale = fillParent
    ? Math.min(box.w / DESIGN_CANVAS.width, box.h / DESIGN_CANVAS.height)
    : box.w / DESIGN_CANVAS.width;
  const renderW = DESIGN_CANVAS.width * scale;
  const renderH = DESIGN_CANVAS.height * scale;

  const bgStyle: React.CSSProperties = {
    background: page.backgroundValue || theme.backgroundColor,
    position: 'relative',
    width: DESIGN_CANVAS.width,
    height: DESIGN_CANVAS.height,
    overflow: 'hidden',
    flexShrink: 0,
  };

  const sorted = [...page.elements]
    .map((el, _idx) => ({ ...el, _idx }))
    .sort((a, b) => a.zIndex - b.zIndex);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onSelect(null);
  };

  return (
    <div
      ref={outerRef}
      className={`studio-flipbook-page-outer ${fillParent ? 'studio-flipbook-page-outer--fill' : ''} ${className}`}
      style={{
        width: fillParent || !displayWidth ? '100%' : box.w,
        height: fillParent ? '100%' : renderH,
        overflow: 'hidden',
        position: 'relative',
        display: fillParent ? 'flex' : undefined,
        alignItems: fillParent ? 'center' : undefined,
        justifyContent: fillParent ? 'center' : undefined,
      }}
    >
      <div
        className="studio-flipbook-page-scaler"
        style={{
          width: renderW,
          height: renderH,
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
      <div
        className="studio-flipbook-page"
        style={{
          ...bgStyle,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        onClick={interactive ? handleCanvasClick : undefined}
      >
        {overlay && (
          <div style={{ position: 'absolute', inset: 0, background: overlay, zIndex: 1, pointerEvents: 'none' }} />
        )}
        {sorted.map((el) =>
          interactive ? (
            <InteractiveElement
              key={el._idx}
              el={el}
              idx={el._idx}
              imageUrlById={imageUrlById}
              accent={theme.accentColor}
              overlay={overlay}
              selected={selectedIndex === el._idx}
              scale={scale}
              builderZoom={builderZoom}
              onSelect={onSelect}
              onCommit={onElementChange}
              onTextDoubleClick={onTextDoubleClick}
            />
          ) : (
            <PageElementView
              key={el._idx}
              el={el}
              imageUrlById={imageUrlById}
              accent={theme.accentColor}
              overlay={overlay}
            />
          )
        )}
      </div>
      </div>
    </div>
  );
};

export default StudioFlipbookPageCanvas;
