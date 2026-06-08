import React from 'react';
import { getTheme } from '../themes';
import type { GeneratedPage, GeneratedPageElement, ThemeId } from '../types';
import { DESIGN_CANVAS } from '../constants/canvas';

/* ─── public props ─── */
export type CanvasElement = GeneratedPageElement & { _idx: number };

type Props = {
  page: GeneratedPage;
  imageUrlById: Record<number, string>;
  themeId?: ThemeId;
  className?: string;
  /** When true the user can select / drag / resize elements */
  interactive?: boolean;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  /** Called after drag or resize finishes */
  onElementChange: (index: number, patch: Partial<GeneratedPageElement>) => void;
  /** Double-click on a text element */
  onTextDoubleClick?: (index: number) => void;
};

/* ─── helpers ─── */
function frameBorderStyle(frameType?: string, accent?: string): React.CSSProperties {
  switch (frameType) {
    case 'golden':   return { border: `2px solid ${accent ?? '#c9a227'}` };
    case 'border':   return { border: '1px solid rgba(255,255,255,0.85)' };
    case 'circle':   return { borderRadius: '50%', overflow: 'hidden' };
    case 'rounded':  return { borderRadius: 16, overflow: 'hidden' };
    case 'grayscale_fade': return { filter: 'grayscale(1)' };
    default:         return {};
  }
}

/* ─── single element renderer (interactive) ─── */
function InteractiveElement({
  el,
  idx,
  imageUrlById,
  accent,
  overlay,
  selected,
  onSelect,
  onCommit,
  onTextDoubleClick,
}: {
  el: CanvasElement;
  idx: number;
  imageUrlById: Record<number, string>;
  accent: string;
  overlay?: string;
  selected: boolean;
  onSelect: (i: number) => void;
  onCommit: (i: number, patch: Partial<GeneratedPageElement>) => void;
  onTextDoubleClick?: (i: number) => void;
}) {
  const [dragging, setDragging] = React.useState(false);
  const [resizing, setResizing] = React.useState(false);
  const dragStart = React.useRef<{ mx: number; my: number; ex: number; ey: number } | null>(null);
  const resizeStart = React.useRef<{ mx: number; my: number; ew: number; eh: number } | null>(null);

  /* pointer-down on the element body → start drag */
  const handlePointerDown = (e: React.PointerEvent) => {
    if (el.elementType === 'decorative') return;
    e.stopPropagation();
    onSelect(idx);
    if (el.elementType === 'text') return; // text is edited via double-click, not dragged
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { mx: e.clientX, my: e.clientY, ex: el.x, ey: el.y };
    setDragging(true);
  };

  /* pointer-down on resize handle */
  const handleResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    resizeStart.current = { mx: e.clientX, my: e.clientY, ew: el.width, eh: el.height };
    setResizing(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging && dragStart.current) {
      const dx = ((e.clientX - dragStart.current.mx) / DESIGN_CANVAS.width) * 100;
      const dy = ((e.clientY - dragStart.current.my) / DESIGN_CANVAS.height) * 100;
      onCommit(idx, {
        x: Math.max(0, Math.min(100 - el.width, dragStart.current.ex + dx)),
        y: Math.max(0, Math.min(100 - el.height, dragStart.current.ey + dy)),
      });
    }
    if (resizing && resizeStart.current) {
      const dx = ((e.clientX - resizeStart.current.mx) / DESIGN_CANVAS.width) * 100;
      const dy = ((e.clientY - resizeStart.current.my) / DESIGN_CANVAS.height) * 100;
      onCommit(idx, {
        width: Math.max(3, Math.min(100 - el.x, resizeStart.current.ew + dx)),
        height: Math.max(3, Math.min(100 - el.y, resizeStart.current.eh + dy)),
      });
    }
  };

  const handlePointerUp = () => {
    setDragging(false);
    setResizing(false);
    dragStart.current = null;
    resizeStart.current = null;
  };

  const base: React.CSSProperties = {
    position: 'absolute',
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.width}%`,
    height: `${el.height}%`,
    zIndex: el.zIndex,
    opacity: el.opacity ?? 1,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    outline: selected ? `2px solid ${accent}` : undefined,
    outlineOffset: 2,
    cursor: dragging ? 'grabbing' : resizing ? 'nwse-resize' : el.elementType === 'text' ? 'text' : 'grab',
    userSelect: 'none',
  };

  /* ── image element ── */
  if (el.elementType === 'image' && el.albumImageId) {
    const url = imageUrlById[el.albumImageId];
    const radius = (el.styleJson?.borderRadius as number) ?? 0;
    const shadow = (el.styleJson?.shadow as string) ?? '';
    return (
      <div
        key={idx}
        style={{
          ...base,
          borderRadius: el.frameType === 'circle' ? '50%' : radius ? `${radius}px` : 0,
          overflow: 'hidden',
          ...frameBorderStyle(el.frameType, accent),
          boxShadow: shadow || undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {url ? (
          <img
            src={url}
            alt=""
            loading="lazy"
            draggable={false}
            style={{
              width: '100%', height: '100%',
              objectFit: el.fitMode ?? 'cover',
              objectPosition: `${el.cropX ?? 50}% ${el.cropY ?? 50}%`,
              display: 'block',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#e5e7eb' }} />
        )}
        {selected && (
          <div
            onPointerDown={handleResizeDown}
            style={{
              position: 'absolute',
              bottom: -6, right: -6,
              width: 14, height: 14,
              borderRadius: '50%',
              background: accent,
              border: '2px solid #fff',
              cursor: 'nwse-resize',
              zIndex: 9999,
            }}
          />
        )}
      </div>
    );
  }

  /* ── text element ── */
  if (el.elementType === 'text') {
    const s = el.styleJson ?? {};
    return (
      <div
        key={idx}
        style={{
          ...base,
          fontSize: `clamp(${(s.fontSizePx as number) * 0.4}px, ${((s.fontSizePx as number) / DESIGN_CANVAS.width) * 100}vw, ${s.fontSizePx}px)`,
          fontWeight: (s.fontWeight as number) ?? 400,
          color: (s.color as string) ?? '#fff',
          textAlign: (s.align as React.CSSProperties['textAlign']) ?? 'left',
          letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
          lineHeight: (s.lineHeight as number) ?? 1.4,
          textShadow: (s.shadow as string) ?? (overlay ? '0 2px 8px rgba(0,0,0,0.5)' : undefined),
          display: 'flex',
          alignItems: 'center',
          justifyContent: s.align === 'center' ? 'center' : s.align === 'right' ? 'flex-end' : 'flex-start',
          overflow: 'hidden',
          wordBreak: 'break-word',
          userSelect: 'text',
          cursor: 'text',
        }}
        onPointerDown={(e) => { e.stopPropagation(); onSelect(idx); }}
        onDoubleClick={() => onTextDoubleClick?.(idx)}
      >
        {el.content}
        {selected && (
          <div
            onPointerDown={handleResizeDown}
            style={{
              position: 'absolute',
              bottom: -6, right: -6,
              width: 14, height: 14,
              borderRadius: '50%',
              background: accent,
              border: '2px solid #fff',
              cursor: 'nwse-resize',
              zIndex: 9999,
            }}
          />
        )}
      </div>
    );
  }

  /* ── decorative ── */
  if (el.elementType === 'decorative') {
    return renderDecorative(el, accent, idx);
  }

  return null;
}

/* ─── decorative renderer ─── */
function renderDecorative(el: CanvasElement, accent: string, key: number) {
  const kind = (el.styleJson?.kind as string) ?? '';
  const s: React.CSSProperties = {
    position: 'absolute', left: `${el.x}%`, top: `${el.y}%`,
    width: `${el.width}%`, height: `${el.height}%`,
    zIndex: el.zIndex, pointerEvents: 'none',
  };
  if (kind === 'divider')       return <div key={key} style={{ ...s, background: accent, opacity: 0.6 }} />;
  if (kind === 'border')        return <div key={key} style={{ ...s, border: `1px solid ${accent}`, borderRadius: 4, opacity: 0.5 }} />;
  if (kind === 'corner_floral') return <div key={key} style={{ ...s, color: accent, fontSize: 'clamp(12px,2vw,24px)' }}>✦</div>;
  if (kind === 'heart')         return <div key={key} style={{ ...s, color: '#be185d', fontSize: 'clamp(16px,3vw,32px)' }}>♥</div>;
  if (kind === 'confetti')      return <div key={key} style={{ ...s, opacity: 0.35, fontSize: 10 }}>✨ 🎉 ✨</div>;
  return null;
}

/* ─── main canvas ─── */
const StudioFlipbookPageCanvas: React.FC<Props> = ({
  page, imageUrlById, themeId, className = '',
  interactive = false, selectedIndex, onSelect, onElementChange,
  onTextDoubleClick,
}) => {
  const theme = getTheme(themeId ?? page.themeVariant ?? 'wedding_modern');
  const overlay = (page.settingsJson?.overlayGradient as string) ?? undefined;

  const bgStyle: React.CSSProperties = {
    background: page.backgroundType === 'gradient' || page.backgroundType === 'image'
      ? page.backgroundValue || theme.backgroundColor
      : theme.backgroundColor,
    position: 'relative',
    width: '100%',
    aspectRatio: `${DESIGN_CANVAS.width} / ${DESIGN_CANVAS.height}`,
    overflow: 'hidden',
  };

  const sorted = [...page.elements]
    .map((el, _idx) => ({ ...el, _idx }))
    .sort((a, b) => a.zIndex - b.zIndex);

  /* click on empty canvas → deselect */
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onSelect(null);
  };

  return (
    <div
      className={`studio-flipbook-page ${className}`}
      style={bgStyle}
      onClick={interactive ? handleCanvasClick : undefined}
    >
      {overlay && (
        <div style={{ position: 'absolute', inset: 0, background: overlay, zIndex: 1, pointerEvents: 'none' }} />
      )}
      {sorted.map((el) => {
        if (!interactive) {
          /* non-interactive fallback — simple render */
          return (
            <div key={el._idx} style={{
              position: 'absolute', left: `${el.x}%`, top: `${el.y}%`,
              width: `${el.width}%`, height: `${el.height}%`,
              zIndex: el.zIndex, opacity: el.opacity ?? 1,
            }}>
              {el.elementType === 'image' && el.albumImageId && imageUrlById[el.albumImageId] && (
                <img src={imageUrlById[el.albumImageId]} alt="" loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: el.fitMode ?? 'cover', display: 'block' }} />
              )}
              {el.elementType === 'text' && (
                <div style={{ color: (el.styleJson?.color as string) ?? '#fff', fontSize: (el.styleJson?.fontSizePx as number) ?? 24 }}>
                  {el.content}
                </div>
              )}
            </div>
          );
        }
        return (
          <InteractiveElement
            key={el._idx}
            el={el}
            idx={el._idx}
            imageUrlById={imageUrlById}
            accent={theme.accentColor}
            overlay={overlay}
            selected={selectedIndex === el._idx}
            onSelect={onSelect}
            onCommit={onElementChange}
            onTextDoubleClick={onTextDoubleClick}
          />
        );
      })}
    </div>
  );
};

export default StudioFlipbookPageCanvas;
