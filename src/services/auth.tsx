import React, { createContext, useState, useContext, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import AuthModal from '@/components/auth/AuthModal';

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

interface AuthContextType {
  user: User | null;
  users: User[];
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
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
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  continueAsGuest: async () => {},
  openAuthModal: () => {},
  googleSignIn: async () => {},
  loginOrSignUp: async () => {},
});

// Create Supabase client
import { supabase } from '@/integrations/supabase/client';

// Create a hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const currentUser = session.user;
        const userData: User = {
          id: currentUser.id,
          email: currentUser.email || '',
          username: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User',
          displayName: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User',
          createdAt: currentUser.created_at,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
          isAI: false,
          registrationMethod: (currentUser.app_metadata?.provider as 'email' | 'google') || 'email',
          user_type: 'real'
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        setIsGuest(false);
        
        await syncUserToDatabase(currentUser);
      } else {
        handleContinueAsGuest();
      }
      
      await fetchUsers();
      
      setIsLoading(false);
    };
    
    checkSession();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const currentUser = session.user;
          const userData: User = {
            id: currentUser.id,
            email: currentUser.email || '',
            username: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User',
            displayName: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User',
            createdAt: currentUser.created_at,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`,
            isAI: false,
            registrationMethod: (currentUser.app_metadata?.provider as 'email' | 'google') || 'email',
            user_type: 'real'
          };
          
          setUser(userData);
          setIsAuthenticated(true);
          setIsGuest(false);
          
          await syncUserToDatabase(currentUser);
          
          await fetchUsers();
        } else if (event === 'SIGNED_OUT') {
          handleContinueAsGuest();
        }
      }
    );
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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
        
        setUsers(mappedUsers);
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
        setUsers(users);
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
    const { email, user_metadata, id, created_at, app_metadata } = user;
    const username = user_metadata?.name || email?.split('@')[0] || 'User';

    try {
      const { error } = await supabase.rpc('sync_user_to_database', {
        user_id: id,
        user_username: username,
        user_email: email,
        user_avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
      });

      if (error) {
        console.error('Failed to sync user to DB:', error);
      } else {
        console.log('User synced to DB successfully');
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
    
    setUsers(sampleUsers);
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
        
        if (error) {
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
      
      setShowAuthModal(false);
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleContinueAsGuest = async () => {
    const guestUser: User = {
      id: 'guest-' + Math.random().toString(36).substring(2, 15),
      displayName: 'Guest User',
      username: 'Guest User',
      isGuest: true,
      createdAt: new Date().toISOString(),
      registrationMethod: 'guest',
      user_type: 'ai'
    };
    setUser(guestUser);
    setIsAuthenticated(false);
    setIsGuest(true);
    localStorage.setItem('user', JSON.stringify(guestUser));
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
            await supabase.rpc('update_username', {
              profile_id: user.id,
              new_username: pendingUsername
            });
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
    user,
    users,
    isAuthenticated,
    isGuest,
    isLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
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
