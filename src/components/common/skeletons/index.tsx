/**
 * Skeleton loading components built on react-loading-skeleton.
 *
 * Rules:
 *  - Import SkeletonTheme once at the app root (already done in App.tsx via SkeletonProvider).
 *  - Each exported component mirrors the visual shape of the real content it replaces.
 *  - No dashboard-level skeletons here — DashboardLoading handles that.
 */

import React from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// ─── Re-export SkeletonTheme so consumers can wrap if needed ─────────────────
export  { SkeletonTheme };

// ─── Shared theme defaults ────────────────────────────────────────────────────
export const SKELETON_BASE_COLOR = '#e2e8f0';   // slate-200
export const SKELETON_HIGHLIGHT = '#ffffff';    // slate-100

// ─── Tiny helper ─────────────────────────────────────────────────────────────
const S = (props: React.ComponentProps<typeof Skeleton>) => (
  <Skeleton
    baseColor={SKELETON_BASE_COLOR}
    highlightColor={SKELETON_HIGHLIGHT}
    borderRadius={8}
    {...props}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// 1. STAT CARD  (used in: ProfilePage, PlansPage, BillingPage, AnalyticsPage)
// ─────────────────────────────────────────────────────────────────────────────
export const StatCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <S width="60%" height={12} className="mb-2" />
            <S width="40%" height={28} />
          </div>
          <S width={44} height={44} borderRadius={12} />
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. LIST ROW  (used in: InvitationHistory, InvitationsList, ConnectedAccountsList)
// ─────────────────────────────────────────────────────────────────────────────
export const ListRowSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
      >
        <S width={36} height={36} circle />
        <div className="flex-1">
          <S width="45%" height={13} className="mb-1.5" />
          <S width="65%" height={11} />
        </div>
        <S width={60} height={24} borderRadius={20} />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. IMAGE GRID  (used in: ImagesPage)
// ─────────────────────────────────────────────────────────────────────────────
export const ImageGridSkeleton: React.FC<{ count?: number }> = ({ count = 12 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl overflow-hidden">
        <S height={160} borderRadius={12} />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. PLAN CARD  (used in: PlansPage)
// ─────────────────────────────────────────────────────────────────────────────
export const PlanCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
      >
        <S width="50%" height={20} />
        <S width="35%" height={36} />
        <S width="80%" height={12} />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="flex items-center gap-2">
              <S width={16} height={16} circle />
              <S width="70%" height={12} />
            </div>
          ))}
        </div>
        <S height={40} borderRadius={12} />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. PROFILE FORM  (used in: ProfilePage)
// ─────────────────────────────────────────────────────────────────────────────
export const ProfileFormSkeleton: React.FC = () => (
  <div className="max-w-2xl mx-auto space-y-6">
    {/* Avatar + name */}
    <div className="flex items-center gap-4 mb-6">
      <S width={72} height={72} circle />
      <div>
        <S width={160} height={20} className="mb-2" />
        <S width={120} height={14} />
      </div>
    </div>
    {/* Fields */}
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i}>
        <S width={100} height={13} className="mb-1.5" />
        <S height={42} borderRadius={10} />
      </div>
    ))}
    <S height={44} borderRadius={12} width={140} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. SERVICE CARD  (used in: ServicesPage)
// ─────────────────────────────────────────────────────────────────────────────
export const ServiceCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
      >
        <div className="flex items-center gap-3">
          <S width={44} height={44} borderRadius={10} />
          <div className="flex-1">
            <S width="55%" height={16} className="mb-1.5" />
            <S width="75%" height={12} />
          </div>
          <S width={52} height={26} borderRadius={20} />
        </div>
        <S height={12} width="90%" />
        <S height={36} borderRadius={10} />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. MEMORIES EVENT CARD  (used in: MemoriesEventsListPage, MemoriesDashboardPage)
// ─────────────────────────────────────────────────────────────────────────────
export const MemoriesEventCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <ul className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <li
        key={i}
        className="flex flex-col sm:flex-row overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm"
      >
        {/* Thumbnail */}
        <div className="sm:w-[240px] shrink-0">
          <S height={160} borderRadius={0} />
        </div>
        {/* Content */}
        <div className="flex-1 p-5 space-y-3">
          <S width="60%" height={20} />
          <S width="80%" height={13} />
          <div className="flex gap-4">
            <S width={90} height={12} />
            <S width={70} height={12} />
          </div>
        </div>
      </li>
    ))}
  </ul>
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. MEMORIES STAT CARDS  (used in: MemoriesDashboardPage)
// ─────────────────────────────────────────────────────────────────────────────
export const MemoriesStatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <S width={36} height={36} borderRadius={10} className="mb-3" />
        <S width="50%" height={24} className="mb-1" />
        <S width="70%" height={12} />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 9. THEME CARD  (used in: PhotoThemesPage)
// ─────────────────────────────────────────────────────────────────────────────
export const ThemeCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
      >
        <S width={56} height={56} borderRadius={14} />
        <S width="70%" height={18} />
        <S width="90%" height={12} />
        <S width="85%" height={12} />
        <S height={38} borderRadius={12} />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 10. USAGE PAGE  (used in: UsagePage)
// ─────────────────────────────────────────────────────────────────────────────
export const UsagePageSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* Banner */}
    <div className="rounded-3xl p-8 bg-white border border-slate-200 shadow-sm">
      <S width="40%" height={28} className="mb-3" />
      <S width="60%" height={16} className="mb-6" />
      <div className="grid grid-cols-2 gap-6">
        <S height={72} borderRadius={12} />
        <S height={72} borderRadius={12} />
      </div>
    </div>
    {/* Metric cards */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <S width={48} height={48} borderRadius={12} />
            <div className="flex-1">
              <S width="55%" height={18} className="mb-1.5" />
              <S width="40%" height={13} />
            </div>
            <S width={60} height={36} />
          </div>
          <S height={12} borderRadius={6} />
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 11. BILLING PAGE  (used in: BillingPage)
// ─────────────────────────────────────────────────────────────────────────────
export const BillingPageSkeleton: React.FC = () => (
  <div className="space-y-8">
    <StatCardSkeleton count={4} />
    {/* Transaction rows */}
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
      <S width="30%" height={22} className="mb-4" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <S width={40} height={40} borderRadius={10} />
            <div>
              <S width={140} height={14} className="mb-1.5" />
              <S width={100} height={12} />
            </div>
          </div>
          <div className="text-right">
            <S width={60} height={16} className="mb-1" />
            <S width={50} height={12} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 13. SHARED ALBUMS  (used in: SharedAlbums)
// ─────────────────────────────────────────────────────────────────────────────
export const SharedAlbumsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          <S width={64} height={64} borderRadius={10} />
          <div className="flex-1">
            <S width="45%" height={18} className="mb-2" />
            <S width="65%" height={13} className="mb-1.5" />
            <S width="40%" height={12} />
          </div>
          <S width={20} height={20} borderRadius={4} />
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 14. SHARED PHOTO LINKS  (used in: SharedPhotoLinks)
// ─────────────────────────────────────────────────────────────────────────────
export const SharedPhotoLinksSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <S width="40%" height={16} />
            <S width="60%" height={12} />
            <S width="80%" height={12} />
          </div>
          <S width={100} height={36} borderRadius={10} />
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 15. PHOTO BOOK HUB  (used in: PhotoBookPage)
// ─────────────────────────────────────────────────────────────────────────────
export const PhotoBookSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-3">
        <S height={200} borderRadius={10} />
        <S width="70%" height={14} />
        <S width="50%" height={12} />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 16. PAYMENT MANAGEMENT TABLE  (used in: PaymentManagement)
// ─────────────────────────────────────────────────────────────────────────────
export const PaymentTableSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-6">
    {/* Stat cards */}
    <StatCardSkeleton count={3} />
    {/* Table rows */}
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="bg-slate-50 px-6 py-3 flex gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <S key={i} width={80} height={12} />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-6 py-4">
            <div className="flex-1 space-y-1.5">
              <S width="60%" height={13} />
              <S width="40%" height={11} />
            </div>
            <S width={80} height={13} />
            <S width={90} height={22} borderRadius={20} />
            <S width={60} height={16} />
            <S width={80} height={13} />
            <div className="flex gap-2">
              <S width={28} height={28} borderRadius={6} />
              <S width={28} height={28} borderRadius={6} />
              <S width={28} height={28} borderRadius={6} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 17. FAMILY TREE OVERLAY  (used in: FamilyTreePage)
// ─────────────────────────────────────────────────────────────────────────────
export const FamilyTreeLoadingOverlay: React.FC = () => (
  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-4">
      <S width={64} height={64} circle />
      <S width={180} height={16} />
      <S width={120} height={12} />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 18. UPLOAD FAMILY IMAGES — family member selector  (used in: UploadFamilyImagesPage)
// ─────────────────────────────────────────────────────────────────────────────
export const FamilyMemberSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-3">
          <S width={40} height={40} circle />
          <div className="flex-1">
            <S width="55%" height={14} className="mb-1.5" />
            <S width="40%" height={12} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <S width={60} height={22} borderRadius={20} />
          <S width={70} height={22} borderRadius={20} />
        </div>
      </div>
    ))}
  </div>
);
export const InvitationHistorySkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-3">
          <S width={36} height={36} circle />
          <S width={80} height={22} borderRadius={20} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j}>
              <S width="60%" height={12} className="mb-1" />
              <S width="80%" height={14} />
            </div>
          ))}
        </div>
        <S height={80} borderRadius={10} />
      </div>
    ))}
  </div>
);
