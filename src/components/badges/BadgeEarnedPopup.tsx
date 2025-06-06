import React, { useEffect, useState } from 'react';
import { Badge } from '@/utils/badges/types';
import { BadgeCard } from './BadgeCard';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BadgeEarnedPopupProps {
  badge: Badge | null;
  onClose: () => void;
}

export const BadgeEarnedPopup: React.FC<BadgeEarnedPopupProps> = ({ badge, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (badge) {
      setIsOpen(true);
      // Trigger confetti when badge is shown
      const end = Date.now() + 1000;
      
      const triggerConfetti = () => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF8C00']
        });
        
        if (Date.now() < end) {
          requestAnimationFrame(triggerConfetti);
        }
      };
      
      triggerConfetti();
    } else {
      setIsOpen(false);
    }
  }, [badge]);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  if (!badge) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Award className="h-6 w-6 text-yellow-500" />
            <span>Badge Unlocked!</span>
            <Award className="h-6 w-6 text-yellow-500" />
          </DialogTitle>
          <DialogDescription className="text-center">
            Congratulations! You've earned a new badge.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-6">
          <div className="mb-4 relative">
            <BadgeCard 
              badge={badge} 
              earned={true} 
              size="lg" 
              showProgress={false} 
            />
            <Sparkles className="absolute -top-2 -right-2 text-yellow-500 h-8 w-8 animate-pulse" />
          </div>
          
          <h3 className="text-xl font-bold text-history-primary">{badge.name}</h3>
          <p className="text-center mt-2 text-muted-foreground">{badge.description}</p>
          
          <div className="mt-4 text-sm inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
            {badge.category} • {badge.difficulty}
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleClose}>
            Awesome!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 