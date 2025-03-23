
import { useState } from 'react';
import { Map, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  activeView: 'map' | 'image';
  onToggle: () => void;
  imageSrc?: string;
  showClose?: boolean;
}

const ViewToggle = ({ activeView, onToggle, imageSrc, showClose = false }: ViewToggleProps) => {
  // Static map preview for map mode
  const staticMapUrl = "https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/0,0,1,0/400x400?access_token=pk.sample";
  
  return (
    <div className="absolute right-4 top-4 z-10">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onToggle}
        className="h-10 flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm"
      >
        {activeView === 'image' ? (
          <>
            <Map className="h-4 w-4 mr-1" />
            <span className="font-medium">Map</span>
            {showClose && (
              <span className="ml-1 h-4 w-4 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              </span>
            )}
          </>
        ) : (
          <>
            <Image className="h-4 w-4 mr-1" />
            <span className="font-medium">Photo</span>
            <span className="ml-1 h-5 w-5 rounded overflow-hidden border border-gray-300 dark:border-gray-600">
              <img 
                src={imageSrc} 
                alt="Thumbnail" 
                className="w-full h-full object-cover" 
              />
            </span>
          </>
        )}
      </Button>
    </div>
  );
};

export default ViewToggle;
