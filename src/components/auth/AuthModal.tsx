
import { useState } from "react";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: "login" | "signup";
}

const AuthModal = ({
  isOpen,
  onClose,
  initialView = "login",
}: AuthModalProps) => {
  const [view, setView] = useState<"login" | "signup">(initialView);

  const handleSwitchToSignUp = () => {
    setView("signup");
  };

  const handleSwitchToLogin = () => {
    setView("login");
  };

  if (view === "login") {
    return (
      <LoginForm
        isOpen={isOpen}
        onClose={onClose}
        switchToSignUp={handleSwitchToSignUp}
      />
    );
  }

  return (
    <SignUpForm
      isOpen={isOpen}
      onClose={onClose}
      switchToLogin={handleSwitchToLogin}
    />
  );
};

export default AuthModal;
