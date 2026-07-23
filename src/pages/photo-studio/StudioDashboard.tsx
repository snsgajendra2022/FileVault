import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Camera,
  FolderPlus,
  Images,
  Search,
  Share2,
  Sparkles,
  Upload,
  Users,
  AlertCircle,
  Clock,
  Folder,
  Heart,
  ScanFace,
  RefreshCw,
} from 'lucide-react';
import './StudioDashboard.premium.css';
import adminService from '../../api/services/adminService';
import api from '../../api/client/axiosInstance';
import { useAuth } from '../../state/context/AuthContext';
import {
  fetchFacePersons,
  resolveMediaUrl,
  type FacePerson,
  type FacePersonsResponse,
} from '../../api/services/faceRecognitionService';
import ProgressiveImage from '../../components/photo-studio/ProgressiveImage';
import {
  getGalleryDisplaySrc,
  type UserImageWithVariants,
} from '../../utils/progressiveImageVariants';

const VISIBLE_PEOPLE = 5;
const RECENT_PHOTO_LIMIT = 6;
const ALBUM_LIMIT = 6;
const MOSAIC_ROLES = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

const EMPTY_FACE_PERSONS: FacePersonsResponse = {
  userId: 0,
  username: '',
  fullName: '',
  totalPersons: 0,
  persons: [],
};

interface DashboardStats {
  totalMember?: number;
  clientsTrendPercent?: number;
  clientsTrendLabel?: string;
  totalPhotos?: number;
  totalVideos?: number;
  recentUploads?: number;
  totalAlbums?: number;
}

interface UserImageItem {
  id: string | number;
  url?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  filename?: string;
  originalFilename?: string;
  createdAt?: string;
  uploadTime?: string;
  fileType?: string;
  mediaType?: string;
  albumName?: string;
  albumId?: number;
  variants?: UserImageWithVariants['variants'];
  [key: string]: unknown;
}

interface Album {
  id: number;
  name: string;
  description?: string;
  imageCount?: number;
  coverImageId?: number | null;
  coverImageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isPublic?: boolean;
  shared?: boolean;
}

function personInitials(name?: string | null): string {
  const parts = (name ?? '').trim().split(/[\s_]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function greetingForHour(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatRelativeTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatShortDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isVideoType(fileType?: string, filename?: string, mediaType?: string): boolean {
  if (mediaType === 'VIDEO') return true;
  if (fileType?.startsWith('video/')) return true;
  if (/^(mp4|mov|webm|avi|mkv|m4v)$/i.test(fileType || '')) return true;
  return /\.(mp4|mov|webm|m4v|avi)$/i.test(filename || '');
}

function toVariantImage(img: UserImageItem): UserImageWithVariants {
  const thumb = String(img.thumbnailUrl || '');
  const preview = String(img.previewUrl || img.url || thumb || '');
  return {
    id: img.id,
    previewUrl: preview,
    thumbnailUrl: thumb || preview,
    filename: photoTitle(img),
    downloadUrl: String((img as { downloadUrl?: string }).downloadUrl || preview),
    uploadTime: String(img.uploadTime || img.createdAt || ''),
    fileType: String(img.fileType || 'image/jpeg'),
    mediaType: img.mediaType,
    variants: img.variants,
  };
}

/** Photos: s01 / preview. Videos: thumbnailUrl still (never HLS). */
function photoGallerySrc(img: UserImageItem): string {
  if (isVideoType(img.fileType, photoTitle(img), img.mediaType) && img.thumbnailUrl) {
    return String(img.thumbnailUrl);
  }

  try {
    const gallery = getGalleryDisplaySrc(toVariantImage(img));
    if (gallery) return gallery;
  } catch {
    /* fall through */
  }
  if (img.thumbnailUrl) return String(img.thumbnailUrl);
  return String(img.previewUrl || img.url || '');
}

function photoHeroSrc(img: UserImageItem): string {
  return photoGallerySrc(img);
}

function DashboardGalleryPhoto({
  image,
  alt = '',
  className = 'h-full w-full object-cover',
}: {
  image: UserImageItem;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const variantImage = useMemo(() => toVariantImage(image), [image]);
  const fallback = photoGallerySrc(image);

  if (failed || !fallback) {
    return (
      <div className="sd-dash-cover-fallback" aria-hidden>
        <Camera className="sd-dash-cover-fallback__icon" />
      </div>
    );
  }

  return (
    <div className="sd-dash-gallery-photo">
      <ProgressiveImage
        image={variantImage}
        enabled
        mode="gallery"
        alt={alt}
        className={className}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function photoTitle(img: UserImageItem): string {
  return (
    (img.filename as string) ||
    (img.originalFilename as string) ||
    `Photo ${img.id}`
  );
}

function DashboardPersonAvatar({ person }: { person: FacePerson }) {
  const [imgError, setImgError] = useState(false);
  const thumb = resolveMediaUrl(person.personThumbnailUrl);

  return (
    <Link
      to={`/filter-images?person=${encodeURIComponent(person.personId)}`}
      className="sd-dash-person"
      aria-label={`${person.displayName || person.personId}, ${person.imageCount ?? 0} photos`}
    >
      <div className="sd-dash-person__avatar">
        {thumb && !imgError ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <span aria-hidden>{personInitials(person.displayName)}</span>
        )}
        {person.isNewPerson ? <em className="sd-dash-person__new">New</em> : null}
      </div>
      <span className="sd-dash-person__name" title={person.displayName || person.personId}>
        {person.displayName || person.personId}
      </span>
      <span className="sd-dash-person__count">{person.imageCount ?? 0}</span>
    </Link>
  );
}

function CoverImage({
  src,
  alt = '',
  className = '',
  priority = false,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`sd-dash-cover-fallback ${className}`} aria-hidden>
        <Camera className="sd-dash-cover-fallback__icon" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onError={() => setFailed(true)}
    />
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sd-dash-section__head">
      <div>
        {eyebrow ? <p className="sd-dash-eyebrow">{eyebrow}</p> : null}
        <h2 className="sd-dash-section__title">{title}</h2>
      </div>
      {action}
    </header>
  );
}

function EmptyBlock({
  title,
  description,
  actionLabel,
  actionTo,
  icon: Icon = Camera,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}) {
  return (
    <div className="sd-dash-empty">
      <Icon className="sd-dash-empty__icon" aria-hidden />
      <p className="sd-dash-empty__title">{title}</p>
      <p className="sd-dash-empty__desc">{description}</p>
      {actionLabel && actionTo ? (
        <Link to={actionTo} className="sd-dash-btn sd-dash-btn--ghost">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function mosaicRole(index: number): (typeof MOSAIC_ROLES)[number] {
  return MOSAIC_ROLES[index % MOSAIC_ROLES.length];
}

function DashboardSkeleton() {
  return (
    <div className="sd-dash sd-dash--loading" aria-busy="true" aria-label="Loading dashboard">
      <div className="sd-dash-skel sd-dash-skel--header" />
      <div className="sd-dash-skel sd-dash-skel--hero" />
      <div className="sd-dash-metrics">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sd-dash-skel sd-dash-skel--metric" />
        ))}
      </div>
      <div className="sd-dash-photo-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="sd-dash-skel sd-dash-skel--photo" />
        ))}
      </div>
    </div>
  );
}

const StudioDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allPhotos, setAllPhotos] = useState<UserImageItem[]>([]);
  const [yourPhotosCount, setYourPhotosCount] = useState<number | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photos' | 'videos'>('all');
  const [activityTab, setActivityTab] = useState<'studio' | 'people'>('studio');
  const [reloadKey, setReloadKey] = useState(0);

  const { data: facePersonsData, isPending: facePersonsLoading } = useQuery({
    queryKey: ['facePersons', user?.id],
    queryFn: async () => {
      if (!user?.id) return EMPTY_FACE_PERSONS;
      try {
        return await fetchFacePersons(user.id);
      } catch (err) {
        console.warn('Face persons unavailable on dashboard:', err);
        return { ...EMPTY_FACE_PERSONS, userId: user.id };
      }
    },
    enabled: !!user?.id,
    staleTime: 60_000,
    retry: false,
  });

  const detectedPeople = Array.isArray(facePersonsData?.persons) ? facePersonsData.persons : [];
  const totalDetectedPeople =
    typeof facePersonsData?.totalPersons === 'number'
      ? facePersonsData.totalPersons
      : detectedPeople.length;

  useEffect(() => {
    let cancelled = false;
    const fetchDashboardData = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const dashbaordActivities = await api.get('/api/dashboard/summary');
        const nextStats: DashboardStats = {};

        if (isAdmin) {
          const [systemHealth, userStats, usageStats] = await Promise.all([
            adminService.getSystemHealthOptional(),
            adminService.getUserStatisticsOptional(),
            adminService.getUsageStatisticsOptional('month'),
          ]);
          if (typeof userStats?.totalUsers === 'number') nextStats.totalMember = userStats.totalUsers;
          if (typeof systemHealth?.totalImages === 'number') nextStats.totalPhotos = systemHealth.totalImages;
          const fileTypeDistribution = usageStats?.fileTypeDistribution || {};
          const videoCount = fileTypeDistribution.video ?? fileTypeDistribution.videos;
          if (typeof videoCount === 'number') nextStats.totalVideos = videoCount;
        }

        const summary = dashbaordActivities?.data ?? {};
        if (typeof summary.totalMember === 'number' && !nextStats.totalMember) {
          nextStats.totalMember = summary.totalMember;
        }
        if (typeof summary.totalPhotos === 'number') nextStats.totalPhotos = summary.totalPhotos;
        if (typeof summary.totalVideos === 'number') nextStats.totalVideos = summary.totalVideos;
        if (typeof summary.clientsTrendPercent === 'number') {
          nextStats.clientsTrendPercent = summary.clientsTrendPercent;
        }
        if (typeof summary.clientsTrendLabel === 'string') {
          nextStats.clientsTrendLabel = summary.clientsTrendLabel;
        }
        if (typeof summary.recentUploads === 'number') nextStats.recentUploads = summary.recentUploads;
        if (!cancelled) setStats(nextStats);

        if (typeof summary.yourPhotos === 'number') {
          if (!cancelled) setYourPhotosCount(summary.yourPhotos);
        } else if (!cancelled) {
          setYourPhotosCount(null);
        }

        try {
          const familyRes = await api.get('/api/simple-invitations/family-relationships');
          const family = familyRes.data?.familyData || familyRes.data || {};
          const allClients: { id: number; userId: number }[] = [];
          const flattenClients = (clients: unknown[]) => {
            if (!Array.isArray(clients)) return;
            clients.forEach((client: any) => {
              if (client?.relation === 'Client') {
                allClients.push({ id: client.userId, userId: client.userId });
              }
              if (client?.clients?.length) flattenClients(client.clients);
            });
          };
          if (family.clients?.length) flattenClients(family.clients);
          const uniqueClients = allClients.filter(
            (c, i, self) => i === self.findIndex((x) => x.id === c.id)
          );
          if (uniqueClients.length > 0 && !cancelled) {
            setStats((prev) => ({ ...prev, totalMember: uniqueClients.length }));
          }
        } catch (e) {
          console.error('Error fetching family relationships:', e);
        }

        const token = localStorage.getItem('token');
        if (token) {
          const imagesRes = await api.get(`/api/images/user/all?token=${token}`);
          const items = Array.isArray(imagesRes.data)
            ? imagesRes.data
            : imagesRes.data?.images || [];
          if (!cancelled) setAllPhotos(items || []);
        } else if (!cancelled) {
          setAllPhotos([]);
        }

        try {
          const albumsRes = await api.get('/api/albums');
          const albumsData = Array.isArray(albumsRes.data)
            ? albumsRes.data
            : albumsRes.data?.albums || [];
          if (!cancelled) {
            setAlbums(albumsData);
            if (albumsData.length > 0) {
              setStats((prev) => ({ ...prev, totalAlbums: albumsData.length }));
            }
          }
        } catch (e) {
          console.error('Error fetching albums:', e);
          if (!cancelled) setAlbums([]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        if (!cancelled) setLoadError('Could not load your photo library. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchDashboardData();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, reloadKey]);

  const photosCount = typeof yourPhotosCount === 'number' ? yourPhotosCount : allPhotos.length;
  const albumCount = stats.totalAlbums ?? albums.length;
  const clientCount = typeof stats.totalMember === 'number' ? stats.totalMember : 0;
  const videoCount =
    typeof stats.totalVideos === 'number'
      ? stats.totalVideos
      : allPhotos.filter((p) => isVideoType(p.fileType, photoTitle(p), p.mediaType)).length;

  const sortedPhotos = useMemo(() => {
    return [...allPhotos].sort((a, b) => {
      const ta = new Date(a.createdAt || a.uploadTime || 0).getTime();
      const tb = new Date(b.createdAt || b.uploadTime || 0).getTime();
      return tb - ta;
    });
  }, [allPhotos]);

  const sortedAlbums = useMemo(() => {
    return [...albums].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [albums]);

  const q = searchQuery.trim().toLowerCase();

  const filteredRecentPhotos = useMemo(() => {
    return sortedPhotos
      .filter((img) => {
        const video = isVideoType(img.fileType, photoTitle(img), img.mediaType);
        if (mediaFilter === 'photos' && video) return false;
        if (mediaFilter === 'videos' && !video) return false;
        if (!q) return true;
        const hay = `${photoTitle(img)} ${img.albumName || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, RECENT_PHOTO_LIMIT);
  }, [sortedPhotos, mediaFilter, q]);

  const filteredAlbums = useMemo(() => {
    return sortedAlbums
      .filter((album) => {
        if (!q) return true;
        return `${album.name} ${album.description || ''}`.toLowerCase().includes(q);
      })
      .slice(0, ALBUM_LIMIT);
  }, [sortedAlbums, q]);

  const featuredAlbum = sortedAlbums.find((a) => a.coverImageUrl) || sortedAlbums[0] || null;
  const featuredPhoto = sortedPhotos[0] || null;
  const featuredSrc = featuredAlbum?.coverImageUrl || (featuredPhoto ? photoHeroSrc(featuredPhoto) : null);

  const uploadsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return allPhotos.filter((img) => {
      const raw = img.createdAt || img.uploadTime;
      if (!raw) return false;
      return new Date(raw).getTime() >= weekAgo;
    }).length;
  }, [allPhotos]);

  const sharedAlbumCount = useMemo(
    () => albums.filter((a) => a.isPublic || a.shared).length,
    [albums]
  );

  const needsAttention = useMemo(() => {
    const items: {
      id: string;
      title: string;
      detail: string;
      actionLabel: string;
      to: string;
      thumb?: string | null;
    }[] = [];

    albums
      .filter((a) => !a.coverImageUrl && (a.imageCount || 0) > 0)
      .slice(0, 2)
      .forEach((a) => {
        items.push({
          id: `cover-${a.id}`,
          title: a.name,
          detail: 'Awaiting cover selection',
          actionLabel: 'Open album',
          to: '/studio/albums',
          thumb: a.coverImageUrl,
        });
      });

    albums
      .filter((a) => (a.imageCount || 0) === 0)
      .slice(0, 2)
      .forEach((a) => {
        items.push({
          id: `empty-${a.id}`,
          title: a.name,
          detail: 'Draft album — add photos to continue',
          actionLabel: 'Upload photos',
          to: '/upload',
          thumb: a.coverImageUrl,
        });
      });

    return items.slice(0, 4);
  }, [albums]);

  const activityItems = useMemo(() => {
    const items: {
      id: string;
      text: string;
      time: string;
      sortAt: number;
      preview?: string | null;
      to: string;
    }[] = [];

    sortedPhotos.slice(0, 5).forEach((img) => {
      const raw = img.createdAt || img.uploadTime || '';
      items.push({
        id: `photo-${img.id}`,
        text: `Uploaded ${photoTitle(img)}`,
        time: formatRelativeTime(raw),
        sortAt: new Date(raw || 0).getTime(),
        preview: photoGallerySrc(img),
        to: '/client-images',
      });
    });

    sortedAlbums.slice(0, 3).forEach((album) => {
      const raw = album.updatedAt || album.createdAt || '';
      items.push({
        id: `album-${album.id}`,
        text: `Album “${album.name}” updated`,
        time: formatRelativeTime(raw),
        sortAt: new Date(raw || 0).getTime(),
        preview: album.coverImageUrl,
        to: '/studio/albums',
      });
    });

    return items.sort((a, b) => b.sortAt - a.sortAt).slice(0, 8);
  }, [sortedPhotos, sortedAlbums]);

  const firstName = user?.firstName || user?.username || 'there';
  const studioName =
    (user as { studioName?: string; businessName?: string } | null)?.studioName ||
    (user as { studioName?: string; businessName?: string } | null)?.businessName ||
    (user?.username ? `${user.username}'s Studio` : 'Your studio');
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const awaitingReview = albums.filter((a) => !a.coverImageUrl && (a.imageCount || 0) > 0).length;
  const contextSummary =
    uploadsThisWeek > 0 || awaitingReview > 0
      ? `Your studio has ${uploadsThisWeek.toLocaleString()} newly uploaded ${uploadsThisWeek === 1 ? 'memory' : 'memories'}${
          awaitingReview > 0
            ? ` and ${awaitingReview} ${awaitingReview === 1 ? 'gallery' : 'galleries'} awaiting review`
            : ''
        }.`
      : t('dashboard.welcomeSummary', {
          defaultValue: 'A calm workspace for your albums, galleries, and recent captures.',
        });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/client-images');
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="sd-dash">
      <main className="sd-dash-main">
        <header className="sd-dash-header">
          <div className="sd-dash-header__copy">
            <p className="sd-dash-eyebrow">
              <Sparkles className="sd-dash-icon-sm" aria-hidden />
              {todayLabel}
            </p>
            <h1 className="sd-dash-greeting">
              {greetingForHour()}, {firstName}
            </h1>
            <p className="sd-dash-studio">{studioName}</p>
            <p className="sd-dash-lede">{contextSummary}</p>
          </div>

          <div className="sd-dash-header__actions">
            <form className="sd-dash-search" onSubmit={handleSearchSubmit} role="search">
              <Search className="sd-dash-search__icon" aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search photos & albums"
                aria-label="Search photos and albums"
              />
            </form>
            <Link to="/upload" className="sd-dash-btn sd-dash-btn--primary">
              <Upload className="sd-dash-icon-sm" aria-hidden />
              Upload media
            </Link>
            <Link to="/studio/albums" className="sd-dash-btn sd-dash-btn--ghost">
              <FolderPlus className="sd-dash-icon-sm" aria-hidden />
              Create album
            </Link>
            <button
              type="button"
              className="sd-dash-btn sd-dash-btn--icon"
              onClick={() => setReloadKey((k) => k + 1)}
              aria-label="Refresh dashboard"
              title="Refresh"
            >
              <RefreshCw className="sd-dash-icon-sm" />
            </button>
          </div>
        </header>

        {loadError ? (
          <div className="sd-dash-error" role="alert">
            <AlertCircle className="sd-dash-icon-sm" aria-hidden />
            <div>
              <p className="sd-dash-error__title">Library unavailable</p>
              <p className="sd-dash-error__desc">{loadError}</p>
            </div>
            <button
              type="button"
              className="sd-dash-btn sd-dash-btn--ghost"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Try again
            </button>
          </div>
        ) : null}

        <section className="sd-dash-feature" aria-label="Featured collection">
          {featuredSrc ? (
            <>
              <div className="sd-dash-feature__media">
                {featuredAlbum?.coverImageUrl ? (
                  <CoverImage
                    src={featuredAlbum.coverImageUrl}
                    alt={`Cover for album ${featuredAlbum.name}`}
                    className="sd-dash-hero__img"
                    priority
                  />
                ) : featuredPhoto ? (
                  <DashboardGalleryPhoto
                    image={featuredPhoto}
                    alt={photoTitle(featuredPhoto)}
                    className="sd-dash-hero__img"
                  />
                ) : (
                  <CoverImage src={featuredSrc} alt="Featured photo" className="sd-dash-hero__img" priority />
                )}
              </div>
              <div className="sd-dash-feature__panel">
                <span className="sd-dash-feature__badge">
                  {featuredAlbum ? 'Featured collection' : 'Latest capture'}
                </span>
                <h2 className="sd-dash-feature__title">
                  {featuredAlbum?.name ||
                    (featuredPhoto ? photoTitle(featuredPhoto) : 'Your library')}
                </h2>
                <p className="sd-dash-feature__meta">
                  {featuredAlbum
                    ? `${formatShortDate(featuredAlbum.updatedAt || featuredAlbum.createdAt) || 'Recently updated'} · Updated ${
                        formatRelativeTime(featuredAlbum.updatedAt || featuredAlbum.createdAt) ||
                        'recently'
                      }`
                    : formatRelativeTime(featuredPhoto?.createdAt || featuredPhoto?.uploadTime)}
                </p>
                <div className="sd-dash-feature__stats">
                  <div className="sd-dash-feature__stat">
                    <strong>
                      {(featuredAlbum?.imageCount ?? photosCount).toLocaleString()}
                    </strong>
                    <span>Photos</span>
                  </div>
                  {videoCount > 0 ? (
                    <div className="sd-dash-feature__stat">
                      <strong>{videoCount.toLocaleString()}</strong>
                      <span>Videos</span>
                    </div>
                  ) : null}
                  <div className="sd-dash-feature__stat">
                    <strong>
                      {featuredAlbum?.isPublic || featuredAlbum?.shared ? 'Shared' : 'Private'}
                    </strong>
                    <span>Visibility</span>
                  </div>
                </div>
                <div className="sd-dash-feature__cta">
                  <Link
                    to={featuredAlbum ? '/studio/albums' : '/client-images'}
                    className="sd-dash-btn sd-dash-btn--primary"
                  >
                    Open gallery
                    <ArrowUpRight className="sd-dash-icon-sm" aria-hidden />
                  </Link>
                  <Link to="/studio/shared-albums" className="sd-dash-btn sd-dash-btn--ghost">
                    <Share2 className="sd-dash-icon-sm" aria-hidden />
                    Share
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="sd-dash-feature__empty">
              <Camera className="sd-dash-empty__icon" aria-hidden />
              <h2>Your studio library is ready</h2>
              <p>Upload your first photo collection to begin organizing and sharing your work.</p>
              <div className="sd-dash-feature__cta">
                <Link to="/upload" className="sd-dash-btn sd-dash-btn--primary">
                  Upload media
                </Link>
                <Link to="/studio/albums" className="sd-dash-btn sd-dash-btn--ghost">
                  Create album
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="sd-dash-pulse" aria-label="Studio pulse">
          {[
            {
              value: photosCount.toLocaleString(),
              label: 'Photos',
              hint: uploadsThisWeek > 0 ? `${uploadsThisWeek} added this week` : 'Across your library',
            },
            {
              value: albumCount.toLocaleString(),
              label: 'Active albums',
              hint: albums.filter((a) => (a.imageCount || 0) > 0).length
                ? `${albums.filter((a) => (a.imageCount || 0) > 0).length} with photos`
                : 'Ready to create',
            },
            {
              value: sharedAlbumCount.toLocaleString(),
              label: 'Shared galleries',
              hint: 'Client-ready links',
            },
            {
              value: (clientCount > 0 ? clientCount : videoCount).toLocaleString(),
              label: clientCount > 0 ? 'Clients' : 'Videos',
              hint:
                clientCount > 0
                  ? stats.clientsTrendLabel || 'Connected clients'
                  : 'In your library',
            },
          ].map((item) => (
            <article key={item.label} className="sd-dash-pulse__item">
              <p className="sd-dash-pulse__value">{item.value}</p>
              <p className="sd-dash-pulse__label">{item.label}</p>
              <p className="sd-dash-pulse__hint">{item.hint}</p>
            </article>
          ))}
        </section>

        <section className="sd-dash-section" aria-labelledby="recent-photos-heading">
          <SectionHeader
            title="Recently added"
            action={
              <div className="sd-dash-filters">
                {(['all', 'photos', 'videos'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`sd-dash-chip${mediaFilter === f ? ' is-active' : ''}`}
                    onClick={() => setMediaFilter(f)}
                    aria-pressed={mediaFilter === f}
                  >
                    {f === 'all' ? 'All media' : f === 'photos' ? 'Photos' : 'Videos'}
                  </button>
                ))}
                <Link to="/client-images" className="sd-dash-link">
                  View gallery
                  <ArrowUpRight className="sd-dash-icon-sm" aria-hidden />
                </Link>
              </div>
            }
          />
          <h2 id="recent-photos-heading" className="sr-only">
            Recently added photos
          </h2>

          {filteredRecentPhotos.length === 0 ? (
            <EmptyBlock
              title={q ? 'No photos match your search' : 'Your studio library is ready'}
              description={
                q
                  ? 'Try another keyword or clear the active filters.'
                  : 'Upload your first photo collection to begin organizing and sharing your work.'
              }
              actionLabel={q ? undefined : 'Upload photos'}
              actionTo={q ? undefined : '/upload'}
              icon={Images}
            />
          ) : (
            <div className="sd-dash-mosaic">
              {filteredRecentPhotos.map((img, index) => {
                const video = isVideoType(img.fileType, photoTitle(img), img.mediaType);
                const role = mosaicRole(index);
                const albumHint = (img.albumName as string) || '';
                return (
                  <Link
                    key={String(img.id)}
                    to="/client-images"
                    className={`sd-dash-photo sd-dash-photo--${role}`}
                  >
                    <div className="sd-dash-photo__media">
                      <DashboardGalleryPhoto image={img} alt="" />
                      {video ? <span className="sd-dash-photo__badge">Video</span> : null}
                      <div className="sd-dash-photo__overlay">
                        <span className="sd-dash-photo__title">
                          {albumHint || photoTitle(img)}
                        </span>
                        <span className="sd-dash-photo__time">
                          {formatRelativeTime(img.createdAt || img.uploadTime)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {q && filteredRecentPhotos.length === 0 ? (
            <button
              type="button"
              className="sd-dash-btn sd-dash-btn--ghost sd-dash-clear-filters"
              onClick={() => {
                setSearchQuery('');
                setMediaFilter('all');
              }}
            >
              Clear filters
            </button>
          ) : null}
        </section>

        <div className="sd-dash-split">
          <section className="sd-dash-section" aria-labelledby="albums-heading">
            <SectionHeader
              title="Album stories"
              action={
                <Link to="/studio/albums" className="sd-dash-link">
                  View all albums
                  <ArrowUpRight className="sd-dash-icon-sm" aria-hidden />
                </Link>
              }
            />
            <h2 id="albums-heading" className="sr-only">
              Album stories
            </h2>

            {filteredAlbums.length === 0 ? (
              <EmptyBlock
                title={q ? 'No albums match your search' : 'Create your first visual story'}
                description={
                  q
                    ? 'Try a different search term.'
                    : 'Albums help organize important events and client galleries.'
                }
                actionLabel={q ? undefined : 'Create album'}
                actionTo={q ? undefined : '/studio/albums'}
                icon={Folder}
              />
            ) : (
              <div className="sd-dash-album-grid">
                {filteredAlbums.map((album, index) => (
                  <Link
                    key={album.id}
                    to="/studio/albums"
                    className={`sd-dash-album${index === 0 ? ' sd-dash-album--lead' : ''}`}
                  >
                    <div className="sd-dash-album__cover">
                      <CoverImage
                        src={album.coverImageUrl}
                        alt={`Album cover for ${album.name}`}
                        className="sd-dash-album__img"
                      />
                      {(album.isPublic || album.shared) && (
                        <span className="sd-dash-album__share">Shared</span>
                      )}
                    </div>
                    <div className="sd-dash-album__body">
                      <h3 className="sd-dash-album__title">{album.name}</h3>
                      <p className="sd-dash-album__sub">
                        {(album.imageCount ?? 0).toLocaleString()} photos
                        {album.updatedAt || album.createdAt
                          ? ` · ${formatShortDate(album.updatedAt || album.createdAt)}`
                          : ''}
                        {album.updatedAt
                          ? ` · ${formatRelativeTime(album.updatedAt)}`
                          : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <aside className="sd-dash-rail">
            {needsAttention.length > 0 ? (
              <section className="sd-dash-panel" aria-labelledby="attention-heading">
                <SectionHeader title="Continue working" />
                <h2 id="attention-heading" className="sr-only">
                  Continue working
                </h2>
                <ul className="sd-dash-attention">
                  {needsAttention.map((item) => (
                    <li key={item.id} className="sd-dash-attention__item">
                      <div className="sd-dash-attention__thumb">
                        <CoverImage src={item.thumb} alt="" />
                      </div>
                      <div className="sd-dash-attention__body">
                        <p className="sd-dash-attention__title">{item.title}</p>
                        <p className="sd-dash-attention__detail">{item.detail}</p>
                      </div>
                      <Link to={item.to} className="sd-dash-btn sd-dash-btn--tiny">
                        {item.actionLabel}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="sd-dash-panel" aria-labelledby="activity-heading">
              <SectionHeader title="Activity" />
              <h2 id="activity-heading" className="sr-only">
                Activity
              </h2>
              <div className="sd-dash-tabs" role="tablist" aria-label="Activity type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activityTab === 'studio'}
                  className={`sd-dash-tab${activityTab === 'studio' ? ' is-active' : ''}`}
                  onClick={() => setActivityTab('studio')}
                >
                  Studio
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activityTab === 'people'}
                  className={`sd-dash-tab${activityTab === 'people' ? ' is-active' : ''}`}
                  onClick={() => setActivityTab('people')}
                >
                  People
                </button>
              </div>

              {activityTab === 'studio' ? (
                activityItems.length === 0 ? (
                  <EmptyBlock
                    title="Everything is quiet for now"
                    description="Uploads, client selections, shares, and downloads will appear here."
                    icon={Clock}
                  />
                ) : (
                  <ul className="sd-dash-activity">
                    {activityItems.map((item) => (
                      <li key={item.id}>
                        <Link to={item.to} className="sd-dash-activity__row">
                          <div className="sd-dash-activity__thumb">
                            <CoverImage src={item.preview} alt="" />
                          </div>
                          <div className="sd-dash-activity__body">
                            <p>{item.text}</p>
                            <span>
                              <time dateTime={new Date(item.sortAt).toISOString()}>{item.time}</time>
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <>
                  <div className="sd-dash-people-head">
                    <p className="sd-dash-people-head__hint">Faces detected in your library</p>
                    <Link to="/filter-images" className="sd-dash-link">
                      People Frame
                      <ArrowUpRight className="sd-dash-icon-sm" aria-hidden />
                    </Link>
                  </div>
                  {facePersonsLoading ? (
                    <div className="sd-dash-people-skel">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="sd-dash-skel sd-dash-skel--avatar" />
                      ))}
                    </div>
                  ) : detectedPeople.length === 0 ? (
                    <div className="sd-dash-people-empty">
                      <ScanFace aria-hidden />
                      <p>No faces detected yet. Upload portraits and they appear here.</p>
                    </div>
                  ) : (
                    <div className="sd-dash-people">
                      {detectedPeople.slice(0, VISIBLE_PEOPLE).map((person, index) => (
                        <DashboardPersonAvatar
                          key={person.personId || `person-${index}`}
                          person={person}
                        />
                      ))}
                      {totalDetectedPeople > VISIBLE_PEOPLE ? (
                        <Link to="/filter-images" className="sd-dash-people-more">
                          +{totalDetectedPeople - VISIBLE_PEOPLE}
                          <span>View all</span>
                        </Link>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="sd-dash-panel sd-dash-shortcuts" aria-label="Quick links">
              <Link to="/client-images" className="sd-dash-shortcut">
                <Images aria-hidden />
                <span>Photo gallery</span>
              </Link>
              <Link to="/studio/clients" className="sd-dash-shortcut">
                <Users aria-hidden />
                <span>Clients</span>
              </Link>
              <Link to="/studio/shared-albums" className="sd-dash-shortcut">
                <Heart aria-hidden />
                <span>Shared albums</span>
              </Link>
              <Link to="/invitations" className="sd-dash-shortcut">
                <Share2 aria-hidden />
                <span>Invite client</span>
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default StudioDashboard;
