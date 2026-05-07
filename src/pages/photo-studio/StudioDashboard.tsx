import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  FaCamera,
  FaUsers,
  FaImages,
  FaPlus,
  FaChartLine,
  FaFolder,
  FaArrowUp,
  FaArrowDown,
  FaEye,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import './StudioDashboard.css';
import adminService from '../../api/services/adminService';
import api from '../../api/client/axiosInstance';
import DashboardLoading from '../../components/common/DashboardLoading';
import { useAuth } from '../../state/context/AuthContext';

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

interface RecentActivity {
  id: string;
  type: 'upload' | 'client' | 'session';
  message: string;
  timestamp: string;
  clientName?: string;
}

interface RecentClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastSession: string;
  totalPhotos: number;
  avatar?: string;
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

// ── Timestamp formatter ──────────────────────────────────────────────────────
// Handles: ISO strings, epoch ms strings, epoch numbers, "X ago" strings
function formatActivityTime(raw: string | number | undefined | null): string {
  if (!raw && raw !== 0) return '';

  // Already a plain relative label with no parseable date — pass through
  const str = String(raw).trim();
  if (/^\d+\s*(mins?|hours?|days?|weeks?)\s*ago$/i.test(str)) return str;
  if (/^just now$/i.test(str)) return str;

  // Try to parse as epoch ms (number or numeric string)
  const asNum = Number(str);
  const date = !isNaN(asNum) && asNum > 1_000_000_000
    ? new Date(asNum > 9_999_999_999 ? asNum : asNum * 1000) // seconds vs ms
    : new Date(str);

  if (isNaN(date.getTime())) return str; // unparseable — return as-is

  // Time part: "07:03 AM"
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const now = new Date();
  const diffMs  = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);

  // Same calendar day
  const isToday =
    date.getDate()     === now.getDate()   &&
    date.getMonth()    === now.getMonth()  &&
    date.getFullYear() === now.getFullYear();

  // Previous calendar day
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate()     === yesterday.getDate()   &&
    date.getMonth()    === yesterday.getMonth()  &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    if (diffSec < 60)  return 'Just now';
    if (diffMin < 60)  return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
    if (diffHr  < 24)  return `${diffHr} hr${diffHr  === 1 ? '' : 's'} ago`;
  }

  if (isYesterday) return `Yesterday • ${timePart}`;

  // Older: "06 May 2026 • 07:03 AM"
  const datePart = date.toLocaleDateString('en-GB', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
  return `${datePart} • ${timePart}`;
}

const CHART_COLORS = ['#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#14B8A6'];

const StudioDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>({});
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPhotos, setAllPhotos] = useState<UserImageItem[]>([]);
  const [yourPhotosCount, setYourPhotosCount] = useState<number | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumChartData, setAlbumChartData] = useState<ChartDataPoint[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [systemHealthRes, userStatsRes, usageStatsRes] = await Promise.allSettled([
          adminService.getSystemHealth(),
          adminService.getUserStatistics(),
          adminService.getUsageStatistics('month'),
        ]);
        const dashbaordActivities = await api.get('/api/dashboard/summary');
        const nextStats: DashboardStats = {};

        if (userStatsRes.status === 'fulfilled') {
          const totalUsers = userStatsRes.value?.totalUsers;
          if (typeof totalUsers === 'number') nextStats.totalMember = totalUsers;
        }
        if (systemHealthRes.status === 'fulfilled') {
          const totalImages = systemHealthRes.value?.totalImages;
          if (typeof totalImages === 'number') nextStats.totalPhotos = totalImages;
        }
        if (usageStatsRes.status === 'fulfilled') {
          const fileTypeDistribution = usageStatsRes.value?.fileTypeDistribution || {};
          const videoCount = fileTypeDistribution['video'] || fileTypeDistribution['videos'] || undefined;
          if (typeof videoCount === 'number') nextStats.totalVideos = videoCount;
        }

        const summary = dashbaordActivities?.data ?? {};
        if (typeof summary.totalMember === 'number' && !nextStats.totalMember) nextStats.totalMember = summary.totalMember;
        if (typeof summary.totalPhotos === 'number') nextStats.totalPhotos = summary.totalPhotos;
        if (typeof summary.totalVideos === 'number') nextStats.totalVideos = summary.totalVideos;
        if (typeof summary.clientsTrendPercent === 'number') nextStats.clientsTrendPercent = summary.clientsTrendPercent;
        if (typeof summary.clientsTrendLabel === 'string') nextStats.clientsTrendLabel = summary.clientsTrendLabel;
        setStats(nextStats);

        if (Array.isArray(summary.recentActivity)) {
          setRecentActivity(
            summary.recentActivity.map((item: any, idx: number) => ({
              id: String(item.id ?? idx ?? Math.random()),
              type: (item.type === 'client' || item.type === 'session' || item.type === 'upload') ? item.type : 'upload',
              message: String(item.message ?? ''),
              timestamp: String(item.timestamp ?? ''),
              clientName: item.clientName,
            }))
          );
        } else setRecentActivity([]);

        if (typeof summary.yourPhotos === 'number') setYourPhotosCount(summary.yourPhotos);
        else setYourPhotosCount(null);

        let clientsSet = false;
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
                  name: client.name || client.username || (typeof client.email === 'string' ? client.email.split('@')[0] : 'Client'),
                  email: client.email || '',
                  username: client.username,
                  relation: client.relation || 'Client',
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
            const sorted = [...uniqueClients].sort((a, b) => (Number(b.userId) || 0) - (Number(a.userId) || 0));
            setRecentClients(
              sorted.slice(0, 5).map(p => ({
                id: String(p.userId ?? p.username ?? p.email ?? Math.random()),
                name: p.name || p.username || (typeof p.email === 'string' ? p.email.split('@')[0] : 'Client'),
                email: p.email || '',
                phone: '',
                lastSession: '',
                totalPhotos: 0,
                avatar: undefined,
              }))
            );
            clientsSet = true;
          }
        } catch (e) {
          console.error('Error fetching family relationships:', e);
        }

        if (!clientsSet) {
          try {
            const invitationsRes = await api.get('/api/simple-invitations/my-invitations');
            const invitations = Array.isArray(invitationsRes.data) ? invitationsRes.data : invitationsRes.data?.invitations || [];
            const sorted = [...invitations].sort((a: any, b: any) =>
              new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
            );
            setRecentClients(
              sorted.slice(0, 5).map((inv: any) => ({
                id: String(inv.id ?? inv.invitationId ?? Math.random()),
                name: inv.inviteeName || inv.name || (inv.inviteeEmail || inv.email || '').split('@')[0] || 'Client',
                email: inv.inviteeEmail ?? inv.email ?? '',
                phone: inv.phone || '',
                lastSession: inv.updatedAt || inv.createdAt ? new Date(inv.updatedAt || inv.createdAt).toLocaleString() : '',
                totalPhotos: inv.totalPhotos || 0,
                avatar: inv.avatarUrl,
              }))
            );
          } catch {
            setRecentClients([]);
          }
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
  }, []);

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
    if (rest > 0) data.push({ name: t('dashboard.others'), value: rest, color: '#94A3B8' });
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
    <div className="studio-dashboard premium-dashboard">
      <main className="dashboard-main">
        {/* 1. Welcome Header */}
        <section className="welcome-section premium-welcome">
          <div className="welcome-content">
            <h1 className="welcome-greeting">{t('dashboard.welcome', { name: firstName })}</h1>
            <p className="welcome-summary">
              {t('dashboard.welcomeSummary')}
            </p>
          </div>
          <div className="quick-actions">
            <Link to="/invitations" className="quick-action-btn primary">
              <FaPlus />
              {t('dashboard.addClient')}
            </Link>
            <Link to="/upload" className="quick-action-btn secondary">
              <FaImages />
              {t('dashboard.uploadPhotos')}
            </Link>
            <Link to="/studio/albums" className="quick-action-btn secondary">
              <FaFolder />
              {t('dashboard.createAlbum')}
            </Link>
          </div>
        </section>

        {/* 2. Statistics Cards */}
        <section className="stats-grid premium-stats">
          <div className="stat-card premium-card stat-clients">
            <div className="stat-icon-wrap gradient-violet">
              <FaUsers className="stat-icon" />
            </div>
            <div className="stat-body">
              <h3>{(typeof stats.totalMember === 'number' ? stats.totalMember : 0).toLocaleString()}</h3>
              <p>{t('dashboard.totalMember')}</p>
              {typeof stats.clientsTrendPercent === 'number' ? (
                <span className={`stat-trend ${stats.clientsTrendPercent >= 0 ? 'positive' : 'negative'}`}>
                  {t('dashboard.thisMonth', {
                    n: `${stats.clientsTrendPercent >= 0 ? '+' : ''}${stats.clientsTrendPercent}`,
                  })}
                </span>
              ) : stats.clientsTrendLabel ? (
                <span className="stat-trend">{stats.clientsTrendLabel}</span>
              ) : (
                <span className="stat-trend">{t('dashboard.fromFamilyClients')}</span>
              )}
            </div>
          </div>

          <div className="stat-card premium-card stat-albums">
            <div className="stat-icon-wrap gradient-violet">
              <FaFolder className="stat-icon" />
            </div>
            <div className="stat-body">
              <h3>{(stats.totalAlbums ?? albums.length ?? 0).toLocaleString()}</h3>
              <p>{t('dashboard.totalAlbums')}</p>
              <span className="stat-trend">{t('dashboard.imagesCount', { n: totalAlbumImages })}</span>
            </div>
          </div>

          <div className="stat-card premium-card stat-videos">
            <div className="stat-icon-wrap gradient-violet">
              <FaCamera className="stat-icon" />
            </div>
            <div className="stat-body">
              <h3>{(typeof stats.totalVideos === 'number' ? stats.totalVideos : 0).toLocaleString()}</h3>
              <p>{t('dashboard.totalVideos')}</p>
              <span className="stat-trend positive">{t('dashboard.active')}</span>
            </div>
          </div>

          <div className="stat-card premium-card stat-photos">
            <div className="stat-icon-wrap gradient-violet">
              <FaImages className="stat-icon" />
            </div>
            <div className="stat-body">
              <h3>{photosCount.toLocaleString()}</h3>
              <p>{t('dashboard.yourPhotos')}</p>
              <span className="stat-trend">{t('dashboard.allTime')}</span>
            </div>
          </div>
        </section>

        {/* 3. Analytics & Charts */}
        <section className="charts-section premium-charts">
          <div className="chart-card premium-chart-card">
            <div className="chart-header">
              <div className="chart-title-group">
                <FaFolder className="chart-icon" />
                <div>
                  <h3>{t('dashboard.albumStatistics')}</h3>
                  <p>{t('dashboard.topAlbumsByCount')}</p>
                </div>
              </div>
              <Link to="/studio/albums" className="view-all-link">{t('dashboard.viewAllAlbums')}</Link>
            </div>
            <div className="chart-content">
              {albumChartData.length === 0 ? (
                <div className="chart-empty">
                  <FaFolder className="empty-icon" />
                  <p>{t('dashboard.noAlbumsYet')}</p>
                  <Link to="/studio/albums" className="create-link">{t('dashboard.createFirstAlbum')}</Link>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={albumChartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }} cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }} />
                    <Bar dataKey="value" name={t('dashboard.images')} radius={[8, 8, 0, 0]} maxBarSize={48}>
                      {albumChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="chart-card premium-chart-card">
            <div className="chart-header">
              <div className="chart-title-group">
                <FaChartLine className="chart-icon" />
                <div>
                  <h3>{t('dashboard.uploadActivity')}</h3>
                  <p>{t('dashboard.last7Days')}</p>
                </div>
              </div>
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={uploadActivityData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }} />
                  <Line type="monotone" dataKey="count" name={t('dashboard.uploads')} stroke="#6366F1" strokeWidth={2.5} dot={{ fill: '#6366F1', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card premium-chart-card chart-pie-wrap">
            <div className="chart-header">
              <div className="chart-title-group">
                <FaImages className="chart-icon" />
                <div>
                  <h3>{t('dashboard.photoDistribution')}</h3>
                  <p>{t('dashboard.byAlbum')}</p>
                </div>
              </div>
            </div>
            <div className="chart-content">
              {pieChartData.length === 0 ? (
                <div className="chart-empty">
                  <FaImages className="empty-icon" />
                  <p>{t('dashboard.noDataYet')}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={false}
                        labelLine={false}
                      >
                        {pieChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', fontSize: 13 }}
                        formatter={(value: number, name: string, props: any) =>
                          [`${value} ${t('dashboard.images')} (${(props.payload.percent * 100).toFixed(1)}%)`, name]
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Custom legend — full names, no truncation */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '8px 16px',
                    padding: '14px 6px 6px',
                    borderTop: '1px solid #F1F5F9',
                  }}>
                    {pieChartData.map((entry, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                        <span style={{
                          width: 12, height: 12, borderRadius: 4,
                          background: entry.color, flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: 14, fontWeight: 600, color: '#334155',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          lineHeight: 1.5, flex: 1,
                        }} title={entry.name}>
                          {entry.name}
                        </span>
                        <span style={{
                          fontSize: 13, fontWeight: 700, color: '#6366F1',
                          flexShrink: 0, background: '#EEF2FF',
                          borderRadius: 6, padding: '1px 7px',
                        }}>
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4. Recent Activity + 5. Recent Clients */}
        <section className="main-grid premium-main-grid">
          <div className="dashboard-card premium-card activity-feed">
            <div className="card-header">
              <h3>{t('dashboard.recentActivity')}</h3>
              <Link to="/client-images" className="view-all-link">{t('dashboard.viewAll')}</Link>
            </div>
            <div className="activity-list timeline scrollable scrollable-lg scrollable-content">
              {recentActivity.length === 0 ? (
                <div className="activity-item">
                  <div className="activity-icon-wrapper">{getActivityIcon('upload')}</div>
                  <div className="activity-content">
                    <p className="activity-message">{t('dashboard.noRecentActivity')}</p>
                    <span className="activity-time">—</span>
                  </div>
                </div>
              ) : (
                recentActivity.slice(0, 5).map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon-wrapper">{getActivityIcon(activity.type)}</div>
                    <div className="activity-content">
                      <p className="activity-message">{activity.message}</p>
                      <span className="activity-time">{formatActivityTime(activity.timestamp)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="dashboard-card premium-card recent-clients-card">
            <div className="card-header">
              <h3>{t('dashboard.recentClients')}</h3>
              <Link to="/studio/clients" className="view-all-link">{t('dashboard.viewAll')}</Link>
            </div>
            {recentClients.length === 0 ? (
              <div className="clients-list">
                <div className="client-item empty-state">
                  <div className="client-avatar"><span>+</span></div>
                  <div className="client-info">
                    <h4>{t('dashboard.noClientsYet')}</h4>
                    <p>{t('dashboard.addFirstClient')}</p>
                  </div>
                  <Link to="/invitations" className="action-btn primary" title="Add Client"><FaPlus /></Link>
                </div>
              </div>
            ) : (
              <div className="clients-list scrollable scrollable-lg scrollable-content">
                {recentClients.map(client => (
                  <div key={client.id} className="client-item">
                    <div className="client-avatar">
                      {client.avatar ? <img src={client.avatar} alt={client.name} /> : <span>{client.name.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="client-info">
                      <h4>{client.name}</h4>
                      {client.email && <p>{client.email}</p>}
                      <span className="client-meta">
                        {[client.totalPhotos ? `${client.totalPhotos} ${t('dashboard.photosWord')}` : null, client.lastSession].filter(Boolean).join(' • ') || '—'}
                      </span>
                    </div>
                    <div className="client-actions">
                      <Link to={`/studio/clients`} className="action-btn" title="View"><FaEye /></Link>
                      <button type="button" className="action-btn" title="Share gallery"><FaShare /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 6. Quick Access */}
        <section className="quick-access premium-quick-access">
          <div className="section-header">
            <h3>{t('dashboard.quickAccess')}</h3>
            <p>{t('dashboard.quickAccessSubtitle')}</p>
          </div>
          <div className="access-grid">
            <Link to="/studio/clients" className="access-card premium-access-card">
              <div className="access-icon-wrap gradient-indigo"><FaUsers className="access-icon" /></div>
              <h4>{t('dashboard.manageClients')}</h4>
              <p>{t('dashboard.manageClientsDesc')}</p>
              <span className="access-arrow">→</span>
            </Link>
            <Link to="/client-images" className="access-card premium-access-card">
              <div className="access-icon-wrap gradient-cyan"><FaImages className="access-icon" /></div>
              <h4>{t('dashboard.photoGallery')}</h4>
              <p>{t('dashboard.photoGalleryDesc')}</p>
              <span className="access-arrow">→</span>
            </Link>
            <Link to="/studio/albums" className="access-card premium-access-card">
              <div className="access-icon-wrap gradient-violet"><FaFolder className="access-icon" /></div>
              <h4>{t('dashboard.albums')}</h4>
              <p>{t('dashboard.albumsDesc')}</p>
              <span className="access-arrow">→</span>
            </Link>
            <Link to="/upload" className="access-card premium-access-card">
              <div className="access-icon-wrap gradient-amber"><FaPlus className="access-icon" /></div>
              <h4>{t('dashboard.uploadPhotos')}</h4>
              <p>{t('dashboard.uploadPhotosDesc')}</p>
              <span className="access-arrow">→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudioDashboard;
