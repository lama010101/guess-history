
import { Dialog, DialogContent } from "@/components/ui/dialog";
import UnifiedAuthForm from './UnifiedAuthForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoFocus?: boolean;
}

const AuthModal = ({ 
  isOpen, 
  onClose, 
  autoFocus = false 
}: AuthModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center mb-4">
          <h3 className="font-semibold text-lg">Welcome to GuessEvents</h3>
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
