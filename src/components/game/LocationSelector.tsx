import React from 'react';
import HomeMap from '@/components/HomeMap';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LocationSelectorProps {
  selectedLocation: string | null;
  onLocationSelect: (location: string) => void;
  onCoordinatesSelect?: (lat: number, lng: number) => void;
  onSubmit?: () => void;
  hasSelectedLocation?: boolean;
  avatarUrl?: string;
  locationLabel?: string;
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
    <div className="w-full flex flex-col h-full">
      <div className="w-full rounded-lg overflow-hidden mb-4" style={{ height: '300px' }}>
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
