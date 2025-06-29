
import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MapMarker from './MapMarker';
import '../mapStyles.css';

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
  // Draw a line connecting the guess and actual positions
  const ConnectionLine = () => {
    React.useEffect(() => {
      const map = document.querySelector('.leaflet-container');
      if (!map) return;
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('style', 'position: absolute; width: 100%; height: 100%; pointer-events: none; z-index: 450;');
      map.appendChild(svg);
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', '5,5');
      line.setAttribute('class', 'text-history-primary');
      
      svg.appendChild(line);
      
      // Update line positions when the map changes
      const mapInstance = L.DomUtil.get('map');
      if (mapInstance && mapInstance._leaflet_id) {
        const mapObj = L.map as any;
        const leafletMap = mapObj._instances[mapInstance._leaflet_id];
        
        const updateLine = () => {
          const startPoint = leafletMap.latLngToContainerPoint(L.latLng(guessPosition[0], guessPosition[1]));
          const endPoint = leafletMap.latLngToContainerPoint(L.latLng(actualPosition[0], actualPosition[1]));
          
          line.setAttribute('x1', startPoint.x.toString());
          line.setAttribute('y1', startPoint.y.toString());
          line.setAttribute('x2', endPoint.x.toString());
          line.setAttribute('y2', endPoint.y.toString());
        };
        
        leafletMap.on('move zoom viewreset', updateLine);
        updateLine();
        
        return () => {
          leafletMap.off('move zoom viewreset', updateLine);
          svg.remove();
        };
      }

      return () => {
        // Cleanup if mapInstance wasn't found
        svg.remove();
      };
    }, []);
    
    return null;
  };
  
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
        
        <ConnectionLine />
      </AutoBoundMap>
    </div>
  );
};

export default ComparisonMap;
