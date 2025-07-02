import React from 'react';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/AuthModal';
import { useState } from 'react';

interface GuestBadgeProps {
  username?: string;
}

export const GuestBadge: React.FC<GuestBadgeProps> = ({ username = 'Guest' }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <div className="w-full bg-amber-500/20 py-2 px-4 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-amber-700 dark:text-amber-300">[ {username} ]</span>
            <span className="text-sm text-amber-600 dark:text-amber-400">Playing as guest</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
            onClick={() => setShowAuthModal(true)}
          >
            Sign up to unlock full features
          </Button>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

export default GuestBadge;
