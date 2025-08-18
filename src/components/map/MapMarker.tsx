import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface MapMarkerProps {
  position: [number, number];
  color?: string;
  label?: string;
  pulse?: boolean;
}

const MapMarker: React.FC<MapMarkerProps> = ({ 
  position, 
  color = "bg-primary", 
  label,
  pulse = false
}) => {
  // Use a centered DivIcon so polylines connect to the marker center.
  const icon = React.useMemo(() => {
    const size = 24; // px
    const html = `
      <div class="flex items-center justify-center">
        <div class="rounded-full border-2 border-white shadow-md ${color} ${pulse ? 'animate-ping' : ''}"
             style="width:${size}px;height:${size}px;"></div>
      </div>`;
    return L.divIcon({
      className: '',
      html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2], // center anchor
    });
  }, [color, pulse]);

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
