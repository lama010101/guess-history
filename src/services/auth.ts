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
  createdAt?: Date | string; 
  registrationMethod?: 'email' | 'google' | 'guest' | 'system';
  user_type?: 'real' | 'ai';
}

// Define auth store type
interface AuthState {
  user: User | null;
  users: User[]; 
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  loginOrSignUp: (email: string, password: string) => Promise<void>;
  logout: () => void;
  continueAsGuest: () => void;
  googleLogin: () => Promise<void>;
  googleSignIn: () => Promise<void>;
  openAuthModal: (initialView?: 'login' | 'signup') => void;
  updateUserProfile: (userData: Partial<User>) => void;
  syncUsersFromSupabase: () => Promise<void>;
}

// For now, we'll implement a mock auth system with Supabase integration
// This would be enhanced with full Supabase auth later
export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      users: [],
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
          
          const isAdmin = email.toLowerCase() === 'lama010101@gmail.com';
          
          if (data.user) {
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
          
          const isAdmin = email.toLowerCase() === 'lama010101@gmail.com';
          
          if (data.user) {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              username,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
              created_at: data.user.created_at,
              role: 'user'
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
            
            get().syncUsersFromSupabase();
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to sign up', 
            isLoading: false 
          });
        }
      },
      
      loginOrSignUp: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // First try to sign in
          const { data, error } = await supabase.auth.signInWithPassword({
            email, 
            password
          });
          
          // If sign in fails with "invalid credentials" or "user not found", try to sign up
          if (error && (error.message.includes("Invalid login credentials") || error.message.includes("user"))) {
            console.log("Login failed, attempting signup instead:", error.message);
            
            // Get the stored username if available
            const pendingUsername = localStorage.getItem('pendingUsername') || email.split('@')[0];
            
            // Try to sign up
            const { data: signupData, error: signupError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  username: pendingUsername
                }
              }
            });
            
            if (signupError) {
              console.error("Signup error:", signupError);
              throw signupError;
            }
            
            console.log("Signup successful:", signupData);
            const isAdmin = email.toLowerCase() === 'lama010101@gmail.com';
            
            if (signupData.user) {
              // Create profile for the new user
              await supabase.from('profiles').upsert({
                id: signupData.user.id,
                username: pendingUsername,
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pendingUsername}`,
                role: 'user',
                created_at: signupData.user.created_at
              });
              
              // Clear the pending username
              localStorage.removeItem('pendingUsername');
              
              set({
                user: {
                  id: signupData.user.id,
                  username: pendingUsername,
                  email,
                  isGuest: false,
                  avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pendingUsername}`,
                  createdAt: signupData.user.created_at,
                  registrationMethod: 'email',
                  user_type: 'real'
                },
                isAuthenticated: true,
                isLoading: false,
                isAdmin,
              });
              
              await get().syncUsersFromSupabase();
            }
          } else if (data.user) {
            // Successful login
            console.log("Login successful:", data.user);
            const isAdmin = email.toLowerCase() === 'lama010101@gmail.com';
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
            
            // Get the stored username from localStorage if available (in case this is a new user who just verified)
            const pendingUsername = localStorage.getItem('pendingUsername');
            
            // If there's a pending username, update the profile
            if (pendingUsername) {
              await supabase.from('profiles').update({
                username: pendingUsername,
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pendingUsername}`
              }).eq('id', data.user.id);
              
              // Clear the pending username
              localStorage.removeItem('pendingUsername');
            }
            
            set({
              user: {
                id: data.user.id,
                username: pendingUsername || profile?.username || email.split('@')[0],
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
            
            await get().syncUsersFromSupabase();
          } else if (error) {
            console.error("Authentication error:", error);
            throw error;
          }
        } catch (error) {
          console.error("Authentication failed:", error);
          set({ 
            error: error instanceof Error ? error.message : 'Authentication failed', 
            isLoading: false 
          });
          throw error;
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
        console.log("Syncing users from Supabase...");
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('Error fetching users from Supabase:', error);
            return;
          }
          
          if (data && data.length > 0) {
            const mappedUsers = data.map(profile => ({
              id: profile.id,
              username: profile.username || 'Unknown',
              email: '',
              isGuest: false,
              avatarUrl: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username || Math.random()}`,
              createdAt: profile.created_at,
              isAI: profile.role !== 'admin',
              registrationMethod: 'email' as const,
              user_type: profile.role === 'admin' ? 'real' as const : 'ai' as const
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
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
);

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
    
    useAuth.getState().syncUsersFromSupabase();
  }
  
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

export const syncProfileWithAuth = async (user: any) => {
  if (!user) return null;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url, email, role')
      .eq('id', user.id)
      .single();
      
    if (error) {
      console.error('Error fetching user profile:', error);
      return user;
    }
    
    // Merge profile data with user object
    return {
      ...user,
      username: data?.username || user.username || user.email?.split('@')[0] || 'User',
      avatarUrl: data?.avatar_url || user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
      isAdmin: data?.role === 'admin'
    };
  } catch (error) {
    console.error('Error syncing profile with auth:', error);
    return user;
  }
};
