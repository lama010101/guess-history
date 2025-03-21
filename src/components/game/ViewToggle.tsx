
import { useState, useEffect } from 'react';
import { Map, Image } from 'lucide-react';
import MapComponent from '../MapComponent';

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
      const img = new Image();
      img.onload = () => setPreviewImage(imageSrc);
      img.src = imageSrc;
    }
  }, [imageSrc]);

  return (
    <div className="absolute top-4 right-4 z-10">
      <button 
        onClick={onToggle}
        className="bg-background/80 backdrop-blur-sm shadow-lg border p-1 rounded-md flex items-center justify-center w-25 h-25 overflow-hidden transition-all hover:opacity-90"
        style={{ width: '125px', height: '125px' }}
      >
        {activeView === 'image' ? (
          <div className="w-full h-full">
            <MapComponent 
              onLocationSelect={() => {}} 
              selectedLocation={null}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Map className="h-8 w-8 text-white" />
            </div>
          </div>
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
                <Image className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Image className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
      </button>
    </div>
  );
};

export default ViewToggle;
