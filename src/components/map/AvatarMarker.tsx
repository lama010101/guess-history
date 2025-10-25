import React, { useEffect, useMemo, useState } from 'react';
import { Marker } from 'react-leaflet';
import type { MarkerProps } from 'react-leaflet';
import L, { DivIcon } from 'leaflet';

export interface AvatarMarkerProps extends Omit<MarkerProps, 'position' | 'icon'> {
  /** Latitude */
  lat: number;
  /** Longitude */
  lng: number;
  /** URL of the avatar image */
  imageUrl?: string | null;
  /** Optional fallback label (e.g. initials) */
  fallbackLabel?: string | null;
  /** Size in pixels (width & height) */
  sizePx?: number;
  /** Halo color (defaults to mode primary/secondary color) */
  ringColor?: string;
  /** Border color around avatar */
  borderColor?: string;
  /** Width of the avatar border */
  borderWidth?: number;
}

/**
 * AvatarMarker – displays a pulsating placeholder until the avatar image has loaded.
 * Provides a graceful fallback on error while supporting popups and other Marker props.
 */
const AvatarMarker: React.FC<AvatarMarkerProps> = React.memo(({
  lat,
  lng,
  imageUrl,
  fallbackLabel,
  sizePx = 44,
  ringColor = 'hsla(var(--secondary) / 0.45)',
  borderColor = '#fff',
  borderWidth = 2,
  children,
  ...markerProps
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Preload the avatar whenever the URL changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);

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
      img.src = '';
    };
  }, [imageUrl]);

  // Build Leaflet DivIcon when state changes
  const divIcon: DivIcon = useMemo(() => {
    const avatarPx = Math.max(20, Math.round(sizePx * 0.6));
    const haloPx = Math.round(sizePx * 1.05);

    const wrapperStyle = [
      'position:relative',
      `width:${sizePx}px`,
      `height:${sizePx}px`,
      'display:flex',
      'align-items:center',
      'justify-content:center',
    ].join(';');

    const haloStyle = [
      'position:absolute',
      'left:50%',
      'top:50%',
      'transform:translate(-50%,-50%)',
      `width:${haloPx}px`,
      `height:${haloPx}px`,
      'border-radius:9999px',
      `background:${ringColor}`,
      'opacity:0.65',
      `box-shadow:0 0 22px ${ringColor}`,
      'z-index:0',
      'pointer-events:none',
    ].join(';');

    const baseImgStyle = [
      `width:${avatarPx}px`,
      `height:${avatarPx}px`,
      'border-radius:9999px',
      `border:${borderWidth}px solid ${borderColor}`,
      'box-shadow:0 4px 12px rgba(0,0,0,0.35)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'font-weight:600',
      'font-size:13px',
      'text-transform:uppercase',
      'background:#111827',
      'color:#fff',
      'overflow:hidden',
      'position:relative',
      'z-index:1',
    ].join(';');

    let inner = '';
    if (!isLoaded && !hasError && imageUrl) {
      inner = `<div aria-busy="true" aria-live="polite" style="${baseImgStyle}; opacity:0.85;" class="animate-pulse"></div>`;
    } else if (hasError || !imageUrl) {
      const label = (fallbackLabel || '?').trim().slice(0, 2).toUpperCase();
      inner = `<div style="${baseImgStyle}; background:linear-gradient(135deg,#fb7185,#f97316);">${label || '?'}</div>`;
    } else {
      const sanitizedUrl = imageUrl.replace(/"/g, '%22');
      inner = `<img src="${sanitizedUrl}" alt="Player avatar" style="${baseImgStyle}; object-fit:cover;" />`;
    }

    const html = `<div style="${wrapperStyle}"><div style="${haloStyle}"></div>${inner}</div>`;

    return L.divIcon({
      html,
      className: '',
      iconSize: [sizePx, sizePx],
      iconAnchor: [sizePx / 2, sizePx / 2],
      popupAnchor: [0, -sizePx / 2],
    });
  }, [borderColor, borderWidth, fallbackLabel, hasError, imageUrl, isLoaded, ringColor, sizePx]);

  return (
    <Marker
      position={[lat, lng]}
      icon={divIcon}
      {...markerProps}
    >
      {children}
    </Marker>
  );
});

AvatarMarker.displayName = 'AvatarMarker';

export default AvatarMarker;
