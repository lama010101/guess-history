import React from 'react';
import HomeMap from '@/components/HomeMap';

interface LocationSelectorProps {
  selectedLocation: string | null;
  onLocationSelect: (location: string) => void;
  onCoordinatesSelect?: (lat: number, lng: number) => void;
  avatarUrl?: string;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onLocationSelect,
  onCoordinatesSelect,
  avatarUrl
}) => {
  return (
    <div className="mb-8">
      <div className="h-64 md:h-80 w-full">
        <HomeMap 
          avatarUrl={avatarUrl}
          onLocationSelect={onLocationSelect}
          onCoordinatesSelect={onCoordinatesSelect}
        />
      </div>
    </div>
  );
};

export default LocationSelector;
