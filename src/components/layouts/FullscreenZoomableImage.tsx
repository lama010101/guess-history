import React, { useRef, useState, useEffect, WheelEvent, useCallback } from "react";
import { Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserSettings, UserSettings } from '@/utils/profile/profileService';
import TimerDisplay from '@/components/game/TimerDisplay';

interface FullscreenZoomableImageProps {
  image: { url: string; placeholderUrl: string; title: string };
  onExit: () => void;
  currentRound?: number;
  timerEnabled?: boolean;
  rawRemainingTime?: number;
  isTimerActive?: boolean;
  onTimeout?: () => void;
  setRemainingTime?: React.Dispatch<React.SetStateAction<number>>;
  roundTimerSec?: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;
const WHEEL_ZOOM_FACTOR = 0.1; // Smaller factor for smoother wheel zooming
// Master toggle for pinch/scroll zoom inside fullscreen view
const ZOOM_ENABLED = true;

// Track whether we've already auto-panned for a given image/round key during this page session
const __autoPanRegistry = new Set<string>();

const FullscreenZoomableImage: React.FC<FullscreenZoomableImageProps> = ({
  image,
  onExit,
  currentRound = 1,
  timerEnabled = false,
  rawRemainingTime = 0,
  isTimerActive = false,
  onTimeout,
  setRemainingTime,
  roundTimerSec = 0,
}) => {
  const { user } = useAuth();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imgSrc, setImgSrc] = useState(image.placeholderUrl);
  const [showHint, setShowHint] = useState(currentRound === 1);
  const [isInertia, setIsInertia] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const DOUBLE_TAP_MS = 300;
  const DOUBLE_TAP_SLOP_PX = 30;

  // Pointer + inertia tracking
  const activePointerIdRef = useRef<number | null>(null);
  const isPinchingRef = useRef<boolean>(false);
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 }); // px/ms
  const lastMoveRef = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });
  const rafRef = useRef<number | null>(null);
  // Gyroscope tracking
  const gyroRafRef = useRef<number | null>(null);
  const gyroBaselineRef = useRef<{ beta: number; gamma: number } | null>(null);

  // Auto-pan control
  const autoPanRafRef = useRef<number | null>(null);
  const autoPanCancelledRef = useRef<boolean>(false);
  const [isAutoPanning, setIsAutoPanning] = useState(false);

  const fallbackSetRemainingTime = useCallback((_: React.SetStateAction<number>) => {}, []);
  const effectiveSetRemainingTime = setRemainingTime ?? fallbackSetRemainingTime;
  const effectiveOnTimeout = onTimeout ?? (() => {});

  const cancelInertia = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    velocityRef.current = { x: 0, y: 0 };
    setIsInertia(false);
  };

  const cancelAutoPan = () => {
    autoPanCancelledRef.current = true;
    if (autoPanRafRef.current != null) {
      cancelAnimationFrame(autoPanRafRef.current);
      autoPanRafRef.current = null;
    }
    setIsAutoPanning(false);
  };

  const getMaxOffsets = () => {
    if (!imgRef.current || !containerRef.current) return { maxX: 0, maxY: 0 };
    const img = imgRef.current.getBoundingClientRect();
    const container = containerRef.current.getBoundingClientRect();
    const zoomedImgWidth = img.width;
    const zoomedImgHeight = img.height;
    const maxX = Math.max(0, (zoomedImgWidth - container.width) / 2);
    const maxY = Math.max(0, (zoomedImgHeight - container.height) / 2);
    return { maxX, maxY };
  };

  const clampOffset = (x: number, y: number) => {
    const { maxX, maxY } = getMaxOffsets();
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  // Keep a ref of the latest offset to avoid stale closures (used by inertia loop)
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);


  // Zoom controls
  const zoomAtCenter = (targetZoom: number) => {
    if (!containerRef.current) {
      setZoom(() => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom)));
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    zoomAtPoint(targetZoom, centerX, centerY);
  };

  const handleZoomStep = (delta: number) => {
    if (!ZOOM_ENABLED) return;
    const targetZoom = +(zoom + delta).toFixed(2);
    zoomAtCenter(targetZoom);
    if (showHint) setShowHint(false);
  };

  const zoomIn = () => handleZoomStep(ZOOM_STEP);
  const zoomOut = () => handleZoomStep(-ZOOM_STEP);
  
  // Calculate zoom centered on mouse position
  const zoomAtPoint = (newZoom: number, clientX: number, clientY: number) => {
    if (!imgRef.current || !containerRef.current) return;
    
    // Constrain zoom level
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    
    // Get container dimensions and position
    const container = containerRef.current.getBoundingClientRect();
    
    // Calculate relative position of mouse in image space
    const relX = (clientX - container.left) / container.width;
    const relY = (clientY - container.top) / container.height;
    
    // Calculate how the offset should change to keep the point under cursor
    const prevZoom = zoom;
    const scaleChange = newZoom / prevZoom;
    
    // Calculate new offset to maintain the point under cursor
    const newOffsetX = offset.x * scaleChange + (1 - scaleChange) * (container.width * relX);
    const newOffsetY = offset.y * scaleChange + (1 - scaleChange) * (container.height * relY);
    
    // Update state
    setZoom(newZoom);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const zoomAtMax = zoom >= MAX_ZOOM - 0.001;
  const zoomAtMin = zoom <= MIN_ZOOM + 0.001;

  // Pointer-based drag with velocity tracking
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore if a pinch gesture is in progress
    if (isPinchingRef.current) return;
    // Only start a new drag if no active pointer
    if (activePointerIdRef.current !== null) return;
    activePointerIdRef.current = (e as any).pointerId ?? null;
    cancelAutoPan();
    cancelInertia();
    setDragging(true);
    setLastPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    lastMoveRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    velocityRef.current = { x: 0, y: 0 };
    if (containerRef.current && (e as any).pointerId != null) {
      try { containerRef.current.setPointerCapture((e as any).pointerId); } catch {}
    }
    if (imgRef.current) imgRef.current.style.cursor = 'grabbing';
    if (showHint) setShowHint(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (isPinchingRef.current) return;
    if (activePointerIdRef.current !== null && (e as any).pointerId !== activePointerIdRef.current) return;

    const now = performance.now();
    const prev = lastMoveRef.current;
    const dt = Math.max(1, now - prev.t); // ms, avoid divide by zero
    const newX = e.clientX - lastPos.x;
    const newY = e.clientY - lastPos.y;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;

    // Update velocity with better smoothing for mobile
    const instVx = dx / dt;
    const instVy = dy / dt;
    const smoothing = 0.7; // Increased smoothing for better mobile experience
    velocityRef.current = {
      x: velocityRef.current.x * smoothing + instVx * (1 - smoothing),
      y: velocityRef.current.y * smoothing + instVy * (1 - smoothing),
    };

    lastMoveRef.current = { x: e.clientX, y: e.clientY, t: now };

    const clamped = clampOffset(newX, newY);
    setOffset(clamped);
  };

  const startInertia = () => {
    // Check user settings for inertia mode
    if (!userSettings || userSettings.inertia_mode === 'none' || userSettings.inertia_enabled === false) {
      return; // No inertia if disabled
    }

    const eps = 0.001; // Lower threshold for more responsive inertia
    // Scale friction by user-configured inertia_level (1..5). Higher level => lower friction (longer glide)
    const level = Math.max(1, Math.min(5, (userSettings.inertia_level ?? 3)));
    const frictionBase = 0.003;
    const friction = frictionBase * ((6 - level) / 3); // L1≈0.005, L3≈0.003, L5≈0.001
    setIsInertia(true);
    let last = performance.now();
    let hasRecentered = false;

    const step = (now: number) => {
      const dt = Math.min(32, Math.max(1, now - last)); // clamp dt for stability
      last = now;

      // Apply exponential decay to velocity
      const decay = Math.exp(-friction * dt);
      velocityRef.current.x *= decay;
      velocityRef.current.y *= decay;

      let nextX = offsetRef.current.x + velocityRef.current.x * dt;
      let nextY = offsetRef.current.y + velocityRef.current.y * dt;

      const { maxX, maxY } = getMaxOffsets();

      // Stop at bounds per axis
      if (nextX > maxX) { nextX = maxX; velocityRef.current.x = 0; }
      if (nextX < -maxX) { nextX = -maxX; velocityRef.current.x = 0; }
      if (nextY > maxY) { nextY = maxY; velocityRef.current.y = 0; }
      if (nextY < -maxY) { nextY = -maxY; velocityRef.current.y = 0; }

      setOffset({ x: nextX, y: nextY });
      offsetRef.current = { x: nextX, y: nextY };

      const speed = Math.hypot(velocityRef.current.x, velocityRef.current.y);
      const moving = speed > eps;
      const hasRoom = (Math.abs(nextX) < maxX - 0.5) || (Math.abs(velocityRef.current.x) < eps);
      const hasRoomY = (Math.abs(nextY) < maxY - 0.5) || (Math.abs(velocityRef.current.y) < eps);

      if (moving && (hasRoom || hasRoomY)) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        // Inertia finished, check if we should recenter
        if (userSettings.inertia_mode === 'swipes_recenter' && !hasRecentered) {
          hasRecentered = true;
          startRecenterAnimation();
        } else {
          setIsInertia(false);
          rafRef.current = null;
        }
      }
    };

    rafRef.current = requestAnimationFrame(step);
  };

  const startRecenterAnimation = () => {
    const startX = offsetRef.current.x;
    const startY = offsetRef.current.y;
    const targetX = 0;
    const targetY = 0;
    const duration = 800; // ms
    const startTime = performance.now();

    const recenterStep = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      const currentX = startX + (targetX - startX) * eased;
      const currentY = startY + (targetY - startY) * eased;

      setOffset({ x: currentX, y: currentY });
      offsetRef.current = { x: currentX, y: currentY };

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(recenterStep);
      } else {
        setIsInertia(false);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(recenterStep);
  };

  const endPointerInteraction = () => {
    setDragging(false);
    if (imgRef.current) imgRef.current.style.cursor = 'grab';
    // Start inertia if velocity is meaningful and inertia is enabled
    const speed = Math.hypot(velocityRef.current.x, velocityRef.current.y);
    if (speed > 0.005 && userSettings && userSettings.inertia_mode !== 'none' && userSettings.inertia_enabled !== false) { // Lower threshold for more responsive inertia
      startInertia();
    }
    activePointerIdRef.current = null;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== null && (e as any).pointerId !== activePointerIdRef.current) return;
    try {
      if (containerRef.current && (e as any).pointerId != null) {
        containerRef.current.releasePointerCapture((e as any).pointerId);
      }
    } catch {}
    if (isPinchingRef.current) return; // pinch handled by touch handlers
    endPointerInteraction();
  };

  const handlePointerCancel = () => {
    cancelInertia();
    setDragging(false);
    activePointerIdRef.current = null;
    if (imgRef.current) imgRef.current.style.cursor = 'grab';
  };
  
  // Double-click to zoom in (desktop)
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!ZOOM_ENABLED) return;
    const newZoom = +(Math.min(MAX_ZOOM, zoom + 1)).toFixed(2);
    zoomAtPoint(newZoom, e.clientX, e.clientY);
  };
  
  // Mouse wheel zoom
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    cancelAutoPan();
    if (!ZOOM_ENABLED) return;
    // Calculate zoom direction based on wheel delta
    const delta = -Math.sign(e.deltaY) * WHEEL_ZOOM_FACTOR;
    const newZoom = +(zoom + delta).toFixed(2);
    // Apply zoom centered at mouse position
    zoomAtPoint(newZoom, e.clientX, e.clientY);
    if (showHint) setShowHint(false);
  };

  // Touch: only handle double-tap and pinch zoom. Single-finger pan is handled by Pointer Events above.
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single-finger pan handled via Pointer Events
      cancelAutoPan();
      if (showHint) setShowHint(false);
    } else if (e.touches.length === 2) {
      // Disable pinch-to-zoom when zoom is disabled
      if (!ZOOM_ENABLED) {
        isPinchingRef.current = false;
        lastTouchDist.current = null;
        return;
      }
      cancelInertia();
      isPinchingRef.current = true;
      setDragging(false);
      lastTouchDist.current = getTouchDist(e);
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent browser gestures
    if (!ZOOM_ENABLED) return; // Disable pinch zoom
    if (e.touches.length === 2) {
      const dist = getTouchDist(e);
      if (lastTouchDist.current !== null) {
        const delta = dist - lastTouchDist.current;
        if (Math.abs(delta) > 2) {
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const centerX = (touch1.clientX + touch2.clientX) / 2;
          const centerY = (touch1.clientY + touch2.clientY) / 2;
          const zoomFactor = delta * 0.005;
          const newZoom = +(zoom + zoomFactor).toFixed(2);
          zoomAtPoint(newZoom, centerX, centerY);
        }
      }
      lastTouchDist.current = dist;
    }
  };
  
  const handleTouchEnd = () => {
    // End pinch mode if no longer two touches
    isPinchingRef.current = false;
    lastTouchDist.current = null;
  };
  
  const getTouchDist = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      const a = e.touches[0];
      const b = e.touches[1];
      return Math.sqrt(Math.pow(a.clientX - b.clientX, 2) + Math.pow(a.clientY - b.clientY, 2));
    }
    return 0;
  };

  // Constrain panning to prevent image from being moved too far outside view
  useEffect(() => {
    if (!imgRef.current || !containerRef.current) return;
    
    // Get image and container dimensions
    const img = imgRef.current.getBoundingClientRect();
    const container = containerRef.current.getBoundingClientRect();
    
    // Use transformed size from getBoundingClientRect (already includes CSS scale)
    const zoomedImgWidth = img.width;
    const zoomedImgHeight = img.height;
    
    // Calculate maximum allowed offset to keep image partially visible
    const maxOffsetX = Math.max(0, (zoomedImgWidth - container.width) / 2);
    const maxOffsetY = Math.max(0, (zoomedImgHeight - container.height) / 2);
    
    // Constrain offset within boundaries
    const constrainedX = Math.min(maxOffsetX, Math.max(-maxOffsetX, offset.x));
    const constrainedY = Math.min(maxOffsetY, Math.max(-maxOffsetY, offset.y));
    
    // Update offset if it changed
    if (constrainedX !== offset.x || constrainedY !== offset.y) {
      setOffset({ x: constrainedX, y: constrainedY });
    }
  }, [zoom, offset]);
  
  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (user?.id) {
        const settings = await fetchUserSettings(user.id);
        setUserSettings(settings);
      } else {
        // Default settings for non-authenticated users
        setUserSettings({
          theme: 'dark',
          sound_enabled: true,
          notification_enabled: true,
          distance_unit: 'km',
          language: 'en',
          inertia_enabled: true,
          inertia_mode: 'swipes',
          inertia_level: 3,
          vibrate_enabled: false,
          gyroscope_enabled: false,
        });
      }
    };
    loadSettings();
  }, [user]);

  // Reset pan/zoom on open/close and handle image preloading
  useEffect(() => {
    // Default zoom at 100%
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsLoading(true);
    setImageError(false);
    setShowHint(currentRound === 1);
    
    // Set initial state with placeholder
    setImgSrc(image.placeholderUrl);
    setIsLoading(true);
    setImageError(false);

    // Load full-resolution image
    const fullImage = new Image();
    fullImage.src = image.url;

    fullImage.onload = () => {
      setImgSrc(image.url);
      setIsLoading(false);
    };

    fullImage.onerror = () => {
      console.error(`Failed to load full image: ${image.url}`);
      setImageError(true);
      setIsLoading(false);
      setImgSrc('/assets/placeholder.jpg'); // Fallback to a generic placeholder
    };
    
    return () => {
      // Clean up event listeners
      fullImage.onload = null;
      fullImage.onerror = null;
    };
  }, [image.url, currentRound]);

  // Auto-pan once per image/round on first fullscreen open after image loads
  useEffect(() => {
    if (isLoading) return;
    if (!imgRef.current || !containerRef.current) return;
    if (!userSettings) return; // Wait for settings to load

    const key = `${currentRound ?? 0}::${image.url}`;
    if (__autoPanRegistry.has(key)) return;

    // Only auto-pan if inertia mode allows it (not 'none')
    if (userSettings.inertia_mode === 'none') return;

    // Mark as done so subsequent opens during the same round won't auto-pan
    __autoPanRegistry.add(key);
    autoPanCancelledRef.current = false;

    // Compute bounds
    const { maxX } = getMaxOffsets();
    if (maxX <= 1) return; // nothing to pan horizontally

    // Initialize at left edge
    const startLeft = -maxX;
    setOffset(prev => ({ x: startLeft, y: prev.y }));
    offsetRef.current = { x: startLeft, y: offsetRef.current.y };

    setIsAutoPanning(true);

    const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const sweepDuration = 2500; // ms: left -> right ~2.5s
    const backDuration = 1250;  // ms: right -> center ~1.25s

    let phase: 'sweep' | 'back' = 'sweep';
    let t0 = performance.now();

    const step = (now: number) => {
      if (autoPanCancelledRef.current) { setIsAutoPanning(false); return; }
      const dt = now - t0;

      if (phase === 'sweep') {
        const t = Math.min(1, dt / sweepDuration);
        const x = startLeft + (2 * maxX) * easeInOut(t);
        const clamped = clampOffset(x, offsetRef.current.y);
        setOffset(clamped);
        offsetRef.current = clamped;

        if (t < 1) {
          autoPanRafRef.current = requestAnimationFrame(step);
        } else {
          // Sweep completed. If mode is 'swipes', stop at edge; if 'swipes_recenter', go back to center.
          if (userSettings.inertia_mode === 'swipes') {
            setIsAutoPanning(false);
            autoPanRafRef.current = null;
          } else {
            // Begin back-to-center
            phase = 'back';
            t0 = performance.now();
            autoPanRafRef.current = requestAnimationFrame(step);
          }
        }
      } else {
        const t = Math.min(1, dt / backDuration);
        const x = maxX + (0 - maxX) * easeInOut(t);
        const clamped = clampOffset(x, offsetRef.current.y);
        setOffset(clamped);
        offsetRef.current = clamped;

        if (t < 1) {
          autoPanRafRef.current = requestAnimationFrame(step);
        } else {
          // Done
          setIsAutoPanning(false);
          autoPanRafRef.current = null;
        }
      }
    };

    // Start after next frame to ensure layout is stable
    autoPanRafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAutoPan();
    };
  }, [isLoading, image.url, currentRound, userSettings]);

  // Gyroscope-based panning when enabled
  useEffect(() => {
    if (!userSettings?.gyroscope_enabled) {
      // cleanup if previously attached
      if (gyroRafRef.current != null) { cancelAnimationFrame(gyroRafRef.current); gyroRafRef.current = null; }
      gyroBaselineRef.current = null;
      return;
    }
    if (typeof window === 'undefined') return;

    const sensitivityPxPerDegX = 3.0; // horizontal sensitivity
    const sensitivityPxPerDegY = 3.0; // vertical sensitivity
    const smoothing = 0.15; // lerp factor towards target position

    const onOrient = (e: DeviceOrientationEvent) => {
      // Ignore while user is actively interacting or inertia/autopan are active
      if (dragging || isInertia || isAutoPanning) return;
      const beta = e.beta;   // front-back tilt [-180,180]
      const gamma = e.gamma; // left-right tilt [-90,90]
      if (beta == null || gamma == null) return;
      if (!imgRef.current || !containerRef.current) return;

      // establish baseline to treat current device orientation as center
      if (gyroBaselineRef.current == null) {
        gyroBaselineRef.current = { beta, gamma };
        return;
      }

      const base = gyroBaselineRef.current;
      const dBeta = beta - base.beta;   // forward/backward => vertical pan
      const dGamma = gamma - base.gamma; // left/right => horizontal pan

      // Map degrees to pixels, invert axes for natural feel
      const targetX = -(dGamma * sensitivityPxPerDegX);
      const targetY = -(dBeta * sensitivityPxPerDegY);

      // Clamp within bounds and smooth approach with rAF
      const step = () => {
        const current = offsetRef.current;
        const desired = clampOffset(targetX, targetY);
        const nextX = current.x + (desired.x - current.x) * smoothing;
        const nextY = current.y + (desired.y - current.y) * smoothing;
        const clamped = clampOffset(nextX, nextY);
        setOffset(clamped);
        offsetRef.current = clamped;
        gyroRafRef.current = requestAnimationFrame(step);
      };

      if (gyroRafRef.current == null) {
        gyroRafRef.current = requestAnimationFrame(step);
      }
    };

    window.addEventListener('deviceorientation', onOrient);
    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      if (gyroRafRef.current != null) { cancelAnimationFrame(gyroRafRef.current); gyroRafRef.current = null; }
      gyroBaselineRef.current = null;
    };
  }, [userSettings?.gyroscope_enabled, dragging, isInertia, isAutoPanning]);

  // Auto-hide instructions after 3 seconds
  useEffect(() => {
    if (!showHint) return;
    const t = setTimeout(() => setShowHint(false), 3000);
    return () => clearTimeout(t);
  }, [showHint, image.url]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelInertia();
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center select-none overflow-hidden touch-none w-screen"
      style={{ height: '100dvh', minHeight: '100vh' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      data-allow-zoom
    >
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-[10001]">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-history-primary rounded-full animate-spin"></div>
        </div>
      )}
      {/* Zoom percentage badge hidden (zoom disabled) */}
      {/* <div className="absolute bottom-6 left-6 z-[10001] flex flex-col rounded-lg border border-gray-300 shadow-md overflow-hidden select-none">
        <div className="min-w-[2.5rem] h-8 px-2 flex items-center justify-center text-xs font-semibold bg-white/80 text-black">
          {Math.round(zoom * 100)}%
        </div>
      </div> */}
      
      {/* Instructions tooltip */}
      {(!isLoading && showHint) && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm pointer-events-none transition-opacity duration-300">
          {userSettings?.inertia_mode === 'none' ? 'Drag to pan' : 
           userSettings?.inertia_mode === 'swipes_recenter' ? 'Drag to pan • Swipe for momentum • Auto-centers' :
           'Drag to pan • Swipe for momentum'}
        </div>
      )}
      {/* Image */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* Placeholder Image */}
        <img
          src={image.placeholderUrl}
          alt="Round image placeholder"
          className={`absolute inset-0 filter blur-lg transition-opacity duration-300`}
          style={{ height: '100%', width: 'auto', opacity: isLoading ? 1 : 0, display: 'block', maxWidth: 'none', objectFit: 'cover', objectPosition: 'center' }}
          aria-hidden="true"
        />
        {/* Full-Resolution Image */}
        <img
          ref={imgRef}
          src={imgSrc}
          alt="Round image"
          className={`cursor-grab transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{
            background: "black",
            height: '100%',
            width: 'auto',
            maxWidth: 'none',
            objectFit: 'cover',
            objectPosition: 'center',
            transform: `scale(${zoom}) translate(${offset.x / zoom}px,${offset.y / zoom}px)`,
            transition: (dragging || isInertia || isAutoPanning) ? "none" : "transform 0.2s cubic-bezier(.23,1.01,.32,1)",
            touchAction: "none",
            userSelect: "none",
            pointerEvents: "auto",
            display: 'block',
            flex: 'none'
          }}
          draggable={false}
          onTouchStart={handleTouchStart}
          onError={() => {
            setImageError(true);
            setImgSrc('/assets/placeholder.jpg');
          }}
        />
      </div>
      {/* Timer overlay */}
      {timerEnabled && roundTimerSec > 0 && (
        <div className="fixed top-6 left-6 z-[10002] pointer-events-auto">
          <TimerDisplay
            remainingTime={Math.max(0, rawRemainingTime ?? 0)}
            setRemainingTime={effectiveSetRemainingTime}
            isActive={isTimerActive}
            onTimeout={effectiveOnTimeout}
            roundTimerSec={roundTimerSec}
            externalTimer={true}
          />
        </div>
      )}

      {/* Zoom controls */}
      <div className="fixed top-6 right-6 z-[10002] flex flex-col items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={zoomAtMax}
          className={`inline-flex items-center justify-center rounded-full w-12 h-12 shadow-lg transition ${zoomAtMax ? 'bg-white/30 text-gray-400 cursor-not-allowed' : 'bg-black/70 text-white hover:bg-black/80 active:scale-[0.97]'}`}
          aria-label="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <div className="min-w-[3rem] rounded-full bg-black/70 text-white text-xs font-semibold px-3 py-1 text-center shadow-lg select-none">
          {Math.round(zoom * 100)}%
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={zoomAtMin}
          className={`inline-flex items-center justify-center rounded-full w-12 h-12 shadow-lg transition ${zoomAtMin ? 'bg-white/30 text-gray-400 cursor-not-allowed' : 'bg-black/70 text-white hover:bg-black/80 active:scale-[0.97]'}`}
          aria-label="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>

      {/* Close Fullscreen button (bottom-center, themed by --secondary to follow mode highlight) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000]">
        <button
          onClick={onExit}
          onPointerDown={(e) => { e.stopPropagation(); }}
          onMouseDown={(e) => { e.stopPropagation(); }}
          onTouchStart={(e) => { e.stopPropagation(); }}
          onTouchEnd={(e) => { e.stopPropagation(); }}
          className="inline-flex items-center justify-center rounded-full bg-secondary/70 hover:bg-secondary/80 text-secondary-foreground w-[60px] h-[60px] shadow-lg active:brightness-[.95] attention-pulse"
          aria-label="Exit fullscreen"
          title="Exit fullscreen"
        >
          <Maximize className="w-[30px] h-[30px]" />
        </button>
      </div>
    </div>
  );
};

export default FullscreenZoomableImage;
