
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

// Define user types
export interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  isGuest: boolean;
  isAI?: boolean;
  createdAt?: Date | string; // Add createdAt
  registrationMethod?: 'email' | 'google' | 'guest' | 'system'; // Add registrationMethod
  user_type?: 'real' | 'ai'; // Add user_type
}

// Define auth store type
interface AuthState {
  user: User | null;
  users: User[]; // Add users array property
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  continueAsGuest: () => void;
  googleLogin: () => Promise<void>;
  googleSignIn: () => Promise<void>; // Add googleSignIn alias for consistency
  openAuthModal: (initialView?: 'login' | 'signup') => void; // Add openAuthModal
  updateUserProfile: (userData: Partial<User>) => void;
  syncUsersFromSupabase: () => Promise<void>;
}

// For now, we'll implement a mock auth system with Supabase integration
// This would be enhanced with full Supabase auth later
export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      users: [], // Initialize empty users array
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isAdmin: false,
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email, 
            password
          });
          
          if (error) throw error;
          
          // Check if this is an admin user
          const isAdmin = email.toLowerCase() === 'lama010101@gmail.com';
          
          if (data.user) {
            // Get or create user profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
            
            set({
              user: {
                id: data.user.id,
                username: profile?.username || email.split('@')[0],
                email,
                isGuest: false,
                avatarUrl: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
                createdAt: data.user.created_at,
                registrationMethod: 'email',
                user_type: 'real'
              },
              isAuthenticated: true,
              isLoading: false,
              isAdmin,
            });
            
            // Sync users from Supabase
            get().syncUsersFromSupabase();
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to login', 
            isLoading: false 
          });
        }
      },
      
      signUp: async (email: string, password: string, username: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username
              }
            }
          });
          
          if (error) throw error;
          
          // Check if this is an admin user
          const isAdmin = email.toLowerCase() === 'lama010101@gmail.com';
          
          if (data.user) {
            // Try to create a profile for the user
            await supabase.from('profiles').upsert({
              id: data.user.id,
              username,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
              created_at: data.user.created_at
            });
            
            set({
              user: {
                id: data.user.id,
                username,
                email,
                isGuest: false,
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                createdAt: data.user.created_at,
                registrationMethod: 'email',
                user_type: 'real'
              },
              isAuthenticated: true,
              isLoading: false,
              isAdmin,
            });
            
            // Sync users from Supabase
            get().syncUsersFromSupabase();
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to sign up', 
            isLoading: false 
          });
        }
      },
      
      logout: async () => {
        await supabase.auth.signOut();
        
        set({ 
          user: null, 
          isAuthenticated: false,
          isAdmin: false,
        });
      },
      
      continueAsGuest: () => {
        const guestId = 'guest-' + Math.random().toString(36).substring(2, 9);
        
        set({
          user: {
            id: guestId,
            username: 'Guest',
            isGuest: true,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${guestId}`,
            createdAt: new Date().toISOString(),
            registrationMethod: 'guest',
            user_type: 'ai'
          },
          isAuthenticated: true,
          isAdmin: false,
        });
      },
      
      googleLogin: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: window.location.origin
            }
          });
          
          if (error) throw error;
          
          // The OAuth sign-in will redirect the user away from the app,
          // so we won't perform state updates here.
          // The auth state will be managed by the onAuthStateChange listener.
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to login with Google', 
            isLoading: false 
          });
        }
      },
      
      googleSignIn: async () => {
        return get().googleLogin();
      },
      
      openAuthModal: (initialView: 'login' | 'signup' = 'login') => {
        console.log(`Opening auth modal with view: ${initialView}`);
        // In a real implementation, this would open a modal
        // but since we're using zustand, we'll need additional state management
        // or a separate modal state manager
      },

      updateUserProfile: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const updatedUser = { ...currentUser, ...userData };
        
        set({
          user: updatedUser
        });
      },
      
      syncUsersFromSupabase: async () => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('Error fetching users from Supabase:', error);
            return;
          }
          
          if (data && data.length > 0) {
            const mappedUsers = data.map(user => ({
              id: user.id,
              username: user.name || user.email?.split('@')[0] || 'Unknown',
              email: user.email || '',
              isGuest: false,
              avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name || user.email || Math.random()}`,
              createdAt: user.created_at,
              isAI: user.user_type !== 'real',
              registrationMethod: user.signup_method || 'email',
              user_type: user.user_type || 'real'
            }));
            
            set({ users: mappedUsers });
            console.log("Synced users from Supabase:", mappedUsers);
          }
        } catch (error) {
          console.error('Error syncing users from Supabase:', error);
        }
      }
    }),
    {
      name: 'auth-storage', // name of the item in localStorage
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
);

// Initialize auth state with Supabase session
export const initializeAuthWithSupabase = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    const isAdmin = session.user.email?.toLowerCase() === 'lama010101@gmail.com';
    
    useAuth.setState({
      user: {
        id: session.user.id,
        username: profile?.username || session.user.email?.split('@')[0] || 'User',
        email: session.user.email,
        isGuest: false,
        avatarUrl: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
        createdAt: session.user.created_at,
        registrationMethod: 'email',
        user_type: 'real'
      },
      isAuthenticated: true,
      isAdmin
    });
    
    // Sync users from Supabase
    useAuth.getState().syncUsersFromSupabase();
  }
  
  // Set up auth state change listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      const isAdmin = session.user.email?.toLowerCase() === 'lama010101@gmail.com';
      
      useAuth.setState({
        user: {
          id: session.user.id,
          username: profile?.username || session.user.email?.split('@')[0] || 'User',
          email: session.user.email,
          isGuest: false,
          avatarUrl: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
          createdAt: session.user.created_at,
          registrationMethod: 'email',
          user_type: 'real'
        },
        isAuthenticated: true,
        isAdmin
      });
      
      // Sync users from Supabase
      useAuth.getState().syncUsersFromSupabase();
    } else if (event === 'SIGNED_OUT') {
      useAuth.setState({
        user: null,
        isAuthenticated: false,
        isAdmin: false
      });
    }
  });
};
