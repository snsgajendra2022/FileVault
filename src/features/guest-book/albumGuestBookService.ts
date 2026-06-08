import api from '../../api/client/axiosInstance';
import imageService from '../../api/services/imageService';
import type { AlbumImageLike } from '../../utils/albumImageVariants';
import type { StudioAlbumSummary } from './albumUtils';

function normalizeAlbumsList(data: unknown): StudioAlbumSummary[] {
  const raw = data as { albums?: unknown[] } | unknown[];
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.albums) ? raw.albums : [];
  return list
    .map((a): StudioAlbumSummary | null => {
      const item = a as Record<string, unknown>;
      const id = Number(item.id);
      if (!Number.isFinite(id)) return null;
      return {
        id,
        name: String(item.name ?? 'Album'),
        description: item.description != null ? String(item.description) : undefined,
        imageCount: Number(item.imageCount ?? item.image_count ?? 0) || 0,
        thumbnailUrl:
          item.thumbnailUrl != null
            ? String(item.thumbnailUrl)
            : item.coverImageUrl != null
              ? String(item.coverImageUrl)
              : null,
        coverImageUrl: item.coverImageUrl != null ? String(item.coverImageUrl) : null,
        createdAt: item.createdAt != null ? String(item.createdAt) : undefined,
        updatedAt: item.updatedAt != null ? String(item.updatedAt) : undefined,
      };
    })
    .filter((a): a is StudioAlbumSummary => a != null);
}

export async function listStudioAlbumsForGuestBook(): Promise<StudioAlbumSummary[]> {
  const response = await api.get('/api/albums');
  return normalizeAlbumsList(response.data);
}

export async function fetchStudioAlbumImages(albumId: number): Promise<AlbumImageLike[]> {
  const response = await api.get(`/api/albums/${albumId}/images`, {
    params: { page: 0, size: 500, variantDetail: 'full' },
  });
  const raw = response.data ?? {};
  return Array.isArray(raw.images) ? raw.images : [];
}

export async function createStudioGuestBookAlbum(input: {
  name: string;
  description?: string;
}): Promise<StudioAlbumSummary> {
  const response = await api.post('/api/albums', {
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
  });
  const created = response.data as Record<string, unknown>;
  const id = Number(created.id);
  if (!Number.isFinite(id)) {
    throw new Error('Album created but no id returned');
  }
  return {
    id,
    name: String(created.name ?? input.name),
    description: created.description != null ? String(created.description) : input.description,
    imageCount: 0,
    createdAt: created.createdAt != null ? String(created.createdAt) : new Date().toISOString(),
  };
}

export async function uploadPhotosToStudioAlbum(
  albumId: number,
  files: File[],
  note?: string
): Promise<void> {
  if (!files.length) return;
  const imageIds: number[] = [];
  const text = note?.trim() ?? '';

  for (const file of files) {
    const res = await imageService.uploadImage(file);
    const imageId = Number((res as { id?: number }).id);
    if (!Number.isFinite(imageId)) {
      throw new Error('Upload succeeded but no image id was returned');
    }
    imageIds.push(imageId);
  }

  await api.post(`/api/albums/${albumId}/images`, { imageIds });

  if (text && imageIds[0] != null) {
    try {
      await api.post(`/api/images/${imageIds[0]}/comments`, { text });
    } catch {
      /* comment API optional */
    }
  }
}
