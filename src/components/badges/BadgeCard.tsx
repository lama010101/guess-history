import React from 'react';
import { Badge } from '@/utils/badges/types';
import { Award, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface BadgeCardProps {
  badge: Badge;
  earned: boolean;
  progress?: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
}

const difficultyColors = {
  bronze: 'bg-amber-700',
  silver: 'bg-slate-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-cyan-300'
};

export const BadgeCard: React.FC<BadgeCardProps> = ({ 
  badge, 
  earned, 
  progress = 0, 
  size = 'md',
  showProgress = true
}) => {
  const sizesMap = {
    sm: {
      card: 'aspect-square w-20',
      icon: 'h-10 w-10',
      iconSize: 'h-5 w-5',
      text: 'text-xs'
    },
    md: {
      card: 'aspect-square w-28',
      icon: 'h-14 w-14',
      iconSize: 'h-7 w-7',
      text: 'text-sm'
    },
    lg: {
      card: 'aspect-square w-36',
      icon: 'h-20 w-20',
      iconSize: 'h-10 w-10',
      text: 'text-base'
    }
  };
  
  const sizeClass = sizesMap[size];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            sizeClass.card,
            "rounded-lg p-2 flex flex-col items-center justify-center text-center",
            earned ? "bg-history-secondary/10" : "bg-gray-200 dark:bg-gray-800 opacity-70"
          )}>
            <div className={cn(
              sizeClass.icon,
              "rounded-full flex items-center justify-center mb-2",
              earned 
                ? difficultyColors[badge.difficulty] || 'bg-history-secondary' 
                : 'bg-gray-300 dark:bg-gray-700'
            )}>
              {earned ? (
                <Award className={cn(sizeClass.iconSize, "text-white")} />
              ) : (
                <Lock className={cn(sizeClass.iconSize, "text-gray-500 dark:text-gray-400")} />
              )}
            </div>
            <span className={cn(
              sizeClass.text, 
              "font-medium",
              earned ? "" : "text-gray-500 dark:text-gray-400"
            )}>
              {badge.name}
            </span>
            
            {showProgress && !earned && progress > 0 && (
              <div className="w-full mt-2">
                <Progress value={progress} className="h-1" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-4 max-w-xs">
          <div className="space-y-2">
            <h4 className="font-bold text-history-primary dark:text-history-light">{badge.name}</h4>
            <p className="text-sm">{badge.description}</p>
            <div className="text-xs text-muted-foreground">
              {earned 
                ? `Earned! (${badge.category} - ${badge.difficulty})` 
                : `Progress: ${progress}%`
              }
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}; 