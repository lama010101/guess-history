
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useToast } from '@/hooks/use-toast';

// Define user types
export interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  isGuest: boolean;
  createdAt?: Date;
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
          
          // Create timestamp for registration
          const createdAt = new Date();
          
          // Mock successful login
          const user = {
            id: '1',
            username: email.split('@')[0],
            email,
            isGuest: false,
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + email,
            createdAt,
          };
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            isAdmin,
          });
          
          // Store the user in localStorage for other components to access
          localStorage.setItem('user', JSON.stringify(user));
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
          
          // Create timestamp for registration
          const createdAt = new Date();
          
          // Mock successful registration
          const user = {
            id: '1',
            username,
            email,
            isGuest: false,
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + username,
            createdAt,
          };
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            isAdmin,
          });
          
          // Store the user in localStorage for other components to access
          localStorage.setItem('user', JSON.stringify(user));
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
        
        // Remove from localStorage
        localStorage.removeItem('user');
      },
      
      continueAsGuest: () => {
        const guestId = 'guest-' + Math.random().toString(36).substring(2, 9);
        const user = {
          id: guestId,
          username: 'Guest',
          isGuest: true,
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + guestId,
        };
        
        set({
          user,
          isAuthenticated: true,
          isAdmin: false,
        });
        
        // Store the guest user in localStorage
        localStorage.setItem('user', JSON.stringify(user));
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
          
          // Create timestamp for registration
          const createdAt = new Date();
          
          const user = {
            id: '2',
            username,
            email,
            isGuest: false,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            createdAt,
          };
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            isAdmin,
          });
          
          // Store the user in localStorage for other components to access
          localStorage.setItem('user', JSON.stringify(user));
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
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
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
