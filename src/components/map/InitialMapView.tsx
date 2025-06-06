
import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface InitialMapViewProps {
  center?: [number, number];
  zoom?: number;
}

const InitialMapView: React.FC<InitialMapViewProps> = ({ 
  center = [20, 0], 
  zoom = 2 
}) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

export default InitialMapView;
