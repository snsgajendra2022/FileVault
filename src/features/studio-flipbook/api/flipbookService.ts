import api from '../../../api/client/axiosInstance';
import type { EventType, FlipbookDraft, GeneratedPage, ThemeId } from '../types';
import { generateStudioFlipbook } from '../engine/layoutEngine';

export type FlipbookDto = {
  id: number;
  albumId: number;
  userId: number;
  title: string;
  eventType: string;
  theme: string;
  status: string;
  coverImageId?: number;
  settingsJson?: string;
  pages?: FlipbookPageDto[];
};

export type FlipbookPageDto = {
  id: number;
  flipbookId: number;
  pageNumber: number;
  pageType: string;
  layoutType: string;
  backgroundType: string;
  backgroundValue: string;
  themeVariant?: string;
  settingsJson?: string;
  elements: FlipbookPageElementDto[];
};

export type FlipbookPageElementDto = {
  id?: number;
  elementType: string;
  albumImageId?: number;
  content?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  opacity?: number;
  maskType?: string;
  frameType?: string;
  fitMode?: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  styleJson?: string;
};

function pagesToPayload(pages: GeneratedPage[]) {
  return pages.map((p) => ({
    pageNumber: p.pageNumber,
    pageType: p.pageType,
    layoutType: p.layoutType,
    backgroundType: p.backgroundType,
    backgroundValue: p.backgroundValue,
    themeVariant: p.themeVariant,
    settingsJson: p.settingsJson,
    elements: p.elements.map((e) => ({
      elementType: e.elementType,
      albumImageId: e.albumImageId,
      content: e.content,
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      rotation: e.rotation,
      zIndex: e.zIndex,
      opacity: e.opacity,
      maskType: e.maskType,
      frameType: e.frameType,
      fitMode: e.fitMode,
      cropX: e.cropX,
      cropY: e.cropY,
      cropWidth: e.cropWidth,
      cropHeight: e.cropHeight,
      styleJson: e.styleJson,
    })),
  }));
}

export async function listFlipbooksByAlbum(albumId: number): Promise<FlipbookDto[]> {
  const res = await api.get<FlipbookDto[]>(`/api/albums/${albumId}/flipbooks`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function getFlipbook(flipbookId: number): Promise<FlipbookDto> {
  const res = await api.get<FlipbookDto>(`/api/flipbooks/${flipbookId}`);
  return res.data;
}

export async function createFlipbookFromAlbum(params: {
  albumId: number;
  title: string;
  eventType: EventType;
  theme?: ThemeId;
  thankYouMessage?: string;
  coupleName?: string;
  eventDate?: string;
  coverImageId?: number;
  pages?: GeneratedPage[];
}): Promise<FlipbookDto> {
  const res = await api.post<FlipbookDto>('/api/flipbooks/generate', {
    albumId: params.albumId,
    title: params.title,
    eventType: params.eventType,
    theme: params.theme,
    thankYouMessage: params.thankYouMessage,
    coupleName: params.coupleName,
    eventDate: params.eventDate,
    coverImageId: params.coverImageId,
    pages: params.pages ? pagesToPayload(params.pages) : undefined,
  });
  return res.data;
}

export async function updateFlipbook(
  flipbookId: number,
  patch: {
    title?: string;
    eventType?: EventType | string;
    theme?: ThemeId | string;
    status?: string;
    coverImageId?: number;
    settingsJson?: unknown;
    thankYouMessage?: string;
    coupleName?: string;
    eventDate?: string;
  }
): Promise<FlipbookDto> {
  const res = await api.put<FlipbookDto>(`/api/flipbooks/${flipbookId}`, patch);
  return res.data;
}

export async function saveFlipbookPages(
  flipbookId: number,
  pages: GeneratedPage[]
): Promise<FlipbookDto> {
  const res = await api.put<FlipbookDto>(`/api/flipbooks/${flipbookId}/pages`, {
    pages: pagesToPayload(pages),
    keepDraft: true,
  });
  return res.data;
}

/** Preferred studio save: metadata + pages in one request. */
export async function saveFlipbookAll(
  flipbookId: number,
  data: {
    title: string;
    eventType: EventType;
    theme: ThemeId;
    pages: GeneratedPage[];
    coverImageId?: number;
    thankYouMessage?: string;
    coupleName?: string;
    eventDate?: string;
    settingsJson?: unknown;
  }
): Promise<FlipbookDto> {
  const res = await api.put<FlipbookDto>(`/api/flipbooks/${flipbookId}/save`, {
    title: data.title,
    eventType: data.eventType,
    theme: data.theme,
    coverImageId: data.coverImageId,
    thankYouMessage: data.thankYouMessage,
    coupleName: data.coupleName,
    eventDate: data.eventDate,
    settingsJson: data.settingsJson,
    pages: pagesToPayload(data.pages),
  });
  return res.data;
}

export async function publishFlipbook(flipbookId: number): Promise<FlipbookDto> {
  const res = await api.post<FlipbookDto>(`/api/flipbooks/${flipbookId}/publish`);
  return res.data;
}

export async function deleteFlipbook(flipbookId: number): Promise<void> {
  await api.delete(`/api/flipbooks/${flipbookId}`);
}

/** Client-side layout generation (used for first draft / regenerate). */
export function previewGenerateFromAlbumImages(
  albumId: number,
  title: string,
  eventType: EventType,
  images: Array<{ id: number; imageUrl?: string; thumbnailUrl?: string; width?: number; height?: number }>,
  opts?: { theme?: ThemeId; thankYouMessage?: string; coupleName?: string; eventDate?: string }
): FlipbookDraft {
  const pages = generateStudioFlipbook({
    albumId,
    title,
    eventType,
    theme: opts?.theme,
    thankYouMessage: opts?.thankYouMessage,
    coupleName: opts?.coupleName,
    eventDate: opts?.eventDate,
    images,
  });
  return {
    albumId,
    title,
    eventType,
    theme: opts?.theme ?? 'wedding_modern',
    status: 'draft',
    pages,
  };
}

function parseJsonField<T>(raw?: string | T | null): T | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function dtoToGeneratedPages(dto: FlipbookPageDto[]): GeneratedPage[] {
  return (dto ?? []).map((p) => ({
    pageNumber: p.pageNumber,
    pageType: p.pageType as GeneratedPage['pageType'],
    layoutType: p.layoutType as GeneratedPage['layoutType'],
    backgroundType: p.backgroundType as GeneratedPage['backgroundType'],
    backgroundValue: p.backgroundValue,
    themeVariant: p.themeVariant as ThemeId | undefined,
    settingsJson: parseJsonField<Record<string, unknown>>(p.settingsJson),
    elements: (p.elements ?? []).map((e) => ({
      elementType: e.elementType as GeneratedPage['elements'][0]['elementType'],
      albumImageId: e.albumImageId,
      content: e.content,
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      rotation: e.rotation,
      zIndex: e.zIndex,
      opacity: e.opacity,
      maskType: e.maskType,
      frameType: e.frameType as GeneratedPage['elements'][0]['frameType'],
      fitMode: e.fitMode as GeneratedPage['elements'][0]['fitMode'],
      cropX: e.cropX,
      cropY: e.cropY,
      cropWidth: e.cropWidth,
      cropHeight: e.cropHeight,
      styleJson: parseJsonField<Record<string, unknown>>(e.styleJson),
    })),
  }));
}
