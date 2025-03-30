import { useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapInstructions from './map/MapInstructions';
import LoadingIndicator from './map/LoadingIndicator';

interface MapComponentProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation: { lat: number; lng: number } | null;
  initialLocation?: { lat: number; lng: number };
  actualLocation?: { lat: number; lng: number };
  showActualLocationMarker?: boolean;
  hideInstructions?: boolean;
  initialZoom?: number;
}

const MapComponent = ({
  onLocationSelect,
  selectedLocation,
  initialLocation = { lat: 40, lng: 0 }, // Center point for better world view
  actualLocation,
  showActualLocationMarker = false,
  hideInstructions = false,
  initialZoom = 2 // Default zoom level
}: MapComponentProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const actualMarkerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(!hideInstructions);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [initialLocation.lat, initialLocation.lng],
      zoom: initialZoom,
      worldCopyJump: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
      setShowInstructions(false);
    });

    mapRef.current = map;
    setMapLoaded(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onLocationSelect, initialLocation, initialZoom]);

  // Handle selected location changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;

    // Clear existing marker
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    // Add marker for selected location
    if (selectedLocation) {
      const marker = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
      markerRef.current = marker;
      
      // Don't adjust view after placing marker - this ensures we maintain the current zoom and position
    }
  }, [selectedLocation, mapLoaded]);

  // Handle showing actual location and distance line
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !showActualLocationMarker) return;

    const map = mapRef.current;

    // Clear previous actual marker and line
    if (actualMarkerRef.current) {
      map.removeLayer(actualMarkerRef.current);
      actualMarkerRef.current = null;
    }
    if (lineRef.current) {
      map.removeLayer(lineRef.current);
      lineRef.current = null;
    }

    // Add marker for actual location
    if (actualLocation) {
      const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const marker = L.marker([actualLocation.lat, actualLocation.lng], { icon: redIcon }).addTo(map);
      actualMarkerRef.current = marker;

      // Draw line between selected and actual location
      if (selectedLocation) {
        const line = L.polyline([
          [selectedLocation.lat, selectedLocation.lng],
          [actualLocation.lat, actualLocation.lng]
        ], { color: 'red', dashArray: '5, 10' }).addTo(map);
        lineRef.current = line;

        // Adjust map view to show both markers
        map.fitBounds([
          [selectedLocation.lat, selectedLocation.lng],
          [actualLocation.lat, actualLocation.lng]
        ], { padding: [50, 50] });
      }
    }
  }, [actualLocation, selectedLocation, showActualLocationMarker, mapLoaded]);

  return (
    <div className="h-full w-full relative">
      {/* Map Container */}
      <div ref={mapContainerRef} className="h-full w-full z-10" />
      
      {/* Loading Indicator */}
      {!mapLoaded && <LoadingIndicator isLoading={!mapLoaded} />}
      
      {/* Map Instructions */}
      {showInstructions && mapLoaded && !selectedLocation && (
        <MapInstructions showInstructions={showInstructions} />
      )}
    </div>
  );
};

export default MapComponent;
