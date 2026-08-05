import React from 'react';
import { CropImageDisplay, DraggableCropImage } from '../../../components/photo-studio/CropImageDisplay';
import { getTheme } from '../themes';
import type { FitMode, GeneratedPage, GeneratedPageElement, ThemeId } from '../types';
import { DESIGN_CANVAS } from '../constants/canvas';
import {
  combinedFrameStyle,
  frameLocksAspectRatio,
  getFrameMediaInset,
} from '../utils/frameShapeStyles';

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
  onElementContextMenu?: (index: number, event: React.MouseEvent) => void;
  displayWidth?: number;
  fillParent?: boolean;
};

function resolveFitMode(fit?: string): FitMode {
  if (fit === 'contain' || fit === 'fill') return fit;
  return 'cover';
}

function resolveImageFrameBackground(
  frameType: string | undefined,
  frameStyle: React.CSSProperties,
  hasUrl: boolean,
): string {
  if (frameType === 'polaroid') {
    return (frameStyle.background as string) || '#ffffff';
  }
  if (hasUrl) return 'transparent';
  return '#f3f4f6';
}

/** Shared chrome + media slot — identical on canvas, thumbs, and flipbook preview. */
function ImageFrameChrome({
  frameType,
  frameStyle,
  background,
  boxShadow,
  topOffset = 0,
  children,
}: {
  frameType?: string;
  frameStyle: React.CSSProperties;
  background: string;
  boxShadow?: string;
  topOffset?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        top: topOffset || 0,
        zIndex: 2,
        overflow: 'hidden',
        ...frameStyle,
        // Absolute media inset replaces any leftover padding
        padding: 0,
        boxShadow,
        background,
      }}
    >
      <div style={getFrameMediaInset(frameType)}>
        {children}
      </div>
    </div>
  );
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
  const radius = (el.styleJson?.borderRadius as number) ?? 0;
  const shadow = (el.styleJson?.shadow as string) ?? '';
  const fit = resolveFitMode(el.fitMode);
  const frameStyle = combinedFrameStyle(el.frameType, accent, el.maskType, radius);

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
    const url = el.albumImageId != null
      ? imageUrlById[Number(el.albumImageId)] || imageUrlById[el.albumImageId]
      : undefined;
    return (
      <div style={{ ...base, overflow: 'visible' }}>
        <ImageFrameChrome
          frameType={el.frameType}
          frameStyle={frameStyle}
          background={resolveImageFrameBackground(el.frameType, frameStyle, !!url)}
          boxShadow={shadow || (frameStyle.boxShadow as string) || undefined}
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
              color: '#9ca3af', fontSize: 13, border: '2px dashed #d1d5db', boxSizing: 'border-box',
            }}>
              + Image
            </div>
          )}
        </ImageFrameChrome>
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

type DragMode = 'none' | 'frame' | 'resize' | 'rotate' | 'inner-zoom';

const EDGE_SIZE = 16;

function InteractiveElement({
  el, idx, imageUrlById, accent, overlay, selected, getPageRect,
  onSelect, onCommit, onTextDoubleClick, onElementContextMenu,
}: {
  el: CanvasElement;
  idx: number;
  imageUrlById: Record<number, string>;
  accent: string;
  overlay?: string;
  selected: boolean;
  getPageRect: () => DOMRect | null;
  onSelect: (i: number) => void;
  onCommit: (i: number, patch: Partial<GeneratedPageElement>) => void;
  onTextDoubleClick?: (i: number) => void;
  onElementContextMenu?: (i: number, event: React.MouseEvent) => void;
}) {
  const [dragMode, setDragMode] = React.useState<DragMode>('none');
  const [spaceHeld, setSpaceHeld] = React.useState(false);
  const elRef = React.useRef(el);
  elRef.current = el;
  const dragModeRef = React.useRef<DragMode>('none');
  const dragStart = React.useRef<{
    mx: number; my: number;
    ex: number; ey: number;
    ew: number; eh: number;
    er: number;
    ezoom: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const isImage = el.elementType === 'image';

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const endDrag = React.useCallback(() => {
    dragModeRef.current = 'none';
    setDragMode('none');
    dragStart.current = null;
  }, []);

  const roundPct = (n: number) => Math.round(n * 100) / 100;

  React.useEffect(() => {
    if (dragMode === 'none') return;

    const onMove = (e: PointerEvent) => {
      const start = dragStart.current;
      const mode = dragModeRef.current;
      const cur = elRef.current;
      if (!start || mode === 'none') return;

      const rect = getPageRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;

      const dx = ((e.clientX - start.mx) / rect.width) * 100;
      const dy = ((e.clientY - start.my) / rect.height) * 100;

      if (mode === 'frame') {
        onCommit(idx, {
          x: roundPct(Math.max(0, Math.min(100 - cur.width, start.ex + dx))),
          y: roundPct(Math.max(0, Math.min(100 - cur.height, start.ey + dy))),
        });
        return;
      }

      if (mode === 'resize') {
        const lock = frameLocksAspectRatio(cur.frameType);
        if (lock) {
          const delta = Math.max(dx, dy);
          const nextW = Math.max(5, Math.min(100 - cur.x, start.ew + delta));
          const nextH = cur.frameType === 'oval' ? nextW * 0.72 : nextW;
          onCommit(idx, {
            width: roundPct(nextW),
            height: roundPct(Math.min(100 - cur.y, Math.max(5, nextH))),
          });
        } else {
          onCommit(idx, {
            width: roundPct(Math.max(5, Math.min(100 - cur.x, start.ew + dx))),
            height: roundPct(Math.max(5, Math.min(100 - cur.y, start.eh + dy))),
          });
        }
        return;
      }

      if (mode === 'rotate') {
        const angle = (Math.atan2(e.clientY - start.centerY, e.clientX - start.centerX) * 180) / Math.PI + 90;
        onCommit(idx, { rotation: Math.round(angle) });
        return;
      }

      if (mode === 'inner-zoom') {
        const pixelDy = e.clientY - start.my;
        const nextZoom = Math.max(1, Math.min(2.5, start.ezoom - pixelDy * 0.005));
        onCommit(idx, {
          styleJson: {
            ...cur.styleJson,
            imageZoom: Math.round(nextZoom * 100) / 100,
          },
        });
      }
    };

    const onUp = () => endDrag();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragMode, endDrag, getPageRect, idx, onCommit]);

  const startDrag = (e: React.PointerEvent, mode: DragMode) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(idx);

    const cur = elRef.current;
    const rect = getPageRect();
    const centerX = rect
      ? rect.left + rect.width * ((cur.x + cur.width / 2) / 100)
      : e.clientX;
    const centerY = rect
      ? rect.top + rect.height * ((cur.y + cur.height / 2) / 100)
      : e.clientY;

    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      ex: cur.x,
      ey: cur.y,
      ew: cur.width,
      eh: cur.height,
      er: cur.rotation ?? 0,
      ezoom: (cur.styleJson?.imageZoom as number) ?? 1,
      centerX,
      centerY,
    };
    dragModeRef.current = mode;
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
    boxShadow: selected ? `0 0 0 2px ${accent}` : undefined,
    cursor:
      dragMode === 'frame'
        ? 'grabbing'
        : spaceHeld && isImage
          ? 'grab'
          : isImage
            ? 'default'
            : 'grab',
    userSelect: 'none',
    pointerEvents: el.elementType === 'decorative' ? 'none' : 'auto',
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    transformOrigin: 'center center',
    transition: dragMode === 'none' ? 'box-shadow 0.15s ease' : undefined,
    willChange: dragMode !== 'none' ? 'transform' : undefined,
  };

  const imageUrl = isImage && el.albumImageId != null
    ? imageUrlById[Number(el.albumImageId)] || imageUrlById[el.albumImageId]
    : undefined;
  const radius = (el.styleJson?.borderRadius as number) ?? 0;
  const shadow = (el.styleJson?.shadow as string) ?? '';
  const fit = resolveFitMode(el.fitMode);
  const frameStyle = combinedFrameStyle(el.frameType, accent, el.maskType, radius);
  const moveMode = spaceHeld;

  const edgeMoveProps = (mode: DragMode = 'frame') => ({
    onPointerDown: (e: React.PointerEvent) => startDrag(e, mode),
    style: { pointerEvents: 'auto' as const, touchAction: 'none' as const },
  });

  const handleContextMenu = (e: React.MouseEvent) => {
    if (el.elementType === 'decorative') return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(idx);
    onElementContextMenu?.(idx, e);
  };

  return (
    <div
      className={isImage ? 'group/crop studio-flipbook-interactive-el' : 'studio-flipbook-interactive-el'}
      style={shell}
      onDoubleClick={() => el.elementType === 'text' && onTextDoubleClick?.(idx)}
      onPointerDown={() => onSelect(idx)}
      onContextMenu={handleContextMenu}
    >
      {isImage ? (
        <>
          {selected && (
            <div
              className="studio-flipbook-frame-move-handle"
              {...edgeMoveProps('frame')}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 28,
                background: `linear-gradient(135deg, ${accent}, #6366f1)`,
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                cursor: dragMode === 'frame' ? 'grabbing' : 'grab',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto',
                touchAction: 'none',
                gap: 8,
              }}
            >
              <span>↔ Drag to move</span>
              <span style={{ opacity: 0.75, fontWeight: 500 }}>· Space+drag · edges · corner resize</span>
            </div>
          )}

          <ImageFrameChrome
            frameType={el.frameType}
            frameStyle={frameStyle}
            background={resolveImageFrameBackground(el.frameType, frameStyle, !!imageUrl)}
            boxShadow={shadow || (frameStyle.boxShadow as string) || undefined}
            topOffset={selected ? 28 : 0}
          >
            {imageUrl ? (
              moveMode ? (
                <div
                  style={{ position: 'absolute', inset: 0, cursor: dragMode === 'frame' ? 'grabbing' : 'grab' }}
                  {...edgeMoveProps('frame')}
                />
              ) : (
                <DraggableCropImage
                  src={imageUrl}
                  cropX={el.cropX ?? 50}
                  cropY={el.cropY ?? 50}
                  zoom={(el.styleJson?.imageZoom as number) ?? 1}
                  fit={fit}
                  onCropChange={(x, y) => onCommit(idx, { cropX: x, cropY: y })}
                />
              )
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#9ca3af', fontSize: 13, border: '2px dashed #d1d5db', boxSizing: 'border-box',
              }}>
                + Image
              </div>
            )}
          </ImageFrameChrome>

          {selected && !moveMode && (
              <>
                <div
                  className="studio-flipbook-edge-zone studio-flipbook-edge-zone--top"
                  style={{ position: 'absolute', top: selected ? 28 : 0, left: 0, right: 0, height: EDGE_SIZE, zIndex: 12, cursor: 'grab' }}
                  {...edgeMoveProps('frame')}
                />
                <div
                  className="studio-flipbook-edge-zone studio-flipbook-edge-zone--bottom"
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: EDGE_SIZE, zIndex: 12, cursor: 'grab' }}
                  {...edgeMoveProps('frame')}
                />
                <div
                  className="studio-flipbook-edge-zone studio-flipbook-edge-zone--left"
                  style={{ position: 'absolute', top: selected ? 28 : 0, bottom: 0, left: 0, width: EDGE_SIZE, zIndex: 12, cursor: 'grab' }}
                  {...edgeMoveProps('frame')}
                />
                <div
                  className="studio-flipbook-edge-zone studio-flipbook-edge-zone--right"
                  style={{ position: 'absolute', top: selected ? 28 : 0, bottom: 0, right: 0, width: EDGE_SIZE, zIndex: 12, cursor: 'grab' }}
                  {...edgeMoveProps('frame')}
                />
                <div
                  className="studio-flipbook-inner-zoom-handle"
                  title="Drag to resize image inside frame"
                  onPointerDown={(e) => startDrag(e, 'inner-zoom')}
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    right: 10,
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.95)',
                    border: `2px solid ${accent}`,
                    color: accent,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: dragMode === 'inner-zoom' ? 'grabbing' : 'ns-resize',
                    zIndex: 14,
                    pointerEvents: 'auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                    touchAction: 'none',
                  }}
                >
                  ⤢
                </div>
              </>
            )}
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
        <>
          <div
            onPointerDown={(e) => startDrag(e, 'resize')}
            title="Resize box"
            className="studio-flipbook-box-resize-handle"
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: accent,
              border: '2px solid #fff',
              cursor: 'nwse-resize',
              zIndex: 22,
              pointerEvents: 'auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          />
          <div
            onPointerDown={(e) => startDrag(e, 'rotate')}
            title="Rotate"
            style={{
              position: 'absolute',
              top: selected && isImage ? 22 : -10,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#fff',
              border: `2px solid ${accent}`,
              cursor: 'grab',
              zIndex: 22,
              pointerEvents: 'auto',
            }}
          />
        </>
      )}
    </div>
  );
}

const StudioFlipbookPageCanvas: React.FC<Props> = ({
  page, imageUrlById, themeId, className = '',
  interactive = false, selectedIndex, onSelect, onElementChange,
  onTextDoubleClick, onElementContextMenu, displayWidth, fillParent = false,
}) => {
  const outerRef = React.useRef<HTMLDivElement>(null);
  const pageRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState({
    w: displayWidth ?? DESIGN_CANVAS.width,
    h: (displayWidth ?? DESIGN_CANVAS.width) * (DESIGN_CANVAS.height / DESIGN_CANVAS.width),
  });

  const getPageRect = React.useCallback(() => pageRef.current?.getBoundingClientRect() ?? null, []);

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
          ref={pageRef}
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
                getPageRect={getPageRect}
                onSelect={onSelect}
                onCommit={onElementChange}
                onTextDoubleClick={onTextDoubleClick}
                onElementContextMenu={onElementContextMenu}
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
