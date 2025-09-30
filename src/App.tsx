import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import ImagesPage from './pages/ImagesPage';
import NotFoundPage from './pages/NotFoundPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { clearNavigationState } from './utils/navigation';
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
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import InvitationsPage from './pages/InvitationsPage';
import ServiceConfigPage from './pages/ServiceConfigPage';
// PhotoStudio Pro imports
import StudioLanding from './pages/StudioLanding';
import StudioAuthPage from './pages/StudioAuthPage';
import StudioDashboard from './pages/StudioDashboard';
import ClientManagement from './pages/ClientManagement';
import PhotoGallery from './pages/PhotoGallery';
import ClientPortal from './pages/ClientPortal';
import BarcodeSystem from './pages/BarcodeSystem';
import StudioSettings from './pages/StudioSettings';
import ViewImagePage from './pages/ViewImagePage';
import FamilyTree from './components/invitations/FamilyTree';
import CreateClientInvitationForm from './components/invitations/CreateClient';
import ClientTreePage from './pages/ClientTree';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
      
      {/* Public invitation acceptance route */}
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      
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
        <Route path="images" element={<ImagesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="invitations" element={<InvitationsPage />} />
        <Route path="services/config/:serviceId" element={<ServiceConfigPage />} />
        {/* PhotoStudio Pro Routes */}
        <Route path="studio/dashboard" element={<StudioDashboard />} />
        <Route path="studio/clients" element={<ClientManagement />} />
        <Route path="studio/gallery" element={<PhotoGallery />} />
        <Route path="studio/barcodes" element={<BarcodeSystem />} />
        <Route path="studio/settings" element={<StudioSettings />} />
        {/* <Route path="treePage" element={<TreePage />} /> */}
        <Route path="client-tree" element={<ClientTreePage />} />
        <Route path="family-tree" element={<FamilyTree />} />
        <Route path="create-client" element={<CreateClientInvitationForm onInvitationCreated={() => {}} />} />
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
