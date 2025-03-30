
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import UnifiedAuthForm from './UnifiedAuthForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoFocus?: boolean;
  defaultTab?: 'login' | 'signup';
}

const AuthModal = ({ 
  isOpen, 
  onClose, 
  autoFocus = false,
  defaultTab = 'login'
}: AuthModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-center">Welcome to GuessEvents</DialogTitle>
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            Sign in or create an account to continue
          </p>
        </div>
        <UnifiedAuthForm onSuccess={onClose} autoFocus={autoFocus} />
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
