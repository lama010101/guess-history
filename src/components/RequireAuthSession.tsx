import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * RequireAuthSession
 * - Blocks access when there is NO Supabase session (user === null)
 * - Allows both registered and anonymous (guest) users through
 * - Avoids flicker by waiting for `isLoading` to finish before deciding
 */
const RequireAuthSession = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    try {
      console.debug('[RequireAuthSession] Waiting for auth session…');
    } catch {}
    return null; // keep UI unchanged
  }

  if (!user) {
    try {
      console.debug('[RequireAuthSession] No user session found. Redirecting to / from', location.pathname);
    } catch {}
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireAuthSession;
