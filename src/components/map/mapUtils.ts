
import L from 'leaflet';
import { supabase } from "@/integrations/supabase/client";
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Create a custom icon for the default marker
export const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Set default icon for all markers
L.Marker.prototype.options.icon = DefaultIcon;

// Reverse geocoding function
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );
    const json = await res.json();
    return json.display_name || '';
  } catch (error) {
    console.error('Error fetching address:', error);
    return '';
  }
};

// Fetch map halo radius from settings
export const fetchHaloRadius = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', 'map_halo_radius_km_setting')
      .maybeSingle();
    
    if (!error && data && typeof data.current_round === 'number') {
      return data.current_round;
    }
  } catch (error) {
    console.error('Error loading map radius setting:', error);
  }
  
  // Default value of 100km
  return 100;
};
