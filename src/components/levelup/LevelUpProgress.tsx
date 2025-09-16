import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLevelProgress } from '@/hooks/useLevelProgress';

interface LevelUpProgressProps {
  currentLevel: number;
  onLevelUp?: (newLevel: number) => void;
}

export function LevelUpProgress({ currentLevel, onLevelUp }: LevelUpProgressProps) {
  const { user } = useAuth();
  const { updateLevelProgress } = useLevelProgress();
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const updateProgress = async () => {
      if (!user?.id) return;
      
      try {
        setIsUpdating(true);
        const { success, newLevel } = await updateLevelProgress(user.id, currentLevel);
        
        if (success && newLevel && onLevelUp) {
          onLevelUp(newLevel);
        }
      } catch (error) {
        console.error('Error updating level progress:', error);
      } finally {
        setIsUpdating(false);
      }
    };

    updateProgress();
  }, [user?.id, currentLevel, updateLevelProgress, onLevelUp]);

  return null; // This is a utility component that doesn't render anything
}
