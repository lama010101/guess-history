
import { useRef, useState, useEffect } from 'react';
import * as L from 'leaflet';

interface UseLeafletMapProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation: { lat: number; lng: number } | null;
  initialLocation?: { lat: number; lng: number };
  actualLocation?: { lat: number; lng: number };
  showActualLocationMarker?: boolean;
  initialZoom?: number;
}

export const useLeafletMap = ({
  onLocationSelect,
  selectedLocation,
  initialLocation = { lat: 0, lng: 0 },
  actualLocation,
  showActualLocationMarker = false,
  initialZoom = 2
}: UseLeafletMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const actualMarkerRef = useRef<L.Marker | null>(null);
  const distanceLineRef = useRef<L.Polyline | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [initialLocation.lat, initialLocation.lng],
      zoom: initialZoom,
      layers: [
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
      ]
    });

    // Set map reference
    mapRef.current = map;
    setMapLoaded(true);

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialLocation, initialZoom]);

  // Handle map click to place marker
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;

    const handleClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
      setShowInstructions(false);
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [onLocationSelect, mapLoaded]);

  // Update marker position when selectedLocation changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;

    if (selectedLocation) {
      const { lat, lng } = selectedLocation;

      // Remove existing marker
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }

      // Add new marker
      const newMarker = L.marker([lat, lng]).addTo(map);
      markerRef.current = newMarker;
    } else if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
      setShowInstructions(true);
    }
  }, [selectedLocation, mapLoaded]);

  // Show actual location marker and distance line
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !actualLocation) return;

    const map = mapRef.current;

    // Remove existing actual location marker and distance line
    if (actualMarkerRef.current) {
      map.removeLayer(actualMarkerRef.current);
    }
    if (distanceLineRef.current) {
      map.removeLayer(distanceLineRef.current);
    }

    if (showActualLocationMarker && actualLocation) {
      // Add actual location marker
      const actualMarker = L.marker([actualLocation.lat, actualLocation.lng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      }).addTo(map);
      actualMarkerRef.current = actualMarker;

      // Draw distance line
      if (selectedLocation) {
        // Fix: Cast the array of coordinates as L.LatLngExpression[]
        const latlngs: L.LatLngExpression[] = [
          [selectedLocation.lat, selectedLocation.lng],
          [actualLocation.lat, actualLocation.lng]
        ];
        const polyline = L.polyline(latlngs, { color: 'red' }).addTo(map);
        distanceLineRef.current = polyline;
      }
    }

    return () => {
      if (actualMarkerRef.current) {
        map.removeLayer(actualMarkerRef.current);
        actualMarkerRef.current = null;
      }
      if (distanceLineRef.current) {
        map.removeLayer(distanceLineRef.current);
        distanceLineRef.current = null;
      }
    };
  }, [actualLocation, showActualLocationMarker, selectedLocation, mapLoaded]);

  return {
    mapRef,
    mapContainerRef,
    mapLoaded,
    markerRef,
    actualMarkerRef,
    distanceLineRef,
    showInstructions,
    clearMarker: () => {
      if (markerRef.current && mapRef.current) {
        mapRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    }
  };
};
