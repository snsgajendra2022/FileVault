import React from 'react';
import { createPortal } from 'react-dom';
import HTMLFlipBook from 'react-pageflip';
import {
  FaTimes, FaChevronLeft, FaChevronRight, FaDownload, FaBook,
} from 'react-icons/fa';
import StudioFlipbookPageCanvas from './StudioFlipbookPageCanvas';
import type { GeneratedPage, ThemeId } from '../types';
import { computeFlipbookPageSize } from '../constants/canvas';

type Props = {
  pages: GeneratedPage[];
  imageUrlById: Record<number, string>;
  themeId: ThemeId;
  albumTitle?: string;
  onClose: () => void;
  onDownloadPdf: () => void;
};

type ViewMode = 'flipbook' | 'page';
type BookOrientation = 'landscape' | 'portrait';

type FlipBookHandle = {
  pageFlip: () => {
    flipPrev: (corner?: string) => void;
    flipNext: (corner?: string) => void;
    flip: (page: number, corner?: string) => void;
  };
};

const FlipBookPage = React.forwardRef<HTMLDivElement, {
  children: React.ReactNode;
}>(function FlipBookPage({ children }, ref) {
  return (
    <div ref={ref} className="studio-flipbook-flip-page">
      <div className="studio-flipbook-flip-page-inner">
        {children}
      </div>
    </div>
  );
});

function pageFrameStyle(
  orientation: BookOrientation,
  bookW: number,
  bookH: number,
): React.CSSProperties {
  return {
    width: bookW,
    height: bookH,
    maxWidth: 'calc(100vw - 96px)',
    maxHeight: 'calc(100vh - 130px)',
  };
}

const StudioFlipbookPreview: React.FC<Props> = ({
  pages, imageUrlById, themeId, albumTitle, onClose, onDownloadPdf,
}) => {
  const bookRef = React.useRef<FlipBookHandle | null>(null);

  const [viewMode, setViewMode] = React.useState<ViewMode>('flipbook');
  const [orientation, setOrientation] = React.useState<BookOrientation>('landscape');
  const [currentPage, setCurrentPage] = React.useState(0);
  const [bookSize, setBookSize] = React.useState(() =>
    computeFlipbookPageSize('landscape'),
  );

  /** Force HTMLFlipBook remount when box geometry changes (library caches page DOM). */
  const pagesLayoutKey = React.useMemo(
    () => pages.map((p) =>
      `${p.pageNumber}:${p.elements.map((e) =>
        [e.x, e.y, e.width, e.height, e.rotation ?? 0, e.cropX ?? 50, e.cropY ?? 50, e.styleJson?.imageZoom ?? 1, e.albumImageId ?? ''].join(',')
      ).join('|')}`
    ).join('/'),
    [pages],
  );

  React.useEffect(() => {
    const update = () => setBookSize(computeFlipbookPageSize(orientation));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [orientation]);

  const flipPrev = React.useCallback(() => {
    if (viewMode === 'flipbook') {
      bookRef.current?.pageFlip().flipPrev();
    } else {
      setCurrentPage((p) => Math.max(0, p - 1));
    }
  }, [viewMode]);

  const flipNext = React.useCallback(() => {
    if (viewMode === 'flipbook') {
      bookRef.current?.pageFlip().flipNext();
    } else {
      setCurrentPage((p) => Math.min(pages.length - 1, p + 1));
    }
  }, [viewMode, pages.length]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') flipPrev();
      if (e.key === 'ArrowRight') flipNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, flipPrev, flipNext]);

  const activePage = pages[currentPage];
  const frameStyle = pageFrameStyle(orientation, bookSize.width, bookSize.height);

  return createPortal(
    <div className="studio-flipbook-preview-overlay studio-flipbook-preview-photo-theme">
      <div className="studio-flipbook-preview-topbar">
        <div className="studio-flipbook-preview-brand">
          <div className="studio-flipbook-preview-brand-icon">
            <FaBook />
          </div>
          <div>
            <span className="studio-flipbook-preview-brand-title">Flipbook</span>
            {albumTitle && (
              <span className="studio-flipbook-preview-brand-sub">{albumTitle}</span>
            )}
          </div>
        </div>

        <div className="studio-flipbook-preview-topbar-actions">
          <div className="studio-flipbook-preview-view-toggle">
            <button
              type="button"
              className={viewMode === 'flipbook' ? 'active' : ''}
              onClick={() => setViewMode('flipbook')}
            >
              Flip Book
            </button>
            <button
              type="button"
              className={viewMode === 'page' ? 'active' : ''}
              onClick={() => setViewMode('page')}
            >
              Page View
            </button>
          </div>

          <div className="studio-flipbook-preview-orientation-toggle">
            <button
              type="button"
              className={orientation === 'landscape' ? 'active' : ''}
              onClick={() => setOrientation('landscape')}
            >
              Landscape
            </button>
            <button
              type="button"
              className={orientation === 'portrait' ? 'active' : ''}
              onClick={() => setOrientation('portrait')}
            >
              Portrait
            </button>
          </div>

          <button type="button" className="studio-flipbook-preview-dl-btn" onClick={onDownloadPdf}>
            <FaDownload /> PDF
          </button>
          <button type="button" className="studio-flipbook-preview-close-btn" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>
      </div>

      <div className="studio-flipbook-preview-stage-photo">
        <div className="studio-flipbook-preview-spotlight" aria-hidden />

        <button
          type="button"
          className="studio-flipbook-preview-nav-photo prev"
          onClick={flipPrev}
          disabled={currentPage === 0}
        >
          <FaChevronLeft />
        </button>

        {viewMode === 'flipbook' ? (
          <div
            className="studio-flipbook-preview-book-wrap-photo"
            style={{ width: bookSize.width, height: bookSize.height }}
          >
            <HTMLFlipBook
              key={`${orientation}-${bookSize.width}-${bookSize.height}-${pagesLayoutKey}`}
              ref={bookRef}
              width={bookSize.width}
              height={bookSize.height}
              size="fixed"
              minWidth={bookSize.width}
              maxWidth={bookSize.width}
              minHeight={bookSize.height}
              maxHeight={bookSize.height}
              maxShadowOpacity={0.7}
              showCover={true}
              mobileScrollSupport={true}
              drawShadow={true}
              flippingTime={700}
              onFlip={(e) => setCurrentPage(e.data)}
              className="studio-flipbook-book-photo"
              style={{ width: '100%', height: '100%' }}
              startPage={0}
              usePortrait={orientation === 'portrait'}
              startZIndex={0}
              autoSize={false}
              showPageCorners={true}
              disableFlipByClick={false}
              clickEventForward={true}
              useMouseEvents={true}
              swipeDistance={50}
            >
              {pages.map((page) => (
                <FlipBookPage key={page.pageNumber}>
                  <StudioFlipbookPageCanvas
                    page={page}
                    imageUrlById={imageUrlById}
                    themeId={themeId}
                    fillParent
                    selectedIndex={null}
                    onSelect={() => {}}
                    onElementChange={() => {}}
                  />
                </FlipBookPage>
              ))}
            </HTMLFlipBook>
          </div>
        ) : (
          <div
            className="studio-flipbook-page-preview-frame"
            style={frameStyle}
            key={`${currentPage}-${orientation}-${pagesLayoutKey}`}
          >
            {activePage && (
              <StudioFlipbookPageCanvas
                page={activePage}
                imageUrlById={imageUrlById}
                themeId={themeId}
                fillParent
                selectedIndex={null}
                onSelect={() => {}}
                onElementChange={() => {}}
              />
            )}
          </div>
        )}

        <button
          type="button"
          className="studio-flipbook-preview-nav-photo next"
          onClick={flipNext}
          disabled={currentPage >= pages.length - 1}
        >
          <FaChevronRight />
        </button>

        <div className="studio-flipbook-preview-surface-shadow" aria-hidden />
      </div>

      <div className="studio-flipbook-preview-bottombar">
        <span className="studio-flipbook-preview-page-count">
          Page {currentPage + 1} of {pages.length}
          <span className="studio-flipbook-preview-size-hint">
            · {bookSize.width}×{bookSize.height}
          </span>
        </span>
        <div className="studio-flipbook-preview-dots">
          {pages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`studio-flipbook-preview-dot${idx === currentPage ? ' active' : ''}${idx < currentPage ? ' past' : ''}`}
              onClick={() => {
                setCurrentPage(idx);
                if (viewMode === 'flipbook') {
                  bookRef.current?.pageFlip().flip(idx);
                }
              }}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </div>
        <span className="studio-flipbook-preview-hint">
          {viewMode === 'flipbook' ? 'Drag corners to flip · ' : ''}← → navigate · Esc close
        </span>
      </div>
    </div>,
    document.body
  );
};

export default StudioFlipbookPreview;
