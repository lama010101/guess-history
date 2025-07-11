import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthRedirectWrapperProps {
  children: React.ReactNode;
}

/**
 * AuthRedirectWrapper component
 * 
 * This component is now a simple wrapper that doesn't perform any redirects.
 * It's kept for potential future use or if there are other components that depend on it.
 */
export const AuthRedirectWrapper = ({ children }: AuthRedirectWrapperProps) => {
  // No redirect logic - just render children
  return <>{children}</>;
};

export default AuthRedirectWrapper;
