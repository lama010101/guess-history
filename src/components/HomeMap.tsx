import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FullscreenControl } from 'react-leaflet-fullscreen';
import 'react-leaflet-fullscreen/styles.css';
import '@/styles/map-fullscreen.css';
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, X } from 'lucide-react';

import AvatarMarker from './map/AvatarMarker';

interface HomeMapProps {
  avatarUrl?: string;
  onLocationSelect?: (location: string) => void;
  onCoordinatesSelect?: (lat: number, lng: number) => void;
  showHeader?: boolean;
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

// Helper component to expose react-leaflet map instance
const MapRefSaver: React.FC<{ onMap: (map: L.Map) => void }> = ({ onMap }) => {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
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
  onCoordinatesSelect,
  showHeader = true
}) => {
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [location, setLocation] = useState<string>('Select a location');
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  // Avatar error state handled inside AvatarMarker

  
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  // Perform Nominatim search
  const executeSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`);
      const results = await resp.json();
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (e) {
      console.error('Search failed', e);
      setSearchResults([]);
    }
  };

  const handleSelectResult = (res: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(res.lat);
    const lon = parseFloat(res.lon);
    setMarkerPosition([lat, lon]);
    const pretty = res.display_name.split(',').slice(0, 2).join(', ').trim() || res.display_name;
    setLocation(pretty);
    if (onCoordinatesSelect) onCoordinatesSelect(lat, lon);
    if (onLocationSelect) onLocationSelect(pretty);
    if (mapInstance) {
      mapInstance.setView([lat, lon], Math.max(5, mapInstance.getZoom()));
    }
    setSearchResults([]);
  };

  return (
    <div className="flex flex-col h-full">
      {showHeader && (
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
      )}
      
      {/* Search input */}
      <div className="mb-2">
        <div className="relative">
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') executeSearch();
            }}
            placeholder="Search a place (city, country)..."
            className="w-full rounded-md bg-white dark:bg-[#1f1f1f] text-black dark:text-white px-3 py-2 pr-16 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                // keep focus for immediate re-typing
                if (inputRef.current) inputRef.current.focus();
              }}
              className="absolute right-9 top-1/2 -translate-y-1/2 p-1 rounded text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white"
              aria-label="Clear search"
              title="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={executeSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
          {searchResults.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-md max-h-56 overflow-auto shadow-lg">
              {searchResults.map((r, idx) => (
                <li
                  key={`${r.lat}-${r.lon}-${idx}`}
                  className="px-3 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] cursor-pointer"
                  onClick={() => handleSelectResult(r)}
                >
                  {r.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>
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
          {/* Save map ref via hook component to avoid whenCreated typing issues */}
          <MapRefSaver onMap={setMapInstance} />
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