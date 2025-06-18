
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { assignRandomAvatarAndUsername, needsAvatarOrUsername } from '@/services/avatarService';

// Define types for our users
export type AuthUser = User & {
  type?: 'auth' | 'guest';
  isGuest?: boolean;
  display_name?: string;
  avatar_url?: string;
};

export type GuestUser = {
  id: string;
  type: 'guest';
  isGuest: true;
  display_name: string;
  avatar_url?: string;
};

// Define the shape of our Auth Context
export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  isGoogleUser: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<AuthUser>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | GuestUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isGoogleUser, setIsGoogleUser] = useState<boolean>(false);

  // Check for existing session on mount
  useEffect(() => {
    console.log("AuthProvider: Initializing auth state");
    
    // Set up Supabase auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log(`[AuthContext_OASC] Event: ${event}, Session: ${currentSession ? currentSession.user.id : 'null'}`);

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setIsGuest(false);
          setIsGoogleUser(false);
        } else if (currentSession) {
          console.log(`[AuthContext_OASC] Processing Supabase session for user: ${currentSession.user.id}`);
          const authUser = currentSession.user as AuthUser;
          // Detect if this is an anonymous/guest user via provider
          const isAnon = currentSession.user.app_metadata?.provider === 'anonymous';
          if (isAnon) {
            authUser.type = 'guest';
            (authUser as any).isGuest = true;
            setIsGuest(true);
          } else {
            authUser.type = 'auth';
            (authUser as any).isGuest = false;
            setIsGuest(false);
          }
          setUser(authUser);
          setSession(currentSession);
          const isGoogle = currentSession.user.app_metadata?.provider === 'google';
          setIsGoogleUser(isGoogle);
          console.log(`[AuthContext_OASC] Auth user set. User ID: ${authUser.id}, isGuest: ${isAnon}, isGoogle: ${isGoogle}`);
        } else {
          // No Supabase session: set user to null
          setUser(null);
          setSession(null);
          setIsGuest(false);
          setIsGoogleUser(false);
        }
      }
    );

    // Check for existing Supabase session on mount
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("Found authenticated session:", session);
          const authUser = session.user as AuthUser;
          const isAnon = session.user.app_metadata?.provider === 'anonymous';
          if (isAnon) {
            authUser.type = 'guest';
            (authUser as any).isGuest = true;
            setIsGuest(true);
          } else {
            authUser.type = 'auth';
            (authUser as any).isGuest = false;
            setIsGuest(false);
          }
          setUser(authUser);
          setSession(session);
          const isGoogle = session.user.app_metadata?.provider === 'google';
          setIsGoogleUser(isGoogle);
          console.log(`[AuthContext_OASC] Initial session set. User ID: ${authUser.id}, isGuest: ${isAnon}, isGoogle: ${isGoogle}`);
        } else {
          setUser(null);
          setSession(null);
          setIsGuest(false);
          setIsGoogleUser(false);
        }
      } catch (error) {
        console.error("Failed to get auth session", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user as AuthUser);
      setIsGuest(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // User will need to confirm email before being logged in
    } finally {
      setIsLoading(false);
    }
  };

  // Guest login using Supabase anonymous sign-in
  const continueAsGuest = async (): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      // 1. Anonymous sign-in
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      const user = data.user as AuthUser;
      user.type = 'guest';
      user.isGuest = true;

      // 2. Assign random avatar and username, upsert into profiles
      const { avatar, username } = await assignRandomAvatarAndUsername();
      if (avatar && username) {
        await supabase.from('profiles').upsert({
          id: user.id,
          avatar_url: avatar.url,
          avatar_name: avatar.name,
          avatar_image_url: avatar.url,
          display_name: username,
          updated_at: new Date().toISOString(),
        });
        user.display_name = username;
        user.avatar_url = avatar.url;
      }

      // 3. Optionally fetch profile to ensure fields are present
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name,avatar_url')
        .eq('id', user.id)
        .single();
      if (profileData) {
        user.display_name = profileData.display_name;
        user.avatar_url = profileData.avatar_url;
      }

      // The onAuthStateChange listener will handle updating state
      return user;
    } catch (error) {
      console.error("[AuthContext_CG] Error in continueAsGuest:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log("Initiating Google sign in");
      // Get the current URL path to return to after authentication
      const currentPath = window.location.pathname;
      
      // Use PKCE auth flow for better security and session handling
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${currentPath}`,
          // Use PKCE auth flow
          flowType: 'pkce',
          queryParams: {
            // Request offline access for refresh tokens
            access_type: 'offline',
            // Force consent screen to ensure refresh token
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
      
      // Log the auth URL for debugging
      if (data?.url) {
        console.log("Google auth initiated successfully, redirecting to OAuth provider");
        console.log("Auth URL:", data.url);
      } else {
        console.warn("No redirect URL returned from signInWithOAuth");
      }
      
      // No need to update state here as we're redirecting to OAuth provider
      // State will update on return via Supabase's auth state listener
    } catch (error) {
      console.error("Google sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isGuest) {
        // Clear guest session from localStorage
        localStorage.removeItem('guestSession');
      } else {
        // Sign out from Supabase auth
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      setUser(null);
      setIsGuest(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isGuest,
      isGoogleUser,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      continueAsGuest
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
