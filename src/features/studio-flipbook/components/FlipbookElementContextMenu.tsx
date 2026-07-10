import React from 'react';
import { createPortal } from 'react-dom';
import { FaChevronRight } from 'react-icons/fa';
import type { FrameType } from '../types';
import { getFrameShapeStyle } from '../utils/frameShapeStyles';

export type FlipbookContextAction =
  | 'cut'
  | 'copy'
  | 'duplicate'
  | 'delete'
  | 'reset-crop'
  | 'swap-image'
  | 'bring-forward'
  | 'send-backward'
  | 'fit-cover'
  | 'fit-contain'
  | 'edit-text'
  | { type: 'shape'; frameType: FrameType }
  | { type: 'text-font'; fontFamily: string }
  | { type: 'text-size'; fontSizePx: number }
  | { type: 'text-color'; color: string }
  | { type: 'text-align'; align: 'left' | 'center' | 'right' }
  | { type: 'box-size'; width: number; height: number }
  | { type: 'inner-zoom'; zoom: number };

export type FlipbookLivePatch = {
  width?: number;
  height?: number;
  styleJson?: Record<string, unknown>;
};

type TextStyleSnapshot = {
  fontFamily?: string;
  fontSizePx?: number;
  color?: string;
  align?: string;
};

type BoxSizeSnapshot = {
  width: number;
  height: number;
  imageZoom?: number;
};

type Props = {
  open: boolean;
  x: number;
  y: number;
  elementType?: string;
  currentFrameType?: FrameType | string;
  currentTextStyle?: TextStyleSnapshot;
  currentBoxSize?: BoxSizeSnapshot;
  onAction: (action: FlipbookContextAction) => void;
  onLivePatch?: (patch: FlipbookLivePatch) => void;
  onClose: () => void;
};

type FlyoutId =
  | 'shapes'
  | 'fit'
  | 'box-size'
  | 'inner-size'
  | 'font-family'
  | 'font-size'
  | 'color'
  | 'align';

const VIEWPORT_PAD = 12;

const SHAPE_OPTIONS: { id: FrameType; label: string; group?: string }[] = [
  { id: 'none', label: 'Rectangle', group: 'Basic' },
  { id: 'rounded', label: 'Rounded', group: 'Basic' },
  { id: 'circle', label: 'Circle', group: 'Basic' },
  { id: 'oval', label: 'Oval', group: 'Basic' },
  { id: 'triangle', label: 'Triangle', group: 'Geometric' },
  { id: 'diamond', label: 'Diamond', group: 'Geometric' },
  { id: 'pentagon', label: 'Pentagon', group: 'Geometric' },
  { id: 'hexagon', label: 'Hexagon', group: 'Geometric' },
  { id: 'star', label: 'Star', group: 'Geometric' },
  { id: 'diagonal', label: 'Diagonal', group: 'Geometric' },
  { id: 'polaroid', label: 'Polaroid', group: 'Style' },
  { id: 'golden', label: 'Golden frame', group: 'Style' },
  { id: 'border', label: 'White border', group: 'Style' },
  { id: 'soft_shadow', label: 'Soft shadow', group: 'Style' },
  { id: 'full_bleed', label: 'Full bleed', group: 'Style' },
  { id: 'grayscale_fade', label: 'Grayscale', group: 'Style' },
];

const FONT_FAMILIES = [
  { value: '"Playfair Display", Georgia, serif', label: 'Playfair Display' },
  { value: '"Cormorant Garamond", Georgia, serif', label: 'Cormorant Garamond' },
  { value: '"Dancing Script", cursive', label: 'Dancing Script' },
  { value: '"Merriweather", Georgia, serif', label: 'Merriweather' },
  { value: '"Inter", system-ui, sans-serif', label: 'Inter' },
  { value: '"Fredoka", system-ui, sans-serif', label: 'Fredoka' },
];

const FONT_SIZES = [16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 96];

const TEXT_COLORS: { value: string; label: string }[] = [
  { value: '#ffffff', label: 'White' },
  { value: '#111827', label: 'Black' },
  { value: '#c9a227', label: 'Gold' },
  { value: '#be185d', label: 'Rose' },
  { value: '#1e3a5f', label: 'Navy' },
  { value: '#6b7280', label: 'Gray' },
  { value: '#4338ca', label: 'Indigo' },
  { value: '#059669', label: 'Emerald' },
];

const ALIGN_OPTIONS: { id: 'left' | 'center' | 'right'; label: string }[] = [
  { id: 'left', label: 'Left' },
  { id: 'center', label: 'Center' },
  { id: 'right', label: 'Right' },
];

const BOX_SIZE_PRESETS: { label: string; width: number; height: number }[] = [
  { label: 'Small', width: 15, height: 20 },
  { label: 'Medium', width: 28, height: 32 },
  { label: 'Large', width: 45, height: 50 },
  { label: 'Wide', width: 65, height: 38 },
  { label: 'Tall', width: 32, height: 60 },
  { label: 'Full width', width: 90, height: 55 },
];

const INNER_ZOOM_PRESETS = [1, 1.1, 1.25, 1.5, 1.75, 2, 2.5];

function FlyoutSliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="studio-flipbook-ctx-slider-row">
      <div className="studio-flipbook-ctx-slider-head">
        <span>{label}</span>
        <span className="studio-flipbook-ctx-slider-val">
          {step < 1 ? value.toFixed(1) : Math.round(value)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function MenuItem({
  label,
  hint,
  danger,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  danger?: boolean;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`studio-flipbook-ctx-item${danger ? ' studio-flipbook-ctx-item--danger' : ''}${selected ? ' studio-flipbook-ctx-item--selected' : ''}`}
      onClick={onClick}
    >
      <span>{label}</span>
      {hint ? <span className="studio-flipbook-ctx-hint">{hint}</span> : null}
    </button>
  );
}

function ShapePreview({ frameType }: { frameType: FrameType }) {
  const shapeStyle = getFrameShapeStyle(frameType);
  return (
    <span
      className="studio-flipbook-ctx-shape-preview"
      style={{
        ...shapeStyle,
        borderRadius: shapeStyle.borderRadius ?? 2,
        background: 'linear-gradient(135deg, #93c5fd 0%, #6366f1 100%)',
      }}
      aria-hidden
    />
  );
}

function MenuDivider() {
  return <div className="studio-flipbook-ctx-divider" role="separator" />;
}

function clampMenuPosition(
  anchorX: number,
  anchorY: number,
  menuWidth: number,
  menuHeight: number
): { left: number; top: number } {
  const maxLeft = window.innerWidth - menuWidth - VIEWPORT_PAD;
  const maxTop = window.innerHeight - menuHeight - VIEWPORT_PAD;

  let left = anchorX;
  let top = anchorY;

  if (top + menuHeight > window.innerHeight - VIEWPORT_PAD) {
    top = anchorY - menuHeight;
  }
  if (left + menuWidth > window.innerWidth - VIEWPORT_PAD) {
    left = anchorX - menuWidth;
  }

  left = Math.max(VIEWPORT_PAD, Math.min(left, maxLeft));
  top = Math.max(VIEWPORT_PAD, Math.min(top, maxTop));

  return { left, top };
}

function normalizeFrameType(value?: FrameType | string): FrameType {
  if (!value || value === 'rectangle') return 'none';
  return value as FrameType;
}

function fontFamilyLabel(value?: string): string {
  return FONT_FAMILIES.find((f) => f.value === value)?.label ?? 'Playfair Display';
}

function isInsideCtxUi(target: Node | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest('[data-ctx-ui]');
}

function SubmenuRow({
  icon,
  title,
  value,
  open,
  onOpenFlyout,
  onLabelClick,
}: {
  icon?: React.ReactNode;
  title: string;
  value?: string;
  open: boolean;
  onOpenFlyout: () => void;
  onLabelClick?: () => void;
}) {
  return (
    <div className={`studio-flipbook-ctx-submenu-row${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="studio-flipbook-ctx-submenu-label-btn"
        onClick={onLabelClick}
      >
        {icon}
        <span className="studio-flipbook-ctx-submenu-text">
          <span className="studio-flipbook-ctx-submenu-title">{title}</span>
          {value ? <span className="studio-flipbook-ctx-submenu-value">{value}</span> : null}
        </span>
      </button>
      <button
        type="button"
        className="studio-flipbook-ctx-submenu-arrow"
        aria-label={`Open ${title} options`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onOpenFlyout();
        }}
      >
        <FaChevronRight className="studio-flipbook-ctx-chevron" aria-hidden />
      </button>
    </div>
  );
}

function FlyoutPanel({
  open,
  anchorRef,
  children,
  className,
  width = 220,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
  width?: number;
}) {
  const flyoutRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ left: 0, top: 0 });

  const setRefs = React.useCallback((el: HTMLDivElement | null) => {
    (flyoutRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }, []);

  React.useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const positionFlyout = () => {
      const anchor = anchorRef.current;
      const flyout = flyoutRef.current;
      if (!anchor || !flyout) return;

      const rowRect = anchor.getBoundingClientRect();
      const fw = flyout.offsetWidth || width;
      const fh = flyout.offsetHeight;

      let left = rowRect.right + 6;
      let top = rowRect.top;

      if (left + fw > window.innerWidth - VIEWPORT_PAD) {
        left = rowRect.left - fw - 6;
      }
      if (top + fh > window.innerHeight - VIEWPORT_PAD) {
        top = Math.max(VIEWPORT_PAD, window.innerHeight - fh - VIEWPORT_PAD);
      }
      top = Math.max(VIEWPORT_PAD, top);

      setPosition({ left, top });
    };

    const frame = requestAnimationFrame(positionFlyout);
    return () => cancelAnimationFrame(frame);
  }, [open, anchorRef, width, children]);

  if (!open) return null;

  return createPortal(
    <div
      ref={setRefs}
      data-ctx-ui
      className={`studio-flipbook-ctx-flyout${className ? ` ${className}` : ''}`}
      style={{ left: position.left, top: position.top, minWidth: width }}
      role="menu"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body
  );
}

const FlipbookElementContextMenu: React.FC<Props> = ({
  open,
  x,
  y,
  elementType,
  currentFrameType,
  currentTextStyle,
  currentBoxSize,
  onAction,
  onLivePatch,
  onClose,
}) => {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const shapesRowRef = React.useRef<HTMLDivElement>(null);
  const fitRowRef = React.useRef<HTMLDivElement>(null);
  const boxSizeRowRef = React.useRef<HTMLDivElement>(null);
  const innerSizeRowRef = React.useRef<HTMLDivElement>(null);
  const fontRowRef = React.useRef<HTMLDivElement>(null);
  const sizeRowRef = React.useRef<HTMLDivElement>(null);
  const colorRowRef = React.useRef<HTMLDivElement>(null);
  const alignRowRef = React.useRef<HTMLDivElement>(null);

  const [position, setPosition] = React.useState({ left: x, top: y });
  const [openFlyout, setOpenFlyout] = React.useState<FlyoutId | null>(null);

  const isImage = elementType === 'image';
  const isText = elementType === 'text';
  const isResizable = isImage || isText;
  const activeShape = normalizeFrameType(currentFrameType);
  const boxWidth = currentBoxSize?.width ?? 25;
  const boxHeight = currentBoxSize?.height ?? 30;
  const imageZoom = currentBoxSize?.imageZoom ?? 1;

  const reposition = React.useCallback(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition(clampMenuPosition(x, y, rect.width, rect.height));
  }, [x, y]);

  React.useLayoutEffect(() => {
    if (!open) return;
    setOpenFlyout(null);
    setPosition({ left: x, top: y });
    const frame = requestAnimationFrame(reposition);
    return () => cancelAnimationFrame(frame);
  }, [open, x, y, elementType, reposition]);

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (isInsideCtxUi(target)) return;
      onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (openFlyout) {
          setOpenFlyout(null);
        } else {
          onClose();
        }
      }
    };

    const onScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (isInsideCtxUi(target)) return;
      onClose();
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [open, openFlyout, onClose]);

  if (!open) return null;

  const run = (action: FlipbookContextAction) => {
    onAction(action);
    onClose();
  };

  const toggleFlyout = (id: FlyoutId) => {
    setOpenFlyout((current) => (current === id ? null : id));
  };

  const activeShapeLabel =
    SHAPE_OPTIONS.find((s) => s.id === activeShape)?.label ?? 'Rectangle';

  const activeFontLabel = fontFamilyLabel(currentTextStyle?.fontFamily);
  const activeSizeLabel = `${currentTextStyle?.fontSizePx ?? 32}px`;
  const activeColor = (currentTextStyle?.color as string) ?? '#ffffff';
  const activeAlign =
    ALIGN_OPTIONS.find((a) => a.id === currentTextStyle?.align)?.label ?? 'Center';
  const boxSizeLabel = `${boxWidth.toFixed(0)}% × ${boxHeight.toFixed(0)}%`;
  const innerZoomLabel = `${Math.round(imageZoom * 100)}%`;

  const patchBoxSize = (width: number, height: number) => {
    onLivePatch?.({ width, height });
  };

  const patchInnerZoom = (zoom: number) => {
    onLivePatch?.({ styleJson: { imageZoom: zoom } });
  };

  const menu = (
    <>
      <div
        className="studio-flipbook-ctx-backdrop"
        aria-hidden
        onContextMenu={(e) => e.preventDefault()}
      />
      <div
        ref={menuRef}
        data-ctx-ui
        className="studio-flipbook-ctx-menu"
        role="menu"
        style={{ left: position.left, top: position.top }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <MenuItem label="Cut box" hint="Remove & copy" onClick={() => run('cut')} />
        <MenuItem label="Copy box" onClick={() => run('copy')} />
        <MenuItem label="Duplicate" onClick={() => run('duplicate')} />
        <MenuItem label="Delete box" danger onClick={() => run('delete')} />
        <MenuDivider />

        <MenuDivider />

        {isResizable && (
          <div ref={boxSizeRowRef} className="studio-flipbook-ctx-submenu">
            <SubmenuRow
              title="Box size"
              value={boxSizeLabel}
              open={openFlyout === 'box-size'}
              onOpenFlyout={() => toggleFlyout('box-size')}
            />
          </div>
        )}

        {isImage && (
          <>
            <MenuItem label="Reset image position" onClick={() => run('reset-crop')} />
            <MenuItem label="Swap image…" onClick={() => run('swap-image')} />
            <MenuDivider />

            <div ref={innerSizeRowRef} className="studio-flipbook-ctx-submenu">
              <SubmenuRow
                title="Inner image size"
                value={innerZoomLabel}
                open={openFlyout === 'inner-size'}
                onOpenFlyout={() => toggleFlyout('inner-size')}
              />
            </div>

            <div ref={shapesRowRef} className="studio-flipbook-ctx-submenu">
              <SubmenuRow
                icon={<ShapePreview frameType={activeShape} />}
                title="Shapes"
                value={activeShapeLabel}
                open={openFlyout === 'shapes'}
                onOpenFlyout={() => toggleFlyout('shapes')}
              />
            </div>

            <div ref={fitRowRef} className="studio-flipbook-ctx-submenu">
              <SubmenuRow
                title="Fit mode"
                open={openFlyout === 'fit'}
                onOpenFlyout={() => toggleFlyout('fit')}
              />
            </div>

            <MenuDivider />
          </>
        )}

        {isText && (
          <>
            <MenuItem label="Edit text…" hint="Open editor" onClick={() => run('edit-text')} />
            <MenuDivider />

            <div ref={fontRowRef} className="studio-flipbook-ctx-submenu">
              <SubmenuRow
                title="Font family"
                value={activeFontLabel}
                open={openFlyout === 'font-family'}
                onOpenFlyout={() => toggleFlyout('font-family')}
                onLabelClick={() => run('edit-text')}
              />
            </div>

            <div ref={sizeRowRef} className="studio-flipbook-ctx-submenu">
              <SubmenuRow
                title="Font size"
                value={activeSizeLabel}
                open={openFlyout === 'font-size'}
                onOpenFlyout={() => toggleFlyout('font-size')}
                onLabelClick={() => run('edit-text')}
              />
            </div>

            <div ref={colorRowRef} className="studio-flipbook-ctx-submenu">
              <SubmenuRow
                icon={
                  <span
                    className="studio-flipbook-ctx-color-swatch"
                    style={{ background: activeColor }}
                    aria-hidden
                  />
                }
                title="Text color"
                value={activeColor}
                open={openFlyout === 'color'}
                onOpenFlyout={() => toggleFlyout('color')}
                onLabelClick={() => run('edit-text')}
              />
            </div>

            <div ref={alignRowRef} className="studio-flipbook-ctx-submenu">
              <SubmenuRow
                title="Alignment"
                value={activeAlign}
                open={openFlyout === 'align'}
                onOpenFlyout={() => toggleFlyout('align')}
                onLabelClick={() => run('edit-text')}
              />
            </div>

            <MenuDivider />
          </>
        )}

        <MenuItem label="Bring forward" onClick={() => run('bring-forward')} />
        <MenuItem label="Send backward" onClick={() => run('send-backward')} />
      </div>

      <FlyoutPanel
        open={openFlyout === 'box-size'}
        anchorRef={boxSizeRowRef}
        width={240}
        className="studio-flipbook-ctx-flyout--controls"
      >
        <div className="studio-flipbook-ctx-group-label">Quick sizes</div>
        {BOX_SIZE_PRESETS.map((preset) => {
          const selected =
            Math.abs(boxWidth - preset.width) < 1 && Math.abs(boxHeight - preset.height) < 1;
          return (
            <button
              key={preset.label}
              type="button"
              className={`studio-flipbook-ctx-shape-item${selected ? ' is-selected' : ''}`}
              onClick={() => run({ type: 'box-size', width: preset.width, height: preset.height })}
            >
              <span>{preset.label}</span>
              <span className="studio-flipbook-ctx-hint">
                {preset.width}% × {preset.height}%
              </span>
              {selected ? (
                <span className="studio-flipbook-ctx-check" aria-hidden>
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
        <div className="studio-flipbook-ctx-group-label">Custom</div>
        <FlyoutSliderRow
          label="Width"
          value={boxWidth}
          min={5}
          max={100}
          step={0.5}
          suffix="%"
          onChange={(width) => patchBoxSize(width, boxHeight)}
        />
        <FlyoutSliderRow
          label="Height"
          value={boxHeight}
          min={5}
          max={100}
          step={0.5}
          suffix="%"
          onChange={(height) => patchBoxSize(boxWidth, height)}
        />
      </FlyoutPanel>

      <FlyoutPanel
        open={openFlyout === 'inner-size'}
        anchorRef={innerSizeRowRef}
        width={220}
        className="studio-flipbook-ctx-flyout--controls"
      >
        <div className="studio-flipbook-ctx-group-label">Zoom presets</div>
        {INNER_ZOOM_PRESETS.map((zoom) => {
          const selected = Math.abs(imageZoom - zoom) < 0.02;
          return (
            <button
              key={zoom}
              type="button"
              className={`studio-flipbook-ctx-shape-item${selected ? ' is-selected' : ''}`}
              onClick={() => run({ type: 'inner-zoom', zoom })}
            >
              <span>{Math.round(zoom * 100)}%</span>
              {selected ? (
                <span className="studio-flipbook-ctx-check" aria-hidden>
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
        <div className="studio-flipbook-ctx-group-label">Custom zoom</div>
        <FlyoutSliderRow
          label="Image zoom"
          value={imageZoom * 100}
          min={100}
          max={250}
          step={5}
          suffix="%"
          onChange={(pct) => patchInnerZoom(pct / 100)}
        />
        <MenuItem
          label="Reset inner size"
          hint="100%"
          onClick={() => run({ type: 'inner-zoom', zoom: 1 })}
        />
      </FlyoutPanel>

      <FlyoutPanel
        open={openFlyout === 'shapes'}
        anchorRef={shapesRowRef}
        width={240}
        className="studio-flipbook-ctx-flyout--shapes"
      >
        {SHAPE_OPTIONS.map((shape, index) => {
          const showGroup =
            shape.group &&
            (index === 0 || SHAPE_OPTIONS[index - 1]?.group !== shape.group);
          return (
            <React.Fragment key={shape.id}>
              {showGroup ? (
                <div className="studio-flipbook-ctx-group-label">{shape.group}</div>
              ) : null}
              <button
                type="button"
                className={`studio-flipbook-ctx-shape-item${activeShape === shape.id ? ' is-selected' : ''}`}
                onClick={() => run({ type: 'shape', frameType: shape.id })}
              >
                <ShapePreview frameType={shape.id} />
                <span>{shape.label}</span>
                {activeShape === shape.id ? (
                  <span className="studio-flipbook-ctx-check" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </button>
            </React.Fragment>
          );
        })}
      </FlyoutPanel>

      <FlyoutPanel
        open={openFlyout === 'fit'}
        anchorRef={fitRowRef}
        width={200}
      >
        <MenuItem label="Cover" hint="Fill frame" onClick={() => run('fit-cover')} />
        <MenuItem label="Contain" hint="Full image" onClick={() => run('fit-contain')} />
      </FlyoutPanel>

      <FlyoutPanel
        open={openFlyout === 'font-family'}
        anchorRef={fontRowRef}
        width={220}
      >
        {FONT_FAMILIES.map((font) => (
          <button
            key={font.value}
            type="button"
            className={`studio-flipbook-ctx-shape-item${
              currentTextStyle?.fontFamily === font.value ? ' is-selected' : ''
            }`}
            style={{ fontFamily: font.value }}
            onClick={() => run({ type: 'text-font', fontFamily: font.value })}
          >
            <span>{font.label}</span>
            {currentTextStyle?.fontFamily === font.value ? (
              <span className="studio-flipbook-ctx-check" aria-hidden>
                ✓
              </span>
            ) : null}
          </button>
        ))}
      </FlyoutPanel>

      <FlyoutPanel
        open={openFlyout === 'font-size'}
        anchorRef={sizeRowRef}
        width={180}
      >
        {FONT_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            className={`studio-flipbook-ctx-shape-item${
              (currentTextStyle?.fontSizePx ?? 32) === size ? ' is-selected' : ''
            }`}
            onClick={() => run({ type: 'text-size', fontSizePx: size })}
          >
            <span>{size}px</span>
            {(currentTextStyle?.fontSizePx ?? 32) === size ? (
              <span className="studio-flipbook-ctx-check" aria-hidden>
                ✓
              </span>
            ) : null}
          </button>
        ))}
      </FlyoutPanel>

      <FlyoutPanel
        open={openFlyout === 'color'}
        anchorRef={colorRowRef}
        width={200}
      >
        {TEXT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`studio-flipbook-ctx-shape-item${
              activeColor.toLowerCase() === c.value.toLowerCase() ? ' is-selected' : ''
            }`}
            onClick={() => run({ type: 'text-color', color: c.value })}
          >
            <span
              className="studio-flipbook-ctx-color-swatch"
              style={{ background: c.value }}
              aria-hidden
            />
            <span>{c.label}</span>
            {activeColor.toLowerCase() === c.value.toLowerCase() ? (
              <span className="studio-flipbook-ctx-check" aria-hidden>
                ✓
              </span>
            ) : null}
          </button>
        ))}
      </FlyoutPanel>

      <FlyoutPanel
        open={openFlyout === 'align'}
        anchorRef={alignRowRef}
        width={180}
      >
        {ALIGN_OPTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`studio-flipbook-ctx-shape-item${
              (currentTextStyle?.align ?? 'center') === a.id ? ' is-selected' : ''
            }`}
            onClick={() => run({ type: 'text-align', align: a.id })}
          >
            <span>{a.label}</span>
            {(currentTextStyle?.align ?? 'center') === a.id ? (
              <span className="studio-flipbook-ctx-check" aria-hidden>
                ✓
              </span>
            ) : null}
          </button>
        ))}
      </FlyoutPanel>
    </>
  );

  return createPortal(menu, document.body);
};

export default FlipbookElementContextMenu;

/** @deprecated use { type: 'shape', frameType } action */
export function frameActionToType(action: FlipbookContextAction): FrameType | null {
  if (typeof action === 'object' && action.type === 'shape') return action.frameType;
  return null;
}
