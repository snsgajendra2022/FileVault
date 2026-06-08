import React from 'react';
import { createPortal } from 'react-dom';
import HTMLFlipBook from 'react-pageflip';
import { FaTimes, FaChevronLeft, FaChevronRight, FaDownload } from 'react-icons/fa';
import StudioFlipbookPageCanvas from './StudioFlipbookPageCanvas';
import type { GeneratedPage, ThemeId } from '../types';
import { DESIGN_CANVAS } from '../constants/canvas';

type Props = {
  pages: GeneratedPage[];
  imageUrlById: Record<number, string>;
  themeId: ThemeId;
  onClose: () => void;
  onDownloadPdf: () => void;
};

function computePageSize(): { w: number; h: number } {
  const ratio = DESIGN_CANVAS.height / DESIGN_CANVAS.width;
  const maxW = Math.min(window.innerWidth * 0.42, 580);
  const maxH = window.innerHeight * 0.72;
  let w = maxW;
  let h = w * ratio;
  if (h > maxH) {
    h = maxH;
    w = h / ratio;
  }
  return { w: Math.round(w), h: Math.round(h) };
}

const FlipPage = React.forwardRef<HTMLDivElement, { children: React.ReactNode; width: number; height: number }>(
  ({ children, width, height }, ref) => (
    <div
      ref={ref}
      className="studio-flipbook-preview-page"
      style={{ width, height, background: '#fff', overflow: 'hidden', position: 'relative' }}
    >
      {children}
    </div>
  )
);
FlipPage.displayName = 'FlipPage';

type FlipBookHandle = {
  pageFlip: () => { flipPrev: () => void; flipNext: () => void };
};

const StudioFlipbookPreview: React.FC<Props> = ({ pages, imageUrlById, themeId, onClose, onDownloadPdf }) => {
  const bookRef = React.useRef<FlipBookHandle | null>(null);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(computePageSize);

  React.useEffect(() => {
    const onResize = () => setPageSize(computePageSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handlePrev = () => bookRef.current?.pageFlip().flipPrev();
  const handleNext = () => bookRef.current?.pageFlip().flipNext();

  return createPortal(
    <div className="studio-flipbook-preview-overlay" onClick={onClose}>
      <div className="studio-flipbook-preview-modal" onClick={e => e.stopPropagation()}>
        <div className="studio-flipbook-preview-header">
          <h3>Flipbook Preview</h3>
          <div className="studio-flipbook-preview-header-actions">
            <button type="button" className="studio-flipbook-preview-btn" onClick={onDownloadPdf}>
              <FaDownload /> Download PDF
            </button>
            <button type="button" className="studio-flipbook-preview-close" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="studio-flipbook-preview-stage">
          <button type="button" className="studio-flipbook-preview-nav prev" onClick={handlePrev} disabled={currentPage === 0}>
            <FaChevronLeft />
          </button>

          <div className="studio-flipbook-preview-book-wrap">
            <HTMLFlipBook
              width={pageSize.w}
              height={pageSize.h}
              size="fixed"
              minWidth={pageSize.w}
              maxWidth={pageSize.w}
              minHeight={pageSize.h}
              maxHeight={pageSize.h}
              showCover={true}
              mobileScrollSupport={true}
              onFlip={(e) => setCurrentPage(e.data)}
              ref={bookRef}
              className="studio-flipbook-book"
              style={{ margin: '0 auto' }}
              startPage={0}
              drawShadow={true}
              flippingTime={600}
              usePortrait={true}
              startZIndex={0}
              autoSize={false}
              maxShadowOpacity={0.5}
              showPageCorners={true}
              disableFlipByClick={false}
              clickEventForward={true}
              useMouseEvents={true}
              swipeDistance={50}
            >
              {pages.map((page) => (
                <FlipPage key={page.pageNumber} width={pageSize.w} height={pageSize.h}>
                  <StudioFlipbookPageCanvas
                    page={page}
                    imageUrlById={imageUrlById}
                    themeId={themeId}
                    displayWidth={pageSize.w}
                    selectedIndex={null}
                    onSelect={() => {}}
                    onElementChange={() => {}}
                  />
                </FlipPage>
              ))}
            </HTMLFlipBook>
          </div>

          <button type="button" className="studio-flipbook-preview-nav next" onClick={handleNext} disabled={currentPage >= pages.length - 1}>
            <FaChevronRight />
          </button>
        </div>

        <div className="studio-flipbook-preview-footer">
          Page {currentPage + 1} of {pages.length}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StudioFlipbookPreview;
