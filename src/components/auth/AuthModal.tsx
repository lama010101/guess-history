
import { useState, useEffect } from "react";
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

  // Reset state when location changes to prevent stale modal state
  useEffect(() => {
    if (isOpen) {
      onClose();
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
