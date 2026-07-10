import type { CSSProperties } from 'react';
import type { FrameType } from '../types';

/** Clip-path and border styles for dynamic frame shapes. */
export function getFrameShapeStyle(
  frameType?: FrameType | string,
  maskType?: string
): CSSProperties {
  const type = (maskType || frameType || 'rectangle') as string;

  switch (type) {
    case 'circle':
      return { borderRadius: '50%', overflow: 'hidden' };
    case 'oval':
      return { borderRadius: '50% / 42%', overflow: 'hidden' };
    case 'rounded':
      return { borderRadius: 16, overflow: 'hidden' };
    case 'triangle':
      return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', overflow: 'hidden' };
    case 'diamond':
      return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', overflow: 'hidden' };
    case 'pentagon':
      return {
        clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
        overflow: 'hidden',
      };
    case 'hexagon':
      return {
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
        overflow: 'hidden',
      };
    case 'star':
      return {
        clipPath:
          'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
        overflow: 'hidden',
      };
    case 'diagonal':
      return { clipPath: 'polygon(0 12%, 100% 0, 100% 88%, 0 100%)', overflow: 'hidden' };
    case 'polaroid':
      return {
        borderRadius: 4,
        overflow: 'hidden',
        padding: '8% 8% 18% 8%',
        background: '#fff',
        boxSizing: 'border-box',
      };
    default:
      return { overflow: 'hidden' };
  }
}

export function getFrameBorderStyle(frameType?: FrameType | string, accent?: string): CSSProperties {
  switch (frameType) {
    case 'golden':
      return { border: `2px solid ${accent ?? '#c9a227'}` };
    case 'border':
      return { border: '1px solid rgba(255,255,255,0.85)' };
    case 'soft_shadow':
      return { boxShadow: '0 12px 32px rgba(15, 23, 42, 0.28)' };
    case 'grayscale_fade':
      return { filter: 'grayscale(1)' };
    default:
      return {};
  }
}

export function frameLocksAspectRatio(frameType?: FrameType | string): boolean {
  return frameType === 'circle' || frameType === 'diamond' || frameType === 'hexagon' || frameType === 'star';
}

export function combinedFrameStyle(
  frameType?: FrameType | string,
  accent?: string,
  maskType?: string,
  borderRadiusPx?: number
): CSSProperties {
  const shape = getFrameShapeStyle(frameType, maskType);
  const border = getFrameBorderStyle(frameType, accent);

  if (frameType === 'rounded' && borderRadiusPx) {
    return { ...shape, ...border, borderRadius: borderRadiusPx };
  }

  if (frameType === 'circle' || frameType === 'oval') {
    return { ...shape, ...border };
  }

  if (!shape.clipPath && borderRadiusPx) {
    return { ...shape, ...border, borderRadius: borderRadiusPx };
  }

  return { ...shape, ...border };
}
