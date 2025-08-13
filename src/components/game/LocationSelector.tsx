import React from 'react';
import HomeMap from '@/components/HomeMap';

interface LocationSelectorProps {
  selectedLocation: string | null;
  onLocationSelect: (location: string) => void;
  onCoordinatesSelect?: (lat: number, lng: number) => void;
  onSubmit?: () => void;
  hasSelectedLocation?: boolean;
  avatarUrl?: string;
  locationLabel?: string;
  onHome?: () => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onLocationSelect,
  onCoordinatesSelect,
  onSubmit,
  hasSelectedLocation = false,
  avatarUrl,
  onHome
}) => {
  return (
    <div className="w-full flex flex-col h-full">

      <div className="w-full rounded-lg overflow-hidden mb-4" style={{ height: '300px' }}>
        <HomeMap 
          onLocationSelect={onLocationSelect}
          onCoordinatesSelect={onCoordinatesSelect}
          avatarUrl={avatarUrl}
          showHeader={false}
        />
      </div>
    </div>
  );
};

export default LocationSelector;
