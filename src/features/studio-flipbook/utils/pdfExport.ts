import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import type { GeneratedPage, ThemeId } from '../types';
import { DESIGN_CANVAS } from '../constants/canvas';

let CanvasComponent: React.ComponentType<{
  page: GeneratedPage;
  imageUrlById: Record<number, string>;
  themeId?: ThemeId;
  displayWidth?: number;
  selectedIndex: number | null;
  onSelect: (i: number | null) => void;
  onElementChange: (i: number, p: Partial<import('../types').GeneratedPageElement>) => void;
}> | null = null;

async function getCanvas() {
  if (!CanvasComponent) {
    const mod = await import('../components/StudioFlipbookPageCanvas');
    CanvasComponent = mod.default;
  }
  return CanvasComponent;
}

async function waitForImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else { img.onload = () => resolve(); img.onerror = () => resolve(); }
        })
    )
  );
}

export async function exportPagesToPdf(
  pages: GeneratedPage[],
  imageUrlById: Record<number, string>,
  themeId: ThemeId,
  fileName = 'studio-flipbook'
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [DESIGN_CANVAS.width, DESIGN_CANVAS.height],
  });
  const Canvas = await getCanvas();

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage([DESIGN_CANVAS.width, DESIGN_CANVAS.height], 'landscape');

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${DESIGN_CANVAS.width}px`;
    container.style.height = `${DESIGN_CANVAS.height}px`;
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    const root = createRoot(container);

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(Canvas, {
          page: pages[i],
          imageUrlById,
          themeId,
          displayWidth: DESIGN_CANVAS.width,
          selectedIndex: null,
          onSelect: () => {},
          onElementChange: () => {},
        })
      );
      setTimeout(resolve, 500);
    });

    await waitForImages(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: DESIGN_CANVAS.width,
        height: DESIGN_CANVAS.height,
        logging: false,
      } as Parameters<typeof html2canvas>[1]);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, DESIGN_CANVAS.width, DESIGN_CANVAS.height);
    } catch (err) {
      console.error(`Failed to render page ${i + 1}:`, err);
    }

    root.unmount();
    document.body.removeChild(container);
  }

  pdf.save(`${fileName}.pdf`);
}
