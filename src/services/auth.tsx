
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username?: string;
  email?: string;
  avatarUrl?: string;
  isGuest: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  loginAsGuest: () => void;
  updateUserProfile: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  user: null,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  loginAsGuest: () => {},
  updateUserProfile: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load user from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setIsAuthenticated(true);
      setIsAdmin(parsedUser.email === 'admin@example.com' || parsedUser.email === 'lama010101@gmail.com');
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Mock login - in a real app, this would call an API
    const mockUser: User = {
      id: '1',
      username: email.split('@')[0],
      email,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email.split('@')[0]}`,
      isGuest: false
    };
    
    localStorage.setItem('user', JSON.stringify(mockUser));
    setUser(mockUser);
    setIsAuthenticated(true);
    setIsAdmin(email === 'admin@example.com' || email === 'lama010101@gmail.com');
  };

  const register = async (email: string, username: string, password: string) => {
    // Mock registration - in a real app, this would call an API
    const mockUser: User = {
      id: '1',
      username,
      email,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      isGuest: false
    };
    
    localStorage.setItem('user', JSON.stringify(mockUser));
    setUser(mockUser);
    setIsAuthenticated(true);
    setIsAdmin(email === 'admin@example.com' || email === 'lama010101@gmail.com');
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
  };

  const loginAsGuest = () => {
    const guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
    const guestUser: User = {
      id: guestId,
      username: `Guest_${guestId.substring(6)}`,
      isGuest: true
    };
    
    localStorage.setItem('user', JSON.stringify(guestUser));
    setUser(guestUser);
    setIsAuthenticated(true);
  };

  const updateUserProfile = (userData: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      isAdmin,
      login, 
      register, 
      logout, 
      loginAsGuest,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
