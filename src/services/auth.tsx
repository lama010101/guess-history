
import React, { createContext, useState, useContext, useEffect } from 'react';
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
});

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
    // Load user from localStorage
    const loadUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setUser(user);
          setIsAuthenticated(!user.isGuest);
          setIsGuest(user.isGuest || false);
        } catch (error) {
          console.error('Error parsing user:', error);
          // Continue as guest if there's an error
          handleContinueAsGuest();
        }
      } else {
        // No stored user, continue as guest
        handleContinueAsGuest();
      }
      setIsLoading(false);
    };

    // Load registered users
    const loadUsers = () => {
      const storedUsers = localStorage.getItem('registeredUsers');
      if (storedUsers) {
        try {
          const parsedUsers = JSON.parse(storedUsers);
          setUsers(parsedUsers);
        } catch (error) {
          console.error('Error parsing users:', error);
          setUsers([]);
        }
      }
    };

    loadUser();
    loadUsers();
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    try {
      // In a real app, this would make an API call
      const registeredUsers = localStorage.getItem('registeredUsers');
      let users = [];
      
      if (registeredUsers) {
        users = JSON.parse(registeredUsers);
        const user = users.find((u: any) => u.email === email);
        
        if (!user) {
          throw new Error('User not found');
        }
        
        // Simple password check - in a real app this would be done securely
        // Here we're just checking if the user exists
        
        setUser(user);
        setIsAuthenticated(true);
        setIsGuest(false);
        localStorage.setItem('user', JSON.stringify(user));
        setShowAuthModal(false);
      } else {
        throw new Error('No registered users found');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Invalid email or password');
    }
  };

  const handleSignUp = async (email: string, password: string, username: string) => {
    try {
      // Check if email already exists
      const registeredUsers = localStorage.getItem('registeredUsers');
      let users = [];
      
      if (registeredUsers) {
        users = JSON.parse(registeredUsers);
        const existingUser = users.find((u: any) => u.email === email);
        
        if (existingUser) {
          throw new Error('Email already in use');
        }
      }
      
      // Generate a unique ID
      const newUser = {
        id: Math.random().toString(36).substring(2, 15),
        email,
        username,
        displayName: username,
        createdAt: new Date().toISOString(),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        isAI: false // Explicitly mark real users as not AI
      };
      
      // Add to registered users
      users.push(newUser);
      localStorage.setItem('registeredUsers', JSON.stringify(users));
      setUsers(users);
      
      // Log in the new user
      setUser(newUser);
      setIsAuthenticated(true);
      setIsGuest(false);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      setShowAuthModal(false);
    } catch (error) {
      console.error('Error signing up:', error);
      alert(error instanceof Error ? error.message : 'Error creating account');
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(false);
    // Transition to guest mode automatically
    handleContinueAsGuest();
  };

  const handleContinueAsGuest = async () => {
    const guestUser = {
      id: 'guest-' + Math.random().toString(36).substring(2, 15),
      displayName: 'Guest User',
      username: 'Guest User',
      isGuest: true,
      createdAt: new Date().toISOString(),
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

  const authContextValue = {
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
