
import { Map, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  activeView: 'image' | 'map';
  onToggle: () => void;
  imageSrc: string;
  showClose?: boolean;
}

const ViewToggle = ({ 
  activeView, 
  onToggle, 
  imageSrc,
  showClose = true
}: ViewToggleProps) => {
  // OpenStreetMap attribution image
  const osmLogo = "https://wiki.openstreetmap.org/w/images/7/79/Public-images-osm_logo.svg";

  return (
    <div className="absolute top-4 right-4 z-10">
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-md bg-background/80 backdrop-blur-sm"
        onClick={onToggle}
      >
        {activeView === 'image' ? (
          <div className="h-8 w-8 rounded overflow-hidden">
            <img 
              src={osmLogo} 
              alt="Switch to map view" 
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="h-8 w-8 rounded overflow-hidden">
            <img 
              src={imageSrc} 
              alt="Switch to image view" 
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </Button>
    </div>
  );
};

export default ViewToggle;
