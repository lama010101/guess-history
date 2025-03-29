import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define user types
export interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  isGuest: boolean;
  isAI?: boolean; // Add this optional boolean property
}

// Define auth store type
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  continueAsGuest: () => void;
  googleLogin: () => Promise<void>;
  updateUserProfile: (userData: Partial<User>) => void;
}

// For now, we'll implement a mock auth system
// This would be replaced with Supabase or another auth provider later
export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isAdmin: false,
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if this is an admin user
          const isAdmin = email.toLowerCase() === 'lama010101@gmail.com';
          
          // Mock successful login
          set({
            user: {
              id: '1',
              username: email.split('@')[0],
              email,
              isGuest: false,
              avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + email,
            },
            isAuthenticated: true,
            isLoading: false,
            isAdmin,
          });
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
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if this is an admin user
          const isAdmin = email.toLowerCase() === 'lama010101@gmail.com';
          
          // Mock successful registration
          set({
            user: {
              id: '1',
              username,
              email,
              isGuest: false,
              avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + username,
            },
            isAuthenticated: true,
            isLoading: false,
            isAdmin,
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to sign up', 
            isLoading: false 
          });
        }
      },
      
      logout: () => {
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
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + guestId,
          },
          isAuthenticated: true,
          isAdmin: false,
        });
      },
      
      googleLogin: async () => {
        set({ isLoading: true, error: null });
        try {
          // Simulate Google login
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Generate a random email but check if it's our admin email
          const email = Math.random() < 0.1 ? 'lama010101@gmail.com' : 
            `user${Math.floor(Math.random() * 10000)}@gmail.com`;
          const username = email === 'lama010101@gmail.com' ? 'AdminUser' : 
            `User${Math.floor(Math.random() * 10000)}`;
          
          // Check if this is an admin user
          const isAdmin = email.toLowerCase() === 'lama010101@gmail.com';
          
          set({
            user: {
              id: '2',
              username,
              email,
              isGuest: false,
              avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            },
            isAuthenticated: true,
            isLoading: false,
            isAdmin,
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to login with Google', 
            isLoading: false 
          });
        }
      },

      updateUserProfile: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const updatedUser = { ...currentUser, ...userData };
        
        set({
          user: updatedUser
        });
      },
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
