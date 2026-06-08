import type { MemoriesImage } from '../memories/types';
import type { AlbumImageLike } from '../../utils/albumImageVariants';
import {
  getAlbumHdUrl,
  getAlbumImageFileType,
  getAlbumThumbnailUrl,
} from '../../utils/albumImageVariants';
import type { GuestBookEntry, GuestBookEntryMeta } from './types';
import { parseGuestUploadNote } from './utils';

export type StudioAlbumSummary = {
  id: number;
  name: string;
  description?: string;
  imageCount?: number;
  thumbnailUrl?: string | null;
  coverImageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic', 'heif']);

export function isAlbumPhotoImage(image: AlbumImageLike): boolean {
  const ft = getAlbumImageFileType(image).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ft)) return true;
  const name = image.originalFilename || image.filename || '';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.has(ext);
}

/** Resolve display URLs for guest book cards and lightbox. */
export function albumImageToMemoriesImage(image: AlbumImageLike): MemoriesImage {
  const fileType = getAlbumImageFileType(image);
  const thumb = getAlbumThumbnailUrl(image, fileType) || getAlbumHdUrl(image, fileType) || '';
  const hd = getAlbumHdUrl(image, fileType) || thumb;
  const commentsRaw = Array.isArray(image.comments) ? image.comments : [];

  return {
    id: String(image.id),
    thumbUrl: thumb,
    hdUrl: hd,
    likes: Number(image.likes ?? 0) || 0,
    comments: commentsRaw
      .map((c, i) => ({
        id: String(c?.id ?? `c_${image.id}_${i}`),
        text: String(c?.text ?? '').trim(),
        createdAt: String(c?.createdAt ?? new Date().toISOString()),
      }))
      .filter((c) => c.text),
  };
}

function albumImageEntryId(albumId: string, imageId: string): string {
  return `${albumId}:img:${imageId}`;
}

function applyAlbumMeta(
  entry: GuestBookEntry,
  meta?: GuestBookEntryMeta
): GuestBookEntry {
  if (!meta) return entry;
  return {
    ...entry,
    title: meta.title ?? entry.title,
    date: meta.date ?? entry.date,
    category: meta.category ?? entry.category,
    tag: meta.tag ?? entry.tag,
    pinned: meta.pinned ?? entry.pinned,
    featured: meta.featured ?? entry.featured,
    reactions: {
      heart: meta.reactions?.heart ?? entry.reactions.heart,
      smile: meta.reactions?.smile ?? entry.reactions.smile,
      celebrate: meta.reactions?.celebrate ?? entry.reactions.celebrate,
    },
    userReaction: meta.userReaction ?? entry.userReaction,
    likes: entry.likes + (meta.extraLikes ?? 0),
    userLiked: meta.userLiked ?? entry.userLiked,
  };
}

/** Each album photo becomes a digital guest-book memory card. */
export function mapAlbumImagesToGuestEntries(
  album: StudioAlbumSummary,
  images: AlbumImageLike[],
  metaByEntryId: Record<string, GuestBookEntryMeta> = {},
  opts?: { canManage?: boolean; likedImageIds?: Set<string> }
): GuestBookEntry[] {
  const albumId = String(album.id);
  const canManage = Boolean(opts?.canManage);
  const likedImageIds = opts?.likedImageIds ?? new Set<string>();
  const albumTitle = album.name?.trim() || 'Guest album';
  const albumNote = album.description?.trim() ?? '';
  const createdFallback = album.createdAt ?? new Date().toISOString();

  const photos = images.filter(isAlbumPhotoImage).map(albumImageToMemoriesImage);
  const entries: GuestBookEntry[] = [];

  photos.forEach((img, index) => {
    const firstComment = img.comments?.[0];
    const commentText = firstComment?.text?.trim() ?? '';
    const parsed = commentText ? parseGuestUploadNote(commentText) : null;
    const guestName = parsed?.guestName?.trim() || albumTitle;
    const message =
      parsed?.message ||
      commentText ||
      (index === 0 && albumNote ? albumNote : '');

    const id = albumImageEntryId(albumId, img.id);
    const base: GuestBookEntry = {
      id,
      eventId: albumId,
      guestName,
      message,
      title: parsed?.title,
      images: [img],
      likes: img.likes ?? 0,
      pinned: false,
      featured: false,
      reactions: { heart: 0, smile: 0, celebrate: 0 },
      userLiked: likedImageIds.has(img.id),
      createdAt: firstComment?.createdAt ?? createdFallback,
      source: 'api',
      canEdit: canManage,
      canDelete: canManage,
    };
    entries.push(applyAlbumMeta(base, metaByEntryId[id]));
  });

  return entries;
}

export function resolveMemoriesImageSrc(
  img: { thumbUrl?: string; hdUrl?: string },
  preferHd = false
): string {
  const thumb = img.thumbUrl?.trim() || '';
  const hd = img.hdUrl?.trim() || '';
  if (preferHd) return hd || thumb;
  return thumb || hd;
}
