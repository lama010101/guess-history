
import { Map, Image, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

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
  
  // State to show first-time user tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  
  useEffect(() => {
    // Check if user has seen the tooltip before
    const hasSeenTooltip = localStorage.getItem('hasSeenToggleTooltip');
    
    if (!hasSeenTooltip) {
      setShowTooltip(true);
      
      // Hide tooltip after 5 seconds
      const timer = setTimeout(() => {
        setShowTooltip(false);
        localStorage.setItem('hasSeenToggleTooltip', 'true');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          className="h-[53px] w-[53px] rounded-md bg-background/80 backdrop-blur-sm hover:bg-background/90 transition-all"
          onClick={onToggle}
        >
          {activeView === 'image' ? (
            <div className="h-13 w-13 rounded overflow-hidden">
              <img 
                src={osmLogo} 
                alt="Switch to map view" 
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-13 w-13 rounded overflow-hidden">
              <img 
                src={safeImageSrc} 
                alt="Switch to image view" 
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </Button>
        
        {showTooltip && (
          <div className="absolute right-0 top-full mt-2 bg-black/80 text-white p-2 rounded text-sm w-48 backdrop-blur-sm animate-fade-in">
            <div className="flex items-center gap-1 mb-1">
              <ArrowLeftRight className="h-4 w-4" />
              <span className="font-bold">Toggle View</span>
            </div>
            <p>Click to switch between image and map view</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewToggle;
