import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { handleGoogleRedirect } from './lib/googleAuth';
import ProtectedRoute from './components/ProtectedRoute';
import { PageLoader } from './components/ui';
import Landing from './pages/Landing';

const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const Assistant = lazy(() => import('./components/Assistant'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Legal = lazy(() => import('./pages/Legal'));
const NotFound = lazy(() => import('./pages/NotFound'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const CampaignNew = lazy(() => import('./pages/CampaignNew'));
const CampaignDetail = lazy(() => import('./pages/CampaignDetail'));
const Work = lazy(() => import('./pages/Work'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Connections = lazy(() => import('./pages/Connections'));
const Eligibility = lazy(() => import('./pages/Eligibility'));
const Referrals = lazy(() => import('./pages/Referrals'));
const Verification = lazy(() => import('./pages/Verification'));
const Admin = lazy(() => import('./pages/Admin'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

handleGoogleRedirect();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Suspense fallback={<PageLoader label="Loading" />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/legal/:page" element={<Legal />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardHome />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="campaigns/new" element={<CampaignNew />} />
              <Route path="campaigns/:id" element={<CampaignDetail />} />
              <Route path="work" element={<Work />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="connections" element={<Connections />} />
              <Route path="eligibility" element={<Eligibility />} />
              <Route path="referrals" element={<Referrals />} />
              <Route path="verification" element={<Verification />} />
              <Route path="admin" element={<Admin />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Assistant />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
