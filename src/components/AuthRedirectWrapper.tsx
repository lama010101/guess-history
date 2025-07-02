import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthRedirectWrapperProps {
  children: React.ReactNode;
}

/**
 * AuthRedirectWrapper component
 * 
 * Checks for authenticated session on load and redirects to landing page if not signed in.
 * Also listens for auth state changes and redirects on sign out.
 */
export const AuthRedirectWrapper = ({ children }: AuthRedirectWrapperProps) => {
  useEffect(() => {
    // Check for authenticated session on component mount
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to landing page if no session found
        window.location.href = 'https://guess-history.com';
      }
    };

    checkSession();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Redirect to landing page on sign out
        window.location.href = 'https://guess-history.com';
      }
    });

    // Clean up subscription on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
};

export default AuthRedirectWrapper;
