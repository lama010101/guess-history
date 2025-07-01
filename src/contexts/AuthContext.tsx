
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define types for our users
export type AuthUser = User & {
  is_guest?: false;
};

export type GuestUser = User & {
  is_guest: true;
};

// Define the shape of our Auth Context
export interface AuthState {
  user: AuthUser | GuestUser | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  upgradeUser: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// Function to generate a random username from an avatar filename
const generateRandomUsername = (avatarName: string) => {
  const name = avatarName.split('.')[0].replace(/[-_]/g, ' ');
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  return `${name}_${randomNumber}`;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | GuestUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const currentUser = session?.user as AuthUser | GuestUser | null;
      setUser(currentUser);
      setIsLoading(false);
    });

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user as AuthUser | GuestUser | null;
      setUser(currentUser);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isGuest = user ? 'is_guest' in user && user.is_guest === true : false;

  const continueAsGuest = async () => {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      if (authData.user) {
        // Fetch a random avatar
        const { data: avatarData, error: avatarError } = await supabase.storage.from('avatars').list();
        if (avatarError || !avatarData || avatarData.length === 0) {
          throw new Error('Could not fetch avatars.');
        }

        const randomAvatar = avatarData[Math.floor(Math.random() * avatarData.length)];
        const avatarUrl = supabase.storage.from('avatars').getPublicUrl(randomAvatar.name).data.publicUrl;
        const username = generateRandomUsername(randomAvatar.name);

        // Create user profile in the database
        const { error: profileError } = await supabase.from('users').insert({
          id: authData.user.id,
          is_guest: true,
          username,
          avatar_url: avatarUrl,
        });

        if (profileError) throw profileError;

        // Update the user state
        const guestUser = { ...authData.user, is_guest: true } as GuestUser;
        setUser(guestUser);
      }
    } catch (error) {
      console.error('Error during guest sign-in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const signInWithEmail = async (email: string) => {
    await supabase.auth.signInWithOtp({ email });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    // Redirect to guess-history.com after sign out
    window.location.href = 'https://guess-history.com';
  };

  const upgradeUser = async (email: string) => {
    if (!user) throw new Error('No user is currently signed in.');

    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;

    // Update the user's is_guest status in the database
    const { error: profileError } = await supabase
      .from('users')
      .update({ is_guest: false })
      .eq('id', user.id);

    if (profileError) throw profileError;

    // Refresh the user state
    const updatedUser = { ...user, is_guest: false } as AuthUser;
    setUser(updatedUser);
  };

  const value = {
    user,
    session,
    isLoading,
    isGuest,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    continueAsGuest,
    upgradeUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
