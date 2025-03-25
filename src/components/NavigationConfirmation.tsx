
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NavigationConfirmationProps {
  isInGame: boolean;
}

const NavigationConfirmation = ({ isInGame }: NavigationConfirmationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [destinationPath, setDestinationPath] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Store the current path for comparison
  const currentPath = location.pathname;
  
  // Handle navigation requests when in game
  const handleNavigationRequest = (path: string) => {
    if (isInGame && path !== currentPath) {
      setDestinationPath(path);
      setIsOpen(true);
      return true; // We're handling this navigation
    }
    return false; // Let normal navigation proceed
  };

  // Confirm navigation
  const confirmNavigation = () => {
    if (destinationPath) {
      navigate(destinationPath);
    }
    setIsOpen(false);
  };

  // Expose the navigation handler to the window object
  useEffect(() => {
    if (!window.appNavigation) {
      window.appNavigation = {
        navigateTo: handleNavigationRequest
      };
    } else {
      window.appNavigation.navigateTo = handleNavigationRequest;
    }
  }, [isInGame, currentPath]);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave the game?</AlertDialogTitle>
          <AlertDialogDescription>
            You're currently in a game. If you leave now, your progress will be saved, but you'll exit the current round.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmNavigation}>Yes, leave game</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Augment the window interface to include our custom navigation
declare global {
  interface Window {
    appNavigation?: {
      navigateTo: (path: string) => boolean;
    };
  }
}

export default NavigationConfirmation;
