
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'signup';
}

const AuthModal = ({ isOpen, onClose, initialView = 'login' }: AuthModalProps) => {
  const [view, setView] = useState<'login' | 'signup'>(initialView);
  const [open, setOpen] = useState(isOpen);

  // Update internal state when isOpen prop changes
  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  // When view changes, make sure the modal stays open
  useEffect(() => {
    if (view === 'login' || view === 'signup') {
      setOpen(true);
    }
  }, [view]);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {view === 'login' ? 'Login to EventGuesser' : 'Create an Account'}
          </DialogTitle>
        </DialogHeader>
        
        {view === 'login' ? (
          <LoginForm onSignUp={() => setView('signup')} onSuccess={handleClose} />
        ) : (
          <SignUpForm onLogin={() => setView('login')} onSuccess={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
