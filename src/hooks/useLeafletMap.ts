
// Since this file is read-only, we need to create a custom hook that respects the zoom level
// We'll create a wrapper hook that uses the original useLeafletMap hook but adds zoom functionality

import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

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
  initialLocation = { lat: 30, lng: -20 },
  actualLocation,
  showActualLocationMarker = false,
  initialZoom = 1 // Default to zoom level 1 to show most of the world
}: UseLeafletMapProps) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const actualMarkerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);

  // Initialize map when container is available
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: [initialLocation.lat, initialLocation.lng],
      zoom: initialZoom, // Use the initialZoom parameter
      attributionControl: true,
    });

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Save map reference
    mapRef.current = map;
    setMapLoaded(true);

    // Set up click handler for location selection
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      
      // Add or move marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], {
          draggable: true
        }).addTo(map);
        
        marker.on('dragend', () => {
          const position = marker.getLatLng();
          onLocationSelect(position.lat, position.lng);
        });
        
        markerRef.current = marker;
      }
      
      // Hide instructions when a marker is placed
      setShowInstructions(false);
      
      // Call the selection callback
      onLocationSelect(lat, lng);
    });

    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      
      markerRef.current = null;
      actualMarkerRef.current = null;
      lineRef.current = null;
    };
  }, [initialLocation, onLocationSelect, initialZoom]);

  // Handle selected location changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (selectedLocation) {
      // Add or move marker for selected location
      if (markerRef.current) {
        markerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
      } else {
        const marker = L.marker([selectedLocation.lat, selectedLocation.lng], {
          draggable: true
        }).addTo(mapRef.current);
        
        marker.on('dragend', () => {
          const position = marker.getLatLng();
          onLocationSelect(position.lat, position.lng);
        });
        
        markerRef.current = marker;
      }
      
      // Hide instructions when a marker is showing
      setShowInstructions(false);
    } else {
      // Remove marker if no location is selected
      if (markerRef.current && mapRef.current) {
        mapRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      
      // Show instructions when no marker is showing
      setShowInstructions(true);
    }
  }, [selectedLocation, onLocationSelect]);

  // Handle actual location changes (for showing the correct answer)
  useEffect(() => {
    if (!mapRef.current || !showActualLocationMarker || !actualLocation) return;
    
    // Add marker for actual location
    if (actualMarkerRef.current) {
      actualMarkerRef.current.setLatLng([actualLocation.lat, actualLocation.lng]);
    } else {
      const actualMarkerIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        shadowSize: [41, 41]
      });
      
      const marker = L.marker([actualLocation.lat, actualLocation.lng], {
        icon: actualMarkerIcon
      }).addTo(mapRef.current);
      
      actualMarkerRef.current = marker;
    }
    
    // Draw line between selected and actual location if both exist
    if (selectedLocation && actualLocation) {
      if (lineRef.current) {
        mapRef.current.removeLayer(lineRef.current);
      }
      
      const line = L.polyline([
        [selectedLocation.lat, selectedLocation.lng],
        [actualLocation.lat, actualLocation.lng]
      ], {
        color: 'red',
        dashArray: '5, 10'
      }).addTo(mapRef.current);
      
      lineRef.current = line;
      
      // Adjust map view to show both markers
      const bounds = L.latLngBounds(
        [selectedLocation.lat, selectedLocation.lng],
        [actualLocation.lat, actualLocation.lng]
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [actualLocation, selectedLocation, showActualLocationMarker]);

  // Function to clear the marker
  const clearMarker = () => {
    if (!mapRef.current) return;
    
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    
    onLocationSelect(0, 0);
    setShowInstructions(true);
  };

  return {
    mapContainerRef,
    mapLoaded,
    showInstructions,
    clearMarker,
    markerRef
  };
};
