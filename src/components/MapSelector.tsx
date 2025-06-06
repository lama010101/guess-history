import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './mapStyles.css';
import { FullscreenControl } from 'react-leaflet-fullscreen';
import 'react-leaflet-fullscreen/styles.css';

// Import refactored components
import InitialMapView from './map/InitialMapView';
import LocationMarker from './map/LocationMarker';
import MapMarker from './map/MapMarker';
import MapCircles from './map/MapCircles';
import { reverseGeocode, fetchHaloRadius } from '@/utils/mapUtils';

interface MapSelectorProps {
  haloColor?: string;
  onLocationSelect?: (location: string) => void;
  onCoordinatesSelect?: (lat: number, lng: number) => void;
}

const MapSelector: React.FC<MapSelectorProps> = ({
  haloColor = 'var(--halo, #7E69AB)',
  onLocationSelect,
  onCoordinatesSelect
}) => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [address, setAddress] = useState<string>('');
  const [haloRadiusKm, setHaloRadiusKm] = useState<number>(100);
  const mapRef = useRef<L.Map | null>(null);

  // Fetch dynamic halo radius setting on mount
  useEffect(() => {
    async function loadSetting() {
      const radius = await fetchHaloRadius();
      setHaloRadiusKm(radius);
    }
    loadSetting();
  }, []);

  const handleLocationSelect = async (latlng: L.LatLng) => {
    const newPosition: [number, number] = [latlng.lat, latlng.lng];
    setPosition(newPosition);
    
    // Reverse-geocode using OpenStreetMap Nominatim
    const newAddress = await reverseGeocode(latlng.lat, latlng.lng);
    setAddress(newAddress);
    onLocationSelect?.(newAddress);
    
    // Call the coordinates select handler if provided
    if (onCoordinatesSelect) {
      onCoordinatesSelect(latlng.lat, latlng.lng);
    }
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden z-0">
      <div className="absolute inset-0 z-0">
      <MapContainer
        style={{ width: '100%', height: '100%' }}
        ref={(map) => {
          if (map) {
            mapRef.current = map;
          }
        }}
      >
        <InitialMapView />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationMarker onLocationSelect={handleLocationSelect} />
        
        {position && <MapMarker position={position} />}
        {position && <MapCircles position={position} haloRadiusKm={haloRadiusKm} haloColor={haloColor} />}
          
          <FullscreenControl position="topright" />
      </MapContainer>
      </div>
    </div>
  );
};

export default MapSelector;
