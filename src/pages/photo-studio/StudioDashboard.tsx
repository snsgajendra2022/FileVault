import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Images, Users, ArrowUpRight, Sparkles, ScanFace } from 'lucide-react';
import {
  FaCamera,
  FaUsers,
  FaImages,
  FaPlus,
  FaChartLine,
  FaFolder,
  FaShare,
} from 'react-icons/fa';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import './StudioDashboard.css';
import adminService from '../../api/services/adminService';
import api from '../../api/client/axiosInstance';
import DashboardLoading from '../../components/common/DashboardLoading';
import { useAuth } from '../../state/context/AuthContext';
import { useDocumentTheme } from '../../hooks/useDocumentTheme';
import {
  fetchFacePersons,
  resolveMediaUrl,
  type FacePerson,
  type FacePersonsResponse,
} from '../../api/services/faceRecognitionService';
import { THEME } from './studioDashboardTheme';

const VISIBLE_PEOPLE = 3;

const EMPTY_FACE_PERSONS: FacePersonsResponse = {
  userId: 0,
  username: '',
  fullName: '',
  totalPersons: 0,
  persons: [],
};

function personInitials(name?: string | null): string {
  const parts = (name ?? '').trim().split(/[\s_]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function DashboardPersonAvatar({ person }: { person: FacePerson }) {
  const [imgError, setImgError] = useState(false);
  const thumb = resolveMediaUrl(person.personThumbnailUrl);

  return (
    <Link
      to={`/filter-images?person=${encodeURIComponent(person.personId)}`}
      className="sd-person-avatar-link group"
      aria-label={`${person.displayName || person.personId}, ${person.imageCount ?? 0} photos`}
    >
      <div className="sd-person-ring">
        {thumb && !imgError ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="sd-person-fallback" aria-hidden>
            {personInitials(person.displayName)}
          </div>
        )}
        {person.isNewPerson && <span className="sd-person-new">New</span>}
      </div>
      <span className="sd-person-name" title={person.displayName || person.personId}>
        {person.displayName || person.personId}
      </span>
      <span className="sd-person-count">{person.imageCount ?? 0} photos</span>
    </Link>
  );
}

function StudioDetectedPeopleStrip({
  persons,
  totalPersons,
  loading,
}: {
  persons: FacePerson[];
  totalPersons: number;
  loading: boolean;
}) {
  const visible = persons.slice(0, VISIBLE_PEOPLE);
  const hiddenCount = Math.max(0, persons.length - VISIBLE_PEOPLE);

  return (
    <div className="sd-people-hub">
      <div className="sd-people-hub__glow" aria-hidden />
      <div className="sd-people-hub__inner">
        <div className="sd-people-hub__header">
          <div className="sd-people-hub__title-block">
            <span className="sd-people-hub__badge">
              <ScanFace className="h-3.5 w-3.5" />
              AI Face Match
            </span>
            <h4 className="sd-people-hub__title">Your people</h4>
            <p className="sd-people-hub__subtitle">
              Tap a face to jump straight into their photo collection
            </p>
          </div>
          <div className="sd-people-hub__actions">
            {totalPersons > 0 && (
              <div className="sd-people-hub__stat">
                <span className="sd-people-hub__stat-value">{totalPersons}</span>
                <span className="sd-people-hub__stat-label">detected</span>
              </div>
            )}
            <Link to="/filter-images" className="sd-people-hub__cta">
              People Frame
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="sd-people-hub__body">
          {loading ? (
            <div className="sd-people-hub__skeletons">
              {[0, 1, 2].map((i) => (
                <div key={i} className="sd-people-hub__skel">
                  <div className="sd-people-hub__skel-avatar" />
                  <div className="sd-people-hub__skel-line" />
                </div>
              ))}
            </div>
          ) : persons.length === 0 ? (
            <div className="sd-people-hub__empty">
              <div className="sd-people-hub__empty-icon">
                <ScanFace className="h-7 w-7" />
              </div>
              <p className="sd-people-hub__empty-title">No faces detected yet</p>
              <p className="sd-people-hub__empty-desc">
                Upload portraits or event photos — faces appear here automatically.
              </p>
              {/* <Link to="/upload" className="sd-people-hub__empty-link">
                Upload photos
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link> */}
            </div>
          ) : (
            <div className="sd-people-hub__strip">
              {visible.map((person, index) => (
                <DashboardPersonAvatar
                  key={person.personId || `person-${index}`}
                  person={person}
                />
              ))}
              {hiddenCount > 0 && (
                <Link
                  to="/filter-images"
                  className="sd-view-more-people"
                  aria-label={`View ${hiddenCount} more people`}
                >
                  <div className="sd-view-more-stack" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="sd-view-more-count">+{hiddenCount}</span>
                  <span>View all</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid var(--sd-tooltip-border)',
  boxShadow: 'var(--sd-shadow-medium)',
  fontSize: 12,
  padding: '8px 12px',
  color: 'var(--sd-text-primary)',
  background: 'var(--sd-tooltip-bg)',
};

// Chart colors using theme palette
const CHART_COLORS = THEME.chartColors;

interface DashboardStats {
  totalMember?: number;
  clientsTrendPercent?: number;
  clientsTrendLabel?: string;
  totalPhotos?: number;
  totalVideos?: number;
  totalRevenue?: number;
  recentUploads?: number;
  activeSessions?: number;
  totalAlbums?: number;
}

interface UserImageItem {
  id: string | number;
  url?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  uploadTime?: string;
  fileType?: string;
  [key: string]: any;
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
}

interface ChartDataPoint {
  label: string;
  value: number;
  color: string;
}

const StudioDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [allPhotos, setAllPhotos] = useState<UserImageItem[]>([]);
  const [yourPhotosCount, setYourPhotosCount] = useState<number | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumChartData, setAlbumChartData] = useState<ChartDataPoint[]>([]);
  const { user, isAdmin } = useAuth();
  const { theme: colorMode } = useDocumentTheme();
  const chartTickColor = colorMode === 'dark' ? '#94a3b8' : '#64748b';
  const chartGridColor = colorMode === 'dark' ? '#334155' : '#f1f5f9';

  const truncateLabel = (value: unknown, max = 12) => {
    const s = String(value ?? '');
    if (s.length <= max) return s;
    return `${s.slice(0, Math.max(0, max - 1))}…`;
  };

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
    const fetchDashboardData = async () => {
      setLoading(true);
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
        if (typeof summary.totalMember === 'number' && !nextStats.totalMember) nextStats.totalMember = summary.totalMember;
        if (typeof summary.totalPhotos === 'number') nextStats.totalPhotos = summary.totalPhotos;
        if (typeof summary.totalVideos === 'number') nextStats.totalVideos = summary.totalVideos;
        if (typeof summary.clientsTrendPercent === 'number') nextStats.clientsTrendPercent = summary.clientsTrendPercent;
        if (typeof summary.clientsTrendLabel === 'string') nextStats.clientsTrendLabel = summary.clientsTrendLabel;
        setStats(nextStats);

        if (typeof summary.yourPhotos === 'number') setYourPhotosCount(summary.yourPhotos);
        else setYourPhotosCount(null);

        try {
          const familyRes = await api.get('/api/simple-invitations/family-relationships');
          const family = familyRes.data?.familyData || familyRes.data || {};
          const allClients: any[] = [];
          const flattenClients = (clients: any[]) => {
            if (!Array.isArray(clients)) return;
            clients.forEach((client: any) => {
              if (client?.relation === 'Client') {
                allClients.push({
                  id: client.userId,
                  userId: client.userId,
                });
              }
              if (client?.clients?.length) flattenClients(client.clients);
            });
          };
          if (family.clients?.length) flattenClients(family.clients);
          const uniqueClients = allClients.filter((c, i, self) => i === self.findIndex(x => x.id === c.id));
          if (uniqueClients.length > 0) {
            nextStats.totalMember = uniqueClients.length;
            setStats(prev => ({ ...prev, totalMember: uniqueClients.length }));
          }
        } catch (e) {
          console.error('Error fetching family relationships:', e);
        }

        const token = localStorage.getItem('token');
        if (token) {
          const imagesRes = await api.get(`/api/images/user/all?token=${token}`);
          const items = Array.isArray(imagesRes.data) ? imagesRes.data : imagesRes.data?.images || [];
          setAllPhotos(items || []);
        } else setAllPhotos([]);

        try {
          const albumsRes = await api.get('/api/albums');
          const albumsData = Array.isArray(albumsRes.data) ? albumsRes.data : albumsRes.data?.albums || [];
          setAlbums(albumsData);
          if (albumsData.length > 0) setStats(prev => ({ ...prev, totalAlbums: albumsData.length }));

          const sortedAlbums = [...albumsData].sort((a, b) => (b.imageCount || 0) - (a.imageCount || 0)).slice(0, 6);
          setAlbumChartData(
            sortedAlbums.map((album, i) => ({
              label: album.name || `Album ${album.id}`,
              value: album.imageCount || 0,
              color: CHART_COLORS[i % CHART_COLORS.length],
            }))
          );
        } catch (e) {
          console.error('Error fetching albums:', e);
          setAlbums([]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [isAdmin]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload': return <FaImages className="activity-icon upload" />;
      case 'client': return <FaUsers className="activity-icon client" />;
      case 'session': return <FaCamera className="activity-icon session" />;
      default: return <FaImages className="activity-icon" />;
    }
  };

  const totalAlbumImages = useMemo(() => albums.reduce((sum, a) => sum + (a.imageCount || 0), 0), [albums]);

  // Last 7 days upload activity (from allPhotos createdAt/uploadTime)
  const uploadActivityData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: { name: string; date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      result.push({
        name: dayNames[d.getDay()],
        date: d.toISOString().slice(0, 10),
        count: 0,
      });
    }
    allPhotos.forEach(img => {
      const raw = img.createdAt || img.uploadTime || (img as any).uploadTime;
      if (!raw) return;
      const date = new Date(raw).toISOString().slice(0, 10);
      const row = result.find(r => r.date === date);
      if (row) row.count += 1;
    });
    return result.map(({ name, date, count }) => ({ name: `${name} ${date.slice(5)}`, count }));
  }, [allPhotos]);

  // Photo distribution pie (by album – top 5 + Others)
  const pieChartData = useMemo(() => {
    const top = [...albums].sort((a, b) => (b.imageCount || 0) - (a.imageCount || 0)).slice(0, 5);
    const total = top.reduce((s, a) => s + (a.imageCount || 0), 0);
    const rest = totalAlbumImages - total;
    const data = top.map((a, i) => ({
      name: a.name || `Album ${a.id}`,   // full name — no truncation
      value: a.imageCount || 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
    if (rest > 0) data.push({ name: t('dashboard.others'), value: rest, color: THEME.textMuted });
    return data;
  }, [albums, totalAlbumImages, t]);

  const photosCount = typeof yourPhotosCount === 'number' ? yourPhotosCount : allPhotos.length;

  if (loading) {
    return (
      <DashboardLoading
        title={t('dashboard.loadingTitle')}
        subtitle={t('dashboard.loadingSubtitle')}
        icon={FaCamera}
      />
    );
  }

  const firstName = user?.firstName ?? 'there';

  return (
    <div className="studio-dashboard premium-dashboard sd-page sd-dashboard-v2">
      <main className="sd-dashboard-main relative w-full">
        {/* 1. Welcome Hero */}
        <section className="sd-hero-shell mb-6">
          <div className="sd-hero-shell__glow" aria-hidden />
          <div className="sd-hero-panel sd-hero-panel--premium relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 sd-hero-panel__mesh" aria-hidden />
          <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full sd-hero-panel__orb" aria-hidden />

          <div className="relative flex flex-col gap-5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-7 lg:px-8">
            <div className="flex-1 min-w-0">
              <p className="sd-hero-eyebrow">
                <Sparkles className="h-3.5 w-3.5" />
                Studio overview
              </p>
              <h1 className="sd-hero-title">
                {t('dashboard.welcome', { name: firstName })}
              </h1>
              <p className="sd-hero-subtitle">
                {t('dashboard.welcomeSummary')}
              </p>

              <div className="sd-hero-stats">
                <span className="sd-hero-stat">
                  <FaImages className="h-3.5 w-3.5" />
                  <span className="sd-hero-stat__value">{photosCount.toLocaleString()}</span>
                  <span className="sd-hero-stat__label">{t('dashboard.photosUploaded')}</span>
                </span>
                <span className="sd-hero-stat">
                  <FaUsers className="h-3.5 w-3.5" />
                  <span className="sd-hero-stat__value">{(typeof stats.totalMember === 'number' ? stats.totalMember : 0)}</span>
                  <span className="sd-hero-stat__label">{t('dashboard.activeClients')}</span>
                </span>
                <span className="sd-hero-stat">
                  <FaFolder className="h-3.5 w-3.5" />
                  <span className="sd-hero-stat__value">{(stats.totalAlbums ?? 0)}</span>
                  <span className="sd-hero-stat__label">{t('dashboard.albumsCreated')}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-4 shrink-0">
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                <Link to="/upload" className="sd-hero-btn sd-hero-btn--primary justify-center">
                  <FaImages className="h-3.5 w-3.5" />
                  {t('dashboard.uploadPhotos')}
                </Link>
                <Link to="/studio/albums" className="sd-hero-btn sd-hero-btn--ghost justify-center">
                  <FaFolder className="h-3.5 w-3.5" />
                  {t('dashboard.createAlbum')}
                </Link>
                <Link to="/invitations" className="sd-hero-btn sd-hero-btn--ghost justify-center">
                  <FaShare className="h-3.5 w-3.5" />
                  {t('dashboard.addClient')}
                </Link>
              </div>

              <div className="hidden sm:flex items-end gap-2 opacity-90 select-none pointer-events-none sd-hero-deco">
                <div className="relative">
                  <div className="sd-hero-deco__camera">
                    <div className="sd-hero-deco__lens">
                      <div className="sd-hero-deco__lens-inner" />
                    </div>
                    <div className="sd-hero-deco__flash" />
                  </div>
                </div>
                <div className="flex flex-col items-center mb-1">
                  <div className="text-lg">🌸</div>
                  <div className="sd-hero-deco__pot" />
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* 2. KPI cards */}
        <section className="sd-stat-grid mb-6">
          {[
            {
              icon: FaUsers,
              iconBg: 'sd-icon-badge',
              iconColor: 'text-[#2563EB]',
              sparkColor: THEME.primary,
              value: (typeof stats.totalMember === 'number' ? stats.totalMember : 0).toLocaleString(),
              label: t('dashboard.totalMember'),
              trend: typeof stats.clientsTrendPercent === 'number'
                ? `${stats.clientsTrendPercent >= 0 ? '+' : ''}${stats.clientsTrendPercent}% this month`
                : stats.clientsTrendLabel || t('dashboard.fromFamilyClients'),
              trendUp: (stats.clientsTrendPercent ?? 0) >= 0,
              spark: [2, 3, 2, 5, 4, 7, 6],
            },
            {
              icon: FaFolder,
              iconBg: 'sd-icon-badge',
              iconColor: 'text-[#2563EB]',
              sparkColor: THEME.primary,
              value: (stats.totalAlbums ?? albums.length ?? 0).toLocaleString(),
              label: t('dashboard.totalAlbums'),
              trend: t('dashboard.imagesCount', { n: totalAlbumImages }),
              trendUp: true,
              spark: [3, 4, 3, 6, 5, 8, 7],
            },
            {
              icon: FaCamera,
              iconBg: 'sd-icon-badge',
              iconColor: 'text-[#2563EB]',
              sparkColor: THEME.primary,
              value: (typeof stats.totalVideos === 'number' ? stats.totalVideos : 0).toLocaleString(),
              label: t('dashboard.totalVideos'),
              trend: t('dashboard.active'),
              trendUp: true,
              spark: [0, 0, 0, 0, 0, 0, 0],
            },
            {
              icon: FaImages,
              iconBg: 'sd-icon-badge',
              iconColor: 'text-[#2563EB]',
              sparkColor: THEME.primary,
              value: photosCount.toLocaleString(),
              label: t('dashboard.yourPhotos'),
              trend: t('dashboard.allTime'),
              trendUp: true,
              spark: [10, 20, 15, 30, 25, 40, 35],
            },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                className="sd-stat-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="sd-stat-card__inner">
                  <div className="sd-stat-card__top">
                    <div className="sd-stat-card__icon">
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="sd-stat-card__spark">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={card.spark.map((v, i) => ({ v, i }))}>
                          <Line type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <p className="sd-stat-card__value">{card.value}</p>
                  <p className="sd-stat-card__label">{card.label}</p>
                  <span className={`sd-stat-card__trend ${card.trendUp ? 'sd-stat-card__trend--up' : 'sd-stat-card__trend--down'}`}>
                    {card.trendUp ? '↑' : '↓'} {card.trend}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* 3. Analytics */}
        <section className="sd-analytics-grid mb-6">
          <div className="sd-chart-panel">
            <div className="sd-chart-panel__glow" aria-hidden />
            <div className="sd-chart-panel__inner">
            <header className="sd-chart-panel__header">
              <div className="sd-chart-panel__header-left">
                <span className="sd-panel__eyebrow">
                  <FaFolder className="h-3.5 w-3.5" />
                  Albums
                </span>
                <h3 className="sd-panel__title">{t('dashboard.albumStatistics')}</h3>
                <p className="sd-panel__subtitle">{t('dashboard.topAlbumsByCount')}</p>
              </div>
              <Link to="/studio/albums" className="sd-panel__link">
                {t('dashboard.viewAllAlbums')}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </header>
            <div className="sd-chart-panel__body">
            {albumChartData.length === 0 ? (
              <div className="sd-chart-panel__empty">
                <FaFolder className="h-10 w-10" />
                <p>{t('dashboard.noAlbumsYet')}</p>
                <Link to="/studio/albums" className="sd-panel__link">
                  {t('dashboard.createFirstAlbum')}
                </Link>
              </div>
            ) : (
              <div className="sd-chart-canvas sd-chart-canvas--albums">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={albumChartData}
                    margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                    barSize={14}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
                    <XAxis type="number" tick={{ fill: chartTickColor, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={108}
                      tickFormatter={(v) => truncateLabel(v, 14)}
                      tick={{ fill: chartTickColor, fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(37,99,235,0.06)' }} />
                    <Bar dataKey="value" name={t('dashboard.images')} radius={[0, 6, 6, 0]}>
                      {albumChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            </div>
            </div>
          </div>

          <div className="sd-chart-panel">
            <div className="sd-chart-panel__glow sd-chart-panel__glow--alt" aria-hidden />
            <div className="sd-chart-panel__inner">
            <header className="sd-chart-panel__header">
              <div className="sd-chart-panel__header-left">
                <span className="sd-panel__eyebrow">
                  <FaChartLine className="h-3.5 w-3.5" />
                  Activity
                </span>
                <h3 className="sd-panel__title">{t('dashboard.uploadActivity')}</h3>
                <p className="sd-panel__subtitle">{t('dashboard.last7Days')}</p>
              </div>
            </header>
            <div className="sd-chart-panel__body">
            <div className="sd-chart-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={uploadActivityData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="uploadGradStudio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.primary} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={THEME.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickFormatter={(v) => String(v ?? '').split(' ')[0]}
                    interval="preserveStartEnd"
                    tick={{ fill: chartTickColor, fontSize: 11, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fill: chartTickColor, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="count" name={t('dashboard.uploads')}
                    stroke={THEME.primary} strokeWidth={2.5}
                    dot={{ fill: THEME.primary, strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 6, fill: THEME.primary, stroke: colorMode === 'dark' ? '#1e293b' : '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            </div>
            </div>
          </div>
        </section>

        {/* 5. Quick Access — premium hub (hero above untouched) */}
        <section className="sd-quick-hub-section mb-10">
          <div className="sd-quick-hub-section__header">
            <div>
              <p className="sd-quick-hub-section__eyebrow">
                <Sparkles className="h-3.5 w-3.5" />
                {t('dashboard.quickAccess')}
              </p>
              <h3 className="sd-quick-hub-section__title">{t('dashboard.quickAccessSubtitle')}</h3>
            </div>
          </div>

          <StudioDetectedPeopleStrip
            persons={detectedPeople}
            totalPersons={totalDetectedPeople}
            loading={facePersonsLoading}
          />

          <div className="sd-bento">
            {/* Featured — People Frame */}
            <motion.div
              className="sd-bento__featured"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link to="/filter-images" className="sd-bento-featured-card group">
                <div className="sd-bento-featured-card__mesh" aria-hidden />
                <div className="sd-bento-featured-card__orb sd-bento-featured-card__orb--1" aria-hidden />
                <div className="sd-bento-featured-card__orb sd-bento-featured-card__orb--2" aria-hidden />
                <div className="sd-bento-featured-card__top">
                  <div className="sd-bento-featured-card__icon">
                    <ScanFace className="h-6 w-6" />
                  </div>
                  <span className="sd-bento-featured-card__pill">
                    <span className="sd-bento-featured-card__live" />
                    {totalDetectedPeople > 0 ? `${totalDetectedPeople} faces` : 'Ready'}
                  </span>
                </div>
                <div className="sd-bento-featured-card__body">
                  <h4 className="sd-bento-featured-card__heading">People Frame</h4>
                  <p className="sd-bento-featured-card__text">
                    Filter every shoot by face. Instant previews, silky quality upgrades.
                  </p>
                  {detectedPeople.length > 0 && (
                    <div className="sd-bento-featured-card__faces">
                      {detectedPeople.slice(0, 5).map((p, i) => (
                        <div
                          key={p.personId || `bento-${i}`}
                          className="sd-bento-featured-card__face"
                          style={{ zIndex: 5 - i }}
                        >
                          {p.personThumbnailUrl ? (
                            <img src={resolveMediaUrl(p.personThumbnailUrl)} alt="" />
                          ) : (
                            <span>{personInitials(p.displayName)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="sd-bento-featured-card__footer">
                  <span>Open face filter</span>
                  <span className="sd-bento-featured-card__arrow">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Action tiles */}
            <div className="sd-bento__grid">
              {[
                {
                  to: '/client-images',
                  icon: Images,
                  title: t('dashboard.photoGallery'),
                  desc: t('dashboard.photoGalleryDesc'),
                  stat: photosCount.toLocaleString(),
                  statLabel: 'photos',
                  accent: 'blue',
                  delay: 0.06,
                },
                {
                  to: '/studio/albums',
                  icon: FaFolder,
                  title: t('dashboard.albums'),
                  desc: t('dashboard.albumsDesc'),
                  stat: String(stats.totalAlbums ?? albums.length ?? 0),
                  statLabel: 'albums',
                  accent: 'indigo',
                  delay: 0.12,
                },
                {
                  to: '/upload',
                  icon: FaPlus,
                  title: t('dashboard.uploadPhotos'),
                  desc: t('dashboard.uploadPhotosDesc'),
                  stat: 'Ready',
                  statLabel: 'to upload',
                  accent: 'sky',
                  delay: 0.18,
                },
                {
                  to: '/studio/clients',
                  icon: Users,
                  title: t('dashboard.manageClients'),
                  desc: t('dashboard.manageClientsDesc'),
                  stat: String(typeof stats.totalMember === 'number' ? stats.totalMember : 0),
                  statLabel: 'clients',
                  accent: 'violet',
                  delay: 0.24,
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.to}
                    className="sd-bento__cell"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: card.delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link to={card.to} className={`sd-bento-tile sd-bento-tile--${card.accent} group`}>
                      <div className="sd-bento-tile__shine" aria-hidden />
                      <div className="sd-bento-tile__icon-wrap">
                        <Icon className="sd-bento-tile__icon" />
                      </div>
                      <div className="sd-bento-tile__content">
                        <h5 className="sd-bento-tile__title">{card.title}</h5>
                        <p className="sd-bento-tile__desc">{card.desc}</p>
                        <div className="sd-bento-tile__stat">
                          <span className="sd-bento-tile__stat-value">{card.stat}</span>
                          <span className="sd-bento-tile__stat-label">{card.statLabel}</span>
                        </div>
                      </div>
                      <span className="sd-bento-tile__go" aria-hidden>
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudioDashboard;
