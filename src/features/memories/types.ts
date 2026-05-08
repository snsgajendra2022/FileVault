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

/** Album / share batch from API (`imageGroups`): images + host note on the group. */
export type MemoriesAlbumComment = {
  id: string;
  text: string;
  createdAt: string;
  userId?: number;
  userName?: string;
  displayName?: string;
};

export type MemoriesImageGroup = {
  shareId: number | null;
  recipientEmail: string | null;
  recipientName: string | null;
  recipientMobile: string | null;
  images: MemoriesImage[];
  comment?: MemoriesAlbumComment;
};

export type MemoriesEvent = {
  id: string;
  slug: string;
  name: string;
  /** ISO datetime string */
  dateTime: string;
  location: string;
  /** Longer text for guest intro / detail */
  description?: string;
  /** Short blurb for guest landing */
  summary?: string;
  /** e.g. wedding | birthday | corporate | family | other — drives welcome imagery */
  eventType?: string;
  coverImageUrl?: string;
  /** When true, server may generate a photobook from event images using the chosen template. */
  photobookNeeded?: boolean;
  photobookTemplateId?: number | null;
  photobookThankYouMessage?: string | null;
  /** Opaque token for QR / private links */
  accessToken: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  images: MemoriesImage[];
  /** When present, photos are grouped per share/recipient; UI can show album cards then drill in. */
  imageGroups?: MemoriesImageGroup[];
  /** User IDs this event was shared with (via share-memories-event API). */
  sharedWithUserIds?: number[];
};
