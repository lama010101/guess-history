
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import LoginForm from "./LoginForm";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const location = useLocation();

  // Reset state when location changes to prevent stale modal state
  useEffect(() => {
    if (open) {
      onOpenChange(false);
    }
  }, [location.pathname]);

  return (
    <LoginForm isOpen={open} onClose={() => onOpenChange(false)} />
  );
};

export default AuthModal;
