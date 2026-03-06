import React, { useState, useEffect, useMemo } from 'react';
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
  Legend,
} from 'recharts';
import './StudioDashboard.css';
import adminService from '../../services/adminService';
import api from '../../services/api';
import DashboardLoading from '../../components/common/DashboardLoading';
import { useAuth } from '../../context/AuthContext';

interface DashboardStats {
  totalClients?: number;
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

const CHART_COLORS = ['#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#14B8A6'];

const StudioDashboard: React.FC = () => {
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
          if (typeof totalUsers === 'number') nextStats.totalClients = totalUsers;
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
        if (typeof summary.totalClients === 'number' && !nextStats.totalClients) nextStats.totalClients = summary.totalClients;
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
            nextStats.totalClients = uniqueClients.length;
            setStats(prev => ({ ...prev, totalClients: uniqueClients.length }));
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
      name: (a.name || `Album ${a.id}`).slice(0, 12) + (a.name && a.name.length > 12 ? '…' : ''),
      value: a.imageCount || 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
    if (rest > 0) data.push({ name: 'Others', value: rest, color: '#94A3B8' });
    return data;
  }, [albums, totalAlbumImages]);

  const photosCount = typeof yourPhotosCount === 'number' ? yourPhotosCount : allPhotos.length;

  if (loading) {
    return (
      <DashboardLoading
        title="Loading Dashboard"
        subtitle="Preparing your studio..."
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
            <h1 className="welcome-greeting">Welcome back, {firstName}</h1>
            <p className="welcome-summary">
              Here’s what’s happening with your studio today. Manage clients, albums, and photos in one place.
            </p>
          </div>
          <div className="quick-actions">
            <Link to="/invitations" className="quick-action-btn primary">
              <FaPlus />
              Add Client
            </Link>
            <Link to="/upload" className="quick-action-btn secondary">
              <FaImages />
              Upload Photos
            </Link>
            <Link to="/studio/albums" className="quick-action-btn secondary">
              <FaFolder />
              Create Album
            </Link>
          </div>
        </section>

        {/* 2. Statistics Cards */}
        <section className="stats-grid premium-stats">
          <div className="stat-card premium-card stat-clients">
            <div className="stat-icon-wrap gradient-indigo">
              <FaUsers className="stat-icon" />
            </div>
            <div className="stat-body">
              <h3>{(typeof stats.totalClients === 'number' ? stats.totalClients : 0).toLocaleString()}</h3>
              <p>Total Clients</p>
              {typeof stats.clientsTrendPercent === 'number' ? (
                <span className={`stat-trend ${stats.clientsTrendPercent >= 0 ? 'positive' : 'negative'}`}>
                  {stats.clientsTrendPercent >= 0 ? '+' : ''}{stats.clientsTrendPercent}% this month
                </span>
              ) : stats.clientsTrendLabel ? (
                <span className="stat-trend">{stats.clientsTrendLabel}</span>
              ) : (
                <span className="stat-trend">From family & clients</span>
              )}
            </div>
          </div>

          <div className="stat-card premium-card stat-albums">
            <div className="stat-icon-wrap gradient-violet">
              <FaFolder className="stat-icon" />
            </div>
            <div className="stat-body">
              <h3>{(stats.totalAlbums ?? albums.length ?? 0).toLocaleString()}</h3>
              <p>Total Albums</p>
              <span className="stat-trend">{totalAlbumImages} images</span>
            </div>
          </div>

          <div className="stat-card premium-card stat-videos">
            <div className="stat-icon-wrap gradient-cyan">
              <FaCamera className="stat-icon" />
            </div>
            <div className="stat-body">
              <h3>{(typeof stats.totalVideos === 'number' ? stats.totalVideos : 0).toLocaleString()}</h3>
              <p>Total Videos</p>
              <span className="stat-trend positive">Active</span>
            </div>
          </div>

          <div className="stat-card premium-card stat-photos">
            <div className="stat-icon-wrap gradient-emerald">
              <FaImages className="stat-icon" />
            </div>
            <div className="stat-body">
              <h3>{photosCount.toLocaleString()}</h3>
              <p>Your Photos</p>
              <span className="stat-trend">All time</span>
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
                  <h3>Album Statistics</h3>
                  <p>Top albums by image count</p>
                </div>
              </div>
              <Link to="/studio/albums" className="view-all-link">View All Albums</Link>
            </div>
            <div className="chart-content">
              {albumChartData.length === 0 ? (
                <div className="chart-empty">
                  <FaFolder className="empty-icon" />
                  <p>No albums yet</p>
                  <Link to="/studio/albums" className="create-link">Create your first album</Link>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={albumChartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }} cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }} />
                    <Bar dataKey="value" name="Images" radius={[8, 8, 0, 0]} maxBarSize={48}>
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
                  <h3>Upload Activity</h3>
                  <p>Last 7 days</p>
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
                  <Line type="monotone" dataKey="count" name="Uploads" stroke="#6366F1" strokeWidth={2.5} dot={{ fill: '#6366F1', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card premium-chart-card chart-pie-wrap">
            <div className="chart-header">
              <div className="chart-title-group">
                <FaImages className="chart-icon" />
                <div>
                  <h3>Photo Distribution</h3>
                  <p>By album</p>
                </div>
              </div>
            </div>
            <div className="chart-content">
              {pieChartData.length === 0 ? (
                <div className="chart-empty">
                  <FaImages className="empty-icon" />
                  <p>No data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }} formatter={(value: number) => [value, 'Images']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        {/* 4. Recent Activity + 5. Recent Clients */}
        <section className="main-grid premium-main-grid">
          <div className="dashboard-card premium-card activity-feed">
            <div className="card-header">
              <h3>Recent Activity</h3>
              <Link to="/client-images" className="view-all-link">View All</Link>
            </div>
            <div className="activity-list timeline">
              {recentActivity.length === 0 ? (
                <div className="activity-item">
                  <div className="activity-icon-wrapper">{getActivityIcon('upload')}</div>
                  <div className="activity-content">
                    <p className="activity-message">No recent activity yet</p>
                    <span className="activity-time">—</span>
                  </div>
                </div>
              ) : (
                recentActivity.slice(0, 5).map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon-wrapper">{getActivityIcon(activity.type)}</div>
                    <div className="activity-content">
                      <p className="activity-message">{activity.message}</p>
                      <span className="activity-time">{activity.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="dashboard-card premium-card recent-clients-card">
            <div className="card-header">
              <h3>Recent Clients</h3>
              <Link to="/studio/clients" className="view-all-link">View All</Link>
            </div>
            {recentClients.length === 0 ? (
              <div className="clients-list">
                <div className="client-item empty-state">
                  <div className="client-avatar"><span>+</span></div>
                  <div className="client-info">
                    <h4>No clients yet</h4>
                    <p>Add your first client to get started.</p>
                  </div>
                  <Link to="/invitations" className="action-btn primary" title="Add Client"><FaPlus /></Link>
                </div>
              </div>
            ) : (
              <div className="clients-list">
                {recentClients.map(client => (
                  <div key={client.id} className="client-item">
                    <div className="client-avatar">
                      {client.avatar ? <img src={client.avatar} alt={client.name} /> : <span>{client.name.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="client-info">
                      <h4>{client.name}</h4>
                      {client.email && <p>{client.email}</p>}
                      <span className="client-meta">
                        {[client.totalPhotos ? `${client.totalPhotos} photos` : null, client.lastSession].filter(Boolean).join(' • ') || '—'}
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
            <h3>Quick Access</h3>
            <p>Navigate to your most used features</p>
          </div>
          <div className="access-grid">
            <Link to="/studio/clients" className="access-card premium-access-card">
              <div className="access-icon-wrap gradient-indigo"><FaUsers className="access-icon" /></div>
              <h4>Manage Clients</h4>
              <p>Add, edit, and organize your clients</p>
              <span className="access-arrow">→</span>
            </Link>
            <Link to="/client-images" className="access-card premium-access-card">
              <div className="access-icon-wrap gradient-cyan"><FaImages className="access-icon" /></div>
              <h4>Photo Gallery</h4>
              <p>Upload and organize photos & videos</p>
              <span className="access-arrow">→</span>
            </Link>
            <Link to="/studio/albums" className="access-card premium-access-card">
              <div className="access-icon-wrap gradient-violet"><FaFolder className="access-icon" /></div>
              <h4>Albums</h4>
              <p>Create and manage photo albums</p>
              <span className="access-arrow">→</span>
            </Link>
            <Link to="/upload" className="access-card premium-access-card">
              <div className="access-icon-wrap gradient-amber"><FaPlus className="access-icon" /></div>
              <h4>Upload Photos</h4>
              <p>Upload new photos to your library</p>
              <span className="access-arrow">→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudioDashboard;
