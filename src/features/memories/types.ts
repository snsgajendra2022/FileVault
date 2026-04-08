/** Our Memories — event gallery platform (client state today; replace with API later). */

export type MemoriesPrivacy = 'public' | 'private' | 'invite';

export type MemoriesImage = {
  id: string;
  /** Fast grid / blur-up */
  thumbUrl: string;
  /** Full-screen quality */
  hdUrl: string;
  likes: number;
  comments?: MemoriesComment[];
};

export type MemoriesComment = {
  id: string;
  text: string;
  createdAt: string;
};

export type MemoriesEvent = {
  id: string;
  slug: string;
  name: string;
  /** ISO datetime string */
  dateTime: string;
  location: string;
  coverImageUrl?: string;
  /** Opaque token for QR / private links */
  accessToken: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  images: MemoriesImage[];
  /** User IDs this event was shared with (via share-memories-event API). */
  sharedWithUserIds?: number[];
};
