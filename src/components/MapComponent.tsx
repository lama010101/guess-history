
import { useRef, useEffect, useState } from 'react';
import { Map as LeafletMap, LatLng, Marker, TileLayer } from 'leaflet';
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
    mapContainer,
    map,
    marker,
    isLoading,
    handleMapClick,
    handleClearMarker
  } = useLeafletMap({
    onLocationSelect,
    selectedLocation,
    initialLocation,
    actualLocation,
    showActualLocationMarker
  });

  return (
    <div className="h-full w-full relative">
      {/* Map Container */}
      <div ref={mapContainer} className="h-full w-full z-10" />
      
      {/* Loading Indicator */}
      {isLoading && <LoadingIndicator />}
      
      {/* Only show instructions if not hidden and no marker */}
      {!hideInstructions && !selectedLocation && !isLoading && (
        <MapInstructions />
      )}
      
      {/* Clear Pin Button */}
      {selectedLocation && !isLoading && (
        <ClearPinButton onClick={handleClearMarker} />
      )}
    </div>
  );
};

export default MapComponent;
