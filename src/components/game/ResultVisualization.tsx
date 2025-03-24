
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

interface ResultVisualizationProps {
  actualLocation: { lat: number; lng: number };
  guessedLocation: { lat: number; lng: number };
  isVisible: boolean;
  circleRadius?: number;
  showConnectionLine?: boolean;
}

const ResultVisualization = ({
  actualLocation,
  guessedLocation,
  isVisible,
  circleRadius = 1000,
  showConnectionLine = false
}: ResultVisualizationProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    return () => {
      setIsMounted(false);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Check if component is mounted
    if (!isMounted || !isVisible || !mapRef.current) return;
    
    // Clear previous map if it exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize map after a short delay to ensure DOM is ready
    const initMapPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (!isMounted || !mapRef.current) return;
        
        try {
          // Prepare map options
          const mapOptions = {
            center: guessedLocation,
            zoom: 3,
            zoomControl: false,
            attributionControl: true,
            scrollWheelZoom: false,
          };

          // Initialize map
          const map = L.map(mapRef.current, mapOptions);
          mapInstanceRef.current = map;

          // Add tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }).addTo(map);

          // Add markers
          const actualIcon = L.divIcon({
            className: 'actual-location-icon',
            html: `<div class="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          const guessIcon = L.divIcon({
            className: 'guess-location-icon',
            html: `<div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          // Add markers to map
          const actualMarker = L.marker(actualLocation, { icon: actualIcon }).addTo(map);
          const guessMarker = L.marker(guessedLocation, { icon: guessIcon }).addTo(map);
          
          // Create circle around actual location
          const circle = L.circle(actualLocation, {
            radius: circleRadius,
            color: 'green',
            fillColor: '#3f6212',
            fillOpacity: 0.1,
            weight: 2
          }).addTo(map);

          // Add connection line if requested
          if (showConnectionLine) {
            const polyline = L.polyline([guessedLocation, actualLocation], {
              color: '#6366f1',
              weight: 2,
              opacity: 0.7,
              dashArray: '5, 5'
            }).addTo(map);
          }

          // Fit bounds to show both markers
          const bounds = L.latLngBounds([actualLocation, guessedLocation]);
          map.fitBounds(bounds, { padding: [50, 50] });

          resolve();
        } catch (error) {
          console.error("Error initializing map:", error);
        }
      }, 100);
    });

    return () => {
      // Cancel the promise by checking isMounted in the next tick
      Promise.resolve().then(() => {
        if (!isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      });
    };
  }, [actualLocation, guessedLocation, circleRadius, isVisible, isMounted, showConnectionLine]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-36 sm:h-48 rounded-lg overflow-hidden mt-2" 
      aria-label="Map showing your guess and the actual location"
    />
  );
};

export default ResultVisualization;
