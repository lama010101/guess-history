
import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Image, X } from 'lucide-react';

interface ViewToggleProps {
  activeView: 'image' | 'map';
  onToggle: () => void;
  imageSrc?: string; 
  showClose?: boolean;
  onClose?: () => void;
  size?: 'default' | 'large';
}

const ViewToggle = ({ 
  activeView, 
  onToggle, 
  imageSrc, 
  showClose = true,
  onClose,
  size = 'default'
}: ViewToggleProps) => {
  // Size multiplier (33% larger for large size)
  const sizeClass = size === 'large' ? 'w-12 h-12' : 'w-9 h-9';
  const iconSize = size === 'large' ? 24 : 18;

  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        className={`${sizeClass} rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700`}
        onClick={onToggle}
        title={activeView === 'image' ? 'Switch to map view' : 'Switch to image view'}
      >
        {activeView === 'image' ? (
          <MapPin size={iconSize} />
        ) : (
          <Image size={iconSize} />
        )}
      </Button>
    </div>
  );
};

export default ViewToggle;
