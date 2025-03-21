
import { useEffect, useRef, useState } from 'react';

interface UseLeafletMapProps {
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
}

export const useLeafletMap = ({ onLocationSelect, selectedLocation }: UseLeafletMapProps) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletLoadedRef = useRef(false);
  const markerRef = useRef<any>(null);

  // Initialize Leaflet map
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

  // Clear the current marker
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

  // Load Leaflet library and initialize map
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

  return {
    mapContainerRef,
    mapLoaded,
    showInstructions,
    clearMarker,
    markerRef,
  };
};
