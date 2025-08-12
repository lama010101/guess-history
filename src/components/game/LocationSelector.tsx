import React from 'react';
import HomeMap from '@/components/HomeMap';
import { Button } from "@/components/ui/button";
import { MapPin } from 'lucide-react';
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
        <div className="fixed bottom-0 left-0 right-0 bg-transparent p-4 z-10 lg:hidden">
          <Button 
            onClick={onSubmit}
            className={`w-full max-w-md mx-auto flex items-center justify-center text-lg font-semibold px-8 py-6 !text-white shadow-lg ${hasSelectedLocation ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-700'}`}
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
