import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FullscreenControl } from 'react-leaflet-fullscreen';
import 'react-leaflet-fullscreen/styles.css';
import '@/styles/map-fullscreen.css';
import { Badge } from "@/components/ui/badge";
import { MapPin } from 'lucide-react';

import AvatarMarker from './map/AvatarMarker';

interface HomeMapProps {
  avatarUrl?: string;
  onLocationSelect?: (location: string) => void;
  onCoordinatesSelect?: (lat: number, lng: number) => void;
}

// Component that handles map click events
const MapClickHandler: React.FC<{
  onMapClick: (latlng: L.LatLng) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

// Component to handle fullscreen events
const FullscreenHandler: React.FC = () => {
  const map = useMap();
  
  useEffect(() => {
    map.on('enterFullscreen', () => document.body.classList.add('leaflet-fullscreen-on'));
    map.on('exitFullscreen', () => document.body.classList.remove('leaflet-fullscreen-on'));
    
    return () => {
      map.off('enterFullscreen');
      map.off('exitFullscreen');
    };
  }, [map]);
  
  return null;
};

const HomeMap: React.FC<HomeMapProps> = ({
  avatarUrl,
  onLocationSelect,
  onCoordinatesSelect
}) => {
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [location, setLocation] = useState<string>('Select a location');
  // Avatar error state handled inside AvatarMarker

  

  // Handle map click to set marker position
  const handleMapClick = async (latlng: L.LatLng) => {
    const newPosition: [number, number] = [latlng.lat, latlng.lng];
    setMarkerPosition(newPosition);
    
    // Call the coordinates select handler if provided
    if (onCoordinatesSelect) {
      onCoordinatesSelect(latlng.lat, latlng.lng);
    }
    
    // Reverse geocode to get location name
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`
      );
      const data = await response.json();
      
      if (data.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.hamlet || 'Unknown';
        const country = data.address.country || 'Unknown';
        const locationString = `${city}, ${country}`;
        setLocation(locationString);
        
        if (onLocationSelect) {
          onLocationSelect(locationString);
        }
      } else {
        setLocation('Unknown location');
        if (onLocationSelect) {
          onLocationSelect('Unknown location');
        }
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      setLocation('Unknown location');
      if (onLocationSelect) {
        onLocationSelect('Unknown location');
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <label className="font-semibold flex items-center text-history-primary dark:text-history-light"><MapPin className="w-4 h-4 mr-1" />WHERE</label>
        {markerPosition ? (
          <Badge variant="selectedValue" className="font-medium">
            {location}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Select a location on the map</span>
        )}
      </div>
      
      <div className="relative flex-grow rounded-lg overflow-hidden">
        <MapContainer 
          id="game-map"
          className="game-map-container leaflet-container"
          center={[36.1408, -5.3536]} 
          zoom={2} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          zoomControl={false}
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapClickHandler onMapClick={handleMapClick} />
          <FullscreenHandler />
          
          {markerPosition && (
            <AvatarMarker lat={markerPosition[0]} lng={markerPosition[1]} imageUrl={avatarUrl ?? undefined} sizePx={100} />
          )}
          
          <FullscreenControl position="topright" />
          <ZoomControl position="topleft" zoomInText="+" zoomOutText="–" />
        </MapContainer>
      </div>
    </div>
  );
};

export default HomeMap; 