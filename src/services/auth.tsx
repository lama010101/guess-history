
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
});

// Create Supabase client
const supabaseUrl = 'https://your-project-url.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

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
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching users:', error);
        loadFallbackUsers();
        return;
      }
      
      if (data && data.length > 0) {
        const mappedUsers = data.map(user => ({
          id: user.id,
          email: user.email,
          username: user.name || user.email?.split('@')[0] || 'Unknown',
          displayName: user.name || user.email?.split('@')[0] || 'Unknown',
          createdAt: user.created_at,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          isAI: user.user_type !== 'real',
          registrationMethod: user.signup_method || 'system',
          user_type: user.user_type
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
    const name = user_metadata?.name || '';
    const signup_method = app_metadata?.provider || 'email';

    try {
      const { error } = await supabase.from('users').upsert({
        id,
        email,
        name,
        signup_method,
        user_type: 'real',
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
    
    // Also add sample users to Supabase
    try {
      for (const user of sampleUsers) {
        const { error } = await supabase.from('users').upsert({
          id: user.id,
          email: user.email,
          name: user.username,
          signup_method: user.registrationMethod,
          user_type: 'ai',
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
