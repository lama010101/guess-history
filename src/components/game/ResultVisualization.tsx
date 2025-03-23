
import { useEffect, useRef } from 'react';

interface ResultVisualizationProps {
  actualLocation: { lat: number; lng: number };
  guessedLocation: { lat: number; lng: number };
  isVisible: boolean;
  circleRadius?: number; // radius in meters
}

const ResultVisualization = ({ 
  actualLocation, 
  guessedLocation, 
  isVisible, 
  circleRadius = 1000 
}: ResultVisualizationProps) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !mapRef.current) return;

    // Function to dynamically load and initialize Leaflet
    const initializeMap = async () => {
      // Check if Leaflet is already loaded
      if (!(window as any).L) {
        // Load Leaflet CSS
        const linkEl = document.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(linkEl);

        // Load Leaflet JS
        const scriptEl = document.createElement('script');
        scriptEl.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        document.head.appendChild(scriptEl);

        // Wait for script to load
        await new Promise((resolve) => {
          scriptEl.onload = resolve;
        });
      }

      const L = (window as any).L;

      // Calculate the midpoint between the actual and guessed locations
      const midLat = (actualLocation.lat + guessedLocation.lat) / 2;
      const midLng = (actualLocation.lng + guessedLocation.lng) / 2;

      // Calculate distance to determine zoom level
      const distance = L.latLng(actualLocation.lat, actualLocation.lng)
        .distanceTo(L.latLng(guessedLocation.lat, guessedLocation.lng));
      
      // Get appropriate zoom level based on distance
      const zoomLevel = distance > 5000000 ? 1 :
                         distance > 1000000 ? 2 :
                         distance > 500000 ? 3 :
                         distance > 100000 ? 4 :
                         distance > 50000 ? 5 :
                         distance > 10000 ? 7 :
                         distance > 5000 ? 8 :
                         distance > 1000 ? 10 :
                         distance > 500 ? 12 : 13;

      // Initialize map
      const map = L.map(mapRef.current, {
        center: [midLat, midLng],
        zoom: zoomLevel,
        touchZoom: true,
        scrollWheelZoom: false,
        boxZoom: false,
        tap: false,
        dragging: true,
        // Handle gestures for mobile with two fingers
        dragging: L.Browser.mobile,
        tap: L.Browser.mobile,
        tapTolerance: 15,
      });

      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      // Create a circle around the actual location with the specified radius
      L.circle([actualLocation.lat, actualLocation.lng], {
        radius: circleRadius,
        color: '#4CAF50',
        fillColor: '#4CAF50',
        fillOpacity: 0.2,
        weight: 2
      }).addTo(map);

      // Add actual location marker
      L.marker([actualLocation.lat, actualLocation.lng], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="
            background-color: #4CAF50;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            transform: translate(-50%, -50%);
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [0, 0],
        })
      }).addTo(map);

      // Add guessed location marker with user profile image
      L.marker([guessedLocation.lat, guessedLocation.lng], {
        icon: L.divIcon({
          className: 'custom-avatar-icon',
          html: `<div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            transform: translate(-50%, -50%);
            overflow: hidden;
            background-color: #2196F3;
          ">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=You" style="width: 100%; height: 100%;">
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [0, 0],
        })
      }).addTo(map);

      // Add line between actual and guessed locations
      L.polyline(
        [
          [actualLocation.lat, actualLocation.lng],
          [guessedLocation.lat, guessedLocation.lng]
        ],
        { 
          color: '#FF5722',
          weight: 2,
          opacity: 0.7,
          dashArray: '5, 5'
        }
      ).addTo(map);

      // Cleanup function
      return () => {
        map.remove();
      };
    };

    // Initialize the map
    const cleanup = initializeMap();

    // Clean up on unmount
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, [actualLocation, guessedLocation, isVisible, circleRadius]);

  return (
    <div ref={mapRef} className="w-full h-[200px] rounded-md overflow-hidden"></div>
  );
};

export default ResultVisualization;
