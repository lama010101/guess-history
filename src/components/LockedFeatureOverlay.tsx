import React from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/AuthModal';
import { useState } from 'react';

interface LockedFeatureOverlayProps {
  message?: string;
  children?: React.ReactNode;
}

export const LockedFeatureOverlay: React.FC<LockedFeatureOverlayProps> = ({
  message = "Sign up to unlock this feature and save your progress!",
  children
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="relative w-full h-full">
      {/* Original content (blurred) */}
      <div className="blur-sm pointer-events-none">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg p-6 text-center">
        <Lock className="h-12 w-12 text-amber-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Feature Locked</h3>
        <p className="text-white/90 mb-6 max-w-md">{message}</p>
        <Button 
          variant="default"
          className="bg-amber-500 hover:bg-amber-600"
          onClick={() => setShowAuthModal(true)}
        >
          Sign Up Now
        </Button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default LockedFeatureOverlay;
