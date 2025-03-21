
import { useLeafletMap } from '@/hooks/useLeafletMap';
import LoadingIndicator from './map/LoadingIndicator';
import MapInstructions from './map/MapInstructions';
import ClearPinButton from './map/ClearPinButton';

interface MapComponentProps {
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
}

const MapComponent = ({ onLocationSelect, selectedLocation }: MapComponentProps) => {
  const {
    mapContainerRef,
    mapLoaded,
    showInstructions,
    clearMarker,
    markerRef
  } = useLeafletMap({ onLocationSelect, selectedLocation });

  return (
    <div className="w-full h-full min-h-[300px] rounded-xl overflow-hidden shadow-lg">
      <LoadingIndicator isLoading={!mapLoaded} />
      <div ref={mapContainerRef} className="w-full h-full min-h-[300px]"></div>
      <MapInstructions showInstructions={showInstructions} />
      <ClearPinButton 
        isVisible={!!markerRef.current} 
        onClear={clearMarker} 
      />
    </div>
  );
};

// Add type definition for window to include Leaflet
declare global {
  interface Window {
    L: any;
  }
}

export default MapComponent;
