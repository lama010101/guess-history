
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { DefaultIcon } from '../../utils/mapUtils';

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
  // We need to fix how we set the icon in react-leaflet v3+
  return (
    <Marker position={position}>
      {label && (
        <Popup>
          {label}
        </Popup>
      )}
      <div className={`custom-marker ${pulse ? 'pulse' : ''}`}>
        <div 
          className={`w-6 h-6 rounded-full border-2 border-white shadow-md ${color}`}
          style={{ transform: 'translate(-50%, -50%)' }}
        ></div>
      </div>
    </Marker>
  );
};

export default MapMarker;
