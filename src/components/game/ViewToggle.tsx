
import { useState, useEffect } from 'react';
import { Map, Image as ImageIcon } from 'lucide-react';

interface ViewToggleProps {
  activeView: 'image' | 'map';
  onToggle: () => void;
  imageSrc: string;
}

const ViewToggle = ({ activeView, onToggle, imageSrc }: ViewToggleProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Preload the image for the preview
  useEffect(() => {
    if (imageSrc) {
      const img = new window.Image();
      img.onload = () => setPreviewImage(imageSrc);
      img.src = imageSrc;
    }
  }, [imageSrc]);

  // Static satellite map centered on Europe
  const mapPreviewImage = 'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/10,45,3,0,0/75x75?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA';

  return (
    <div className="absolute top-4 right-4 z-10">
      <button 
        onClick={onToggle}
        className="bg-background/80 backdrop-blur-sm shadow-lg border p-1 rounded-md flex items-center justify-center overflow-hidden transition-all hover:opacity-90"
        style={{ width: '75px', height: '75px' }}
      >
        {activeView === 'image' ? (
          <img 
            src={mapPreviewImage}
            alt="Map Preview" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full relative">
            {previewImage ? (
              <img 
                src={previewImage} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  );
};

export default ViewToggle;
