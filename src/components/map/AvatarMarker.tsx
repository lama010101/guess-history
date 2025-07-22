import React, { useEffect, useMemo, useState } from 'react';
import { Marker } from 'react-leaflet';
import L, { DivIcon } from 'leaflet';

export interface AvatarMarkerProps {
  /** Latitude */
  lat: number;
  /** Longitude */
  lng: number;
  /** URL of the avatar image */
  imageUrl?: string | null;
  /** Size in pixels (width & height) */
  sizePx?: number;
}

/**
 * AvatarMarker – displays a pulsating placeholder until the avatar image has loaded.
 * Provides a graceful fallback on error.
 */
const AvatarMarker: React.FC<AvatarMarkerProps> = React.memo(({ lat, lng, imageUrl, sizePx = 40 }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Preload the avatar
  useEffect(() => {
    if (!imageUrl) {
      setHasError(true);
      return;
    }

    const img = new Image();
    const handleLoad = () => setIsLoaded(true);
    const handleError = () => {
      console.error(`[AvatarMarker] Failed to load avatar: ${imageUrl}`);
      setHasError(true);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);
    img.src = imageUrl;

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      // Abort any in-flight image request
      img.src = '';
    };
  }, [imageUrl]);

  // Build Leaflet DivIcon when state changes
  const divIcon: DivIcon = useMemo(() => {
    const circleSize = sizePx / 4; // Tailwind class mapping helper (approx.)
    const commonClasses = `rounded-full`;

    let html = '';
    if (!isLoaded && !hasError) {
      // Placeholder – dark pulsating circle
      html = `<div aria-busy="true" aria-live="polite" class="${commonClasses} bg-black dark:bg-gray-200 animate-pulse"></div>`;
    } else if (hasError || !imageUrl) {
      // Error fallback – simple pin emoji within circle
      html = `<div class="${commonClasses} w-${circleSize} h-${circleSize} flex items-center justify-center bg-history-secondary text-white text-xs border-2 border-white shadow-md">📍</div>`;
    } else {
      // Actual avatar image
      html = `<img src="${imageUrl}" alt="Player avatar" class="${commonClasses} w-${circleSize} h-${circleSize} border-2 border-white shadow-md object-cover" />`;
    }

    return L.divIcon({
      html,
      className: '',
      iconSize: [sizePx, sizePx],
      iconAnchor: [sizePx / 2, sizePx / 2],
    });
  }, [isLoaded, hasError, imageUrl, sizePx]);

  return <Marker position={[lat, lng]} icon={divIcon} />;
});

AvatarMarker.displayName = 'AvatarMarker';

export default AvatarMarker;
