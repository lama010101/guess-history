
import { useEffect, useState, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface MapComponentProps {
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
}

const MapComponent = ({ onLocationSelect, selectedLocation }: MapComponentProps) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletLoadedRef = useRef(false);
  const markerRef = useRef<any>(null); // Keep track of the current marker

  useEffect(() => {
    // Load Leaflet only once
    if (leafletLoadedRef.current) {
      initializeMap();
      return;
    }

    // Load Leaflet dynamically
    const loadLeaflet = async () => {
      try {
        // This will check if Leaflet is already loaded
        const L = window.L;
        if (!L) {
          // If Leaflet isn't loaded yet, add it to the document
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(cssLink);
          
          const scriptTag = document.createElement('script');
          scriptTag.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          scriptTag.onload = () => {
            leafletLoadedRef.current = true;
            initializeMap();
          };
          document.head.appendChild(scriptTag);
        } else {
          leafletLoadedRef.current = true;
          initializeMap();
        }
      } catch (error) {
        console.error("Error loading Leaflet:", error);
      }
    };

    loadLeaflet();

    return () => {
      // Cleanup
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update marker when selectedLocation changes from parent
  useEffect(() => {
    if (!mapRef.current || !leafletLoadedRef.current) return;
    
    const L = window.L;
    if (!L) return;
    
    // Clear existing marker
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    
    // Add marker for selected location if it exists and is valid
    if (selectedLocation && selectedLocation.lat !== 0 && selectedLocation.lng !== 0) {
      const marker = L.marker([selectedLocation.lat, selectedLocation.lng], {
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
      }).addTo(mapRef.current);
      
      markerRef.current = marker;
    }
  }, [selectedLocation, mapRef.current]);

  const initializeMap = () => {
    try {
      const L = window.L;
      if (!L || !mapContainerRef.current) return;
      
      // If a map is already initialized for this container, clean it up
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      
      // Create map centered on Europe
      const mapInstance = L.map(mapContainerRef.current).setView([48.8566, 2.3522], 4);
      
      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapInstance);
      
      // Set map click handler
      mapInstance.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        
        // Remove existing marker if any
        if (markerRef.current) {
          mapInstance.removeLayer(markerRef.current);
          markerRef.current = null;
        }
        
        // Create a new marker
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
        
        // Save the new marker
        markerRef.current = marker;
        
        // Hide instructions
        setShowInstructions(false);
        
        // Call the callback with selected coordinates
        if (onLocationSelect) {
          onLocationSelect(lat, lng);
        }
      });
      
      mapRef.current = mapInstance;
      setMapLoaded(true);
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  };

  const clearMarker = () => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
      
      // Reset the selected location
      if (onLocationSelect) {
        onLocationSelect(0, 0); // Reset to default/null location
      }
      
      // Show instructions again
      setShowInstructions(true);
    }
  };

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
      <div ref={mapContainerRef} className="w-full h-full min-h-[300px]"></div>
      {showInstructions && (
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow text-xs text-center flex flex-col gap-2">
          <div className="flex items-center justify-center mb-1">
            <MapPin className="h-4 w-4 mr-1 text-primary" />
            <span className="font-medium">Click on the map to place your guess</span>
          </div>
          <p className="text-muted-foreground">Drag to move around and zoom in/out with the controls</p>
        </div>
      )}
      {markerRef.current && (
        <button 
          onClick={clearMarker}
          className="absolute bottom-4 right-4 z-10 bg-white/80 backdrop-blur-sm py-1 px-2 rounded text-xs text-red-500 hover:bg-white/90 transition-colors"
        >
          Clear pin
        </button>
      )}
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
