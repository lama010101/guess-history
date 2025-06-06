
import React from 'react';
import { Circle } from 'react-leaflet';

interface MapCirclesProps {
  position: [number, number];
  haloRadiusKm: number;
  haloColor: string;
}

const MapCircles: React.FC<MapCirclesProps> = ({ position, haloRadiusKm, haloColor }) => {
  return (
    <React.Fragment>
      {/* First circle for styling */}
      <Circle
        center={position}
        pathOptions={{
          color: haloColor,
          fillColor: haloColor,
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5',
          radius: haloRadiusKm * 1000 // Convert km to meters for radius
        }}
      />
      {/* Second circle for radius */}
      <Circle
        center={position}
        pathOptions={{ 
          opacity: 0, 
          fillOpacity: 0.05,
          color: haloColor,
          fillColor: haloColor,
          radius: haloRadiusKm * 1000 // Convert km to meters for radius
        }}
      >
        <div 
          className="leaflet-circle-radius" 
          style={{ width: `${haloRadiusKm * 1000}px`, height: `${haloRadiusKm * 1000}px` }} 
        />
      </Circle>
    </React.Fragment>
  );
};

export default MapCircles;
