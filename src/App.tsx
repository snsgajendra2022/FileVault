import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import ImagesPage from './pages/ImagesPage';
import NotFoundPage from './pages/NotFoundPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { clearNavigationState } from './utils/navigation';
import { enableInspectBlock } from './utils/blockInspect';
import './index.css';
import AdminPage from './pages/AdminPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UploadPage from './pages/UploadPage';
import SettingsPage from './pages/SettingsPage';
import BillingPage from './pages/BillingPage';
import UsagePage from './pages/UsagePage';
import PlanDetailsPage from './pages/PlanDetailsPage';
import PlansPage from './pages/PlansPage';
import CheckoutPage from './pages/CheckoutPage';
import ServicesPage from './pages/ServicesPage';
import ProfilePage from './pages/ProfilePage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import InvitationsPage from './pages/InvitationsPage';
import ServiceConfigPage from './pages/ServiceConfigPage';
// PhotoStudio Pro imports
import StudioLanding from './pages/PhotoStudio/StudioLanding';
import StudioAuthPage from './pages/PhotoStudio/StudioAuthPage';
import StudioDashboard from './pages/PhotoStudio/StudioDashboard';
import ClientManagement from './pages/PhotoStudio/ClientManagement';
import PhotoGallery from './pages/PhotoStudio/PhotoGallery';
import ClientPortal from './pages/PhotoStudio/ClientPortal';
import BarcodeSystem from './pages/PhotoStudio/BarcodeSystem';
import StudioSettings from './pages/PhotoStudio/StudioSettings';
import StudioCheckout from './pages/PhotoStudio/StudioCheckout';
import ViewImagePage from './pages/ViewImagePage';
import FamilyTree from './components/invitations/FamilyTree';
import CreateClientInvitationForm from './components/invitations/CreateClient';
import ClientTreePage from './pages/PhotoStudio/ClientTree';
import ClientImagesPage from './pages/PhotoStudio/ImagesPage';
import SheetPage from './pages/PhotoStudio/JsFile/Sheet';
import Tree from './pages/PhotoStudio/JsFile/Tree';
import PhotoStudioAlbum from './pages/PhotoStudio/PhotoStudioAlbum';
import PublicSelectionPage from './pages/PhotoStudio/PublicSelectionPage';
import PublicCheckoutPage from './pages/PhotoStudio/PublicCheckoutPage';
import SharedAlbums from './pages/PhotoStudio/SharedAlbums';
import PaymentManagement from './components/admin/PaymentManagement';
// Photo Themes
import PhotoThemesPage from './pages/PhotoThemesPage';
import PhotoThemeCategoryPage from './pages/PhotoThemeCategoryPage';
import PhotoThemeAlbumBuilderPage from './pages/PhotoThemeAlbumBuilderPage';
import PhotoBook from './pages/PhotoBook';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import OMPrivacyPolicyPage from './pages/OMPrivacyPolicyPage';
import UploadFamilyImagesPage from './pages/UploadFamilyImages/UploadPage';
import InvitationCodePage from './pages/InvitationCodePage';
import InviteUserPage from './pages/InviteUserPage';
import ConnectionsPage from './pages/ConnectionsPage';


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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
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
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/our-memories-privacy-policy" element={<OMPrivacyPolicyPage />} />
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
  
      
      {/* PhotoStudio Pro Routes */}
      <Route path="/studio" element={<StudioLanding />} />
      <Route path="/studio/auth" element={<StudioAuthPage />} />
      <Route path="/client/:clientId" element={<ClientPortal />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={
          isAdmin ? <Navigate to="/admin" /> : <Navigate to="/studio/dashboard" />
        } />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="plans/:planId" element={<PlanDetailsPage />} />
        <Route path="checkout/:planId" element={<CheckoutPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SettingsPage />} />
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
        <Route path="studio/clients" element={<ClientManagement />} />
        <Route path="studio/gallery" element={<PhotoGallery />} />
        <Route path="studio/barcodes" element={<BarcodeSystem />} />
        <Route path="studio/payments" element={<StudioCheckout />} />
        <Route path="studio/payment-management" element={<PaymentManagement />} />
        <Route path="studio/settings" element={<StudioSettings />} />
        {/* <Route path="treePage" element={<TreePage />} /> */}
        <Route path="studio/albums" element={<PhotoStudioAlbum />} />
        <Route path="studio/shared-albums" element={<SharedAlbums />} />
        <Route path="client-tree" element={<ClientTreePage />} />
        <Route path="family-tree" element={<FamilyTree />} />
        <Route path="Sheet" element={<SheetPage />} />
        <Route path="create-client" element={<CreateClientInvitationForm onInvitationCreated={() => {}} />} />
        {/* Photo Themes */}
        <Route path="photo-themes" element={<PhotoThemesPage />} />
        <Route path="photo-book" element={<PhotoBook />} />
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

  // Enable inspect blocking (controlled by REACT_APP_BLOCK_INSPECT env variable)
  React.useEffect(() => {
    enableInspectBlock();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <AppRoutes />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
