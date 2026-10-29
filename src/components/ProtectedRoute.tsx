import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PageLoader } from './ui';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <PageLoader label="Authenticating" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <PageLoader label="Setting up your workspace" />;
  return <>{children}</>;
}
