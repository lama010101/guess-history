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
    // Visual avatar diameter in pixels (existing code used sizePx/4)
    const avatarPx = Math.max(8, Math.round(sizePx / 4));
    const haloPx = avatarPx * 2; // halo twice the avatar size

    const wrapperStyle = `position:relative; width:${sizePx}px; height:${sizePx}px; display:flex; align-items:center; justify-content:center;`;
    const haloStyle = `position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:${haloPx}px; height:${haloPx}px; border-radius:9999px; background:rgba(251,146,60,0.5);`;
    const baseImgStyle = `width:${avatarPx}px; height:${avatarPx}px; border-radius:9999px; box-shadow:0 2px 6px rgba(0,0,0,0.25);`;

    let inner = '';
    if (!isLoaded && !hasError) {
      // Placeholder – dark pulsating circle
      inner = `<div aria-busy="true" aria-live="polite" style="${baseImgStyle} background:#000; opacity:0.85;" class="dark:bg-gray-200 animate-pulse"></div>`;
    } else if (hasError || !imageUrl) {
      // Error fallback – simple pin emoji within circle
      inner = `<div style="${baseImgStyle}; background:#ea580c; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; border:2px solid #fff;">📍</div>`;
    } else {
      // Actual avatar image
      inner = `<img src="${imageUrl}" alt="Player avatar" style="${baseImgStyle}; object-fit:cover; border:2px solid #fff;" />`;
    }

    const html = `<div style="${wrapperStyle}"><div style="${haloStyle}"></div>${inner}</div>`;

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
