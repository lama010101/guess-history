
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  activeView: 'image' | 'map';
  onToggle: () => void;
  imageSrc?: string;
  showClose?: boolean;
}

const ViewToggle = ({ activeView, onToggle, showClose = true }: ViewToggleProps) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div 
      className="absolute top-4 right-4 z-20"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Button
        variant="secondary"
        className="h-16 px-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm font-medium"
        onClick={onToggle}
      >
        {activeView === 'image' ? 'Map' : 'Image'}
      </Button>
      
      {activeView === 'map' && (
        <div className="absolute bottom-0 right-0 translate-y-full mt-2 p-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded text-xs">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Openstreetmap_logo.svg" 
            alt="OpenStreetMap" 
            className="h-5" 
          />
        </div>
      )}
    </div>
  );
};

export default ViewToggle;
