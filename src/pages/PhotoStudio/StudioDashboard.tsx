import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaCamera, 
  FaUsers, 
  FaImages, 
  FaQrcode, 
  FaPlus, 
  FaChartLine,
  FaBell,
  FaCog,
  FaSignOutAlt,
  FaEye,
  FaDownload,
  FaShare,
  FaCalendarAlt,
  FaDollarSign,
  FaFolder,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import './StudioDashboard.css';
import adminService from '../../services/adminService';
import api from '../../services/api';
import DashboardLoading from '../../components/common/DashboardLoading';

interface DashboardStats {
  totalClients?: number;
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
  url: string;
  thumbnailUrl?: string;
  createdAt?: string;
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
  const [stats, setStats] = useState<DashboardStats>({});
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPhotos, setAllPhotos] = useState<UserImageItem[]>([]);
  const [yourPhotosCount, setYourPhotosCount] = useState<number | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumChartData, setAlbumChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {

        const [systemHealthRes, userStatsRes, usageStatsRes] = await Promise.allSettled([
          adminService.getSystemHealth(),
          adminService.getUserStatistics(),
          adminService.getUsageStatistics('month')
        ]);
        const dashbaordActivities = await api.get('/api/dashboard/summary');
        console.log('dashboardActivities', dashbaordActivities.data);
        
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

        // Merge in summary stats from dashboard/summary if present
        const summary = (dashbaordActivities && dashbaordActivities.data) ? dashbaordActivities.data : {};
        // Don't override totalClients from summary if we got it from family-relationships API
        if (typeof summary.totalClients === 'number' && !nextStats.totalClients) {
          nextStats.totalClients = summary.totalClients;
        }
        if (typeof summary.totalPhotos === 'number') nextStats.totalPhotos = summary.totalPhotos;
        if (typeof summary.totalVideos === 'number') nextStats.totalVideos = summary.totalVideos;
        setStats(nextStats);

        // recentActivity from summary
        if (Array.isArray(summary.recentActivity)) {
          const mapped: RecentActivity[] = summary.recentActivity.map((item: any, idx: number) => ({
            id: String(item.id ?? idx ?? Math.random()),
            type: (item.type === 'client' || item.type === 'session' || item.type === 'upload') ? item.type : 'upload',
            message: String(item.message ?? ''),
            timestamp: String(item.timestamp ?? ''),
            clientName: item.clientName || undefined,
          }));
          setRecentActivity(mapped);
        } else {
          setRecentActivity([]);
        }

        // yourPhotos numeric count from summary
        if (typeof summary.yourPhotos === 'number') {
          setYourPhotosCount(summary.yourPhotos);
        } else {
          setYourPhotosCount(null);
        }

        // Fetch clients from family relationships API
        let clientsSet = false;
        let totalClientsCount = 0;
        try {
          const familyRes = await api.get('/api/simple-invitations/family-relationships');
          const family = familyRes.data?.familyData || familyRes.data || {};
          
          // Flatten nested clients structure and filter only clients
          const allClients: any[] = [];
          
          const flattenClients = (clients: any[]) => {
            if (!Array.isArray(clients)) return;
            
            clients.forEach((client: any) => {
              if (client && client.relation === "Client") {
                allClients.push({
                  id: client.userId,
                  userId: client.userId,
                  name: client.name || client.username || (typeof client.email === 'string' ? client.email.split('@')[0] : 'Client'),
                  email: client.email || '',
                  username: client.username || '',
                  relation: client.relation || 'Client'
                });
              }
              
              // Recursively process nested clients
              if (client && client.clients && Array.isArray(client.clients) && client.clients.length > 0) {
                flattenClients(client.clients);
              }
            });
          };
          
          if (family.clients && Array.isArray(family.clients)) {
            flattenClients(family.clients);
          }
          
          // Deduplicate clients by userId
          const uniqueClients = allClients.filter((client, index, self) => 
            index === self.findIndex((c) => c.id === client.id)
          );
          
          totalClientsCount = uniqueClients.length;
          
          // Update totalClients in stats
          if (totalClientsCount > 0) {
            nextStats.totalClients = totalClientsCount;
            setStats(nextStats);
          }

          if (uniqueClients.length > 0) {
            const sorted = uniqueClients.slice().sort((a, b) => {
              // Prefer deterministic ordering: by userId desc, then name
              const aId = typeof a.userId === 'number' ? a.userId : -1;
              const bId = typeof b.userId === 'number' ? b.userId : -1;
              if (aId !== bId) return bId - aId;
              return String(a.name || '').localeCompare(String(b.name || ''));
            });
            const topThree = sorted.slice(0, 3);
            const mappedClients: RecentClient[] = topThree.map((p: any) => ({
              id: String(p.userId ?? p.username ?? p.email ?? Math.random()),
              name: p.name || p.username || (typeof p.email === 'string' ? p.email.split('@')[0] : 'Client'),
              email: p.email || '',
              phone: '',
              lastSession: '',
              totalPhotos: 0,
              avatar: undefined
            }));
            setRecentClients(mappedClients);
            clientsSet = true;
          }
        } catch (error) {
          console.error('Error fetching family relationships:', error);
          // ignore and fall back to invitations
        }

        if (!clientsSet) {
          // Fallback: use invitations, still limit to 3
          const invitationsRes = await api.get('/api/simple-invitations/my-invitations');
          if (invitationsRes.data?.length > 0) {
            const invitations = invitationsRes.data || invitationsRes.data.invitations || [];
            const sortedInvitations = (Array.isArray(invitations) ? invitations.slice() : []).sort((a: any, b: any) => {
              const aTime = new Date(a.updatedAt || a.createdAt || a.sentAt || 0).getTime();
              const bTime = new Date(b.updatedAt || b.createdAt || b.sentAt || 0).getTime();
              return bTime - aTime;
            });
            const topThree = sortedInvitations.slice(0, 3);
            const mappedClients: RecentClient[] = topThree.map((inv: any) => {
              const id = String(inv.id ?? inv.invitationId ?? Math.random());
              const email = inv.inviteeEmail ?? inv.email ?? '';
              const nameFromEmail = typeof email === 'string' ? email.split('@')[0] : 'Client';
              const name = inv.inviteeName || inv.name || nameFromEmail || 'Client';
              const lastSession = inv.updatedAt || inv.createdAt || inv.sentAt || new Date().toISOString();
              return {
                id,
                name,
                email,
                phone: inv.phone || '',
                lastSession: new Date(lastSession).toLocaleString(),
                totalPhotos: inv.totalPhotos || 0,
                avatar: inv.avatarUrl || undefined
              };
            });
            setRecentClients(mappedClients);
          } else {
            setRecentClients([]);
          }
        }

        // Fetch all user photos (same API pattern as PhotoGallery) as fallback for count
        const token = localStorage.getItem('token');
        if (token) {
          const imagesRes = await api.get(`/api/images/user/all?token=${token}`);
          const items = Array.isArray(imagesRes.data) ? imagesRes.data : (imagesRes.data?.images || []);
          setAllPhotos(items || []);
        } else {
          setAllPhotos([]);
        }

        // Fetch albums for charts
        try {
          const albumsRes = await api.get('/api/albums');
          const albumsData = Array.isArray(albumsRes.data) 
            ? albumsRes.data 
            : (albumsRes.data?.albums || []);
          setAlbums(albumsData);
          
          // Update total albums stat
          if (albumsData.length > 0) {
            setStats(prev => ({ ...prev, totalAlbums: albumsData.length }));
          }

          // Prepare chart data for top albums by image count
          const sortedAlbums = [...albumsData]
            .sort((a, b) => (b.imageCount || 0) - (a.imageCount || 0))
            .slice(0, 5);
          
          const colors = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #2733db 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
          ];
          
          const chartData: ChartDataPoint[] = sortedAlbums.map((album, index) => ({
            label: album.name || `Album ${album.id}`,
            value: album.imageCount || 0,
            color: colors[index % colors.length]
          }));
          
          setAlbumChartData(chartData);
        } catch (error) {
          console.error('Error fetching albums:', error);
          setAlbums([]);
        }
        // If summary provided activity, keep it; otherwise already set empty above
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload': return <FaImages className="activity-icon upload" />;
      case 'client': return <FaUsers className="activity-icon client" />;
      case 'session': return <FaCamera className="activity-icon session" />;
      default: return <FaBell className="activity-icon" />;
    }
  };

  // Calculate max value for chart scaling
  const maxChartValue = useMemo(() => {
    if (albumChartData.length === 0) return 1;
    return Math.max(...albumChartData.map(d => d.value), 1);
  }, [albumChartData]);

  // Calculate total images across all albums
  const totalAlbumImages = useMemo(() => {
    return albums.reduce((sum, album) => sum + (album.imageCount || 0), 0);
  }, [albums]);

  if (loading) {
    return (
      <DashboardLoading 
        title="Loading Dashboard"
        subtitle="Preparing your photo book..."
        icon={FaCamera}
      />
    );
  }

  return (
    <div className="studio-dashboard">
      {/* Header */}
      {/* <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">
            <FaCamera className="logo-icon" />
            <h1>Photo Book Pro</h1>
          </div>
        </div>
        <div className="header-right">
          <Link to="/studio/settings" className="settings-btn">
            <FaCog />
          </Link>
          <button className="logout-btn">
            <FaSignOutAlt />
          </button>
        </div>
      </header> */}

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Welcome Section */}
        <section className="welcome-section">
          <div className="welcome-content">
            <h2>Welcome back, Photo Book Owner!</h2>
            <p>Here's what's happening with your photo book today.</p>
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
          </div>
        </section>

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card modern-card">
            <div className="stat-icon-wrapper clients">
              <div className="stat-icon clients">
                <FaUsers />
              </div>
              <div className="stat-badge">
                <FaChartLine />
              </div>
            </div>
            <div className="stat-content">
              <h3>{(typeof stats.totalClients === 'number' ? stats.totalClients : 0).toLocaleString()}</h3>
              <p>Total Clients</p>
              <span className="stat-trend positive">+12% this month</span>
            </div>
          </div>

          <div className="stat-card modern-card">
            <div className="stat-icon-wrapper albums">
              <div className="stat-icon albums">
                <FaFolder />
              </div>
              <div className="stat-badge">
                <FaChartLine />
              </div>
            </div>
            <div className="stat-content">
              <h3>{(stats.totalAlbums || albums.length || 0).toLocaleString()}</h3>
              <p>Total Albums</p>
              <span className="stat-trend">{totalAlbumImages} images</span>
            </div>
          </div>

          <div className="stat-card modern-card">
            <div className="stat-icon-wrapper videos">
              <div className="stat-icon videos">
                <FaCamera />
              </div>
              <div className="stat-badge">
                <FaArrowUp />
              </div>
            </div>
            <div className="stat-content">
              <h3>{(typeof stats.totalVideos === 'number' ? stats.totalVideos : 0).toLocaleString()}</h3>
              <p>Total Videos</p>
              <span className="stat-trend positive">Active</span>
            </div>
          </div>

          <div className="stat-card modern-card">
            <div className="stat-icon-wrapper photos">
              <div className="stat-icon photos">
                <FaImages />
              </div>
              <div className="stat-badge">
                <FaImages />
              </div>
            </div>
            <div className="stat-content">
              <h3>{(
                typeof yourPhotosCount === 'number'
                  ? yourPhotosCount
                  : (Array.isArray(allPhotos) ? allPhotos.length : 0)
              ).toLocaleString()}</h3>
              <p>Your Photos</p>
              <span className="stat-trend">All time</span>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section className="charts-section">
          <div className="chart-card album-chart-card">
            <div className="chart-header">
              <div className="chart-title-group">
                <FaFolder className="chart-icon" />
                <div>
                  <h3>Album Statistics</h3>
                  <p>Top albums by image count</p>
                </div>
              </div>
              <Link to="/studio/albums" className="view-all-link">
                View All Albums
              </Link>
            </div>
            <div className="chart-content">
              {albumChartData.length === 0 ? (
                <div className="chart-empty">
                  <FaFolder className="empty-icon" />
                  <p>No albums yet</p>
                  <Link to="/studio/albums" className="create-link">
                    Create Your First Album
                  </Link>
                </div>
              ) : (
                <div className="album-bar-chart">
                  {albumChartData.map((item, index) => {
                    const percentage = maxChartValue > 0 ? (item.value / maxChartValue) * 100 : 0;
                    return (
                      <div key={index} className="chart-bar-item">
                        <div className="chart-bar-label">
                          <span className="bar-label-text">{item.label}</span>
                          <span className="bar-value">{item.value}</span>
                        </div>
                        <div className="chart-bar-container">
                          <div 
                            className="chart-bar-fill"
                            style={{
                              width: `${percentage}%`,
                              background: item.color,
                              animationDelay: `${index * 0.1}s`
                            }}
                          >
                            <span className="bar-fill-text">{item.value}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="chart-card activity-chart-card">
            <div className="chart-header">
              <div className="chart-title-group">
                <FaChartLine className="chart-icon" />
                <div>
                  <h3>Upload Activity</h3>
                  <p>Last 7 days overview</p>
                </div>
              </div>
            </div>
            <div className="chart-content">
              <div className="activity-chart">
                {[1, 2, 3, 4, 5, 6, 7].map((day, index) => {
                  const height = Math.random() * 60 + 20; // Random height for demo
                  return (
                    <div key={day} className="activity-bar">
                      <div 
                        className="activity-bar-fill"
                        style={{ 
                          height: `${height}%`,
                          animationDelay: `${index * 0.1}s`
                        }}
                      />
                      <span className="activity-day">Day {day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <section className="main-grid">
          {/* Recent Activity */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Recent Activity</h3>
              <Link to="/client-images" className="view-all-link">
                View All
              </Link>
            </div>
            {recentActivity.length === 0 ? (
              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-icon-wrapper">
                    {getActivityIcon('upload')}
                  </div>
                  <div className="activity-content">
                    <p className="activity-message">No recent activity yet</p>
                    <span className="activity-time">—</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="activity-list">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon-wrapper">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="activity-content">
                      <p className="activity-message">{activity.message}</p>
                      <span className="activity-time">{activity.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Clients */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Recent Clients</h3>
              <Link to="/studio/clients" className="view-all-link">
                View All
              </Link>
            </div>
            {recentClients.length === 0 ? (
              <div className="clients-list">
                <div className="client-item">
                  <div className="client-avatar"><span>+</span></div>
                  <div className="client-info">
                    <h4>No clients yet</h4>
                    <p>Create your first client invitation to get started.</p>
                    <span className="client-meta">—</span>
                  </div>
                  <div className="client-actions">
                    <Link to="/invitations" className="action-btn" title="Add Client">
                      <FaPlus />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="clients-list">
                {recentClients.slice(0, 5).map((client) => (
                  <div key={client.id} className="client-item">
                    <div className="client-avatar">
                      {client.avatar ? (
                        <img src={client.avatar} alt={client.name} />
                      ) : (
                        <span>{client.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="client-info">
                      <h4>{client.name}</h4>
                      {client.email && <p>{client.email}</p>}
                      <span className="client-meta">
                        {[client.totalPhotos ? `${client.totalPhotos} photos` : null, client.lastSession].filter(Boolean).join(' • ')}
                      </span>
                    </div>
                    <div className="client-actions">
                      <button className="action-btn" title="View Profile">
                        <FaEye />
                      </button>
                      <button className="action-btn" title="Share Gallery">
                        <FaShare />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Quick Access */}
        <section className="quick-access">
          <div className="section-header">
            <h3>Quick Access</h3>
            <p>Navigate to your most used features</p>
          </div>
          <div className="access-grid">
            <Link to="/studio/clients" className="access-card modern-access-card">
              <div className="access-icon-wrapper clients">
                <FaUsers className="access-icon" />
              </div>
              <h4>Manage Clients</h4>
              <p>Add, edit, and organize your clients</p>
              <span className="access-arrow">→</span>
            </Link>

            <Link to="/client-images" className="access-card modern-access-card">
              <div className="access-icon-wrapper photos">
                <FaImages className="access-icon" />
              </div>
              <h4>Photo Gallery</h4>
              <p>Upload and organize photos & videos</p>
              <span className="access-arrow">→</span>
            </Link>

            <Link to="/studio/albums" className="access-card modern-access-card">
              <div className="access-icon-wrapper albums">
                <FaFolder className="access-icon" />
              </div>
              <h4>Albums</h4>
              <p>Create and manage photo albums</p>
              <span className="access-arrow">→</span>
            </Link>

            {/* <Link to="/studio/barcodes" className="access-card modern-access-card">
              <div className="access-icon-wrapper barcodes">
                <FaQrcode className="access-icon" />
              </div>
              <h4>Barcode System</h4>
              <p>Generate and manage photo barcodes</p>
              <span className="access-arrow">→</span>
            </Link> */}
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudioDashboard;
