import React from 'react';
import { Navigate, Route, useParams } from 'react-router-dom';
import { useAuth } from '../state/context/AuthContext';
import PhotoStudioMarketingLayout from './PhotoStudioMarketingLayout';
import { HomePage } from '../../photostudio-react-tailwind/src/App';
import BlogPage from '../../photostudio-react-tailwind/src/pages/BlogPage';
import { Contact, PrivacyPolicy, Terms } from '../../photostudio-react-tailwind/src/pages/PolicyPages';
import '../../photostudio-react-tailwind/src/photostudio-theme.css';

const BlogPageRoute = () => {
  const { slug } = useParams();
  return <BlogPage slug={slug} />;
};

/** Public marketing pages — redirect authenticated users to their dashboard. */
function MarketingGuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/studio/dashboard'} replace />;
  }

  return <>{children}</>;
}

export const photoStudioMarketingRoutes = (
  <Route
    path="/"
    element={
      <MarketingGuestRoute>
        <PhotoStudioMarketingLayout />
      </MarketingGuestRoute>
    }
  >
    <Route index element={<HomePage />} />
    <Route path="blog/:slug" element={<BlogPageRoute />} />
    <Route path="contact" element={<Contact />} />
    <Route path="terms" element={<Terms />} />
    <Route path="privacy-policy" element={<PrivacyPolicy />} />
    <Route path="photo-privacy-policy" element={<PrivacyPolicy />} />
  </Route>
);
