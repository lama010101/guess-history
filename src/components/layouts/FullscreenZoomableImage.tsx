import React, { useRef, useState, useEffect, WheelEvent } from "react";
import { Maximize } from "lucide-react";

interface FullscreenZoomableImageProps {
  image: { url: string; placeholderUrl: string; title: string };
  onExit: () => void;
  currentRound?: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;
const WHEEL_ZOOM_FACTOR = 0.1; // Smaller factor for smoother wheel zooming
// Disable all zoom interactions in fullscreen mode
const ZOOM_ENABLED = false;

const FullscreenZoomableImage: React.FC<FullscreenZoomableImageProps> = ({ image, onExit, currentRound = 1 }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imgSrc, setImgSrc] = useState(image.placeholderUrl);
  const [showHint, setShowHint] = useState(currentRound === 1);
  const [isInertia, setIsInertia] = useState(false);
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

  const cancelInertia = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    velocityRef.current = { x: 0, y: 0 };
    setIsInertia(false);
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
  const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  
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

  // Pointer-based drag with velocity tracking
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore if a pinch gesture is in progress
    if (isPinchingRef.current) return;
    // Only start a new drag if no active pointer
    if (activePointerIdRef.current !== null) return;
    activePointerIdRef.current = (e as any).pointerId ?? null;
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

    // Update velocity (exponential moving average)
    const instVx = dx / dt;
    const instVy = dy / dt;
    velocityRef.current = {
      x: velocityRef.current.x * 0.8 + instVx * 0.2,
      y: velocityRef.current.y * 0.8 + instVy * 0.2,
    };

    lastMoveRef.current = { x: e.clientX, y: e.clientY, t: now };

    const clamped = clampOffset(newX, newY);
    setOffset(clamped);
  };

  const startInertia = () => {
    const eps = 0.002; // px/ms threshold
    const friction = 0.0045; // higher -> faster decay
    setIsInertia(true);
    let last = performance.now();

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
        setIsInertia(false);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
  };

  const endPointerInteraction = () => {
    setDragging(false);
    if (imgRef.current) imgRef.current.style.cursor = 'grab';
    // Start inertia if velocity is meaningful
    const speed = Math.hypot(velocityRef.current.x, velocityRef.current.y);
    if (speed > 0.01) startInertia();
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
          Drag to pan
        </div>
      )}
      {/* Image */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {/* Placeholder Image */}
        <img
          src={image.placeholderUrl}
          alt={`${image.title} placeholder`}
          className={`absolute inset-0 filter blur-lg transition-opacity duration-300`}
          style={{ height: '100%', width: 'auto', opacity: isLoading ? 1 : 0, display: 'block', maxWidth: 'none', objectFit: 'cover', objectPosition: 'center' }}
          aria-hidden="true"
        />
        {/* Full-Resolution Image */}
        <img
          ref={imgRef}
          src={imgSrc}
          alt={image.title}
          className={`cursor-grab transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{
            background: "black",
            height: '100%',
            width: 'auto',
            maxWidth: 'none',
            objectFit: 'cover',
            objectPosition: 'center',
            transform: `scale(${zoom}) translate(${offset.x / zoom}px,${offset.y / zoom}px)`,
            transition: (dragging || isInertia) ? "none" : "transform 0.2s cubic-bezier(.23,1.01,.32,1)",
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
      {/* Close Fullscreen button (bottom-center, orange 60% opaque background) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000]">
        <button
          onClick={onExit}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
          }}
          className="inline-flex items-center justify-center rounded-full bg-orange-500/60 text-white w-12 h-12 shadow-lg hover:bg-orange-500/70 active:bg-orange-500/70"
          style={{ animation: 'attentionPulse 10s ease-in-out infinite' }}
          aria-label="Exit fullscreen"
          title="Exit fullscreen"
        >
          <Maximize className="w-6 h-6" />
        </button>
        <style>{`
          @keyframes attentionPulse {
            /* idle most of the time */
            0%, 80%, 100% { transform: scale(1); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.30), 0 4px 6px -4px rgba(0,0,0,0.30); }
            /* stronger double pulse window */
            84% { transform: scale(1.14); box-shadow: 0 25px 35px -5px rgba(0,0,0,0.45), 0 12px 16px -4px rgba(0,0,0,0.45), 0 0 0 6px rgba(249,115,22,0.35); }
            88% { transform: scale(1);   box-shadow: 0 10px 15px -3px rgba(0,0,0,0.30), 0 4px 6px -4px rgba(0,0,0,0.30); }
            92% { transform: scale(1.14); box-shadow: 0 25px 35px -5px rgba(0,0,0,0.45), 0 12px 16px -4px rgba(0,0,0,0.45), 0 0 0 6px rgba(249,115,22,0.35); }
            96% { transform: scale(1);   box-shadow: 0 10px 15px -3px rgba(0,0,0,0.30), 0 4px 6px -4px rgba(0,0,0,0.30); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default FullscreenZoomableImage;
