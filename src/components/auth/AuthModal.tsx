
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import LoginForm from "./LoginForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const location = useLocation();

  // Reset state when location changes to prevent stale modal state
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname, isOpen, onClose]);

  return (
    <LoginForm isOpen={isOpen} onClose={onClose} />
  );
};

export default AuthModal;
