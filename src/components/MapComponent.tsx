
import { useRef, useEffect, useState } from 'react';
import { useLeafletMap } from '@/hooks/useLeafletMap';
import MapInstructions from './map/MapInstructions';
import LoadingIndicator from './map/LoadingIndicator';

interface MapComponentProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation: { lat: number; lng: number } | null;
  initialLocation?: { lat: number; lng: number };
  actualLocation?: { lat: number; lng: number };
  showActualLocationMarker?: boolean;
  hideInstructions?: boolean;
}

const MapComponent = ({
  onLocationSelect,
  selectedLocation,
  initialLocation = { lat: 40, lng: -20 }, // Center between Europe and USA
  actualLocation,
  showActualLocationMarker = false,
  hideInstructions = false
}: MapComponentProps) => {
  // Use the custom hook for map functionality
  const {
    mapContainerRef,
    mapLoaded,
    showInstructions: showMapInstructions,
    clearMarker,
    markerRef
  } = useLeafletMap({
    onLocationSelect,
    selectedLocation,
    initialLocation,
    actualLocation,
    showActualLocationMarker
  });

  // Derive loading state from mapLoaded
  const isLoading = !mapLoaded;

  return (
    <div className="h-full w-full relative">
      {/* Map Container */}
      <div ref={mapContainerRef} className="h-full w-full z-10" />
      
      {/* Loading Indicator */}
      {isLoading && <LoadingIndicator isLoading={isLoading} />}
      
      {/* Only show instructions if not hidden and no marker */}
      {!hideInstructions && !selectedLocation && !isLoading && (
        <MapInstructions showInstructions={!hideInstructions} />
      )}
      
      {/* Clear Pin Button removed as requested */}
    </div>
  );
};

export default MapComponent;
