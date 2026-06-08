import type { MemoriesImage } from '../memories/types';

export type GuestBookReaction = 'heart' | 'smile' | 'celebrate';

export type GuestBookLayoutMode = 'grid' | 'masonry' | 'timeline';

export type GuestBookSortMode = 'newest' | 'oldest' | 'mostLiked';

export type GuestBookEntrySource = 'api' | 'local';

export type GuestBookEntry = {
  id: string;
  eventId: string;
  guestName: string;
  message: string;
  title?: string;
  /** ISO date string */
  date?: string;
  category?: string;
  tag?: string;
  images: MemoriesImage[];
  likes: number;
  pinned: boolean;
  featured: boolean;
  reactions: Record<GuestBookReaction, number>;
  userReaction?: GuestBookReaction;
  userLiked: boolean;
  createdAt: string;
  source: GuestBookEntrySource;
  canEdit: boolean;
  canDelete: boolean;
};

export type GuestBookEntryInput = {
  guestName: string;
  message: string;
  title?: string;
  date?: string;
  category?: string;
  tag?: string;
  images: File[];
};

export type GuestBookEntryMeta = {
  title?: string;
  date?: string;
  category?: string;
  tag?: string;
  pinned?: boolean;
  featured?: boolean;
  reactions?: Partial<Record<GuestBookReaction, number>>;
  userReaction?: GuestBookReaction;
  extraLikes?: number;
  userLiked?: boolean;
};

export type GuestBookFiltersState = {
  search: string;
  category: string;
  tag: string;
  dateFrom: string;
  dateTo: string;
  sort: GuestBookSortMode;
  layout: GuestBookLayoutMode;
};
