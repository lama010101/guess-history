import React from 'react';
import { getAvatarUrl } from '../multiplayer/AvatarSystem';

interface AvatarDisplayProps {
  player: {
    id: string;
    name: string;
    avatar: string;
    isReady?: boolean;
    hasSubmitted?: boolean;
  };
  size?: 'small' | 'medium' | 'large';
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ 
  player, 
  size = 'medium' 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  return (
    <div className="avatar-display flex flex-col items-center space-y-1">
      <div className={`relative ${sizeClasses[size]}`}>
        <img
          src={getAvatarUrl(player.avatar)}
          alt={player.name}
          className={`rounded-full border-2 ${
            player.hasSubmitted ? 'border-green-500' : 'border-gray-300'
          } ${sizeClasses[size]}`}
        />
        {player.isReady && (
          <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
            ✓
          </div>
        )}
        {player.hasSubmitted && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
            ✓
          </div>
        )}
      </div>
      <span className="text-sm font-medium text-center">{player.name}</span>
    </div>
  );
};
