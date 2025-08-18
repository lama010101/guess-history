import React, { useRef, useState } from 'react';
import HomeMap from '@/components/HomeMap';
import GeoSearchInput from '@/components/geo/GeoSearchInput';
import { GeoHit } from '@/lib/geo/types';

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
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [externalPos, setExternalPos] = useState<{ lat: number; lng: number } | null>(null);

  const handleChoose = (hit: GeoHit) => {
    const label = `${hit.name}${hit.admin ? ', ' + hit.admin : ''}, ${hit.country}`;
    onLocationSelect(label);
    if (onCoordinatesSelect) onCoordinatesSelect(hit.lat, hit.lon);
    setExternalPos({ lat: hit.lat, lng: hit.lon });
  };

  return (
    <div className="w-full flex flex-col h-full">
      <div className="mb-2">
        <GeoSearchInput
          center={center}
          onChoose={handleChoose}
          onManualPin={() => {
            // No special mode needed: HomeMap already supports click-to-place
            // We simply ensure any previous external position remains until user clicks the map.
          }}
        />
      </div>

      <div className="w-full rounded-lg overflow-hidden mb-4 h-[320px] sm:h-[360px] md:flex-1 md:min-h-[300px]">
        <HomeMap 
          onLocationSelect={onLocationSelect}
          onCoordinatesSelect={onCoordinatesSelect}
          avatarUrl={avatarUrl}
          showHeader={false}
          showSearch={false}
          externalPosition={externalPos}
          onCenterChange={setCenter}
        />
      </div>
    </div>
  );
};

export default LocationSelector;
