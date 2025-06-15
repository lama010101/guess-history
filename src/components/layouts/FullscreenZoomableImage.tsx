import React, { useRef, useState, useEffect, WheelEvent } from "react";

interface FullscreenZoomableImageProps {
  image: { url: string; placeholderUrl: string; title: string };
  onExit: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;
const WHEEL_ZOOM_FACTOR = 0.1; // Smaller factor for smoother wheel zooming

const FullscreenZoomableImage: React.FC<FullscreenZoomableImageProps> = ({ image, onExit }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imgSrc, setImgSrc] = useState(image.placeholderUrl);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDist = useRef<number | null>(null);

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

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom === 1) return;
    setDragging(true);
    setLastPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    // Change cursor to grabbing
    if (imgRef.current) {
      imgRef.current.style.cursor = 'grabbing';
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - lastPos.x, y: e.clientY - lastPos.y });
  };
  
  const handleMouseUp = () => {
    setDragging(false);
    // Change cursor back to grab
    if (imgRef.current) {
      imgRef.current.style.cursor = 'grab';
    }
  };
  
  // Mouse wheel zoom
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Calculate zoom direction based on wheel delta
    const delta = -Math.sign(e.deltaY) * WHEEL_ZOOM_FACTOR;
    const newZoom = +(zoom + delta).toFixed(2);
    
    // Apply zoom centered at mouse position
    zoomAtPoint(newZoom, e.clientX, e.clientY);
  };

  // Touch drag & pinch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoom > 1) {
      setDragging(true);
      setLastPos({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
    } else if (e.touches.length === 2) {
      setDragging(false);
      lastTouchDist.current = getTouchDist(e);
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent browser gestures
    
    if (e.touches.length === 1 && dragging) {
      // Single touch - pan
      setOffset({ x: e.touches[0].clientX - lastPos.x, y: e.touches[0].clientY - lastPos.y });
    } else if (e.touches.length === 2) {
      // Two touches - pinch zoom
      const dist = getTouchDist(e);
      
      if (lastTouchDist.current !== null) {
        const delta = dist - lastTouchDist.current;
        
        // Only zoom if the change is significant
        if (Math.abs(delta) > 2) {
          // Calculate center point between the two touches
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const centerX = (touch1.clientX + touch2.clientX) / 2;
          const centerY = (touch1.clientY + touch2.clientY) / 2;
          
          // Calculate zoom factor based on pinch distance change
          const zoomFactor = delta * 0.005; // Smaller factor for smoother zooming
          const newZoom = +(zoom + zoomFactor).toFixed(2);
          
          // Apply zoom centered at pinch center point
          zoomAtPoint(newZoom, centerX, centerY);
        }
      }
      
      lastTouchDist.current = dist;
    }
  };
  
  const handleTouchEnd = () => {
    setDragging(false);
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
    if (zoom === 1) {
      // Reset offset when at minimum zoom
      setOffset({ x: 0, y: 0 });
      return;
    }
    
    if (!imgRef.current || !containerRef.current) return;
    
    // Get image and container dimensions
    const img = imgRef.current.getBoundingClientRect();
    const container = containerRef.current.getBoundingClientRect();
    
    // Calculate boundaries based on zoom level
    const zoomedImgWidth = img.width * zoom;
    const zoomedImgHeight = img.height * zoom;
    
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
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsLoading(true);
    setImageError(false);
    
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
  }, [image.url]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center select-none overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onWheel={handleWheel}
      style={{ touchAction: "none" }}
    >
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-[10001]">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-history-primary rounded-full animate-spin"></div>
        </div>
      )}
      {/* Zoom Controls - styled like map controls, vertical, top left */}
      <div className="absolute top-6 left-6 z-[10001] flex flex-col rounded-lg bg-white/90 border border-gray-300 shadow-md overflow-hidden select-none">
        <button
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="w-10 h-10 flex items-center justify-center text-2xl font-bold border-b border-gray-200 hover:bg-gray-100 focus:outline-none disabled:opacity-40"
          aria-label="Zoom in"
          style={{ borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
        >
          +
        </button>
        <div className="w-10 h-8 flex items-center justify-center text-xs font-medium bg-white/90 border-b border-gray-200">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="w-10 h-10 flex items-center justify-center text-2xl font-bold hover:bg-gray-100 focus:outline-none disabled:opacity-40"
          aria-label="Zoom out"
          style={{ borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}
        >
          –
        </button>
      </div>
      
      {/* Instructions tooltip */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm pointer-events-none transition-opacity duration-300" 
           style={{ opacity: isLoading ? 0 : 0.8 }}>
        Use mouse wheel or pinch to zoom, drag to pan
      </div>
      {/* Image */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Placeholder Image */}
        <img
          src={image.placeholderUrl}
          alt={`${image.title} placeholder`}
          className={`absolute inset-0 w-full h-full object-contain filter blur-lg scale-105 transition-opacity duration-300`}
          style={{ opacity: isLoading ? 1 : 0 }}
          aria-hidden="true"
        />
        {/* Full-Resolution Image */}
        <img
          ref={imgRef}
          src={imgSrc}
          alt={image.title}
          className={`max-w-none max-h-none object-contain cursor-grab transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{
            background: "black",
            transform: `scale(${zoom}) translate(${offset.x / zoom}px,${offset.y / zoom}px)`,
            transition: dragging ? "none" : "transform 0.2s cubic-bezier(.23,1.01,.32,1)",
            touchAction: "none",
            userSelect: "none",
            pointerEvents: "auto"
          }}
          onMouseDown={handleMouseDown}
          draggable={false}
          onTouchStart={handleTouchStart}
          onError={() => {
            setImageError(true);
            setImgSrc('/assets/placeholder.jpg');
          }}
        />
      </div>
      {/* Exit Button */}
      <button
        onClick={onExit}
        className="fixed top-4 right-4 z-[10000] p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        aria-label="Exit fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
        </svg>
      </button>
    </div>
  );
};

export default FullscreenZoomableImage;
