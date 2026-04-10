import type { ComponentType } from 'react';
import {
  FaHome,
  FaUpload,
  FaUsers,
  FaCloud,
  FaChartBar,
  FaShieldAlt,
  FaPlus,
  FaUser,
  FaCamera,
  FaImages,
  FaQrcode,
  FaSitemap,
  FaUserPlus,
  FaShare,
  FaFolder,
  FaRupeeSign,
  FaPalette,
  FaBook,
  FaHeart,
  FaComments,
} from 'react-icons/fa';

/** Single source for sidebar + mobile nav (labelKey → en.json / hi.json `nav.*`) */
export type NavItem = {
  labelKey: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  enabled?: boolean;
};

export type NavGroup = {
  items: NavItem[];
  active: boolean;
};

export const regularNavigation: NavGroup = {
  active: false,
  items: [
    { labelKey: 'nav.regular.dashboard', href: '/studio/dashboard', icon: FaHome, enabled: true },
    { labelKey: 'nav.regular.upload', href: '/upload', icon: FaUpload, enabled: true },
    { labelKey: 'nav.regular.services', href: '/services', icon: FaCloud, enabled: true },
    { labelKey: 'nav.regular.plans', href: '/plans', icon: FaPlus, enabled: true },
    { labelKey: 'nav.regular.usage', href: '/usage', icon: FaChartBar, enabled: true },
    { labelKey: 'nav.regular.invitations', href: '/invitations', icon: FaUsers, enabled: true },
    { labelKey: 'nav.regular.familyTree', href: '/family-tree', icon: FaSitemap, enabled: true },
    { labelKey: 'nav.regular.dummyTree', href: '/treePage', icon: FaUsers, enabled: true },
    { labelKey: 'nav.regular.profile', href: '/profile', icon: FaUser, enabled: true },
  ],
};

export const studioNavigation: NavGroup = {
  active: true,
  items: [
    { labelKey: 'nav.studio.dashboard', href: '/studio/dashboard', icon: FaCamera, enabled: true },
    { labelKey: 'nav.studio.uploadFamily', href: '/upload-family-images', icon: FaUpload, enabled: true },
    { labelKey: 'nav.studio.myImages', href: '/client-images', icon: FaImages, enabled: true },
    { labelKey: 'nav.studio.album', href: '/studio/albums', icon: FaFolder, enabled: true },
    { labelKey: 'nav.studio.ourMemories', href: '/memories/events', icon: FaHeart, enabled: true },
    {
      labelKey: 'nav.studio.openclaw',
      href: '/studio/openclaw',
      icon: FaComments,
      enabled: process.env.REACT_APP_OPENCLAW_ENABLED === 'true',
    },
    { labelKey: 'nav.studio.photoThemes', href: '/photo-themes', icon: FaPalette, enabled: true },
    { labelKey: 'nav.studio.photoBooks', href: '/photo-book', icon: FaBook, enabled: true },
    { labelKey: 'nav.studio.phoneBook', href: '/phonebook', icon: FaBook, enabled: true },
    // { labelKey: 'nav.studio.ourMemoriesShared', href: '/memories/shared', icon: FaShare, enabled: true },
    { labelKey: 'nav.studio.sharedAlbums', href: '/studio/shared-albums', icon: FaShare, enabled: true },
    // { labelKey: 'nav.studio.selectPay', href: '/studio/payments', icon: FaQrcode, enabled: true },
    { labelKey: 'nav.studio.membersTree', href: '/family-tree', icon: FaSitemap, enabled: true },
    { labelKey: 'nav.studio.createMembers', href: '/invitations', icon: FaUserPlus, enabled: true },
    // { labelKey: 'nav.studio.members', href: '/studio/clients', icon: FaUsers, enabled: true },
    // { labelKey: 'nav.studio.paymentManagement', href: '/studio/payment-management', icon: FaRupeeSign, enabled: true },
    { labelKey: 'nav.studio.services', href: '/services', icon: FaCloud, enabled: true },
  ],
};

export const adminNavigation: NavGroup = {
  active: true,
  items: [
    { labelKey: 'nav.admin.adminDashboard', href: '/admin?tab=dashboard', icon: FaShieldAlt, enabled: true },
    { labelKey: 'nav.admin.userManagement', href: '/admin?tab=users', icon: FaUsers, enabled: true },
    { labelKey: 'nav.admin.serviceConfig', href: '/admin?tab=services', icon: FaCloud, enabled: true },
    { labelKey: 'nav.admin.planManagement', href: '/admin?tab=plans', icon: FaPlus, enabled: true },
    { labelKey: 'nav.admin.usageAnalytics', href: '/admin?tab=analytics', icon: FaChartBar, enabled: true },
    { labelKey: 'nav.admin.systemHealth', href: '/admin?tab=health', icon: FaShieldAlt, enabled: true },
    { labelKey: 'nav.admin.paymentManagement', href: '/admin?tab=payments', icon: FaRupeeSign, enabled: true },
  ],
};
