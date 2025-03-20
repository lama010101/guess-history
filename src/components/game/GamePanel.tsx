
import { useState } from 'react';
import { Map, Clock } from 'lucide-react';
import MapComponent from '../MapComponent';
import HistoricalImage from '../HistoricalImage';

interface GamePanelProps {
  currentImage: {
    id: number;
    src: string;
    year: number;
    location: { lat: number; lng: number };
    description: string;
  };
  onLocationSelect: (lat: number, lng: number) => void;
}

const GamePanel = ({ currentImage, onLocationSelect }: GamePanelProps) => {
  const [activeTab, setActiveTab] = useState<'image' | 'map'>('image');
  
  return (
    <div className="md:col-span-3 glass-card rounded-2xl overflow-hidden">
      <div className="h-[500px] relative">
        {/* Tab buttons */}
        <div className="absolute top-4 left-0 right-0 z-10 flex justify-center">
          <div className="bg-black/30 backdrop-blur-md rounded-full p-1 flex">
            <button
              onClick={() => setActiveTab('image')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'image'
                  ? 'bg-white text-black'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1.5" />
                Image
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'map'
                  ? 'bg-white text-black'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              <span className="flex items-center">
                <Map className="h-4 w-4 mr-1.5" />
                Map
              </span>
            </button>
          </div>
        </div>
        
        {/* Image view */}
        <div className={`absolute inset-0 transition-all duration-500 ${
          activeTab === 'image' ? 'opacity-100 z-[1]' : 'opacity-0 z-0'
        }`}>
          <HistoricalImage src={currentImage.src} />
        </div>
        
        {/* Map view */}
        <div className={`absolute inset-0 transition-all duration-500 ${
          activeTab === 'map' ? 'opacity-100 z-[1]' : 'opacity-0 z-0'
        }`}>
          <MapComponent onLocationSelect={onLocationSelect} />
        </div>
      </div>
    </div>
  );
};

export default GamePanel;
