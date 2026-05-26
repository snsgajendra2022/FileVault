import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Images, Users, Star, Clock, ArrowUpRight, CheckCircle2, Sparkles } from 'lucide-react';
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
import { useDocumentTheme } from '../../hooks/useDocumentTheme';
/** Theme tokens — CSS variables switch in light / dark / system (see StudioDashboard.css). */
export const THEME = {
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  background: 'var(--sd-page-bg)',
  cardBackground: 'var(--sd-card)',
  heroBackground: 'var(--sd-hero-bg)',
  border: 'var(--sd-border)',
  textPrimary: 'var(--sd-text-primary)',
  textSecondary: 'var(--sd-text-secondary)',
  success: '#10B981',
  shadow: 'var(--sd-shadow-medium)',
  primaryHover: '#3B82F6',
  cardBg: 'var(--sd-card)',
  textMuted: 'var(--sd-text-muted)',
  borderLight: 'var(--sd-border-light)',
  heroGradient: 'var(--sd-hero-bg)',
  shadowLight: 'var(--sd-shadow)',
  shadowMedium: 'var(--sd-shadow-medium)',
  shadowHeavy: 'var(--sd-shadow-medium)',
  glassBg: 'var(--sd-glass)',
  glassBgLight: 'var(--sd-glass)',
  glassBgLighter: 'var(--sd-glass)',
  chartColors: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'],
  online: '#10B981',
  offline: 'var(--sd-text-muted)',
  warning: '#F59E0B',
  hoverOverlay: 'rgba(37,99,235,0.08)',
  activeScale: 'scale-[0.98]',
  hoverScale: 'scale-[1.02]',
  tooltipBg: 'var(--sd-tooltip-bg)',
  tooltipBorder: 'var(--sd-tooltip-border)',
  statusNewBg: 'var(--sd-status-new-bg)',
};

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

// Status variants using theme colors
const STATUS_VARIANTS = [
  { label: 'Published', bg: 'var(--sd-chip-bg)', text: THEME.primary, dot: THEME.primaryLight },
  { label: 'Featured', bg: 'var(--sd-chip-bg)', text: THEME.primary, dot: THEME.primaryLight },
  { label: 'New', bg: 'var(--sd-status-new-bg)', text: THEME.textSecondary, dot: THEME.textMuted },
];

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

// ── StudioActivityAndClients ─────────────────────────────────────────────────
// Maps raw filenames to beautiful photography category names
const PHOTO_CATEGORIES = [
  'Wedding Moments', 'Birthday Memories', 'Studio Portraits',
  'Pre Wedding Shoot', 'Nature Collection', 'Family Album',
  'Golden Hour', 'Candid Stories', 'Engagement Session',
  'Baby Shower', 'Corporate Event', 'Travel Diaries',
];

function getAlbumDisplayName(img: any, index: number): string {
  // If the image belongs to a named album, use that
  if (img.albumName && !/^album\s*\d+$/i.test(img.albumName)) return img.albumName;
  // Otherwise rotate through beautiful category names
  return PHOTO_CATEGORIES[index % PHOTO_CATEGORIES.length];
}

function StudioActivityAndClients({
  recentImages,
  recentClients,
  t,
  user,
}: {
  recentImages: any[];
  recentClients: RecentClient[];
  t: (key: string, opts?: any) => any;
  user?: { id?: string | number; firstName?: string; [key: string]: any } | null;
}) {
  const avatarGrads = [
    THEME.heroBackground,
    THEME.heroBackground,
    THEME.heroBackground,
    THEME.heroBackground,
    THEME.heroBackground,
  ];

  const fmtDate = (iso: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return '—'; }
  };

  // Group images by album (or treat each as its own "shoot")
  // We show up to 6 gallery cards
  const galleryItems = recentImages.slice(0, 6).map((img: any, i: number) => ({
    img,
    displayName: getAlbumDisplayName(img, i),
    status: STATUS_VARIANTS[i % STATUS_VARIANTS.length],
    photoCount: img.albumImageCount || img.imageCount || Math.floor(Math.random() * 80) + 12,
    date: fmtDate(img.uploadTime || img.createdAt || ''),
    src: img.previewUrl || img.thumbnailUrl || img.downloadUrl || null,
    rating: (4 + (i % 2) * 0.5).toFixed(1),
  }));

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

      {/* ── Premium Gallery Uploads ── */}
      <div className="sd-card rounded-2xl border overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b"
          style={{ borderColor: THEME.border }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl sd-icon-badge border">
              <Images className="h-4 w-4 text-[#2563EB]" />
            </div>
            <div>
              <p className="text-[14px] font-bold" style={{ color: THEME.textPrimary }}>Recent Gallery</p>
              <p className="text-[11px]" style={{ color: THEME.textSecondary }}>Latest photography sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="sd-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: THEME.primary }} />
              Live
            </span>
            <Link to="/client-images"
              className="inline-flex items-center gap-1 text-[11px] font-bold transition-colors"
              style={{ color: THEME.primary }}>
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="p-4">
          {galleryItems.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: THEME.textMuted }}>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-3 sd-muted-box border">
                <Images className="h-7 w-7 text-[THEME.primaryLight]" />
              </div>
              <p className="font-semibold" style={{ color: THEME.textSecondary }}>No uploads yet</p>
              <p className="text-[12px] mt-1">Start uploading your photography sessions</p>
              <Link to="/upload"
                className="inline-flex items-center gap-1.5 mt-3 rounded-xl px-4 py-2 text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryLight} 100%)` }}>
                <FaPlus className="h-3 w-3" /> Upload Photos
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryItems.map(({ img, displayName, status, photoCount, date, src, rating }, i) => (
                <motion.div
                  key={img.id || i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                >
                  <Link to="/client-images" className="block group cursor-pointer">
                    {/* Image card */}
                    <div className="relative rounded-xl overflow-hidden aspect-[4/3] mb-2 sd-muted-box"
                      style={{ boxShadow: 'var(--sd-shadow)' }}>

                      {/* Thumbnail */}
                      {src ? (
                        <img src={src} alt={displayName}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{
                            background: [
                              'linear-gradient(135deg,#EEF4FF 0%,#E7F0FF 100%)',
                              'linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 100%)',
                              'linear-gradient(135deg,#F0F9FF 0%,#E0F2FE 100%)',
                              'linear-gradient(135deg,#EEF4FF 0%,#E7F0FF 100%)',
                              'linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 100%)',
                              'linear-gradient(135deg,#F0F9FF 0%,#E0F2FE 100%)',
                            ][i % 6]
                          }}>
                          <FaCamera className="h-6 w-6 text-[#2563EB]" />
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(17,24,39,0.55) 100%)' }} />

                      {/* Status badge — top left */}
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold backdrop-blur-sm"
                          style={{ background: status.bg + 'cc', color: status.text }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.dot }} />
                          {status.label}
                        </span>
                      </div>

                      {/* Photo count — top right */}
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center gap-1 rounded-full backdrop-blur-sm px-2 py-0.5 text-[9px] font-bold text-white"
                          style={{ background: 'rgba(15,23,42,0.35)', border: '1px solid rgba(255,255,255,0.14)' }}>
                          <Images className="h-2.5 w-2.5" />
                          {photoCount}
                        </span>
                      </div>

                      {/* Hover overlay — view button */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-lg"
                          style={{ border: '1px solid #F1F2F6', boxShadow: '0 6px 24px rgba(37,99,235,0.08)' }}>
                          <ArrowUpRight className="h-4 w-4 text-[#2563EB]" />
                        </div>
                      </div>
                    </div>

                    {/* Card info */}
                    <div className="px-0.5">
                      <p className="text-[12px] font-bold truncate leading-tight" style={{ color: THEME.textPrimary }}>{displayName}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <div className="flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 text-[THEME.primaryLight] fill-[THEME.primaryLight]" />
                          <span className="text-[10px] font-semibold" style={{ color: THEME.textSecondary }}>{rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 text-[THEME.textMuted]" />
                          <span className="text-[10px]" style={{ color: THEME.textMuted }}>{date}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Clients ── */}
      <div className="sd-card rounded-[20px] border overflow-hidden"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 2px 12px rgba(15,23,42,0.06)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b"
          style={{ borderColor: '#F3F4F6' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl sd-icon-badge border">
              <Users className="h-4 w-4 text-[#2563EB]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: THEME.textPrimary }}>{t('dashboard.recentClients')}</p>
              <p className="text-[11px]" style={{ color: THEME.textMuted }}>Connected members</p>
            </div>
          </div>
          <Link to="/invitations"
            className="inline-flex items-center gap-1 text-[12px] font-medium transition-colors"
            style={{ color: THEME.primary }}>
            View All <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Client list */}
        <div className="px-4 py-2">
          {recentClients.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: THEME.textMuted }}>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-3 sd-muted-box border">
                <Users className="h-6 w-6 text-[#2563EB]" />
              </div>
              <p className="font-semibold text-[13px]" style={{ color: THEME.textSecondary }}>No clients yet</p>
              <p className="text-[12px] mt-0.5">Invite your first client to get started</p>
              <Link to="/invitations"
                className="inline-flex items-center gap-1.5 mt-3 rounded-xl px-4 py-2 text-xs font-semibold text-white"
                style={{ background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryLight} 100%)` }}>
                <FaPlus className="h-3 w-3" /> Invite Client
              </Link>
            </div>
          ) : recentClients.map((client, i) => {
            const online = i % 3 !== 1;
            const sessionLabels = ['2h ago', 'Yesterday', '2d ago', '3d ago', '1w ago'];
            const avatarColors = ['#2563EB', '#3B82F6', '#0EA5E9', '#0891B2', '#1D4ED8'];
            return (
              <div key={client.id}>
                <motion.div
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.22 }}
                  className="flex items-center gap-3 py-3 group cursor-pointer"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full text-white text-[12px] font-bold"
                      style={{ background: avatarColors[i % avatarColors.length] }}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold truncate" style={{ color: THEME.textPrimary }}>{client.name}</p>
                    <p className="text-[11px] truncate" style={{ color: THEME.textMuted }}>{client.email || '—'}</p>
                  </div>

                  {/* Right side */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={online
                        ? { background: '#ECFDF5', color: '#059669', border: '1px solid #D1FAE5' }
                        : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }
                      }>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: online ? '#10B981' : '#9CA3AF' }} />
                      {online ? 'Active' : 'Away'}
                    </span>
                    <span className="text-[10px]" style={{ color: THEME.textMuted }}>{sessionLabels[i] || '—'}</span>
                  </div>

                  {/* Hover actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <Link to="/studio/clients"
                      className="h-7 w-7 flex items-center justify-center rounded-lg sd-card border transition-colors hover:opacity-90"
                      style={{ color: THEME.textMuted }}>
                      <FaEye className="h-3 w-3" />
                    </Link>
                    <button type="button"
                      className="h-7 w-7 flex items-center justify-center rounded-lg sd-card border transition-colors hover:opacity-90"
                      style={{ color: THEME.textMuted }}>
                      <FaShare className="h-3 w-3" />
                    </button>
                  </div>
                </motion.div>
                {/* Thin divider between rows (not after last) */}
                {i < recentClients.length - 1 && (
                  <div className="h-px" style={{ background: '#F3F4F6' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        {recentClients.length > 0 && (
          <div className="px-4 pb-4 pt-3">
            <Link to="/invitations"
              className="sd-chip flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-[12px] font-semibold border transition-colors hover:opacity-90"
              style={{ color: THEME.primary }}>
              <Sparkles className="h-3.5 w-3.5" />
              Invite New Client
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

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
  const { user, isAdmin } = useAuth();
  const { theme: colorMode } = useDocumentTheme();
  const chartTickColor = colorMode === 'dark' ? '#94a3b8' : '#64748b';
  const chartGridColor = colorMode === 'dark' ? '#334155' : '#f1f5f9';

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
    <div className="studio-dashboard premium-dashboard sd-page">
      <main className="relative w-full px-4 py-6 sm:px-6 sm:py-8">
        {/* 1. Welcome Hero */}
        <section className="sd-hero-panel relative overflow-hidden rounded-2xl mb-6 border">
          {/* Soft mesh light */}
          <div className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 70% 40%, rgba(37,99,235,0.08) 0%, transparent 70%)' }} />
          <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.16) 0%, transparent 65%)' }} />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 px-6 py-7 sm:px-8">
            {/* Left — text + badges */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight leading-tight"
                style={{ color: THEME.textPrimary }}>
                {t('dashboard.welcome', { name: firstName })} 
              </h1>
              <p className="mt-1.5 text-[13px] font-normal" style={{ color: THEME.textSecondary }}>
                {t('dashboard.welcomeSummary')}
              </p>

              {/* Stat badges */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="sd-chip inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium border"
                  style={{ backdropFilter: 'none' }}>
                  <FaImages className="h-3 w-3 text-[#2563EB]" />
                  {photosCount.toLocaleString()} {t('dashboard.photosUploaded')}
                </span>
                <span className="sd-chip inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium border"
                  style={{ backdropFilter: 'none' }}>
                  <FaUsers className="h-3 w-3 text-[#2563EB]" />
                  {(typeof stats.totalMember === 'number' ? stats.totalMember : 0)} {t('dashboard.activeClients')}
                </span>
                <span className="sd-chip inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium border"
                  style={{ backdropFilter: 'none' }}>
                  <FaFolder className="h-3 w-3 text-[#2563EB]" />
                  {(stats.totalAlbums ?? 0)} {t('dashboard.albumsCreated')}
                </span>
              </div>
            </div>

            {/* Right — action buttons + camera illustration */}
            <div className="flex flex-col items-start sm:items-end gap-4 shrink-0">
              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/upload"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryLight} 100%)`, boxShadow: '0 10px 24px rgba(37,99,235,0.18)' }}
                >
                  <FaImages className="h-3.5 w-3.5 text-white" />
                  {t('dashboard.uploadPhotos')}
                </Link>
                <Link
                  to="/studio/albums"
                  className="sd-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FaFolder className="h-3.5 w-3.5 text-[#2563EB]" />
                  {t('dashboard.createAlbum')}
                </Link>
                <Link
                  to="/invitations"
                  className="sd-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FaShare className="h-3.5 w-3.5 text-[#2563EB]" />
                  {t('dashboard.addClient')}
                </Link>
              </div>

              {/* Camera illustration — decorative with soft blue glassmorphism */}
              <div className="hidden sm:flex items-end gap-2 opacity-90 select-none pointer-events-none">
                <div className="relative">
                  {/* Camera body */}
                  <div className="w-20 h-14 rounded-xl shadow-xl flex items-center justify-center"
                    style={{ background: THEME.glassBgLight, border: `1px solid ${THEME.border}`, boxShadow: THEME.shadowMedium }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ border: '4px solid rgba(37,99,235,0.22)' }}>
                      <div className="w-4 h-4 rounded-full" style={{ background: 'rgba(37,99,235,0.29)' }} />
                    </div>
                    <div className="absolute top-1.5 right-2 w-2 h-1.5 rounded-sm" style={{ background: 'rgba(37,99,235,0.42)' }} />
                  </div>
                  {/* Flash */}
                  <div className="absolute -top-1.5 left-3 w-5 h-2 rounded-sm"
                    style={{ background: '#EFF6FF', border: `1px solid ${THEME.borderLight}` }} />
                </div>
                {/* Flower pot */}
                <div className="flex flex-col items-center mb-1">
                  <div className="text-lg">🌸</div>
                  <div className="w-5 h-6 rounded-b-lg"
                    style={{ background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryLight} 100%)` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Statistics Cards — premium Tailwind */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label}
                className="sd-card rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${card.iconBg}`}>
<Icon className={`w-[18px] h-[18px] ${card.iconColor}`} />
                  </div>
                  {/* Mini sparkline */}
                  <div className="w-20 h-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={card.spark.map((v, i) => ({ v, i }))}>
                        <Line type="monotone" dataKey="v"
                          stroke={card.sparkColor}
                          strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <p className="text-[28px] font-bold leading-none mb-1.5 tracking-tight" style={{ color: THEME.textPrimary }}>{card.value}</p>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: THEME.textMuted }}>{card.label}</p>
                <span className={`text-[12px] font-medium ${card.trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
                  {card.trendUp ? '↑' : '↓'} {card.trend}
                </span>
              </div>
            );
          })}
        </section>

        {/* 3. Analytics & Charts — premium Tailwind */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Album Statistics */}
          <div className="sd-card rounded-2xl p-6 border">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl sd-icon-badge border">
                  <FaFolder className="h-4 w-4 text-[#2563EB]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: THEME.textPrimary }}>{t('dashboard.albumStatistics')}</p>
                  <p className="text-[11px]" style={{ color: THEME.textMuted }}>{t('dashboard.topAlbumsByCount')}</p>
                </div>
              </div>
              <Link to="/studio/albums" className="text-[12px] font-medium transition-colors"
                style={{ color: THEME.primary }}>
                {t('dashboard.viewAllAlbums')}
              </Link>
            </div>
            {albumChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[THEME.textMuted]">
                <FaFolder className="h-10 w-10 mb-3 text-[THEME.borderLight]" />
                <p className="text-sm">{t('dashboard.noAlbumsYet')}</p>
                <Link to="/studio/albums" className="mt-2 text-xs font-semibold text-[THEME.primary] hover:underline">
                  {t('dashboard.createFirstAlbum')}
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={albumChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chartTickColor, fontSize: 11, fontWeight: 500 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: chartTickColor, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(37,99,235,0.06)' }} />
                  <Bar dataKey="value" name={t('dashboard.images')} radius={[6, 6, 0, 0]}>
                    {albumChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Upload Activity */}
          <div className="sd-card rounded-2xl p-6 border">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl sd-icon-badge border">
                  <FaChartLine className="h-4 w-4 text-[#2563EB]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: THEME.textPrimary }}>{t('dashboard.uploadActivity')}</p>
                  <p className="text-[11px]" style={{ color: THEME.textMuted }}>{t('dashboard.last7Days')}</p>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              {/* Area chart for smooth premium look */}
              <LineChart data={uploadActivityData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="uploadGradStudio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={THEME.primary} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={THEME.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: chartTickColor, fontSize: 10, fontWeight: 500 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: chartTickColor, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="count" name={t('dashboard.uploads')}
                  stroke={THEME.primary} strokeWidth={2.5}
                  dot={{ fill: THEME.primary, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: THEME.primary, stroke: colorMode === 'dark' ? '#1e293b' : '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 4. Recent Activity + 5. Recent Clients — premium Tailwind */}
        <StudioActivityAndClients
          recentImages={allPhotos.slice(0, 6)}
          recentClients={recentClients}
          t={t}
          user={user}
        />

        {/* 6. Quick Access — Ultra Premium SaaS Action Cards */}
        <section className="mb-8">
          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[17px] font-extrabold tracking-tight" style={{ color: THEME.textPrimary }}>{t('dashboard.quickAccess')}</h3>
              <p className="text-[12px] mt-0.5" style={{ color: THEME.textMuted }}>{t('dashboard.quickAccessSubtitle')}</p>
            </div>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="sd-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold cursor-default select-none border"
              style={{ color: THEME.primary, boxShadow: 'var(--sd-shadow)' }}>
              <Sparkles className="h-3 w-3" />
              Quick Actions
            </motion.span>
          </div>

          {/* ── Grid: 1 hero card (tall) + 3 stacked on right ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* ── HERO CARD: Manage Clients ── */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              whileHover={{ y: -5, transition: { duration: 0.22, ease: 'easeOut' } }}
            >
              <Link to="/studio/clients" className="block h-full group">
                <div className="relative h-full min-h-[280px] rounded-[20px] overflow-hidden p-6 flex flex-col justify-between"
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                    boxShadow: '0 12px 40px rgba(37,99,235,0.30)',
                  }}>

                  {/* Subtle mesh overlay */}
                  <div className="pointer-events-none absolute inset-0"
                    style={{ background: 'radial-gradient(ellipse 90% 70% at 80% 20%, rgba(255,255,255,0.10) 0%, transparent 65%)' }} />
                  <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)' }} />

                  {/* Top: icon + badge */}
                  <div className="flex items-start justify-between relative z-10">
                    <motion.div
                      whileHover={{ rotate: 6, scale: 1.08 }}
                      transition={{ duration: 0.18 }}
                      className="flex h-13 w-13 items-center justify-center rounded-2xl"
                      style={{
                        width: '52px', height: '52px',
                        background: 'rgba(255,255,255,0.18)',
                        border: '1px solid rgba(255,255,255,0.30)',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
                      }}>
                      <Users className="h-6 w-6 text-white" />
                    </motion.div>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
                      style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      Live
                    </span>
                  </div>

                  {/* Bottom: text + stats + arrow */}
                  <div className="relative z-10">
                    <p className="text-[21px] font-bold text-white leading-tight tracking-tight mb-1">
                      {t('dashboard.manageClients')}
                    </p>
                    <p className="text-[12px] text-blue-100 leading-relaxed mb-5">
                      {t('dashboard.manageClientsDesc')}
                    </p>

                    {/* Stats pills */}
                    <div className="flex items-center gap-2 mb-5">
                      <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-white"
                        style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)' }}>
                        <Users className="h-3 w-3" />
                        {(typeof stats.totalMember === 'number' ? stats.totalMember : 0)} Clients
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-emerald-200"
                        style={{ background: 'rgba(52,211,153,0.16)', border: '1px solid rgba(52,211,153,0.28)' }}>
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    </div>

                    {/* CTA row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-blue-100">View all clients →</span>
                      <motion.div
                        whileHover={{ x: 2, y: -2 }}
                        transition={{ duration: 0.14 }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{
                          background: 'rgba(255,255,255,0.20)',
                          border: '1px solid rgba(255,255,255,0.30)',
                        }}>
                        <ArrowUpRight className="h-4 w-4 text-white" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* ── RIGHT COLUMN: 3 stacked cards ── */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">

              {/* Card: Photo Gallery */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                whileHover={{ x: 3, transition: { duration: 0.18 } }}
              >
                <Link to="/client-images" className="block group">
                  <div className="sd-card relative rounded-[16px] overflow-hidden p-4 flex items-center gap-4 border">
                    <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[16px]"
                      style={{ background: 'linear-gradient(180deg,#2563EB,#3B82F6)' }} />
                    <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl sd-icon-badge border">
                      <Images className="h-5 w-5 text-[#2563EB]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold leading-tight" style={{ color: THEME.textPrimary }}>{t('dashboard.photoGallery')}</p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: THEME.textMuted }}>{t('dashboard.photoGalleryDesc')}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[12px] font-bold" style={{ color: THEME.primary }}>{photosCount.toLocaleString()}</span>
                        <span className="text-[11px]" style={{ color: THEME.textMuted }}>photos</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full sd-muted-box border transition-colors group-hover:opacity-90">
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#2563EB]" />
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Card: Albums */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18, duration: 0.35 }}
                whileHover={{ x: 3, transition: { duration: 0.18 } }}
              >
                <Link to="/studio/albums" className="block group">
                  <div className="sd-card relative rounded-[16px] overflow-hidden p-4 flex items-center gap-4 border">
                    <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[16px]"
                      style={{ background: 'linear-gradient(180deg,#2563EB,#3B82F6)' }} />
                    <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl sd-icon-badge border">
                          <FaFolder className="h-[18px] w-[18px] text-[#2563EB]" />       
             </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold leading-tight" style={{ color: THEME.textPrimary }}>{t('dashboard.albums')}</p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: THEME.textMuted }}>{t('dashboard.albumsDesc')}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[12px] font-bold" style={{ color: THEME.primary }}>{(stats.totalAlbums ?? albums.length ?? 0)}</span>
                        <span className="text-[11px]" style={{ color: THEME.textMuted }}>albums</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full sd-muted-box border transition-colors group-hover:opacity-90">
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#2563EB]" />
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Card: Upload Photos */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.26, duration: 0.35 }}
                whileHover={{ x: 3, transition: { duration: 0.18 } }}
              >
                <Link to="/upload" className="block group">
                  <div className="sd-card relative rounded-[16px] overflow-hidden p-4 flex items-center gap-4 border">
                    <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[16px]"
                      style={{ background: 'linear-gradient(180deg,#2563EB,#3B82F6)' }} />
                    <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl sd-icon-badge border">
                      <FaPlus className="h-4 w-4 text-[#2563EB]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold leading-tight" style={{ color: THEME.textPrimary }}>{t('dashboard.uploadPhotos')}</p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: THEME.textMuted }}>{t('dashboard.uploadPhotosDesc')}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span className="text-[11px] font-medium text-emerald-600">Ready to upload</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full sd-muted-box border transition-colors group-hover:opacity-90">
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#2563EB]" />
                    </div>
                  </div>
                </Link>
              </motion.div>

            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudioDashboard;
