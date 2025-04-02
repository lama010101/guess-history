
import React, { createContext, useState, useContext, useEffect } from 'react';
import AuthModal from '@/components/auth/AuthModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Define interfaces for our auth types
interface User {
  id: string;
  uid?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  isGuest?: boolean;
  createdAt?: Date | string;
  username?: string;
  avatarUrl?: string;
  isAI?: boolean; // Flag to identify AI-generated users vs real users
  registrationMethod?: 'email' | 'google' | 'guest' | 'system';
  user_type?: 'real' | 'ai';
}

interface AuthState {
  user: User | null;
  users: User[];
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  isAdmin: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>; // Alias for signOut
  continueAsGuest: () => Promise<void>;
  openAuthModal: (initialView?: 'login' | 'signup') => void;
  googleSignIn: () => Promise<void>; // Add Google sign-in method
  loginOrSignUp: (email: string, password: string) => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  user: null,
  users: [],
  isAuthenticated: false,
  isGuest: false,
  isLoading: true,
  isAdmin: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  logout: async () => {},
  continueAsGuest: async () => {},
  openAuthModal: () => {},
  googleSignIn: async () => {},
  loginOrSignUp: async () => {},
});

// Create a hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    users: [],
    isAuthenticated: false,
    isGuest: false,
    isLoading: true,
    isAdmin: false
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const toast = useToast ? useToast() : { toast: () => {} };

  // Update auth state in one place to avoid inconsistencies
  const updateAuthState = (updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    const loadInitialAuth = async () => {
      try {
        // First set up auth state listener to avoid missing events during initialization
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state change:', event, session?.user?.id);
            
            if (event === 'SIGNED_IN' && session?.user) {
              await handleSignedIn(session.user);
            } else if (event === 'SIGNED_OUT') {
              handleSignedOut();
            } else if (event === 'USER_UPDATED' && session?.user) {
              await handleUserUpdated(session.user);
            }
          }
        );
        
        // Then check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          await handleSignedIn(session.user);
        } else {
          handleContinueAsGuest();
        }
        
        await fetchUsers();
        
        updateAuthState({ isLoading: false });
        
        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error in loadInitialAuth:', error);
        handleContinueAsGuest();
        updateAuthState({ isLoading: false });
      }
    };
    
    loadInitialAuth();
  }, []);

  const handleSignedIn = async (authUser: any) => {
    try {
      // Get profile data if available
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url, role')
        .eq('id', authUser.id)
        .single();
      
      const userData: User = {
        id: authUser.id,
        email: authUser.email || '',
        username: profile?.username || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        displayName: profile?.username || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        createdAt: authUser.created_at,
        avatarUrl: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
        isAI: false,
        registrationMethod: (authUser.app_metadata?.provider as 'email' | 'google') || 'email',
        user_type: 'real'
      };
      
      updateAuthState({
        user: userData,
        isAuthenticated: true,
        isGuest: false,
        isAdmin: profile?.role === 'admin'
      });
      
      localStorage.removeItem('guestUser');
      await syncUserToDatabase(authUser);
    } catch (error) {
      console.error('Error in handleSignedIn:', error);
      // Fallback to basic user data if profile fetch fails
      const userData: User = {
        id: authUser.id,
        email: authUser.email || '',
        username: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        displayName: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        createdAt: authUser.created_at,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
        isAI: false,
        registrationMethod: (authUser.app_metadata?.provider as 'email' | 'google') || 'email',
        user_type: 'real'
      };
      
      updateAuthState({
        user: userData,
        isAuthenticated: true,
        isGuest: false,
        isAdmin: false
      });
    }
  };

  const handleUserUpdated = async (authUser: any) => {
    // Similar to handleSignedIn but for updates
    await handleSignedIn(authUser);
  };

  const handleSignedOut = () => {
    handleContinueAsGuest();
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_real_users');
      
      if (error) {
        console.error('Error fetching users:', error);
        loadFallbackUsers();
        return;
      }
      
      if (data && data.length > 0) {
        const mappedUsers = data.map((profile: any) => ({
          id: profile.id,
          email: profile.email || '',
          username: profile.username || 'Unknown',
          displayName: profile.username || 'Unknown',
          createdAt: profile.created_at,
          avatarUrl: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`,
          isAI: profile.role !== 'admin',
          registrationMethod: 'email',
          user_type: profile.role === 'admin' ? 'real' : 'ai'
        }));
        
        updateAuthState({ users: mappedUsers });
        console.log("Loaded users from Supabase:", mappedUsers);
      } else {
        loadFallbackUsers();
      }
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      loadFallbackUsers();
    }
  };

  const loadFallbackUsers = () => {
    const storedUsers = localStorage.getItem('registeredUsers');
    if (storedUsers) {
      try {
        let users = JSON.parse(storedUsers);
        updateAuthState({ users });
        console.log("Loaded users from localStorage:", users);
      } catch (error) {
        console.error('Error parsing users:', error);
        createSampleUsers();
      }
    } else {
      createSampleUsers();
    }
  };

  const syncUserToDatabase = async (user: any) => {
    const { email, user_metadata, id, created_at } = user;
    const username = user_metadata?.name || email?.split('@')[0] || 'User';

    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error } = await supabase
          .from('profiles')
          .insert({
            id,
            username,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
          });
  
        if (error) {
          console.error('Failed to create user profile:', error);
        } else {
          console.log('User profile created successfully');
        }
      } else {
        // Update profile if it exists and username is different
        if (existingProfile.username !== username) {
          const { error } = await supabase
            .from('profiles')
            .update({ username })
            .eq('id', id);
  
          if (error) {
            console.error('Failed to update user profile:', error);
          } else {
            console.log('User profile updated successfully');
          }
        }
      }
      
      // Create hints wallet if it doesn't exist
      const { data: existingWallet } = await supabase
        .from('hints_wallet')
        .select('*')
        .eq('user_id', id)
        .single();
      
      if (!existingWallet) {
        await supabase
          .from('hints_wallet')
          .insert({
            user_id: id,
            hint_coins: 10
          });
      }
    } catch (error) {
      console.error('Error in syncUserToDatabase:', error);
    }
  };

  const createSampleUsers = async () => {
    const sampleUsers: User[] = [
      {
        id: 'ai-1',
        email: 'admin@example.com',
        username: 'admin',
        displayName: 'Admin User',
        createdAt: new Date('2023-01-01').toISOString(),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        isAI: true,
        registrationMethod: 'system',
        user_type: 'ai'
      },
      {
        id: 'ai-2',
        email: 'test@example.com',
        username: 'test_user',
        displayName: 'Test User',
        createdAt: new Date('2023-02-15').toISOString(),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
        isAI: true,
        registrationMethod: 'system',
        user_type: 'ai'
      },
      {
        id: 'ai-3',
        email: 'john@example.com',
        username: 'john_doe',
        displayName: 'John Doe',
        createdAt: new Date('2023-03-10').toISOString(),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
        isAI: true,
        registrationMethod: 'system',
        user_type: 'ai'
      }
    ];
    
    updateAuthState({ users: sampleUsers });
    localStorage.setItem('registeredUsers', JSON.stringify(sampleUsers));
    
    try {
      for (const user of sampleUsers) {
        const { error } = await supabase.rpc('add_sample_user', {
          sample_id: user.id,
          sample_username: user.username || '',
          sample_email: user.email || '',
          sample_avatar_url: user.avatarUrl || '',
          sample_role: user.user_type === 'real' ? 'admin' : 'user'
        });
        
        if (error && error.code !== '42883') { // Ignore function not found errors
          console.error('Error creating sample user in Supabase:', error);
        }
      }
    } catch (error) {
      console.error('Error creating sample users in Supabase:', error);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      setShowAuthModal(false);
      return data;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      
      if (error) throw error;
      
      setShowAuthModal(false);
      return data;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const handleSignUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: username,
          }
        }
      });
      
      if (error) throw error;
      
      // Store username in localStorage to be retrieved after email verification
      localStorage.setItem('pendingUsername', username);
      
      setShowAuthModal(false);
      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      // Start with clearing local storage to prevent state inconsistencies
      localStorage.removeItem('currentGameState');
      localStorage.removeItem('guestUser');
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Use setTimeout to ensure other cleanup happens even if signOut is slow
      setTimeout(() => {
        handleContinueAsGuest();
      }, 100);
    } catch (error) {
      console.error('Error signing out:', error);
      // Force logout by clearing everything
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const handleContinueAsGuest = () => {
    // Check for existing guest user in localStorage
    const storedGuestUser = localStorage.getItem('guestUser');
    let guestUser: User;
    
    if (storedGuestUser) {
      guestUser = JSON.parse(storedGuestUser);
    } else {
      // Create new guest user
      guestUser = {
        id: 'guest-' + Math.random().toString(36).substring(2, 15),
        displayName: 'Guest User',
        username: 'Guest User',
        isGuest: true,
        createdAt: new Date().toISOString(),
        registrationMethod: 'guest',
        user_type: 'ai',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=guest-${Math.random()}`
      };
      localStorage.setItem('guestUser', JSON.stringify(guestUser));
    }
    
    updateAuthState({
      user: guestUser,
      isAuthenticated: false,
      isGuest: true,
      isAdmin: false
    });
  };

  const openAuthModal = (initialView: 'login' | 'signup' = 'login') => {
    setAuthView(initialView);
    setShowAuthModal(true);
  };

  const handleLoginOrSignUp = async (email: string, password: string) => {
    try {
      console.log("AuthProvider: Attempting loginOrSignUp with email:", email);
      
      try {
        await handleSignIn(email, password);
        
        const pendingUsername = localStorage.getItem('pendingUsername');
        if (pendingUsername) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('profiles')
              .update({ username: pendingUsername })
              .eq('id', user.id);
              
            localStorage.removeItem('pendingUsername');
          }
        }
        
        return;
      } catch (signInError) {
        console.log("Sign in failed, attempting sign up:", signInError);
        
        const pendingUsername = localStorage.getItem('pendingUsername') || email.split('@')[0];
        
        try {
          await handleSignUp(email, password, pendingUsername);
          localStorage.removeItem('pendingUsername');
          return;
        } catch (signUpError) {
          console.error("Sign up also failed:", signUpError);
          throw signUpError;
        }
      }
    } catch (error) {
      console.error("Error in loginOrSignUp:", error);
      throw error;
    }
  };

  const authContextValue: AuthContextType = {
    ...authState,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    logout: handleSignOut, // Alias for signOut
    continueAsGuest: handleContinueAsGuest,
    openAuthModal,
    googleSignIn: handleGoogleSignIn,
    loginOrSignUp: handleLoginOrSignUp,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab={authView}
      />
    </AuthContext.Provider>
  );
};

export default AuthProvider;
