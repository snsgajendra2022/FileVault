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
  styleJson?: string;
};

export async function listFlipbooksByAlbum(albumId: number): Promise<FlipbookDto[]> {
  const res = await api.get<FlipbookDto[]>(`/api/albums/${albumId}/flipbooks`);
  return res.data ?? [];
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
}): Promise<FlipbookDto> {
  const res = await api.post<FlipbookDto>('/api/flipbooks/generate', params);
  return res.data;
}

export async function saveFlipbookPages(
  flipbookId: number,
  pages: GeneratedPage[]
): Promise<void> {
  const payload = {
    pages: pages.map((p) => ({
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
        styleJson: e.styleJson,
      })),
    })),
  };
  await api.put(`/api/flipbooks/${flipbookId}/pages`, payload);
}

export async function publishFlipbook(flipbookId: number): Promise<FlipbookDto> {
  const res = await api.post<FlipbookDto>(`/api/flipbooks/${flipbookId}/publish`);
  return res.data;
}

/** Client-side preview generation when API not yet available */
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

export function dtoToGeneratedPages(dto: FlipbookPageDto[]): GeneratedPage[] {
  return dto.map((p) => ({
    pageNumber: p.pageNumber,
    pageType: p.pageType as GeneratedPage['pageType'],
    layoutType: p.layoutType as GeneratedPage['layoutType'],
    backgroundType: p.backgroundType as GeneratedPage['backgroundType'],
    backgroundValue: p.backgroundValue,
    themeVariant: p.themeVariant as ThemeId | undefined,
    settingsJson: p.settingsJson ? JSON.parse(p.settingsJson) : undefined,
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
      styleJson: e.styleJson ? JSON.parse(e.styleJson) : undefined,
    })),
  }));
}
