
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [showLogin, setShowLogin] = useState(true);
  const location = useLocation();

  // Use ref to track the last path to avoid unnecessary effects
  const lastPathRef = React.useRef(location.pathname);

  // Only reset state when location changes, not on every render
  useEffect(() => {
    // Only close when location changes, not when isOpen changes
    if (isOpen && location.pathname !== lastPathRef.current) {
      onClose();
      lastPathRef.current = location.pathname;
    }
  }, [location.pathname, isOpen, onClose]);

  const switchToLogin = () => setShowLogin(true);
  const switchToSignUp = () => setShowLogin(false);

  return (
    <>
      {showLogin ? (
        <LoginForm 
          isOpen={isOpen} 
          onClose={onClose} 
          switchToSignUp={switchToSignUp} 
        />
      ) : (
        <SignUpForm 
          isOpen={isOpen} 
          onClose={onClose} 
          switchToLogin={switchToLogin} 
        />
      )}
    </>
  );
};

export default AuthModal;
