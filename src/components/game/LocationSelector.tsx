import React from 'react';
import HomeMap from '@/components/HomeMap';

interface LocationSelectorProps {
  selectedLocation: string | null;
  onLocationSelect: (location: string) => void;
  onCoordinatesSelect?: (lat: number, lng: number) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onLocationSelect,
  onCoordinatesSelect
}) => {
  return (
    <div className="mb-8">
      <div className="h-64 md:h-80 w-full">
        <HomeMap 
          onLocationSelect={onLocationSelect}
          onCoordinatesSelect={onCoordinatesSelect}
        />
      </div>
    </div>
  );
};

export default LocationSelector;
