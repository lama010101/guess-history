
import { useState, useEffect } from 'react';
import { Map, Image as ImageIcon } from 'lucide-react';
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
    <div className="absolute top-2 right-2 z-10">
      <button 
        onClick={onToggle}
        className="bg-background/80 backdrop-blur-sm shadow-lg border p-1 rounded-md flex items-center justify-center overflow-hidden transition-all hover:opacity-90"
        style={{ width: '90px', height: '90px' }}
      >
        {activeView === 'image' ? (
          <div className="w-full h-full">
            <MapComponent 
              onLocationSelect={() => {}} 
              selectedLocation={null}
              hideInstructions={true}
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
