import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

/**
 * Guards manager-facing routes. When Supabase is configured, an unauthenticated
 * visitor is redirected to /login (remembering where they were headed). When it
 * is not configured, the app runs in open demo mode and the route is allowed.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (!isConfigured) return <>{children}</>;

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'var(--primary-accent)' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
