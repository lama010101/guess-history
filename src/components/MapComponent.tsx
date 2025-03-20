
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

interface MapComponentProps {
  onLocationSelect?: (lat: number, lng: number) => void;
}

const MapComponent = ({ onLocationSelect }: MapComponentProps) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userMarker, setUserMarker] = useState<any>(null);
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    // Load Leaflet dynamically
    const loadLeaflet = async () => {
      try {
        // This will simulate dynamic loading, in a real app we'd be using import() for modules
        const L = window.L;
        if (!L) {
          // If Leaflet isn't loaded yet, add it to the document
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          
          const scriptTag = document.createElement('script');
          scriptTag.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          scriptTag.onload = initializeMap;
          
          document.head.appendChild(cssLink);
          document.head.appendChild(scriptTag);
        } else {
          // Leaflet already loaded
          initializeMap();
        }
      } catch (error) {
        console.error("Error loading Leaflet:", error);
      }
    };

    const initializeMap = () => {
      try {
        const L = window.L;
        if (!L) return;
        
        // Create map centered on Europe
        const mapInstance = L.map('map').setView([48.8566, 2.3522], 4);
        
        // Add tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapInstance);
        
        // Set map click handler
        mapInstance.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          
          // Remove existing marker if any
          if (userMarker) {
            mapInstance.removeLayer(userMarker);
          }
          
          // Create marker at clicked position
          const marker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'custom-div-icon',
              html: `<div style="
                background-color: rgb(59, 130, 246);
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                transform: translate(-50%, -50%);
              "></div>`,
              iconSize: [20, 20],
              iconAnchor: [0, 0],
            })
          }).addTo(mapInstance);
          
          setUserMarker(marker);
          
          // Call the callback with selected coordinates
          if (onLocationSelect) {
            onLocationSelect(lat, lng);
          }
        });
        
        setMap(mapInstance);
        setMapLoaded(true);
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    loadLeaflet();

    return () => {
      // Cleanup
      if (map) {
        map.remove();
      }
    };
  }, [onLocationSelect]);

  return (
    <div className="w-full h-full min-h-[300px] rounded-xl overflow-hidden shadow-lg">
      {!mapLoaded && (
        <div className="w-full h-full min-h-[300px] bg-gray-100 rounded-xl flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      <div id="map" className="w-full h-full min-h-[300px]"></div>
      <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow text-xs text-center">
        <div className="flex items-center justify-center mb-1">
          <MapPin className="h-4 w-4 mr-1 text-primary" />
          <span className="font-medium">Click on the map to place your guess</span>
        </div>
        <p className="text-muted-foreground">Drag to move around and zoom in/out with the controls</p>
      </div>
    </div>
  );
};

// Add type definition for window to include Leaflet
declare global {
  interface Window {
    L: any;
  }
}

export default MapComponent;
