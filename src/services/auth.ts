
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define user types
export interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  isGuest: boolean;
}

// Define auth store type
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  continueAsGuest: () => void;
  googleLogin: () => Promise<void>;
}

// For now, we'll implement a mock auth system
// This would be replaced with Supabase or another auth provider later
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
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
          
          // Mock successful registration
          set({
            user: {
              id: '1',
              username,
              email,
              isGuest: false,
              avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + email,
            },
            isAuthenticated: true,
            isLoading: false,
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
          isAuthenticated: false 
        });
      },
      
      continueAsGuest: () => {
        const guestId = 'guest-' + Math.random().toString(36).substr(2, 9);
        set({
          user: {
            id: guestId,
            username: 'Guest',
            isGuest: true,
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + guestId,
          },
          isAuthenticated: true,
        });
      },
      
      googleLogin: async () => {
        set({ isLoading: true, error: null });
        try {
          // Simulate Google login
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock successful Google login
          const randomEmail = `user${Math.floor(Math.random() * 10000)}@gmail.com`;
          const randomName = `User${Math.floor(Math.random() * 10000)}`;
          
          set({
            user: {
              id: '2',
              username: randomName,
              email: randomEmail,
              isGuest: false,
              avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomEmail}`,
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to login with Google', 
            isLoading: false 
          });
        }
      },
    }),
    {
      name: 'auth-storage', // name of the item in localStorage
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
