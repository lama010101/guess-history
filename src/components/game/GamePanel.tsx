
import { useState } from 'react';
import { Map, Clock } from 'lucide-react';
import MapComponent from '../MapComponent';
import HistoricalImage from '../HistoricalImage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  return (
    <div className="glass-card rounded-2xl overflow-hidden h-full">
      <div className="h-[500px] relative">
        <Tabs defaultValue="image" className="w-full">
          {/* Tab buttons */}
          <div className="absolute top-4 left-0 right-0 z-10 flex justify-center">
            <TabsList className="bg-black/30 backdrop-blur-md rounded-full">
              <TabsTrigger value="image" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-black text-white/90">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1.5" />
                  Image
                </span>
              </TabsTrigger>
              
              <TabsTrigger value="map" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-black text-white/90">
                <span className="flex items-center">
                  <Map className="h-4 w-4 mr-1.5" />
                  Map
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Image view */}
          <TabsContent value="image" className="m-0 h-full">
            <div className="absolute inset-0">
              <HistoricalImage src={currentImage.src} />
            </div>
          </TabsContent>
          
          {/* Map view */}
          <TabsContent value="map" className="m-0 h-full">
            <div className="absolute inset-0">
              <MapComponent onLocationSelect={onLocationSelect} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GamePanel;
