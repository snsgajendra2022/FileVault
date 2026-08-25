import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

type Point = { x: number; y: number };

type Rect = { left: number; top: number; width: number; height: number };

const DRAG_THRESHOLD_PX = 4;

function rectsIntersect(a: DOMRect | Rect, b: DOMRect | Rect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('button, a, input, select, textarea, label, [data-no-marquee]'));
}

function idAtPoint(root: HTMLElement, itemSelector: string, x: number, y: number): string | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (!(el instanceof Element)) continue;
    if (!root.contains(el)) continue;
    const item = el.closest(itemSelector);
    if (item instanceof HTMLElement && root.contains(item)) {
      return item.dataset.selectId || null;
    }
  }
  return null;
}

export interface UseMarqueeSelectOptions {
  containerRef: RefObject<HTMLElement | null>;
  itemSelector?: string;
  enabled?: boolean;
  /** Current selection — snapshotted on pointer down when Shift/Ctrl/Meta (add mode) */
  selectedIds?: ReadonlySet<string>;
  /** Full selection to apply while dragging / on release */
  onSelectionChange: (ids: string[]) => void;
}

export interface UseMarqueeSelectResult {
  isSelecting: boolean;
  marqueeStyle: CSSProperties | null;
  surfaceProps: {
    onPointerDown: (e: ReactPointerEvent) => void;
    onDragStart: (e: ReactDragEvent) => void;
  };
}

/**
 * Hold-and-drag multi-select (paint + rubber-band).
 * Works from empty space or any photo — not native image/file copy drag.
 */
export function useMarqueeSelect({
  containerRef,
  itemSelector = '[data-select-id]',
  enabled = true,
  selectedIds,
  onSelectionChange,
}: UseMarqueeSelectOptions): UseMarqueeSelectResult {
  const [isSelecting, setIsSelecting] = useState(false);
  const [marqueeStyle, setMarqueeStyle] = useState<CSSProperties | null>(null);

  const originRef = useRef<Point | null>(null);
  const activeRef = useRef(false);
  const additiveRef = useRef(false);
  const baselineRef = useRef<Set<string>>(new Set());
  const hitRef = useRef<Set<string>>(new Set());
  const pointerIdRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const pendingPointRef = useRef<Point | null>(null);
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const suppressClicksBriefly = useCallback(() => {
    const suppress = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('click', suppress, true);
    window.setTimeout(() => {
      document.removeEventListener('click', suppress, true);
    }, 50);
  }, []);

  const collectRectIds = useCallback(
    (clientRect: Rect): string[] => {
      const root = containerRef.current;
      if (!root) return [];
      const ids: string[] = [];
      root.querySelectorAll(itemSelector).forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const id = node.dataset.selectId;
        if (!id) return;
        if (rectsIntersect(clientRect, node.getBoundingClientRect())) ids.push(id);
      });
      return ids;
    },
    [containerRef, itemSelector]
  );

  const publishSelection = useCallback(() => {
    const next = new Set(baselineRef.current);
    hitRef.current.forEach((id) => next.add(id));
    onSelectionChangeRef.current(Array.from(next));
  }, []);

  const paintSegment = useCallback(
    (from: Point, to: Point) => {
      const root = containerRef.current;
      if (!root) return;
      const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 8));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t;
        const id = idAtPoint(root, itemSelector, x, y);
        if (id) hitRef.current.add(id);
      }
    },
    [containerRef, itemSelector]
  );

  const applyFrame = useCallback(
    (clientX: number, clientY: number) => {
      const origin = originRef.current;
      const root = containerRef.current;
      if (!origin || !root) return;

      const dx = clientX - origin.x;
      const dy = clientY - origin.y;

      if (!activeRef.current) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        activeRef.current = true;
        setIsSelecting(true);
        if (!additiveRef.current) {
          baselineRef.current = new Set();
        }
        const startId = idAtPoint(root, itemSelector, origin.x, origin.y);
        if (startId) hitRef.current.add(startId);
      }

      const prev = lastPointRef.current || origin;
      const nextPt = { x: clientX, y: clientY };
      paintSegment(prev, nextPt);
      lastPointRef.current = nextPt;

      const left = Math.min(origin.x, clientX);
      const top = Math.min(origin.y, clientY);
      const width = Math.abs(dx);
      const height = Math.abs(dy);

      for (const id of collectRectIds({ left, top, width, height })) {
        hitRef.current.add(id);
      }

      setMarqueeStyle({
        position: 'fixed',
        left,
        top,
        width,
        height,
        pointerEvents: 'none',
        zIndex: 9999,
        border: '2px solid #630ed4',
        background: 'rgba(99, 14, 212, 0.14)',
        borderRadius: 6,
        boxSizing: 'border-box',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.35)',
      });

      publishSelection();
    },
    [collectRectIds, containerRef, itemSelector, paintSegment, publishSelection]
  );

  const queueFrame = useCallback(
    (clientX: number, clientY: number) => {
      pendingPointRef.current = { x: clientX, y: clientY };
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const p = pendingPointRef.current;
        if (p) applyFrame(p.x, p.y);
      });
    },
    [applyFrame]
  );

  const endGesture = useCallback(
    (pointerId: number) => {
      if (pointerIdRef.current !== pointerId) return;
      const wasActive = activeRef.current;

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const p = pendingPointRef.current;
      if (p && activeRef.current) applyFrame(p.x, p.y);

      activeRef.current = false;
      originRef.current = null;
      pointerIdRef.current = null;
      lastPointRef.current = null;
      pendingPointRef.current = null;
      hitRef.current = new Set();
      setIsSelecting(false);
      setMarqueeStyle(null);

      const root = containerRef.current;
      if (root) {
        try {
          root.releasePointerCapture(pointerId);
        } catch {
          /* ignore */
        }
      }

      if (wasActive) suppressClicksBriefly();
    },
    [applyFrame, containerRef, suppressClicksBriefly]
  );

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId || !originRef.current) return;
      if (e.cancelable) e.preventDefault();
      queueFrame(e.clientX, e.clientY);
    };

    const onUp = (e: PointerEvent) => endGesture(e.pointerId);
    const onCancel = (e: PointerEvent) => endGesture(e.pointerId);
    const blockDrag = (e: DragEvent) => {
      if (!originRef.current && !activeRef.current) return;
      e.preventDefault();
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('dragstart', blockDrag, true);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('dragstart', blockDrag, true);
    };
  }, [enabled, endGesture, queueFrame]);

  useEffect(() => {
    if (!isSelecting) return;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const cursorPrev = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';
    return () => {
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = cursorPrev;
    };
  }, [isSelecting]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!enabled || e.button !== 0) return;
      if (isInteractiveTarget(e.target)) return;

      // Touch: start after a short hold so scroll still works
      const startGesture = (pointerId: number, clientX: number, clientY: number, additive: boolean) => {
        additiveRef.current = additive;
        baselineRef.current = additive
          ? new Set(selectedIdsRef.current ? Array.from(selectedIdsRef.current) : [])
          : new Set();
        hitRef.current = new Set();
        originRef.current = { x: clientX, y: clientY };
        lastPointRef.current = { x: clientX, y: clientY };
        activeRef.current = false;
        pointerIdRef.current = pointerId;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(pointerId);
        } catch {
          /* ignore */
        }
      };

      if (e.pointerType === 'touch') {
        const pointerId = e.pointerId;
        const x = e.clientX;
        const y = e.clientY;
        const additive = e.shiftKey || e.metaKey || e.ctrlKey;
        const timer = window.setTimeout(() => {
          // Still holding ≈ select mode
          if (pointerIdRef.current != null) return;
          startGesture(pointerId, x, y, additive);
          // Force-active so first move paints immediately
          activeRef.current = true;
          setIsSelecting(true);
          if (!additive) baselineRef.current = new Set();
          const root = containerRef.current;
          if (root) {
            const startId = idAtPoint(root, itemSelector, x, y);
            if (startId) {
              hitRef.current.add(startId);
              publishSelection();
            }
          }
        }, 280);

        const clearTimer = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          window.clearTimeout(timer);
          window.removeEventListener('pointerup', clearTimer);
          window.removeEventListener('pointercancel', clearTimer);
          window.removeEventListener('pointermove', onTouchMoveCancel);
        };
        const onTouchMoveCancel = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          // Moved before hold completed → treat as scroll, cancel pending select
          if (pointerIdRef.current === pointerId) return;
          if (Math.hypot(ev.clientX - x, ev.clientY - y) > 10) {
            clearTimer(ev);
          }
        };
        window.addEventListener('pointerup', clearTimer);
        window.addEventListener('pointercancel', clearTimer);
        window.addEventListener('pointermove', onTouchMoveCancel);
        return;
      }

      // Mouse / pen: prevent browser image ghost-copy drag
      e.preventDefault();
      startGesture(
        e.pointerId,
        e.clientX,
        e.clientY,
        e.shiftKey || e.metaKey || e.ctrlKey
      );
    },
    [containerRef, enabled, itemSelector, publishSelection]
  );

  const onDragStart = useCallback((e: ReactDragEvent) => {
    e.preventDefault();
  }, []);

  return {
    isSelecting,
    marqueeStyle,
    surfaceProps: { onPointerDown, onDragStart },
  };
}
