
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
  registrationMethod?: 'email' | 'google' | 'guest' | 'system';
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
          // Ensure all users have the isAI field explicitly set
          const updatedUsers = parsedUsers.map((user: User) => ({
            ...user,
            isAI: user.isAI === undefined ? (user.registrationMethod === 'system') : user.isAI
          }));
          setUsers(updatedUsers);
          
          // Update localStorage with the explicit isAI field
          localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
        } catch (error) {
          console.error('Error parsing users:', error);
          setUsers([]);
        }
      } else {
        // Initialize with sample AI users if no registered users exist
        createSampleUsers();
      }
    };

    loadUser();
    loadUsers();
  }, []);

  // Create sample AI users for demonstration
  const createSampleUsers = () => {
    const sampleUsers: User[] = [
      {
        id: 'ai-1',
        email: 'admin@example.com',
        username: 'admin',
        displayName: 'Admin User',
        createdAt: new Date('2023-01-01').toISOString(),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        isAI: true,
        registrationMethod: 'system'
      },
      {
        id: 'ai-2',
        email: 'test@example.com',
        username: 'test_user',
        displayName: 'Test User',
        createdAt: new Date('2023-02-15').toISOString(),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
        isAI: true,
        registrationMethod: 'system'
      },
      {
        id: 'ai-3',
        email: 'john@example.com',
        username: 'john_doe',
        displayName: 'John Doe',
        createdAt: new Date('2023-03-10').toISOString(),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
        isAI: true,
        registrationMethod: 'system'
      }
    ];
    
    setUsers(sampleUsers);
    localStorage.setItem('registeredUsers', JSON.stringify(sampleUsers));
  };

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
        
        // Make sure to update users list with the latest data
        setUsers(users);
        
        setShowAuthModal(false);
      } else {
        throw new Error('No registered users found');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Invalid email or password');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // In a real app, this would use actual Google OAuth
      // For now, simulate a successful login with a random email
      
      // Generate a dummy email that wouldn't conflict with AI users
      const randomId = Math.random().toString(36).substring(2, 10);
      const email = `user${randomId}@gmail.com`;
      const username = `GoogleUser${randomId}`;
      
      // Create a new user object
      const newUser: User = {
        id: `google-${randomId}`,
        email,
        username,
        displayName: username,
        createdAt: new Date().toISOString(),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomId}`,
        isAI: false, // Explicitly mark as real user
        registrationMethod: 'google'
      };
      
      // Update the users list
      const registeredUsers = localStorage.getItem('registeredUsers');
      let usersList = registeredUsers ? JSON.parse(registeredUsers) : [];
      
      // Check if email already exists
      const existingUser = usersList.find((u: User) => u.email === email);
      if (!existingUser) {
        usersList.push(newUser);
        localStorage.setItem('registeredUsers', JSON.stringify(usersList));
        setUsers(usersList);
      }
      
      // Set as current user
      setUser(existingUser || newUser);
      setIsAuthenticated(true);
      setIsGuest(false);
      localStorage.setItem('user', JSON.stringify(existingUser || newUser));
      
      setShowAuthModal(false);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      alert('Google sign in failed');
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
      const newUser: User = {
        id: `user-${Math.random().toString(36).substring(2, 15)}`,
        email,
        username,
        displayName: username,
        createdAt: new Date().toISOString(),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        isAI: false, // Explicitly mark as real user
        registrationMethod: 'email'
      };
      
      // Add to registered users
      users.push(newUser);
      localStorage.setItem('registeredUsers', JSON.stringify(users));
      
      // Update the users state immediately to ensure it's available in the admin panel
      setUsers(users);
      
      // Log in the new user
      setUser(newUser);
      setIsAuthenticated(true);
      setIsGuest(false);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      setShowAuthModal(false);
      
      console.log('New user registered and added to users list:', newUser);
      console.log('Updated users list:', users);
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
    const guestUser: User = {
      id: 'guest-' + Math.random().toString(36).substring(2, 15),
      displayName: 'Guest User',
      username: 'Guest User',
      isGuest: true,
      createdAt: new Date().toISOString(),
      registrationMethod: 'guest'
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
