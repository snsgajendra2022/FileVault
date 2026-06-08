import type { EventType, GeneratedPage, ThemeId } from '../types';

export type StoredFlipbook = {
  albumId: number;
  title: string;
  eventType: EventType;
  theme: ThemeId;
  pages: GeneratedPage[];
  updatedAt: string;
};

function storageKey(albumId: number): string {
  return `studio-flipbook:v1:${albumId}`;
}

export function loadFlipbookFromStorage(albumId: number): StoredFlipbook | null {
  try {
    const raw = localStorage.getItem(storageKey(albumId));
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredFlipbook;
    if (!data?.pages?.length) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveFlipbookToStorage(data: StoredFlipbook): void {
  localStorage.setItem(storageKey(data.albumId), JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
}

export function clearFlipbookFromStorage(albumId: number): void {
  localStorage.removeItem(storageKey(albumId));
}
