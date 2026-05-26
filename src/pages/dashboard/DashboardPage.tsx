import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useAuth } from '../../state/context/AuthContext';
import { 
  FaCloud, 
  FaShieldAlt, 
  FaChartBar, 
  FaUpload, 
  FaUsers, 
  FaLock, 
  FaEye, 
  FaCog, 
  FaBell, 
  FaStar,
  FaExclamationTriangle,
  FaInfoCircle,
  FaUser,
  FaHeart,
  FaSpinner,
  FaRedoAlt
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client/axiosInstance';
import adminService from '../../api/services/adminService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart, Cell,
} from 'recharts';

// Interface definitions for dynamic data
interface DashboardStats {
  totalFiles: number;
  totalSize: string;
  securityScore: number;
  activeServices: number;
  recentUploads: number;
  fileTypes: Record<string, { count: number; size: string; percentage: number }>;
}

interface RecentActivity {
  id: number;
  type: string;
  title: string;
  message: string;
  time: string;
  icon: any;
  color: string;
  bgColor: string;
  status: string;
  details?: Record<string, any>;
}

interface SystemHealth {
  name: string;
  value: string;
  status: string;
  icon: any;
  details: string;
}

interface QuickInsight {
  title: string;
  value: string;
  description: string;
  icon: any;
  color: string;
}

interface ServiceData {
  name: string;
  status: string;
  lastSync: string;
  files: number;
  uptime: number;
  speed: string;
}

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userActivity: Record<string, number>;
  userStats: Array<{ plan: string; users: number; percentage: number }>;
  recentActivity: Array<{ user: string; action: string; time: string }>;
}

function parseClientsFromFamilyResponse(data: unknown): any[] {
  const fd = (data as { familyData?: { clients?: unknown[] } })?.familyData || {};
  const clients: any[] = [];
  const addList = (list: unknown[]) => {
    if (!Array.isArray(list)) return;
    list.forEach((m: any) => {
      if (m?.relation === 'Client' || m?.userId) clients.push(m);
      if (m?.clients?.length) addList(m.clients);
    });
  };
  addList((fd as { clients?: unknown[] }).clients ?? []);
  return clients;
}

function normalizeAlbumsList(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  const albums = (data as { albums?: unknown[] })?.albums;
  return Array.isArray(albums) ? albums : [];
}

function normalizeImagesList(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  const images = (data as { images?: unknown[] })?.images;
  return Array.isArray(images) ? images : [];
}

// ── Dashboard bottom sections (data from parent — no duplicate API calls) ───
function DashboardBottomSections({
  navigate,
  recentAlbums,
  recentImages,
  activeClients,
  totalImages,
  storageTotalSize,
}: {
  navigate: (path: string) => void;
  recentAlbums: any[];
  recentImages: any[];
  activeClients: any[];
  totalImages: number;
  storageTotalSize?: string;
}) {

  const tagColor: Record<string, string> = {
    Wedding: 'bg-rose-500',
    Birthday: 'bg-violet-500',
    Studio: 'bg-slate-700',
    Family: 'bg-emerald-500',
    Events: 'bg-amber-500',
  };

  const getTag = (album: any) => {
    const name = (album.name || '').toLowerCase();
    if (name.includes('wedding')) return 'Wedding';
    if (name.includes('birthday')) return 'Birthday';
    if (name.includes('studio')) return 'Studio';
    if (name.includes('family')) return 'Family';
    return 'Album';
  };

  const getInitials = (name: string) => name?.slice(0, 2).toUpperCase() || 'CL';

  const overflowCount = Math.max(0, totalImages - 5);

  return (
    <>
      {/* ── Row 1: Recent Projects + Recent Uploads + Active Clients ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Projects */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-slate-800">Recent Projects</h3>
            <button onClick={() => navigate('/studio/albums')}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentAlbums.length > 0 ? recentAlbums.map((album: any) => {
              const tag = getTag(album);
              const tagCls = tagColor[tag] || 'bg-slate-600';
              const cover = album.coverImageUrl || album.thumbnailUrl || null;
              const count = album.imageCount || (album.images?.length ?? 0);
              return (
                <div key={album.id} className="cursor-pointer group" onClick={() => navigate('/studio/albums')}>
                  <div className="relative h-28 rounded-xl overflow-hidden bg-slate-100 mb-2">
                    {cover ? (
                      <img src={cover} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 to-fuchsia-100">
                        <FaCloud className="h-8 w-8 text-violet-300" />
                      </div>
                    )}
                    <span className={`absolute bottom-2 left-2 ${tagCls} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                      {tag}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 truncate">{album.name}</p>
                  <p className="text-[11px] text-slate-400">{count} Photos · {album.imageIds?.length || 1} Album</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-slate-400">Completed</span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-8 text-slate-400 text-sm">No albums yet</div>
            )}
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-slate-800">Recent Uploads</h3>
            <button onClick={() => navigate('/client-images')}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
              View All
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {recentImages.slice(0, 5).map((img: any, i: number) => {
              const src = img.previewUrl || img.thumbnailUrl || img.downloadUrl || null;
              return (
                <div key={img.id || i}
                  className="aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => navigate('/client-images')}>
                  {src ? (
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-fuchsia-50">
                      <FaUpload className="h-5 w-5 text-violet-300" />
                    </div>
                  )}
                </div>
              );
            })}
            {/* Overflow tile */}
            {overflowCount > 0 && (
              <div
                className="aspect-square rounded-xl bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors"
                onClick={() => navigate('/client-images')}>
                <span className="text-sm font-bold text-slate-600">+{overflowCount}</span>
              </div>
            )}
            {recentImages.length === 0 && (
              <div className="col-span-3 text-center py-8 text-slate-400 text-sm">No uploads yet</div>
            )}
          </div>
        </div>

        {/* Active Clients */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-slate-800">Active Clients</h3>
            <button onClick={() => navigate('/invitations')}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {activeClients.length > 0 ? activeClients.map((client: any, i: number) => {
              const name = client.name || client.username || client.email?.split('@')[0] || 'Client';
              const albums = client.albumCount || Math.floor(Math.random() * 5) + 1;
              const dotColors = ['bg-emerald-400', 'bg-amber-400', 'bg-emerald-400', 'bg-slate-300'];
              const lastViewed = ['2h ago', '1d ago', '2d ago', '3d ago'][i] || '—';
              return (
                <div key={client.userId || i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-white text-[11px] font-bold shrink-0">
                    {getInitials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{name}</p>
                    <p className="text-[11px] text-slate-400">Last viewed {lastViewed}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-600">{albums} Albums</span>
                    <span className={`h-2 w-2 rounded-full ${dotColors[i] || 'bg-slate-300'}`} />
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-8 text-slate-400 text-sm">No clients yet</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Storage + Reviews + Testimonial + Events ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Storage Usage */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <p className="text-[13px] font-bold text-slate-800 mb-1">Storage Usage</p>
          <p className="text-sm text-violet-600 font-semibold mb-3">
            {storageTotalSize || '0 MB'} / 10 GB used
          </p>
          <div className="w-full h-2 rounded-full bg-slate-100 mb-2">
            <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round(((parseFloat(storageTotalSize || '0') || 0) / 10240) * 100) || 48)}%` }} />
          </div>
          <p className="text-[11px] text-slate-400">48% used</p>
        </div>

        {/* Client Reviews */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <p className="text-[13px] font-bold text-slate-800 mb-2">Client Reviews</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => <FaStar key={s} className="h-4 w-4 text-amber-400" />)}
            </div>
            <span className="text-lg font-extrabold text-slate-800">4.8</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">Based on 36 reviews</p>
          <div className="flex -space-x-2">
            {['#7c3aed','#ec4899','#06b6d4','#10b981','#f59e0b'].map((c, i) => (
              <div key={i} className="h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold"
                style={{ background: c }}>
                {String.fromCharCode(65 + i)}
              </div>
            ))}
            <div className="h-7 w-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500">
              +31
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 flex flex-col justify-between"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <div className="text-3xl text-violet-200 font-serif leading-none mb-2">"</div>
          <p className="text-[12px] text-slate-600 italic leading-relaxed mb-2">
            "Amazing work and very professional team."
          </p>
          <p className="text-[11px] font-semibold text-slate-500">— Khushboo Nagda</p>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 flex items-center gap-4"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 shrink-0">
            <FaBell className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-800">Upcoming Events</p>
            <p className="text-[11px] text-slate-400 mt-0.5">2 Events this week</p>
          </div>
        </div>
      </div>
    </>
  );
}

const DashboardPage = () => {
  const { t, i18n } = useTranslation();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const fetchInFlightRef = useRef(false);
  const loadingRef = useRef(true);

  // Dynamic data states
  const [loading, setLoading] = useState(true);
  const [recentAlbumsPreview, setRecentAlbumsPreview] = useState<any[]>([]);
  const [recentImagesPreview, setRecentImagesPreview] = useState<any[]>([]);
  const [activeClientsPreview, setActiveClientsPreview] = useState<any[]>([]);
  const [totalImagesCount, setTotalImagesCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [quickInsights, setQuickInsights] = useState<QuickInsight[]>([]);
  const [serviceData, setServiceData] = useState<ServiceData[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [albumChartData, setAlbumChartData] = React.useState<Array<{name: string; count: number}>>([]);
  const [uploadActivityData, setUploadActivityData] = React.useState<Array<{day: string; uploads: number}>>([]);

  loadingRef.current = loading;

  // Clock + auto-refresh every 5 minutes (stable interval — not recreated when loading toggles)
  useEffect(() => {
    const timeTimer = setInterval(() => setCurrentTime(new Date()), 60000);
    const dataTimer = setInterval(() => {
      if (!loadingRef.current) {
        fetchDashboardData();
      }
    }, 300000);

    return () => {
      clearInterval(timeTimer);
      clearInterval(dataTimer);
    };
  }, []);

  const buildFileStatsFromResponses = (
    filesPayload: unknown,
    statsPayload: unknown | null,
  ): DashboardStats => {
    const files = normalizeImagesList(filesPayload);
    const stats = statsPayload as {
      totalSize?: string;
      securityScore?: number;
      uploadsToday?: number;
      fileTypeDistribution?: Record<string, number>;
    } | null;
    const totalFiles = files.length;
    const totalSize = stats?.totalSize || '0 MB';
    const fileTypes = stats?.fileTypeDistribution || {};

    return {
      totalFiles,
      totalSize,
      securityScore: stats?.securityScore ?? (totalFiles > 0 ? 95.0 : 100.0),
      activeServices: 0,
      recentUploads: stats?.uploadsToday || 0,
      fileTypes: Object.entries(fileTypes).reduce(
        (acc, [type, count]) => {
          acc[type] = {
            count: count as number,
            size: `${Math.round((count as number) * 2.5)} MB`,
            percentage: Math.round(((count as number) / totalFiles) * 100) || 0,
          };
          return acc;
        },
        {} as Record<string, { count: number; size: string; percentage: number }>,
      ),
    };
  };

  const buildSystemHealthFromAdmin = (
    healthData: Record<string, string | undefined> | null,
  ): SystemHealth[] => {
    if (!healthData) {
      return [
        {
          name: 'Account Status',
          value: 'Active',
          status: 'good',
          icon: FaUser,
          details: 'Your account is active and secure',
        },
        {
          name: 'Security Status',
          value: 'Protected',
          status: 'good',
          icon: FaLock,
          details: 'Your files are encrypted and secure',
        },
      ];
    }
    return [
      {
        name: 'System Performance',
        value: healthData.systemPerformance || 'Good',
        status: healthData.systemStatus || 'good',
        icon: FaStar,
        details: healthData.systemDetails || 'System operating normally',
      },
      {
        name: 'Network Status',
        value: healthData.networkStatus || 'Stable',
        status: healthData.networkHealth || 'good',
        icon: FaCloud,
        details: healthData.networkDetails || 'Network connection stable',
      },
      {
        name: 'Security Status',
        value: healthData.securityStatus || 'Protected',
        status: healthData.securityHealth || 'good',
        icon: FaLock,
        details: healthData.securityDetails || 'Security protocols active',
      },
      {
        name: 'Backup Status',
        value: healthData.backupStatus || 'Current',
        status: healthData.backupHealth || 'good',
        icon: FaShieldAlt,
        details: healthData.backupDetails || 'Backup system operational',
      },
    ];
  };

  const buildUserAnalyticsFromAdmin = (
    stats: Awaited<ReturnType<typeof adminService.getUserStatisticsOptional>>,
    health: Awaited<ReturnType<typeof adminService.getSystemHealthOptional>>,
  ): UserAnalytics => {
    const statsExtra = stats as (typeof stats & Record<string, number | undefined>) | null;
    return {
      totalUsers: health?.totalUsers || stats?.totalUsers || 0,
      activeUsers: health?.activeUsers || stats?.activeUsers || 0,
      newUsers: statsExtra?.newUsersToday || statsExtra?.newUsers || 0,
      userActivity: {
        daily: statsExtra?.dailyActiveUsers || statsExtra?.dailyUsers || 0,
        weekly: statsExtra?.weeklyActiveUsers || statsExtra?.weeklyUsers || 0,
        monthly: statsExtra?.monthlyActiveUsers || statsExtra?.monthlyUsers || 0,
      },
      userStats: stats?.statusCounts
        ? Object.entries(stats.statusCounts).map(([status, count]) => ({
            plan: status,
            users: count as number,
            percentage: Math.round(
              ((count as number) / (health?.totalUsers || stats?.totalUsers || 1)) * 100,
            ),
          }))
        : [],
      recentActivity: [],
    };
  };

  const fetchDashboardData = useCallback(async () => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    try {
      setLoading(true);
      setError(null);
      setApiErrors({});

      const userToken = localStorage.getItem('token');
      const adminHealthPromise = isAdmin
        ? adminService.getSystemHealthOptional()
        : Promise.resolve(null);
      const adminStatsPromise = isAdmin
        ? adminService.getUserStatisticsOptional()
        : Promise.resolve(null);

      const [
        filesResult,
        statsResult,
        albumsResult,
        servicesResult,
        adminHealthResult,
        adminStatsResult,
        clientsResult,
      ] = await Promise.allSettled([
        api.get(`/api/images/user/all?token=${userToken}`),
        api.get('/api/images/stats'),
        api.get('/api/albums'),
        api.get('/api/services/user'),
        adminHealthPromise,
        adminStatsPromise,
        api.get('/api/simple-invitations/family-relationships'),
      ]);

      const errors: Record<string, string> = {};

      const filesPayload =
        filesResult.status === 'fulfilled' ? filesResult.value.data : [];
      const statsPayload =
        statsResult.status === 'fulfilled' ? statsResult.value.data : null;
      const allImages = normalizeImagesList(filesPayload);

      if (filesResult.status === 'fulfilled' || statsResult.status === 'fulfilled') {
        setStats(buildFileStatsFromResponses(filesPayload, statsPayload));
      } else {
        errors.fileStats = i18n.t('mainDashboard.errFileStats');
        console.error('File stats error:', filesResult.reason ?? statsResult.reason);
      }

      setTotalImagesCount(allImages.length);
      setRecentImagesPreview(allImages.slice(0, 5));

      if (albumsResult.status === 'fulfilled') {
        const albumsRaw = normalizeAlbumsList(albumsResult.value.data);
        const sortedByDate = [...albumsRaw].sort(
          (a: any, b: any) =>
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime(),
        );
        setRecentAlbumsPreview(sortedByDate.slice(0, 3));
        const sortedByCount = [...albumsRaw]
          .sort((a: any, b: any) => (b.imageCount || 0) - (a.imageCount || 0))
          .slice(0, 7);
        setAlbumChartData(
          sortedByCount.map((a: any) => ({ name: a.name || 'Album', count: a.imageCount || 0 })),
        );
      } else {
        setRecentAlbumsPreview([]);
        setAlbumChartData([]);
      }

      if (clientsResult.status === 'fulfilled') {
        setActiveClientsPreview(
          parseClientsFromFamilyResponse(clientsResult.value.data).slice(0, 4),
        );
      } else {
        setActiveClientsPreview([]);
      }

      if (servicesResult.status === 'fulfilled') {
        const response = servicesResult.value;
        const services = response.data.subscriptions || [];
        setServiceData(
          services.map((service: any) => ({
            name:
              service.serviceDisplayName ||
              service.serviceName ||
              service.name ||
              'Unknown Service',
            status: service.connectionStatus === 'CONNECTED' ? 'Connected' : 'Disconnected',
            lastSync: service.lastConnectionTest
              ? new Date(service.lastConnectionTest).toLocaleString()
              : 'Never',
            files: service.fileCount || 0,
            uptime: service.uptime || (service.connectionStatus === 'CONNECTED' ? 99.9 : 0),
            speed:
              service.speed || (service.connectionStatus === 'CONNECTED' ? 'Fast' : 'Offline'),
          })),
        );
      } else {
        errors.services = i18n.t('mainDashboard.errServices');
        console.error('Services error:', servicesResult.reason);
        setServiceData([]);
      }

      const adminHealth =
        adminHealthResult.status === 'fulfilled'
          ? (adminHealthResult.value as Record<string, string | undefined> | null)
          : null;

      if (isAdmin) {
        if (adminHealthResult.status === 'fulfilled') {
          setSystemHealth(buildSystemHealthFromAdmin(adminHealth ?? {}));
        } else {
          errors.systemHealth = i18n.t('mainDashboard.errSystemHealth');
          setSystemHealth([]);
        }
        if (adminStatsResult.status === 'fulfilled') {
          setUserAnalytics(
            buildUserAnalyticsFromAdmin(
              adminStatsResult.value,
              adminHealthResult.status === 'fulfilled' ? adminHealthResult.value : null,
            ),
          );
        } else {
          errors.userAnalytics = i18n.t('mainDashboard.errUserAnalytics');
          setUserAnalytics(null);
        }
      } else {
        setSystemHealth(buildSystemHealthFromAdmin(null));
        setUserAnalytics(null);
      }

      if (Object.keys(errors).length > 0) {
        setApiErrors(errors);
      }

      setLastUpdated(new Date());

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const recentUploads =
        filesResult.status === 'fulfilled' || statsResult.status === 'fulfilled'
          ? buildFileStatsFromResponses(filesPayload, statsPayload).recentUploads
          : 0;
      setUploadActivityData(
        Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (6 - i));
          return {
            day: `${days[d.getDay()]} ${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            uploads: i === 4 ? recentUploads : 0,
          };
        }),
      );
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(i18n.t('mainDashboard.loadFailed'));
    } finally {
      setLoading(false);
      fetchInFlightRef.current = false;
    }
  }, [isAdmin, i18n]);

  useEffect(() => {
    if (authLoading) return;
    fetchDashboardData();
  }, [authLoading, user?.id, fetchDashboardData]);

  // Generate recent activity based on available data
  const generateRecentActivity = () => {
    const activities: RecentActivity[] = [];

    if (stats?.recentUploads && stats.recentUploads > 0) {
      activities.push({
        id: 1,
        type: 'upload',
        title: i18n.t('mainDashboard.activityUploadTitle'),
        message: i18n.t('mainDashboard.activityUploadMsg', { count: stats.recentUploads }),
        time: '2 minutes ago',
        icon: FaUpload,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        status: 'completed',
        details: { filesUploaded: stats.recentUploads }
      });
    }

    if (serviceData.length > 0) {
      const activeServices = serviceData.filter(s => s.status === 'Connected').length;
      activities.push({
        id: 2,
        type: 'service',
        title: i18n.t('mainDashboard.activityServiceTitle'),
        message: i18n.t('mainDashboard.activityServiceMsg', { count: activeServices }),
        time: '1 hour ago',
        icon: FaCloud,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        status: 'completed',
        details: { activeServices }
      });
    }

    activities.push({
      id: 3,
      type: 'security',
      title: i18n.t('mainDashboard.activitySecurityTitle'),
      message: i18n.t('mainDashboard.activitySecurityMsg'),
      time: '3 hours ago',
      icon: FaShieldAlt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      status: 'completed',
      details: { threats: 0 }
    });

    setRecentActivity(activities);
  };

  // Generate quick insights based on available data
  const generateQuickInsights = () => {
    const insights: QuickInsight[] = [];

    if (stats) {
      insights.push({
        title: t('mainDashboard.totalFiles'),
        value: stats.totalFiles.toLocaleString(),
        description: i18n.t('mainDashboard.insightFilesInAccount'),
        icon: FaCloud,
        color: 'text-blue-600'
      });

      insights.push({
        title: t('mainDashboard.securityScore'),
        value: `${stats.securityScore}%`,
        description:
          stats.securityScore >= 95
            ? t('mainDashboard.excellentProtection')
            : stats.securityScore >= 80
              ? t('mainDashboard.goodProtection')
              : t('mainDashboard.needsAttention'),
        icon: FaShieldAlt,
        color: stats.securityScore >= 95 ? 'text-emerald-600' : stats.securityScore >= 80 ? 'text-yellow-600' : 'text-red-600'
      });
    }

    if (serviceData.length > 0) {
      const activeServices = serviceData.filter(s => s.status === 'Connected').length;
      insights.push({
        title: t('mainDashboard.activeServices'),
        value: activeServices.toString(),
        description: t('mainDashboard.cloudConnected'),
        icon: FaUpload,
        color: 'text-green-600'
      });
    }

    insights.push({
      title: t('mainDashboard.insightAccountStatus'),
      value: 'Active',
      description: t('mainDashboard.insightAccountSecure'),
      icon: FaStar,
      color: 'text-purple-600'
    });

    setQuickInsights(insights);
  };

  // Refresh data
  const handleRefresh = () => {
    fetchDashboardData();
  };

  useEffect(() => {
    if (loading || !stats) return;
    generateRecentActivity();
    generateQuickInsights();
  }, [loading, stats, serviceData, i18n.language]);

  const dynamicStats = useMemo(() => {
    if (!stats) return [];
    return [
      {
        name: t('mainDashboard.totalFiles'),
        value: stats.totalFiles.toLocaleString(),
        change: '+23%',
        changeType: 'positive' as const,
        icon: FaCloud,
        color: 'from-blue-500 via-blue-600 to-blue-700',
        description: t('mainDashboard.secureFiles'),
        trend: 'up' as const,
        details: stats.fileTypes
      },
      {
        name: t('mainDashboard.securityScore'),
        value: `${stats.securityScore}%`,
        change: '+2.3%',
        changeType: 'positive' as const,
        icon: FaShieldAlt,
        color: 'from-emerald-500 via-emerald-600 to-emerald-700',
        description:
          stats.securityScore >= 95
            ? t('mainDashboard.excellentProtection')
            : stats.securityScore >= 80
              ? t('mainDashboard.goodProtection')
              : t('mainDashboard.needsAttention'),
        trend: 'up' as const,
        details: {
          encryption: '100%',
          scanning: '98%',
          backup: '99%',
          access: '97%'
        }
      },
      {
        name: t('mainDashboard.activeServices'),
        value: serviceData.filter((s) => s.status === 'Connected').length.toString(),
        change: '+1',
        changeType: 'positive' as const,
        icon: FaUpload,
        color: 'from-orange-500 via-orange-600 to-orange-700',
        description: t('mainDashboard.cloudConnected'),
        trend: 'up' as const,
        details: serviceData.reduce((acc, service) => {
          acc[service.name.toLowerCase().replace(' ', '')] = service.status;
          return acc;
        }, {} as Record<string, string>)
      },
      {
        name: t('mainDashboard.recentUploads'),
        value: stats.recentUploads.toString(),
        change: '+5',
        changeType: 'positive' as const,
        icon: FaChartBar,
        color: 'from-purple-500 via-purple-600 to-purple-700',
        description: t('mainDashboard.filesUploadedToday'),
        trend: 'up' as const,
        details: {
          today: stats.recentUploads.toString(),
          thisWeek: Math.round(stats.recentUploads * 1.5).toString(),
          thisMonth: Math.round(stats.recentUploads * 4).toString()
        }
      }
    ];
  }, [stats, serviceData, t]);

  // Loading component
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('mainDashboard.loading')}</p>
        </div>
      </div>
    );
  }

  // Error component
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaExclamationTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
          >
            <FaRedoAlt className="h-4 w-4" />
            <span>{t('common.retry')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* ── Hero Welcome Section ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#ede9fe] via-[#f0ebff] to-[#f8f5ff] border border-violet-100/80"
        style={{ boxShadow: '0 4px 32px rgba(124,58,237,0.07), 0 1px 3px rgba(0,0,0,0.04)' }}>

        {/* Background orbs */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.18) 0%, transparent 70%)' }} />

        <div className="relative px-7 py-6 sm:px-10 sm:py-7">
          <div className="flex items-start justify-between gap-6">

            {/* ── Left ── */}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight mb-1.5">
                {t('mainDashboard.welcome', { name: user?.firstName || 'User' })} 👋
              </h1>
              <p className="text-sm text-slate-500 font-medium mb-4 max-w-lg">
                Here's what's happening with your studio today. Manage clients, album in one place.
              </p>

              {/* Stat badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200/60 bg-white/75 px-3 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur-sm"
                  style={{ boxShadow: '0 1px 6px rgba(124,58,237,0.07)' }}>
                  <FaCloud className="h-3 w-3 text-violet-500" />
                  <span className="font-bold text-slate-800">{stats?.totalFiles?.toLocaleString() ?? '—'}</span>
                  <span className="text-slate-500">Photos Uploaded</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200/60 bg-white/75 px-3 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur-sm"
                  style={{ boxShadow: '0 1px 6px rgba(124,58,237,0.07)' }}>
                  <FaUsers className="h-3 w-3 text-violet-500" />
                  <span className="font-bold text-slate-800">{serviceData.filter(s => s.status === 'Connected').length}</span>
                  <span className="text-slate-500">Active Clients</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200/60 bg-white/75 px-3 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur-sm"
                  style={{ boxShadow: '0 1px 6px rgba(124,58,237,0.07)' }}>
                  <FaChartBar className="h-3 w-3 text-violet-500" />
                  <span className="font-bold text-slate-800">18</span>
                  <span className="text-slate-500">Albums Created</span>
                </div>
              </div>
            </div>

            {/* ── Right: buttons + camera ── */}
            <div className="shrink-0 flex flex-col items-end gap-3">
              {/* Action buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => navigate('/upload')}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                    boxShadow: '0 4px 14px rgba(124,58,237,0.38)',
                  }}
                >
                  <FaUpload className="h-3.5 w-3.5" />
                  Upload Photos
                </button>
                <button
                  onClick={() => navigate('/studio/albums')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 active:scale-[0.98]"
                  style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
                >
                  <FaCloud className="h-3.5 w-3.5 text-violet-500" />
                  Create Album
                </button>
                <button
                  onClick={() => navigate('/invitations')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-bold text-slate-700 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 active:scale-[0.98]"
                  style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
                >
                  <FaUsers className="h-3.5 w-3.5 text-violet-500" />
                  Add Client
                </button>
              </div>

              {/* Camera illustration */}
              <div className="flex items-end gap-1 pr-1">
                <div className="relative">
                  {/* Camera body */}
                  <div className="flex h-14 w-16 items-center justify-center rounded-2xl bg-slate-800 shadow-lg"
                    style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
                    {/* Lens */}
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 border-2 border-slate-600">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 border border-slate-700">
                        <div className="h-2 w-2 rounded-full bg-slate-600" />
                      </div>
                    </div>
                    {/* Flash */}
                    <div className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-slate-500" />
                    {/* Viewfinder bump */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-2 w-5 rounded-t-md bg-slate-700" />
                  </div>
                  {/* Flower decoration */}
                  <div className="absolute -top-3 -right-3 text-lg">🌸</div>
                </div>
                {/* Purple bottle/vase decoration */}
                <div className="mb-1 flex h-10 w-4 flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-violet-400" />
                  <div className="flex-1 w-3 rounded-b-lg bg-gradient-to-b from-violet-400 to-violet-600 mt-0.5" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* API Errors Banner */}
      {Object.keys(apiErrors).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <div className="flex items-start space-x-2">
            <FaExclamationTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xs font-medium text-yellow-800">{t('mainDashboard.apiPartial')}</h3>
              <ul className="mt-1 text-xs text-yellow-700 list-disc list-inside space-y-0.5">
                  {Object.entries(apiErrors).map(([key, error]) => (
                    <li key={key}>{error}</li>
                  ))}
                </ul>
            </div>
            <button onClick={handleRefresh} className="text-yellow-600 hover:text-yellow-800 flex-shrink-0">
              <FaRedoAlt className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Refresh Button and Last Updated */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {lastUpdated && (
            <span>{t('mainDashboard.lastUpdated')} {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-1.5 text-sm font-medium"
        >
          <FaRedoAlt className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? t('mainDashboard.refreshing') : t('mainDashboard.refreshData')}</span>
        </button>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'TOTAL CLIENTS',
            value: userAnalytics?.totalUsers?.toLocaleString() ?? (stats ? '9' : '—'),
            trend: '+12% this month',
            trendUp: true,
            icon: FaUsers,
            iconBg: 'bg-violet-100',
            iconColor: 'text-violet-600',
            sparkData: [2,3,2,5,4,7,6],
            sparkColor: '#7c3aed',
          },
          {
            label: 'TOTAL ALBUMS',
            value: albumChartData.length > 0 ? albumChartData.length.toString() : '18',
            trend: '+8% this month',
            trendUp: true,
            icon: FaCloud,
            iconBg: 'bg-violet-100',
            iconColor: 'text-violet-600',
            sparkData: [3,4,3,6,5,8,7],
            sparkColor: '#7c3aed',
          },
          {
            label: 'TOTAL VIDEOS',
            value: '0',
            trend: '0% this month',
            trendUp: false,
            icon: FaChartBar,
            iconBg: 'bg-pink-100',
            iconColor: 'text-pink-500',
            sparkData: [0,0,0,0,0,0,0],
            sparkColor: '#ec4899',
          },
          {
            label: 'TOTAL PHOTOS',
            value: stats?.totalFiles?.toLocaleString() ?? '—',
            trend: '+28% this month',
            trendUp: true,
            icon: FaShieldAlt,
            iconBg: 'bg-pink-100',
            iconColor: 'text-pink-500',
            sparkData: [10,20,15,30,25,40,35],
            sparkColor: '#ec4899',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label}
              className="bg-white rounded-2xl p-5 border border-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
              <div className="flex items-start justify-between mb-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <div className="w-20 h-9">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={card.sparkData.map((v, i) => ({ v, i }))}>
                      <Line type="monotone" dataKey="v" stroke={card.sparkColor} strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-4xl font-extrabold text-slate-900 leading-none mb-1.5">{card.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-3">{card.label}</p>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${card.trendUp ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {card.trendUp ? '↑' : '→'} {card.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Album Statistics */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                <FaChartBar className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-slate-800">Album Statistics</p>
                <p className="text-[11px] text-slate-400">Top albums by image count</p>
              </div>
            </div>
            <button className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
              View All
            </button>
          </div>
          <div className="mt-5" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={albumChartData.length > 0 ? albumChartData : [
                  { name: 'Wedding', count: 52 },
                  { name: 'Birthday', count: 28 },
                  { name: 'Family', count: 35 },
                  { name: 'Studio', count: 20 },
                  { name: 'Events', count: 15 },
                  { name: 'Travel', count: 10 },
                ]}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                barSize={32}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12, padding: '8px 12px' }}
                  cursor={{ fill: 'rgba(124,58,237,0.04)' }}
                />
                <Bar dataKey="count" name="Images" radius={[6, 6, 0, 0]}>
                  {['#7c3aed','#a78bfa','#06b6d4','#10b981','#f59e0b','#ec4899','#f97316'].map((color, i) => (
                    <Cell key={i} fill={color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upload Activity */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                <FaUpload className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-slate-800">Upload Activity</p>
                <p className="text-[11px] text-slate-400">Last 7 days</p>
              </div>
            </div>
            <button className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
              View All
            </button>
          </div>
          <div className="mt-5" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={uploadActivityData.length > 0 ? uploadActivityData : [
                  { day: 'Sun 05-02', uploads: 0 },
                  { day: 'Mon 05-03', uploads: 1 },
                  { day: 'Tue 05-04', uploads: 0 },
                  { day: 'Wed 05-05', uploads: 2 },
                  { day: 'Thu 05-06', uploads: 9 },
                  { day: 'Fri 05-07', uploads: 4 },
                  { day: 'Sat 05-08', uploads: 2 },
                ]}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12, padding: '8px 12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="uploads"
                  name="Uploads"
                  stroke="#7c3aed"
                  strokeWidth={2.5}
                  fill="url(#uploadGrad)"
                  dot={{ fill: '#7c3aed', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>


      {/* ── Recent Projects + Recent Uploads + Active Clients ── */}
      <DashboardBottomSections
        navigate={navigate}
        recentAlbums={recentAlbumsPreview}
        recentImages={recentImagesPreview}
        activeClients={activeClientsPreview}
        totalImages={totalImagesCount}
        storageTotalSize={stats?.totalSize}
      />

      {/* Activity and System Health Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">{t('mainDashboard.recentActivity')}</h3>
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">{t('mainDashboard.liveUpdates')}</span>
              </div>
            </div>
            <div className="space-y-2 scrollable scrollable-lg scrollable-content">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div 
                    key={activity.id} 
                    className={`group relative p-3 ${activity.bgColor} rounded-lg border border-gray-100 hover:shadow-sm transition-all duration-200 hover:translate-x-1 cursor-pointer`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-9 h-9 ${activity.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-0.5">{activity.title}</h4>
                        <p className="text-xs text-gray-500 mb-1">{activity.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{activity.time}</span>
                          {activity.status === 'completed' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              {t('mainDashboard.completed')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Hover details */}
                    <div className="absolute inset-0 bg-white rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto shadow-md border border-gray-100">
                      <div className="space-y-1.5">
                        <h4 className="font-semibold text-gray-900 text-sm">{activity.title}</h4>
                        <p className="text-xs text-gray-500">{activity.message}</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {Object.entries(activity).filter(([key]) => !['id', 'type', 'title', 'message', 'time', 'icon', 'color', 'bgColor', 'status'].includes(key)).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-400 capitalize">{key}:</span>
                              <span className="font-medium text-gray-800">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* System Health Status */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4">{t('mainDashboard.systemHealth')}</h3>
            <div className="space-y-2">
              {systemHealth.map((health) => {
                const Icon = health.icon;
                return (
                  <div 
                    key={health.name}
                    className="group relative p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 text-xs">{health.name}</h4>
                        <p className="text-sm font-bold text-green-600">{health.value}</p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    </div>
                    
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      {health.details}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions + Quick Insights row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {isAdmin ? t('mainDashboard.adminActions') : t('mainDashboard.quickActions')}
            </h3>
            <div className="space-y-2">
              {isAdmin ? (
                <>
                  <button 
                    onClick={() => navigate('/admin')}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <FaUsers className="h-4 w-4" />
                    <span>{t('mainDashboard.userManagement')}</span>
                  </button>
                  <button 
                    onClick={() => navigate('/analytics')}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <FaChartBar className="h-4 w-4" />
                    <span>{t('mainDashboard.systemAnalytics')}</span>
                  </button>
                  <button 
                    onClick={() => navigate('/services')}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <FaCloud className="h-4 w-4" />
                    <span>{t('mainDashboard.serviceManagement')}</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/upload')}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <FaUpload className="h-4 w-4" />
                    <span>{t('mainDashboard.uploadFiles')}</span>
                  </button>
                  <button 
                    onClick={() => navigate('/images')}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <FaShieldAlt className="h-4 w-4" />
                    <span>{t('mainDashboard.myFiles')}</span>
                  </button>
                  <button 
                    onClick={() => navigate('/services')}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                  >
                    <FaCloud className="h-4 w-4" />
                    <span>{t('mainDashboard.cloudServices')}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4">{t('mainDashboard.quickInsights')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickInsights.map((insight) => {
                const Icon = insight.icon;
                return (
                  <div 
                    key={insight.title}
                    className="group p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 cursor-pointer border border-gray-100"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 ${insight.color.replace('text-', 'bg-').replace('-600', '-100')} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${insight.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-gray-700 text-xs truncate">{insight.title}</h4>
                        <p className="text-base font-bold text-gray-900">{insight.value}</p>
                        <p className="text-xs text-gray-500 truncate">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic File Analytics Section */}
      {stats && !apiErrors.fileStats && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">{t('mainDashboard.fileAnalyticsTitle')}</h3>
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">{t('mainDashboard.realtimeData')}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* File Overview */}
            <div className="lg:col-span-1">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">{t('mainDashboard.fileOverviewTitle')}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700 font-medium">{t('mainDashboard.totalFilesLabel')}</span>
                    <span className="text-lg font-bold text-blue-900">{stats.totalFiles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700 font-medium">{t('mainDashboard.totalSizeLabel')}</span>
                    <span className="text-base font-bold text-blue-900">{stats.totalSize}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700 font-medium">{t('mainDashboard.recentUploadsLabel')}</span>
                    <span className="text-base font-bold text-blue-900">{stats.recentUploads}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* File Types Breakdown */}
            <div className="lg:col-span-2">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <h4 className="text-sm font-semibold text-green-900 mb-3">{t('mainDashboard.fileTypesBreakdownTitle')}</h4>
                {Object.keys(stats.fileTypes).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(stats.fileTypes).map(([type, data]) => (
                      <div key={type} className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-800 capitalize">{type}</span>
                          <span className="text-sm font-bold text-green-600">{data.count}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                          <span>{data.size}</span>
                          <span>{data.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${data.percentage}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400">{t('mainDashboard.noFileTypeData')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Analytics Error Fallback */}
      {apiErrors.fileStats && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-center py-6">
            <FaExclamationTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('mainDashboard.fileAnalyticsUnavailable')}</h3>
            <p className="text-xs text-gray-500 mb-3">{t('mainDashboard.fileStatsRefresh')}</p>
            <button onClick={handleRefresh} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center space-x-1.5 mx-auto text-sm">
              <FaRedoAlt className="h-3.5 w-3.5" />
              <span>{t('common.retry')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Service Analytics Section */}
      {serviceData.length > 0 && !apiErrors.services && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">{t('mainDashboard.serviceAnalyticsTitle')}</h3>
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">{t('mainDashboard.allServicesConnected')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Connected Services */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">{t('mainDashboard.connectedServicesTitle')}</h4>
              <div className="space-y-2">
                {serviceData.map((service, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-semibold text-gray-800 truncate">{service.name}</h5>
                        <p className="text-xs text-gray-400">{t('mainDashboard.lastSync')} {service.lastSync}</p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <div className="flex items-center space-x-1.5 justify-end">
                          <div className={`w-2 h-2 rounded-full ${service.status === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className={`text-xs font-semibold ${service.status === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
                            {service.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{service.files} {t('mainDashboard.filesSuffix')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Performance */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <h4 className="text-sm font-semibold text-purple-900 mb-3">{t('mainDashboard.servicePerformanceTitle')}</h4>
              <div className="space-y-2">
                {serviceData.map((service, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800 truncate">{service.name}</span>
                      <span className="text-sm font-bold text-purple-600 ml-2">{service.uptime}%</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t('mainDashboard.speedLabel')} {service.speed}</span>
                      <span className="font-medium text-purple-600">{t('mainDashboard.good')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Error Fallback */}
      {apiErrors.services && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-center py-6">
            <FaExclamationTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('mainDashboard.serviceAnalyticsUnavailable')}</h3>
            <p className="text-xs text-gray-500 mb-3">{t('mainDashboard.serviceDataRefresh')}</p>
            <button onClick={handleRefresh} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center space-x-1.5 mx-auto text-sm">
              <FaRedoAlt className="h-3.5 w-3.5" />
              <span>{t('common.retry')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic User Analytics Section (Admin Only) */}
      {isAdmin && userAnalytics && !apiErrors.userAnalytics && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">{t('mainDashboard.userAnalyticsTitle')}</h3>
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">{t('mainDashboard.activeUsers')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* User Overview */}
            <div className="lg:col-span-1">
              <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                <h4 className="text-sm font-semibold text-pink-900 mb-3">{t('mainDashboard.userOverviewTitle')}</h4>
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-pink-600 mb-1">{userAnalytics.totalUsers.toLocaleString()}</div>
                    <p className="text-xs text-pink-700 font-medium">{t('mainDashboard.totalUsers')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-pink-600">{t('mainDashboard.active')}</span>
                      <span className="text-sm font-semibold text-pink-900">{userAnalytics.activeUsers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-pink-600">{t('mainDashboard.newToday')}</span>
                      <span className="text-sm font-semibold text-pink-900">{userAnalytics.newUsers}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Activity */}
            <div className="lg:col-span-2">
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <h4 className="text-sm font-semibold text-orange-900 mb-3">{t('mainDashboard.userActivityTitle')}</h4>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(userAnalytics.userActivity).map(([period, count]) => (
                    <div key={period} className="bg-white rounded-lg p-3 shadow-sm text-center">
                      <div className="text-xl font-bold text-orange-600 mb-0.5">{count.toLocaleString()}</div>
                      <p className="text-xs text-orange-600 capitalize">{period} {t('mainDashboard.usersSuffix')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* User Plans and Recent Activity */}
          {userAnalytics.userStats.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <h4 className="text-sm font-semibold text-green-900 mb-3">{t('mainDashboard.userPlansTitle')}</h4>
                <div className="space-y-2">
                  {userAnalytics.userStats.map((plan, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-800">{plan.plan}</span>
                        <span className="text-sm font-bold text-green-600">{plan.users.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${plan.percentage}%` }}></div>
                      </div>
                      <p className="text-xs text-green-600">{t('mainDashboard.percentOfTotal', { n: plan.percentage })}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">{t('mainDashboard.recentUserActivityTitle')}</h4>
                <div className="space-y-2">
                  {userAnalytics.recentActivity.length > 0 ? (
                    userAnalytics.recentActivity.map((activity, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{activity.user}</p>
                            <p className="text-xs text-gray-500">{activity.action}</p>
                          </div>
                          <span className="text-xs text-blue-600 ml-2 flex-shrink-0">{activity.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-400">{t('mainDashboard.noRecentActivityData')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Analytics Error Fallback (Admin Only) */}
      {isAdmin && apiErrors.userAnalytics && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-center py-6">
            <FaExclamationTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-800 mb-1">{t('mainDashboard.userAnalyticsUnavailable')}</h3>
            <p className="text-xs text-gray-500 mb-3">{t('mainDashboard.userAnalyticsRefresh')}</p>
            <button onClick={handleRefresh} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center space-x-1.5 mx-auto text-sm">
              <FaRedoAlt className="h-3.5 w-3.5" />
              <span>{t('common.retry')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
