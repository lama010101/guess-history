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
      
      {onSubmit && (
        <div className="fixed bottom-0 left-0 right-0 bg-transparent p-4 z-10 lg:hidden">
          <div className="w-full max-w-md mx-auto flex items-center gap-3">
            {onHome && (
              <Button
                onClick={onHome}
                variant="outline"
                className="bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100 rounded-xl px-6 py-6 flex-1"
              >
                Home
              </Button>
            )}
            <Button 
              onClick={onSubmit}
              className={`flex-1 flex items-center justify-center text-lg font-semibold px-8 py-6 !text-white shadow-lg ${hasSelectedLocation ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-700'}`}
              disabled={!hasSelectedLocation}
            >
              Submit Guess
            </Button>
          </div>
          {!hasSelectedLocation && (
            <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">Select a location first</div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
