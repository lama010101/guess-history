
import React from 'react';
import { useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface LocationMarkerProps {
  onLocationSelect: (latlng: L.LatLng) => void;
  enableClick?: boolean;
}

const LocationMarker: React.FC<LocationMarkerProps> = ({ 
  onLocationSelect,
  enableClick = true
}) => {
  useMapEvents({
    click(e) {
      if (enableClick) {
        onLocationSelect(e.latlng);
      }
    },
  });
  
  return null;
};

export default LocationMarker;
