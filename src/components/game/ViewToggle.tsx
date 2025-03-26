
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
    <div className="absolute top-4 right-4 z-10 flex">
      <Button
        variant="outline"
        size="icon"
        className={`rounded-l-md rounded-r-none h-10 w-10 bg-background/80 backdrop-blur-sm ${
          activeView === 'image' ? 'bg-primary/10 border-primary' : ''
        }`}
        onClick={activeView === 'map' ? onToggle : undefined}
      >
        {activeView === 'image' ? (
          <Image className="h-5 w-5" />
        ) : (
          <div className="h-8 w-8 rounded overflow-hidden">
            <img 
              src={imageSrc} 
              alt="View image" 
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={`rounded-r-md rounded-l-none h-10 w-10 bg-background/80 backdrop-blur-sm ${
          activeView === 'map' ? 'bg-primary/10 border-primary' : ''
        }`}
        onClick={activeView === 'image' ? onToggle : undefined}
      >
        {activeView === 'map' ? (
          <Map className="h-5 w-5" />
        ) : (
          <div className="h-8 w-8 rounded overflow-hidden">
            <img 
              src={osmLogo} 
              alt="OpenStreetMap" 
              className="h-full w-full object-contain"
            />
          </div>
        )}
      </Button>
    </div>
  );
};

export default ViewToggle;
