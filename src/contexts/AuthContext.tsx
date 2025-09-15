
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createUserProfileIfNotExists } from '@/utils/profile/profileService';
import { supabase } from '@/integrations/supabase/client';

// Define the shape of our Auth Context
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  signInWithEmail: (email: string, password?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  upgradeUser: (email: string) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  deleteUserAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// Function to generate a random username from an avatar filename
const generateRandomUsername = (avatarName: string) => {
  const name = avatarName.split('.')[0].replace(/[-_]/g, ' ');
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  return `${name}_${randomNumber}`;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Ensure Realtime uses the latest access token so RLS-authorized events are delivered
      try {
        if (session?.access_token) {
          supabase.realtime.setAuth(session.access_token);
        }
      } catch (e) {
        try { console.warn('AuthContext: failed to set Realtime auth token', e); } catch {}
      }
      if (session?.user) {
        // Ensure profile exists with historical avatar
        createUserProfileIfNotExists(
          session.user.id,
          session.user.user_metadata?.full_name || 'User'
        ).then((ok) => {
          try {
            // Notify UI (navbar/menu, home, etc.) to refetch profile immediately
            window.dispatchEvent(new Event('profileUpdated'));
          } catch {}
        });
      }
      setIsLoading(false);
    });

    // Fetch initial session; do NOT auto-create anonymous sessions anymore
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        try {
          if (session?.access_token) {
            supabase.realtime.setAuth(session.access_token);
          }
        } catch (e) {
          try { console.warn('AuthContext: failed to set Realtime auth token (initial)', e); } catch {}
        }
        if (session?.user) {
          createUserProfileIfNotExists(
            session.user.id,
            session.user.user_metadata?.full_name || 'User'
          ).then(() => {
            try { window.dispatchEvent(new Event('profileUpdated')); } catch {}
          });
        }
      })
      .catch((err) => {
        try {
          console.warn('AuthContext: getSession failed', err);
        } catch {}
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const isGuest = user ? !user.email : false;

  const continueAsGuest = async () => {
    // Mark auth as loading; RequireAuthSession will wait until onAuthStateChange clears it
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      if (authData.user) {
        // Create profile with random historical avatar
        await createUserProfileIfNotExists(authData.user.id, 'Guest');
        // Update the user state (already set by auth listener as well)
        setUser(authData.user);
      }
    } catch (error) {
      console.error('Error during guest sign-in:', error);
    } finally {
      // Do not clear isLoading here; onAuthStateChange will set it to false once session is ready
    }
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const signInWithEmail = async (email: string, password?: string) => {
    if (password && password.length > 0) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const redirectTo = (import.meta as any)?.env?.VITE_AUTH_EMAIL_REDIRECT_TO as string | undefined;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo ?? `${window.location.origin}/home` },
      });
      if (error) throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const redirectTo = (import.meta as any)?.env?.VITE_AUTH_EMAIL_REDIRECT_TO as string | undefined;
      const payload = redirectTo
        ? { email, password, options: { emailRedirectTo: redirectTo } }
        : { email, password };

      const { error } = await supabase.auth.signUp(payload as any);
      if (error) throw error;
    } catch (err) {
      console.error('Supabase signUp failed:', err);
      // Fallback path: if database failed to create a new user (common with broken DB trigger),
      // create/reuse an anonymous session and upgrade it to email+password, which avoids a fresh insert.
      const message = (err as any)?.message || '';
      const status = (err as any)?.status || (err as any)?.code;
      const isDbSaveError = message.includes('Database error saving new user') || status === 500;

      if (!isDbSaveError) throw err as any;

      try {
        // Ensure there is a signed-in user (anonymous). If not, sign in anonymously first.
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) {
          const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously();
          if (anonErr) throw anonErr;
          if (!anonData.user) throw new Error('Anonymous sign-in did not return a user');
        }

        // Now upgrade the current user with email and password.
        const redirectTo = (import.meta as any)?.env?.VITE_AUTH_EMAIL_REDIRECT_TO as string | undefined;
        const { error: emailErr } = await supabase.auth.updateUser(
          redirectTo ? { email, options: { emailRedirectTo: redirectTo } as any } : { email } as any
        );
        if (emailErr) throw emailErr;

        const { error: pwErr } = await supabase.auth.updateUser({ password });
        if (pwErr) throw pwErr;

        // Success: upgraded anonymous user to email/password account.
        return;
      } catch (upgradeErr) {
        console.error('Anonymous upgrade fallback failed:', upgradeErr);
        throw upgradeErr as any;
      }
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during sign-out:', error);
      // Proceed anyway
    }
    setUser(null);
    window.location.replace('/');
  };

  const upgradeUser = async (email: string) => {
    if (!user) throw new Error('No user is currently signed in.');

    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;

    // Attempt to mark the profile as no longer a guest.
    // Some databases may not have the `is_guest` column (older schema).
    // Some environments don't include `is_guest` in the typed schema; cast to any to avoid TS error while runtime handles missing-column gracefully.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_guest: false } as any)
      .eq('id', user.id);

    if (profileError && !profileError.message.includes('is_guest')) {
      // Rethrow only if the error is NOT about the column missing.
      throw profileError;
    }

    // The user object will be updated automatically by the onAuthStateChange listener.
  };

  const updateUserEmail = async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;
    // Supabase sends a confirmation email. User state will update upon confirmation.
  };

  const updateUserPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const deleteUserAccount = async () => {
    if (!user) throw new Error('No user is currently signed in.');
    // This is a placeholder for a more complex server-side operation.
    // In a real app, you would call a Supabase Edge Function to delete the user
    // and all their associated data to bypass RLS.
    console.warn('Placeholder for deleteUserAccount. This should be a server-side call.');
    // For now, we will just sign the user out.
    await signOut();
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
    signUpWithEmail,
    upgradeUser,
    updateUserEmail,
    updateUserPassword,
    deleteUserAccount,
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
