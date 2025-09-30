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

const StudioDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({});

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [systemHealthRes, userStatsRes, usageStatsRes, usersRes] = await Promise.allSettled([
          adminService.getSystemHealth(),
          adminService.getUserStatistics(),
          adminService.getUsageStatistics('month'),
          adminService.getAllUsers({ page: 0, size: 5 })
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

        if (usersRes.status === 'fulfilled') {
          const list = usersRes.value?.users || usersRes.value?.content || usersRes.value?.data || usersRes.value || [];
          const mapped = (Array.isArray(list) ? list : []).map((u: any) => ({
            id: String(u.id ?? u.userId ?? Math.random()),
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Unknown',
            email: u.email,
            phone: u.phone,
            lastSession: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''),
            totalPhotos: undefined,
            avatar: undefined
          }));
          setRecentClients(mapped);
        } else {
          setRecentClients([]);
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
            <Link to="/create-client" className="quick-action-btn primary">
              <FaPlus />
              Add Client
            </Link>
            <Link to="/studio/gallery/upload" className="quick-action-btn secondary">
              <FaImages />
              Upload Photos
            </Link>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="stats-grid">
          {typeof stats.totalClients === 'number' && (
            <div className="stat-card">
              <div className="stat-icon clients">
                <FaUsers />
              </div>
              <div className="stat-content">
                <h3>{stats.totalClients}</h3>
                <p>Total Clients</p>
              </div>
            </div>
          )}

          {typeof stats.totalPhotos === 'number' && (
            <div className="stat-card">
              <div className="stat-icon photos">
                <FaImages />
              </div>
              <div className="stat-content">
                <h3>{Number(stats.totalPhotos).toLocaleString()}</h3>
                <p>Total Photos</p>
              </div>
            </div>
          )}

          {typeof stats.totalVideos === 'number' && (
            <div className="stat-card">
              <div className="stat-icon videos">
                <FaCamera />
              </div>
              <div className="stat-content">
                <h3>{stats.totalVideos}</h3>
                <p>Total Videos</p>
              </div>
            </div>
          )}

          {typeof stats.totalRevenue === 'number' && (
            <div className="stat-card">
              <div className="stat-icon revenue">
                <FaDollarSign />
              </div>
              <div className="stat-content">
                <h3>{formatCurrency(stats.totalRevenue)}</h3>
                <p>Total Revenue</p>
              </div>
            </div>
          )}
        </section>

        {/* Main Content Grid */}
        <section className="main-grid">
          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <div className="dashboard-card">
              <div className="card-header">
                <h3>Recent Activity</h3>
                <Link to="/studio/activity" className="view-all-link">
                  View All
                </Link>
              </div>
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
            </div>
          )}

          {/* Recent Clients */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Recent Clients</h3>
              <Link to="/studio/clients" className="view-all-link">
                View All
              </Link>
            </div>
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
