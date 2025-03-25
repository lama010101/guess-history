
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  activeView: 'image' | 'map';
  onToggle: () => void;
  imageSrc?: string;
  showClose?: boolean;
}

const ViewToggle = ({ activeView, onToggle, imageSrc, showClose = true }: ViewToggleProps) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div 
      className="absolute top-4 right-4 z-20"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Button
        variant="ghost"
        className="h-32 px-4 font-medium flex flex-col items-center gap-2"
        onClick={onToggle}
      >
        {activeView === 'image' ? (
          <>
            <span>Map</span>
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Openstreetmap_logo.svg" 
              alt="OpenStreetMap" 
              className="h-16 w-16 object-contain" 
            />
          </>
        ) : (
          <>
            <span>Image</span>
            {imageSrc && (
              <div className="h-16 w-16 rounded overflow-hidden">
                <img 
                  src={imageSrc} 
                  alt="Historical image" 
                  className="h-full w-full object-cover" 
                />
              </div>
            )}
          </>
        )}
      </Button>
      
      {activeView === 'map' && (
        <div className="absolute bottom-0 right-0 translate-y-full mt-2 p-1 rounded text-xs">
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
