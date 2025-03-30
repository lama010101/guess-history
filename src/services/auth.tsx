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
    // Check for existing session
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
        
        // Sync user to database
        await syncUserToDatabase(currentUser);
      } else {
        // No active session, continue as guest
        handleContinueAsGuest();
      }
      
      // Load users from Supabase
      await fetchUsers();
      
      setIsLoading(false);
    };
    
    checkSession();
    
    // Set up auth state change listener
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
          
          // Sync user to database
          await syncUserToDatabase(currentUser);
          
          // Refresh users list
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

  // Fetch users from Supabase
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching users:', error);
        loadFallbackUsers();
        return;
      }
      
      if (data && data.length > 0) {
        const mappedUsers = data.map(profile => ({
          id: profile.id,
          email: '',  // No email in profiles table
          username: profile.username || 'Unknown',
          displayName: profile.username || 'Unknown',
          createdAt: profile.created_at,
          avatarUrl: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`,
          isAI: profile.role !== 'admin',
          registrationMethod: 'email', // Default to email since we don't have this info
          user_type: profile.role === 'admin' ? 'real' : 'ai'
        }));
        
        setUsers(mappedUsers);
        console.log("Loaded users from Supabase:", mappedUsers);
      } else {
        // No users in Supabase yet, create sample data
        loadFallbackUsers();
      }
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      loadFallbackUsers();
    }
  };

  const loadFallbackUsers = () => {
    // Load users from localStorage as fallback
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

  // Sync user data to Supabase
  const syncUserToDatabase = async (user: any) => {
    const { email, user_metadata, id, created_at, app_metadata } = user;
    const username = user_metadata?.name || email?.split('@')[0] || 'User';

    try {
      const { error } = await supabase.from('profiles').upsert({
        id,
        username,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
        role: 'admin',  // Make the user an admin by default
        created_at: created_at,
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

  // Create sample AI users for demonstration
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
    
    // Also add sample users to Supabase profiles table
    try {
      for (const user of sampleUsers) {
        const { error } = await supabase.from('profiles').upsert({
          id: user.id,
          username: user.username,
          avatar_url: user.avatarUrl,
          role: user.user_type === 'real' ? 'admin' : 'user',
          created_at: user.createdAt,
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
      
      // Session is handled by the auth state change listener
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
      
      // The redirect and session handling will be managed by Supabase
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
      
      // Session will be handled by auth state change listener
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
      
      // Auth state change listener will handle the state update
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
      
      // First try sign in
      try {
        await handleSignIn(email, password);
        
        // If there was a pending username, update the user profile
        const pendingUsername = localStorage.getItem('pendingUsername');
        if (pendingUsername) {
          // Get the current user
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Update the profile
            await supabase.from('profiles').update({
              username: pendingUsername
            }).eq('id', user.id);
            
            // Clear the pending username
            localStorage.removeItem('pendingUsername');
          }
        }
        
        return;
      } catch (signInError) {
        console.log("Sign in failed, attempting sign up:", signInError);
        
        // Get username from localStorage or generate from email
        const pendingUsername = localStorage.getItem('pendingUsername') || email.split('@')[0];
        
        // If sign in fails, try sign up
        try {
          await handleSignUp(email, password, pendingUsername);
          
          // Clear the pending username
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
