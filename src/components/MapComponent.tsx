
import { useRef, useEffect, useState } from 'react';
import { useLeafletMap } from '@/hooks/useLeafletMap';
import MapInstructions from './map/MapInstructions';
import LoadingIndicator from './map/LoadingIndicator';
import ClearPinButton from './map/ClearPinButton';

interface MapComponentProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation: { lat: number; lng: number } | null;
  initialLocation?: { lat: number; lng: number };
  initialZoom?: number; // Added initialZoom prop
  actualLocation?: { lat: number; lng: number };
  showActualLocationMarker?: boolean;
  hideInstructions?: boolean;
}

const MapComponent = ({
  onLocationSelect,
  selectedLocation,
  initialLocation = { lat: 50, lng: 10 }, // Center on Europe by default
  initialZoom = 4, // Default zoom level
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
    initialZoom, // Pass initialZoom to the hook
    actualLocation,
    showActualLocationMarker
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
