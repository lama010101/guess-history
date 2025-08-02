
import React from 'react';
import { MapPin } from "lucide-react";
import ComparisonMap from "@/components/map/ComparisonMap";

interface LocationAccuracyCardProps {
  distanceKm: number;
  guessPosition: [number, number];
  actualPosition: [number, number];
}

const LocationAccuracyCard: React.FC<LocationAccuracyCardProps> = ({ 
  distanceKm, 
  guessPosition, 
  actualPosition 
}) => {
  return (
    <div className="bg-white dark:bg-gray-700 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="font-bold text-lg text-history-primary dark:text-history-light flex items-center">
          <MapPin className="mr-2 h-4 w-4" />
          Location Accuracy
        </h2>
        <div className="px-3 py-1 rounded-full bg-history-primary/10 text-history-primary dark:bg-history-primary/20 dark:text-history-light text-sm">
          {Math.round(distanceKm)} km off
        </div>
      </div>
      
      <div className="h-64 w-full relative">
        <ComparisonMap 
          guessPosition={guessPosition} 
          actualPosition={actualPosition} 
        />
      </div>
    </div>
  );
};

export default LocationAccuracyCard;
