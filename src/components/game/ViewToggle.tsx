
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
  const defaultImageSrc = "https://images.unsplash.com/photo-1565711561500-49678a10a63f?q=80&w=2940&auto=format&fit=crop";

  // Use the provided imageSrc or fall back to default if it's undefined or empty
  const safeImageSrc = imageSrc || defaultImageSrc;

  return (
    <div className="absolute top-4 right-4 z-10">
      <Button
        variant="outline"
        size="icon"
        className="h-[53px] w-[53px] rounded-md bg-background/80 backdrop-blur-sm" /* Increased by 33% from 40px */
        onClick={onToggle}
      >
        {activeView === 'image' ? (
          <div className="h-13 w-13 rounded overflow-hidden"> {/* Increased by 33% from 10 */}
            <img 
              src={osmLogo} 
              alt="Switch to map view" 
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="h-13 w-13 rounded overflow-hidden"> {/* Increased by 33% from 10 */}
            <img 
              src={safeImageSrc} 
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
