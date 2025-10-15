import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * RequireAuthSession
 * - Blocks access when there is NO Supabase session (user === null)
 * - Allows both registered and anonymous (guest) users through
 * - Avoids flicker by waiting for `isLoading` to finish before deciding
 */
const RequireAuthSession = () => {
  const { user, isLoading, continueAsGuest } = useAuth();
  const location = useLocation();
  const [attemptingGuestSession, setAttemptingGuestSession] = useState(false);
  const guestAttemptRef = useRef(false);

  useEffect(() => {
    if (isLoading || user || guestAttemptRef.current) {
      return;
    }

    guestAttemptRef.current = true;
    let cancelled = false;
    setAttemptingGuestSession(true);

    continueAsGuest()
      .catch(() => {
        guestAttemptRef.current = false;
      })
      .finally(() => {
        if (!cancelled) {
          setAttemptingGuestSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [continueAsGuest, isLoading, user]);

  if (isLoading) {
    try {
      console.debug('[RequireAuthSession] Waiting for auth session…');
    } catch {}
    return null; // keep UI unchanged
  }

  if (!user) {
    if (attemptingGuestSession) {
      return null;
    }
    try {
      console.debug('[RequireAuthSession] No user session found. Redirecting to / from', location.pathname);
    } catch {}
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireAuthSession;
