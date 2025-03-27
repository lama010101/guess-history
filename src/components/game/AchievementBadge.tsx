
import { BadgeCheck, Map, Calendar, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BadgeType = 'location' | 'year' | 'combo';

interface AchievementBadgeProps {
  type: BadgeType;
  count?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AchievementBadge = ({
  type,
  count = 0,
  showLabel = true,
  size = 'md',
  className
}: AchievementBadgeProps) => {
  const badges = {
    location: {
      icon: Map,
      label: 'Perfect Location',
      color: 'bg-green-500 text-white'
    },
    year: {
      icon: Calendar,
      label: 'Perfect Year',
      color: 'bg-blue-500 text-white'
    },
    combo: {
      icon: Star,
      label: 'Perfect Combo',
      color: 'bg-purple-500 text-white'
    }
  };

  const { icon: Icon, label, color } = badges[type];
  
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-base'
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className={cn(
        "rounded-full flex items-center justify-center relative",
        color,
        sizeClasses[size]
      )}>
        <Icon className="h-1/2 w-1/2" />
        {count > 0 && (
          <div className="absolute -top-1 -right-1 bg-white rounded-full border-2 border-current h-5 w-5 flex items-center justify-center text-xs font-bold">
            {count}
          </div>
        )}
      </div>
      {showLabel && (
        <span className="mt-1 text-xs text-center">{label}</span>
      )}
    </div>
  );
};

export default AchievementBadge;
