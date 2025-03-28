
import { Award, MapPin, Calendar, Trophy } from 'lucide-react';

interface AchievementBadgeProps {
  type: 'location' | 'year' | 'combo';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const AchievementBadge = ({ 
  type, 
  size = 'md', 
  animated = true 
}: AchievementBadgeProps) => {
  // Set sizes based on the size prop
  const sizeClasses = {
    sm: {
      wrapper: 'w-10 h-10',
      icon: 'h-5 w-5'
    },
    md: {
      wrapper: 'w-14 h-14',
      icon: 'h-7 w-7'
    },
    lg: {
      wrapper: 'w-20 h-20',
      icon: 'h-10 w-10'
    }
  };

  // Set colors and icons based on the badge type
  const badgeConfig = {
    location: {
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-500',
      icon: <MapPin className={`${sizeClasses[size].icon}`} />
    },
    year: {
      bgColor: 'bg-amber-500',
      textColor: 'text-amber-500',
      icon: <Calendar className={`${sizeClasses[size].icon}`} />
    },
    combo: {
      bgColor: 'bg-green-500',
      textColor: 'text-green-500',
      icon: <Trophy className={`${sizeClasses[size].icon}`} />
    }
  };

  const config = badgeConfig[type];
  const animationClass = animated ? 'animate-pulse' : '';

  return (
    <div className="relative inline-block">
      <div className={`${sizeClasses[size].wrapper} rounded-full ${config.bgColor} bg-opacity-20 border-2 ${config.bgColor} flex items-center justify-center ${animationClass}`}>
        <div className={`${config.textColor}`}>
          {config.icon}
        </div>
      </div>
      <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-1 shadow-md">
        <Award className="h-4 w-4 text-yellow-500" />
      </div>
    </div>
  );
};

export default AchievementBadge;
