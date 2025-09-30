import React, { useState, useEffect } from 'react';
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
  FaDollarSign
} from 'react-icons/fa';
import './StudioDashboard.css';
import adminService from '../services/adminService';
import api from '../services/api';

interface DashboardStats {
  totalClients?: number;
  totalPhotos?: number;
  totalVideos?: number;
  totalRevenue?: number;
  recentUploads?: number;
  activeSessions?: number;
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

const StudioDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({});

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPhotos, setAllPhotos] = useState<UserImageItem[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {

        const [systemHealthRes, userStatsRes, usageStatsRes] = await Promise.allSettled([
          adminService.getSystemHealth(),
          adminService.getUserStatistics(),
          adminService.getUsageStatistics('month')
        ]);

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

        setStats(nextStats);

        // Prefer family relationships for client list (only immediate relations)
        let clientsSet = false;
        try {
          const familyRes = await api.get('/api/simple-invitations/family-relationships');
          const family = familyRes.data?.familyData || familyRes.data || {};
          const immediate: any[] = [
            ...(family.parents || []),
            ...(family.siblings || []),
            ...(family.children || []),
            ...(family.spouse ? [family.spouse] : [])
          ].filter(Boolean);

          if (immediate.length > 0) {
            const sorted = immediate.slice().sort((a, b) => {
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
        } catch {
          // ignore and fall back to invitations
        }

        if (!clientsSet) {
          // Fallback: use invitations, still limit to 3
          const invitationsRes = await api.get('/api/simple-invitations/my-invitations');
          if (invitationsRes.data?.success) {
            const invitations = invitationsRes.data.invitations || [];
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

        // Fetch all user photos (same API pattern as PhotoGallery)
        const token = localStorage.getItem('token');
        if (token) {
          const imagesRes = await api.get(`/api/images/user/all?token=${token}`);
          const items = Array.isArray(imagesRes.data) ? imagesRes.data : (imagesRes.data?.images || []);
          setAllPhotos(items || []);
        } else {
          setAllPhotos([]);
        }
        // No dedicated recent activity API; leave empty to hide section
        setRecentActivity([]);
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

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="studio-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">
            <FaCamera className="logo-icon" />
            <h1>PhotoStudio Pro</h1>
          </div>
        </div>
        <div className="header-right">
          <button className="notification-btn">
            <FaBell />
            <span className="notification-badge">3</span>
          </button>
          <Link to="/studio/settings" className="settings-btn">
            <FaCog />
          </Link>
          <button className="logout-btn">
            <FaSignOutAlt />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Welcome Section */}
        <section className="welcome-section">
          <div className="welcome-content">
            <h2>Welcome back, Studio Owner!</h2>
            <p>Here's what's happening with your photo studio today.</p>
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
          <div className="stat-card">
            <div className="stat-icon clients">
              <FaUsers />
            </div>
            <div className="stat-content">
              <h3>{(typeof stats.totalClients === 'number' ? stats.totalClients : 0).toLocaleString()}</h3>
              <p>Total Clients</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon photos">
              <FaImages />
            </div>
            <div className="stat-content">
              <h3>{(typeof stats.totalPhotos === 'number' ? Number(stats.totalPhotos) : 0).toLocaleString()}</h3>
              <p>Total Photos</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon videos">
              <FaCamera />
            </div>
            <div className="stat-content">
              <h3>{(typeof stats.totalVideos === 'number' ? stats.totalVideos : 0).toLocaleString()}</h3>
              <p>Total Videos</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon photos">
              <FaImages />
            </div>
            <div className="stat-content">
              <h3>{(Array.isArray(allPhotos) ? allPhotos.length : 0).toLocaleString()}</h3>
              <p>Your Photos</p>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <section className="main-grid">
          {/* Recent Activity */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Recent Activity</h3>
              <Link to="/studio/activity" className="view-all-link">
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
                {recentActivity.map((activity) => (
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
                {recentClients.map((client) => (
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
          <h3>Quick Access</h3>
          <div className="access-grid">
            <Link to="/studio/clients" className="access-card">
              <FaUsers className="access-icon" />
              <h4>Manage Clients</h4>
              <p>Add, edit, and organize your clients</p>
            </Link>

            <Link to="/studio/gallery" className="access-card">
              <FaImages className="access-icon" />
              <h4>Photo Gallery</h4>
              <p>Upload and organize photos & videos</p>
            </Link>

            <Link to="/studio/barcodes" className="access-card">
              <FaQrcode className="access-icon" />
              <h4>Barcode System</h4>
              <p>Generate and manage photo barcodes</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudioDashboard;
