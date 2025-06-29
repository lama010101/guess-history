import React from 'react';
import HomeMap from '@/components/HomeMap';
import { Button } from '@/components/ui/button';

interface LocationSelectorProps {
  selectedLocation: string | null;
  onLocationSelect: (location: string) => void;
  onCoordinatesSelect?: (lat: number, lng: number) => void;
  onSubmit?: () => void;
  hasSelectedLocation?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onLocationSelect,
  onCoordinatesSelect,
  onSubmit,
  hasSelectedLocation = false
}) => {
  return (
    <div className="mb-8 w-full">
      <div className="h-64 lg:h-[500px] w-full rounded-lg overflow-hidden shadow-lg">
        <HomeMap 
          onLocationSelect={onLocationSelect}
          onCoordinatesSelect={onCoordinatesSelect}
        />
      </div>
      
      {onSubmit && (
        <div className="mt-8 w-full">
          <Button 
            onClick={onSubmit}
            className="w-full lg:w-full max-w-2xl mx-auto px-8 py-6 text-lg font-semibold"
            disabled={!hasSelectedLocation}
          >
            Submit Guess
          </Button>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
