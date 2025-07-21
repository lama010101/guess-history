import React from 'react';
import HomeMap from '@/components/HomeMap';
import { Button } from '@/components/ui/button';

interface LocationSelectorProps {
  selectedLocation: string | null;
  onLocationSelect: (location: string) => void;
  onCoordinatesSelect?: (lat: number, lng: number) => void;
  onSubmit?: () => void;
  hasSelectedLocation?: boolean;
  avatarUrl?: string;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onLocationSelect,
  onCoordinatesSelect,
  onSubmit,
  hasSelectedLocation = false,
  avatarUrl
}) => {
  return (
    <div className="mb-8 w-full flex flex-col h-full">
      <div className="h-64 lg:h-[500px] w-full rounded-lg overflow-hidden shadow-lg mb-4">
        <HomeMap 
          onLocationSelect={onLocationSelect}
          onCoordinatesSelect={onCoordinatesSelect}
          avatarUrl={avatarUrl}
        />
      </div>
      
      {onSubmit && (
        <div className="mt-auto w-full sticky bottom-0 bg-background pt-2 pb-4 lg:pb-0 lg:pt-4 lg:static">
          <Button 
            onClick={onSubmit}
            className="w-full lg:w-full max-w-2xl mx-auto px-8 py-6 text-lg font-semibold shadow-lg lg:shadow-none"
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
