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

interface DashboardStats {
  totalClients: number;
  totalPhotos: number;
  totalVideos: number;
  totalRevenue: number;
  recentUploads: number;
  activeSessions: number;
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
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalPhotos: 0,
    totalVideos: 0,
    totalRevenue: 0,
    recentUploads: 0,
    activeSessions: 0
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch dashboard data
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStats({
          totalClients: 156,
          totalPhotos: 2847,
          totalVideos: 423,
          totalRevenue: 45680,
          recentUploads: 23,
          activeSessions: 8
        });

        setRecentActivity([
          {
            id: '1',
            type: 'upload',
            message: 'New photos uploaded for Sarah Johnson',
            timestamp: '2 hours ago',
            clientName: 'Sarah Johnson'
          },
          {
            id: '2',
            type: 'client',
            message: 'New client registered: Mike Chen',
            timestamp: '4 hours ago',
            clientName: 'Mike Chen'
          },
          {
            id: '3',
            type: 'session',
            message: 'Photo session completed with Emily Davis',
            timestamp: '6 hours ago',
            clientName: 'Emily Davis'
          }
        ]);

        setRecentClients([
          {
            id: '1',
            name: 'Sarah Johnson',
            email: 'sarah.j@email.com',
            phone: '+1 (555) 123-4567',
            lastSession: '2 hours ago',
            totalPhotos: 45
          },
          {
            id: '2',
            name: 'Mike Chen',
            email: 'mike.chen@email.com',
            phone: '+1 (555) 987-6543',
            lastSession: '1 day ago',
            totalPhotos: 32
          },
          {
            id: '3',
            name: 'Emily Davis',
            email: 'emily.davis@email.com',
            phone: '+1 (555) 456-7890',
            lastSession: '2 days ago',
            totalPhotos: 67
          }
        ]);
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
            <Link to="/studio/clients/new" className="quick-action-btn primary">
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
          <div className="stat-card">
            <div className="stat-icon clients">
              <FaUsers />
            </div>
            <div className="stat-content">
              <h3>{stats.totalClients}</h3>
              <p>Total Clients</p>
              <span className="stat-change positive">+12 this month</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon photos">
              <FaImages />
            </div>
            <div className="stat-content">
              <h3>{stats.totalPhotos.toLocaleString()}</h3>
              <p>Total Photos</p>
              <span className="stat-change positive">+{stats.recentUploads} today</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon videos">
              <FaCamera />
            </div>
            <div className="stat-content">
              <h3>{stats.totalVideos}</h3>
              <p>Total Videos</p>
              <span className="stat-change positive">+5 this week</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon revenue">
              <FaDollarSign />
            </div>
            <div className="stat-content">
              <h3>{formatCurrency(stats.totalRevenue)}</h3>
              <p>Total Revenue</p>
              <span className="stat-change positive">+15% this month</span>
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
                    <p>{client.email}</p>
                    <span className="client-meta">
                      {client.totalPhotos} photos • {client.lastSession}
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

            <Link to="/studio/analytics" className="access-card">
              <FaChartLine className="access-icon" />
              <h4>Analytics</h4>
              <p>View detailed reports and insights</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudioDashboard;
