
import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

interface ResultVisualizationProps {
  actualLocation: { lat: number; lng: number };
  guessedLocation?: { lat: number; lng: number };
  isVisible: boolean;
  accuracyRadius?: number; // In meters, default is 1000
}

const ResultVisualization = ({ 
  actualLocation, 
  guessedLocation, 
  isVisible,
  accuracyRadius = 1000 
}: ResultVisualizationProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  useEffect(() => {
    if (!isVisible || !mapRef.current || !guessedLocation) return;

    const initMap = async () => {
      try {
        const L = window.L;
        if (!L) return;

        // Create map if it doesn't exist
        if (!leafletMapRef.current) {
          leafletMapRef.current = L.map(mapRef.current, {
            gestureHandling: true // Enable two-finger pan for touch devices
          }).setView([
            (actualLocation.lat + guessedLocation.lat) / 2,
            (actualLocation.lng + guessedLocation.lng) / 2
          ], 2);

          // Add tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(leafletMapRef.current);

          // Add custom handler for two-finger panning on touch devices
          leafletMapRef.current.gestureHandling.enable();
        }

        // Add accuracy circle around the actual location
        const accuracyCircle = L.circle([actualLocation.lat, actualLocation.lng], {
          radius: accuracyRadius,
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.2,
          weight: 2
        }).addTo(leafletMapRef.current);

        // Add markers for actual location
        const actualMarker = L.marker([actualLocation.lat, actualLocation.lng], {
          icon: L.divIcon({
            className: 'actual-location-marker',
            html: `<div class="p-1 rounded-full bg-green-500 border-2 border-white shadow-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })
        }).addTo(leafletMapRef.current);

        // Add user profile image marker for guessed location
        const guessedMarker = L.marker([guessedLocation.lat, guessedLocation.lng], {
          icon: L.divIcon({
            className: 'guessed-location-marker',
            html: `<div class="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-lg">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=You" class="w-full h-full" />
                  </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
        }).addTo(leafletMapRef.current);

        // Draw a line between the two points
        const latlngs = [
          [actualLocation.lat, actualLocation.lng],
          [guessedLocation.lat, guessedLocation.lng]
        ] as L.LatLngExpression[];
        
        const polyline = L.polyline(latlngs, {
          color: 'red',
          weight: 2,
          opacity: 0.7,
          dashArray: '5, 10'
        }).addTo(leafletMapRef.current);

        // Fit map to show both markers with padding
        const bounds = L.latLngBounds(
          L.latLng(actualLocation.lat, actualLocation.lng),
          L.latLng(guessedLocation.lat, guessedLocation.lng)
        );
        leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });

        // Add tooltips
        actualMarker.bindTooltip("Actual Location").openTooltip();
        guessedMarker.bindTooltip("Your Guess").openTooltip();
      } catch (error) {
        console.error("Error initializing result visualization map:", error);
      }
    };

    // Initialize the map
    initMap();

    // Clean up function
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isVisible, actualLocation, guessedLocation, accuracyRadius]);

  if (!isVisible || !guessedLocation) return null;

  return (
    <div className="mt-4 rounded-lg overflow-hidden border border-border shadow-md">
      <div ref={mapRef} className="h-[200px] w-full"></div>
    </div>
  );
};

export default ResultVisualization;
