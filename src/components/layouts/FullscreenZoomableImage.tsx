import React, { useRef, useState, useEffect } from "react";

interface FullscreenZoomableImageProps {
  image: { url: string; placeholderUrl: string; title: string };
  onExit: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;

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

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom === 1) return;
    setDragging(true);
    setLastPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - lastPos.x, y: e.clientY - lastPos.y });
  };
  const handleMouseUp = () => setDragging(false);

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
    if (e.touches.length === 1 && dragging) {
      setOffset({ x: e.touches[0].clientX - lastPos.x, y: e.touches[0].clientY - lastPos.y });
    } else if (e.touches.length === 2) {
      const dist = getTouchDist(e);
      if (lastTouchDist.current !== null) {
        const delta = dist - lastTouchDist.current;
        if (Math.abs(delta) > 5) {
          setZoom(z => {
            let newZoom = z + (delta > 0 ? ZOOM_STEP : -ZOOM_STEP);
            newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
            return +newZoom.toFixed(2);
          });
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
    // Fix for TypeScript error: TouchList must have Symbol.iterator
    if (e.touches.length >= 2) {
      const a = e.touches[0];
      const b = e.touches[1];
      return Math.sqrt(Math.pow(a.clientX - b.clientX, 2) + Math.pow(a.clientY - b.clientY, 2));
    }
    return 0;
  };

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
