import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaComments, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { openclawEnabled } from '../../config/openclaw';
import { isPortalAssistantEnabled, subscribePortalSettings } from '../../utils/portalSettings';
import OpenClawAssistantPanel from './OpenClawAssistantPanel';

const FAB_SIZE = 56;
const FAB_PAD = 8;
const DRAG_THRESHOLD_PX = 8;
const STORAGE_KEY = 'openclaw_fab_pos';

function normalizePath(pathname: string): string {
  const base = (pathname.split('?')[0] || '/').replace(/\/+$/, '');
  return base === '' ? '/' : base;
}

function shouldHideDock(pathname: string): boolean {
  const p = normalizePath(pathname);

  if (p === '/login' || p === '/register' || p === '/forgot-password' || p === '/reset-password') return true;
  if (p === '/view') return true;
  if (p === '/privacy-policy' || p === '/our-memories-privacy-policy') return true;
  if (p === '/accept-invitation') return true;
  if (p === '/memories' || p.startsWith('/memories/e/')) return true;
  if (p.startsWith('/public/')) return true;
  if (p.startsWith('/client/')) return true;
  if (p === '/studio' || p.startsWith('/studio/auth')) return true;
  if (p === '/studio/openclaw') return true;

  return false;
}

function clampFab(left: number, top: number): { left: number; top: number } {
  if (typeof window === 'undefined') return { left, top };
  const maxL = window.innerWidth - FAB_SIZE - FAB_PAD;
  const maxT = window.innerHeight - FAB_SIZE - FAB_PAD;
  return {
    left: Math.min(Math.max(FAB_PAD, left), maxL),
    top: Math.min(Math.max(FAB_PAD, top), maxT),
  };
}

function defaultFabPosition(): { left: number; top: number } {
  const margin = typeof window !== 'undefined' && window.innerWidth >= 768 ? 32 : 20;
  return clampFab(
    window.innerWidth - FAB_SIZE - margin,
    window.innerHeight - FAB_SIZE - margin
  );
}

function loadSavedFabPosition(): { left: number; top: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { left?: unknown; top?: unknown };
    if (typeof p.left === 'number' && typeof p.top === 'number') {
      return clampFab(p.left, p.top);
    }
  } catch {
    /* ignore */
  }
  return null;
}

type DragRef = {
  pointerId: number;
  startX: number;
  startY: number;
  originL: number;
  originT: number;
  moved: boolean;
};

/**
 * Floating agent + right slide-over panel (chat + voice). FAB is draggable; position saved in localStorage.
 */
const OpenClawAgentDock: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { pathname } = useLocation();
  const { t } = useTranslation(undefined, { keyPrefix: 'openclawPage' });
  const [open, setOpen] = React.useState(false);
  const [fabPos, setFabPos] = React.useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragRef = React.useRef<DragRef | null>(null);
  const suppressClickRef = React.useRef(false);

  React.useLayoutEffect(() => {
    const saved = loadSavedFabPosition();
    setFabPos(saved ?? defaultFabPosition());
  }, []);

  React.useEffect(() => {
    const onResize = () => {
      setFabPos((prev) => (prev ? clampFab(prev.left, prev.top) : defaultFabPosition()));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const onFabPointerDown = React.useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const originL = fabPos?.left ?? rect.left;
    const originT = fabPos?.top ?? rect.top;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originL,
      originT,
      moved: false,
    };
    setIsDragging(false);
  }, [fabPos]);

  const onFabPointerMove = React.useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      d.moved = true;
      setIsDragging(true);
    }
    if (!d.moved) return;
    setFabPos(clampFab(d.originL + dx, d.originT + dy));
  }, []);

  const onFabPointerUp = React.useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setIsDragging(false);

    suppressClickRef.current = true;
    if (d?.moved) {
      setFabPos((cur) => {
        if (cur) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
          } catch {
            /* ignore */
          }
        }
        return cur;
      });
    } else {
      setOpen((v) => !v);
    }
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }, []);

  const onFabPointerCancel = React.useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = null;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onFabClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const [assistantOn, setAssistantOn] = React.useState(() => openclawEnabled && isPortalAssistantEnabled());
  React.useEffect(() => subscribePortalSettings(() => setAssistantOn(openclawEnabled && isPortalAssistantEnabled())), []);

  if (!assistantOn || isLoading || !isAuthenticated || shouldHideDock(pathname) || fabPos === null) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={onFabPointerDown}
        onPointerMove={onFabPointerMove}
        onPointerUp={onFabPointerUp}
        onPointerCancel={onFabPointerCancel}
        onClick={onFabClick}
        style={{
          position: 'fixed',
          left: fabPos.left,
          top: fabPos.top,
          width: FAB_SIZE,
          height: FAB_SIZE,
          zIndex: 120,
          touchAction: 'none',
        }}
        className={`flex items-center justify-center rounded-full shadow-lg shadow-violet-900/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 select-none ${
          isDragging ? 'cursor-grabbing scale-100' : 'cursor-grab hover:scale-105 active:scale-95'
        } ${open ? 'ring-2 ring-violet-400 ring-offset-2 scale-95 hidden'  : ''} ${
          !isDragging ? 'transition-[transform,box-shadow] duration-200 ease-out' : ''
        }`}
        title={open ? t('fabCloseTitle') : `${t('fabTitle')} — ${t('fabDragHint')}`}
        aria-label={open ? t('fabCloseAria') : t('fabAria')}
        aria-expanded={open}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 opacity-90" />
        <span className="pointer-events-none absolute inset-[3px] rounded-full bg-[#0c0c0f]" />
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
          <FaComments className="h-4 w-4" aria-hidden />
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-[1px]"
            aria-label={t('drawerClose')}
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed overflow-scroll top-0 right-0 z-[115] flex h-full w-[min(100vw,400px)] flex-col border-l border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="openclaw-drawer-title"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-violet-50/40 px-4 py-3">
              <div id="openclaw-drawer-title" className="flex min-w-0 items-center gap-2 text-slate-900">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md">
                  <FaComments className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold leading-tight">{t('title')}</p>
                  <p className="truncate text-[11px] text-slate-500">{t('drawerSubtitle')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                aria-label={t('drawerClose')}
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </header>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
              <OpenClawAssistantPanel layout="drawer" />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};

export default OpenClawAgentDock;
