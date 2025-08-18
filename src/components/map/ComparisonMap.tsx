
import React from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MapMarker from './MapMarker';
import '../mapStyles.css';
import { calculateDistanceKm } from '@/utils/gameCalculations';

// Setup bounds calculation helper
const getBoundingBox = (positions: [number, number][]) => {
  if (positions.length === 0) return undefined;
  
  // Initialize with the first position
  let minLat = positions[0][0];
  let maxLat = positions[0][0];
  let minLng = positions[0][1];
  let maxLng = positions[0][1];
  
  // Find min and max for all positions
  positions.forEach(([lat, lng]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });
  
  // Add some padding (20%)
  const latPadding = (maxLat - minLat) * 0.2;
  const lngPadding = (maxLng - minLng) * 0.2;
  
  return [
    [minLat - latPadding, minLng - lngPadding],
    [maxLat + latPadding, maxLng + lngPadding]
  ] as L.LatLngBoundsExpression;
};

// AutoBoundMap component that automatically sets the bounds
const AutoBoundMap: React.FC<{
  positions: [number, number][];
  children?: React.ReactNode;
}> = ({ positions, children }) => {
  const mapRef = React.useRef<L.Map | null>(null);
  const bounds = getBoundingBox(positions);
  
  React.useEffect(() => {
    if (mapRef.current && bounds) {
      mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression);
    }
  }, [bounds]);
  
  return (
    <MapContainer
      style={{ width: '100%', height: '100%' }}
      ref={(map) => {
        if (map) {
          mapRef.current = map;
          if (bounds) {
            map.fitBounds(bounds as L.LatLngBoundsExpression);
          }
        }
      }}
    >
      {children}
    </MapContainer>
  );
};

interface ComparisonMapProps {
  guessPosition: [number, number];
  actualPosition: [number, number];
}

const ComparisonMap: React.FC<ComparisonMapProps> = ({ guessPosition, actualPosition }) => {
  // Dev-only debug of positions and haversine distance
  React.useEffect(() => {
    if (import.meta.env && import.meta.env.DEV) {
      const distanceKm = calculateDistanceKm(
        guessPosition[0],
        guessPosition[1],
        actualPosition[0],
        actualPosition[1]
      );
      console.log('[ComparisonMap] positions + distance', {
        guess: { lat: guessPosition[0], lng: guessPosition[1] },
        actual: { lat: actualPosition[0], lng: actualPosition[1] },
        distanceKm: Number.isFinite(distanceKm) ? distanceKm.toFixed(3) : distanceKm
      });
    }
  }, [guessPosition, actualPosition]);
  
  return (
    <div className="relative w-full h-64 rounded-lg overflow-hidden">
      <AutoBoundMap positions={[guessPosition, actualPosition]}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {/* Guess marker */}
        <MapMarker 
          position={guessPosition} 
          color="bg-history-accent"
          label="You"
          pulse={true} 
        />
        
        {/* Actual marker */}
        <MapMarker 
          position={actualPosition} 
          color="bg-history-primary" 
          label="Actual"
        />
        {/* Dotted black line connecting marker centers */}
        <Polyline
          positions={[guessPosition, actualPosition]}
          pathOptions={{ color: '#000000', weight: 2, dashArray: '5 5' }}
          interactive={false}
        />
      </AutoBoundMap>
    </div>
  );
};

export default ComparisonMap;
