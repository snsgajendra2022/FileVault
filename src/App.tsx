import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './state/context/AuthContext';
import { PortalSettingsProvider } from './state/context/PortalSettingsContext';
import Layout from './components/layout/Layout';
// common
import ErrorBoundary from './components/common/ErrorBoundary';
import { SkeletonTheme, SKELETON_BASE_COLOR, SKELETON_HIGHLIGHT } from './components/common/skeletons';
import { clearNavigationState } from './utils/navigation';
import { enableInspectBlock } from './utils/blockInspect';
import './index.css';
import { syncDocumentThemeFromStorage } from './utils/documentTheme';

// auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';

// dashboard pages
import AdminPage from './pages/dashboard/AdminPage';
import DashboardPage from './pages/dashboard/DashboardPage';

// user pages
import ProfilePage from './pages/user/ProfilePage';
import SettingsPage from './pages/user/SettingsPage';
import PortalSettingsPage from './pages/user/PortalSettingsPage';
import AnalyticsPage from './pages/user/AnalyticsPage';
import ServicesPage from './pages/user/ServicesPage';
import ServiceConfigPage from './pages/user/ServiceConfigPage';

// billing pages
import BillingPage from './pages/billing/BillingPage';
import UsagePage from './pages/billing/UsagePage';
import PlansPage from './pages/billing/PlansPage';
import PlanDetailsPage from './pages/billing/PlanDetailsPage';
import CheckoutPage from './pages/billing/CheckoutPage';

// images pages
import ImagesPage from './pages/photo-studio/ImagesPage';
import UploadPage from './pages/images/UploadPage';
import UploadFamilyImagesPage from './pages/images/UploadFamilyImagesPage';
import ViewImagePage from './pages/images/ViewImagePage';

// invitation pages
import AcceptInvitationPage from './pages/invitations/AcceptInvitationPage';
import InvitationsPage from './pages/invitations/InvitationsPage';
import InvitationCodePage from './pages/invitations/InvitationCodePage';
import InviteUserPage from './pages/invitations/InviteUserPage';
import ConnectionsPage from './pages/invitations/ConnectionsPage';
import FamilyTree from './components/invitations/FamilyTree';
import CreateClientInvitationForm from './components/invitations/CreateClient';

// family tree
import FamilyTreePage from './pages/family-tree/FamilyTreePage';

// photo-studio pages
import StudioLanding from './pages/photo-studio/StudioLanding';
import StudioAuthPage from './pages/photo-studio/StudioAuthPage';
import StudioDashboard from './pages/photo-studio/StudioDashboard';
import ClientManagement from './pages/photo-studio/ClientManagement';
import PhotoGallery from './pages/photo-studio/PhotoGallery';
import ClientPortal from './pages/photo-studio/ClientPortal';
import BarcodeSystem from './pages/photo-studio/BarcodeSystem';
import StudioSettings from './pages/photo-studio/StudioSettings';
import StudioCheckout from './pages/photo-studio/StudioCheckout';
import ClientTreePage from './pages/photo-studio/ClientTree';
import ClientImagesPage from './pages/photo-studio/ImagesPage';
import SheetPage from './pages/photo-studio/labor-sheet/Sheet';
import PhotoStudioAlbum from './pages/photo-studio/PhotoStudioAlbum';
import PublicSelectionPage from './pages/photo-studio/PublicSelectionPage';
import PublicCheckoutPage from './pages/photo-studio/PublicCheckoutPage';
import PublicImagesDisplayPage from './pages/photo-studio/PublicImagesDisplayPage';
import SharedAlbums from './pages/photo-studio/SharedAlbums';
import SharedPhotoLinks from './pages/photo-studio/SharedPhotoLinks';
import PaymentManagement from './components/admin/PaymentManagement';

// photo-themes pages
import PhotoThemesPage from './pages/photo-themes/PhotoThemesPage';
import PhotoThemeCategoryPage from './pages/photo-themes/PhotoThemeCategoryPage';
import PhotoThemeAlbumBuilderPage from './pages/photo-themes/PhotoThemeAlbumBuilderPage';
import StudioFlipbookBuilderPage from './features/studio-flipbook/components/StudioFlipbookBuilderPage';

// photo-book pages
import PhotoBook from './pages/photo-book/PhotoBookPage';

// memories pages
import MemoriesPublicGalleryPage from './pages/memories/MemoriesPublicGalleryPage';
import MemoriesDashboardPage from './pages/memories/MemoriesDashboardPage';
import MemoriesEventsListPage from './pages/memories/MemoriesEventsListPage';
import MemoriesCreateEventPage from './pages/memories/MemoriesCreateEventPage';
import MemoriesEventManagePage from './pages/memories/MemoriesEventManagePage';
import MemoriesSharedWithMePage from './pages/memories/MemoriesSharedWithMePage';

// phonebook pages
import PhoneBookListPage from './pages/PhoneBook/PhoneBookListPage';
import PhoneBookCreatePage from './pages/PhoneBook/PhoneBookCreatePage';
import PhoneBookDetailPage from './pages/PhoneBook/PhoneBookDetailPage';
import PhoneBookEditPage from './pages/PhoneBook/PhoneBookEditPage';
import OpenClawAssistantPage from './pages/OpenClawAssistantPage';
import WhatsAppConfigPage from './pages/WhatsAppConfigPage';
import FilterImagesPage from './pages/filter-images/FilterImagesPage';
import OpenClawAgentDock from './components/openclaw/OpenClawAgentDock';

// misc pages
import NotFoundPage from './pages/misc/NotFoundPage';
import PrivacyPolicyPage from './pages/misc/PrivacyPolicyPage';
import OMPrivacyPolicyPage from './pages/misc/OMPrivacyPolicyPage';
import HelpSupportPage from './pages/misc/HelpSupportPage';
import { photoStudioMarketingRoutes } from './photostudio-marketing/PhotoStudioMarketing';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Only render public page when URL has a share identifier (sid, q, or token). Otherwise redirect to home. */
const PublicShareRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const search = location.search || '';
  const params = new URLSearchParams(search);
  const hasShareId = !!(params.get('sid')?.trim() || params.get('q')?.trim() || params.get('token')?.trim());
  React.useEffect(() => {
    if (!hasShareId) {
      navigate('/', { replace: true });
    }
  }, [hasShareId, navigate]);
  if (!hasShareId) return null; // avoid flash before redirect
  return <>{children}</>;
};

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  // console.log('ProtectedRoute:', { isLoading, isAuthenticated, isAdmin, adminOnly });

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#141210] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5c574f]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/studio/dashboard" />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  return (
    <Routes>
      {/* Public image view route */}
      <Route path="/view" element={<ViewImagePage />} />
      <Route path="/our-memories-privacy-policy" element={<OMPrivacyPolicyPage />} />
      <Route path="/owm-privacy-policy" element={<PrivacyPolicyPage />} />
      {/* Our Memories — guest gallery (public). /memories marketing redirects to login. */}
      <Route path="/memories" element={<Navigate to="/login" replace />} />
      <Route path="/memories/e/:eventSlug" element={<MemoriesPublicGalleryPage />} />
      <Route path="/login" element={
        !isLoading && isAuthenticated ?
          (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/studio/dashboard" />) :
          <LoginPage />
      } />
      <Route path="/register" element={
        !isLoading && isAuthenticated ?
          (isAdmin ? <Navigate to="/admin" /> : <Navigate to="/studio/dashboard" />) :
          <RegisterPage />
      } />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/public/checkout" element={<PublicShareRoute><PublicCheckoutPage /></PublicShareRoute>} />
      {/* Public invitation acceptance route */}
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

      {/* Public PhotoStudio routes - do not open without complete share URL (sid, q, or token) */}
      <Route path="/public/selection" element={<PublicShareRoute><PublicSelectionPage /></PublicShareRoute>} />
      <Route path="/public/images-display" element={<PublicShareRoute><PublicImagesDisplayPage /></PublicShareRoute>} />

      {/* PhotoStudio Pro Routes */}
      <Route path="/studio" element={<StudioLanding />} />
      <Route path="/studio/auth" element={<StudioAuthPage />} />
      <Route path="/client/:clientId" element={<ClientPortal />} />

      {/* PhotoStudio marketing landing — must use same react-router-dom as app (see craco aliases) */}
      {photoStudioMarketingRoutes}

      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="help-support" element={<HelpSupportPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="plans/:planId" element={<PlanDetailsPage />} />
        <Route path="checkout/:planId" element={<CheckoutPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="portal-settings" element={<PortalSettingsPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="upload-family-images" element={<UploadFamilyImagesPage />} />
        <Route path="images" element={<ImagesPage />} />
        <Route path="client-images" element={<ClientImagesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        {/* Invitation system */}
        <Route path="invitation/code" element={<InvitationCodePage />} />
        <Route path="invitation/invite" element={<InviteUserPage />} />
        <Route path="invitations" element={<InvitationsPage />} />
        <Route path="connections" element={<ConnectionsPage />} />
        <Route path="services/config/:serviceId" element={<ServiceConfigPage />} />
        {/* PhotoStudio Pro Routes */}
        <Route path="studio/dashboard" element={<StudioDashboard />} />
        <Route path="studio/openclaw" element={<OpenClawAssistantPage />} />
        <Route path="studio/clients" element={<ClientManagement />} />
        <Route path="studio/gallery" element={<PhotoGallery />} />
        <Route path="studio/barcodes" element={<BarcodeSystem />} />
        <Route path="studio/payments" element={<StudioCheckout />} />
        <Route path="studio/payment-management" element={<PaymentManagement />} />
        <Route path="studio/settings" element={<StudioSettings />} />
        {/* <Route path="treePage" element={<TreePage />} /> */}
        <Route path="studio/albums" element={<PhotoStudioAlbum />} />
        <Route path="studio/albums/:albumId/flipbook" element={<StudioFlipbookBuilderPage />} />
        <Route path="studio/shared-albums" element={<SharedAlbums />} />
        <Route path="studio/shared-photo-links" element={<SharedPhotoLinks />} />
        <Route path="client-tree" element={<ClientTreePage />} />
        <Route path="family-tree" element={<FamilyTreePage />} />
        <Route path="Sheet" element={<SheetPage />} />
        <Route path="create-client" element={<CreateClientInvitationForm onInvitationCreated={() => { }} />} />
        {/* Photo Themes */}
        <Route path="photo-themes" element={<PhotoThemesPage />} />
        <Route path="photo-book" element={<PhotoBook />} />
        <Route path="studio/whatsapp" element={<WhatsAppConfigPage />} />
        <Route path="memories/dashboard" element={<MemoriesDashboardPage />} />
        <Route path="memories/events" element={<MemoriesEventsListPage />} />
        <Route path="memories/events/new" element={<MemoriesCreateEventPage />} />
        <Route path="memories/events/:eventId/edit" element={<MemoriesCreateEventPage />} />
        <Route path="memories/events/:eventId" element={<MemoriesEventManagePage />} />
        <Route path="memories/shared" element={<MemoriesSharedWithMePage />} />
        {/* Phone Book / Contacts */}
        <Route path="phonebook" element={<PhoneBookListPage />} />
        <Route path="phonebook/new" element={<PhoneBookCreatePage />} />
        <Route path="phonebook/:contactId" element={<PhoneBookDetailPage />} />
        <Route path="phonebook/:contactId/edit" element={<PhoneBookEditPage />} />
        {/* Face filter — inside main layout (sidebar + header) */}
        <Route path="filter-images" element={<FilterImagesPage />} />
        <Route path="photo-themes/:categorySlug" element={<PhotoThemeCategoryPage />} />
        <Route path="photo-themes/:categorySlug/album" element={<PhotoThemeAlbumBuilderPage />} />
        {/* Admin route with proper protection */}
        <Route path="admin" element={
          <ProtectedRoute adminOnly>
            <AdminPage />
          </ProtectedRoute>
        } />
        {/* Catch all unmatched routes and redirect to appropriate dashboard */}
        <Route path="*" element={
          isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/studio/dashboard" replace />
        } />
      </Route>

      {/* Catch all other routes and show 404 page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

function App() {
  // Clear any problematic navigation state on app start
  React.useEffect(() => {
    clearNavigationState();
  }, []);

  React.useEffect(() => {
    syncDocumentThemeFromStorage();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (localStorage.getItem('filevault-theme') === 'system' || !localStorage.getItem('filevault-theme')) {
        syncDocumentThemeFromStorage();
      }
    };
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, []);

  // Enable inspect blocking (controlled by REACT_APP_BLOCK_INSPECT env variable)
  React.useEffect(() => {
    enableInspectBlock();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SkeletonTheme baseColor={SKELETON_BASE_COLOR} highlightColor={SKELETON_HIGHLIGHT}>
          <AuthProvider>
            <PortalSettingsProvider>
            <Router>
              <AppRoutes />
              <OpenClawAgentDock />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#141210',
                    color: '#fffcf8',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,252,248,0.08)',
                  },
                }}
              />
            </Router>
            </PortalSettingsProvider>
          </AuthProvider>
        </SkeletonTheme>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
