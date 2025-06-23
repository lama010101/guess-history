
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { DefaultIcon } from '../../utils/mapUtils';
import L from 'leaflet';

interface MapMarkerProps {
  position: [number, number];
  color?: string;
  label?: string;
  pulse?: boolean;
  avatarUrl?: string;
  isUserGuess?: boolean;
}

const MapMarker: React.FC<MapMarkerProps> = ({ 
  position, 
  color = "bg-primary", 
  label,
  pulse = false,
  avatarUrl,
  isUserGuess = false
}) => {
  // Create a custom icon based on whether we're using an avatar or not
  const icon = React.useMemo(() => {
    if (isUserGuess && avatarUrl) {
      return L.divIcon({
        html: `<img src="${avatarUrl}" class="w-8 h-8 rounded-full border-2 border-white shadow-md ${pulse ? 'pulse' : ''}" alt="User guess" onerror="this.style.display='none'; this.parentNode.classList.add('fallback-marker')" />`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
    } else {
      return L.divIcon({
        html: `<div class="${pulse ? 'pulse' : ''}"><div class="w-6 h-6 rounded-full border-2 border-white shadow-md ${color}"></div></div>`,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
    }
  }, [avatarUrl, color, pulse, isUserGuess]);

  return (
    <Marker position={position} icon={icon}>
      {label && (
        <Popup>
          {label}
        </Popup>
      )}
    </Marker>
  );
};

export default MapMarker;
