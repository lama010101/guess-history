import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ForcedAuthModal } from './ForcedAuthModal';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    // Wait for auth state to load before deciding to show the modal
    if (!isLoading) {
      if (user) {
        setIsAuthenticated(true);
        setShowAuthModal(false);
      } else {
        setIsAuthenticated(false);
        setShowAuthModal(true);
      }
    }
  }, [user, isLoading]);

  // Handle successful authentication
  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  // Show loading state while auth state is loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-history-primary"></div>
      </div>
    );
  }

  return (
    <>
      <ForcedAuthModal 
        isOpen={showAuthModal} 
        onAuthenticated={handleAuthenticated} 
      />
      {isAuthenticated && children}
    </>
  );
}
