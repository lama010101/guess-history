
import { useRef, useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { useLeafletMap } from '@/hooks/useLeafletMap';
import MapInstructions from './map/MapInstructions';
import LoadingIndicator from './map/LoadingIndicator';
import ClearPinButton from './map/ClearPinButton';

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
  initialLocation = { lat: 0, lng: 0 },
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
    selectedLocation
  });

  // Derive loading state from mapLoaded
  const isLoading = !mapLoaded;

  // Handler for clearing the marker
  const handleClearMarker = () => {
    clearMarker();
  };

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
      
      {/* Clear Pin Button */}
      {selectedLocation && !isLoading && (
        <ClearPinButton onClear={handleClearMarker} />
      )}
    </div>
  );
};

export default MapComponent;
