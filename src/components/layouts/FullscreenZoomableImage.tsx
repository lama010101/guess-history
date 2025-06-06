import React, { useRef, useState, useEffect } from "react";

interface FullscreenZoomableImageProps {
  image: { url: string; title: string };
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
    const [a, b] = e.touches;
    return Math.sqrt(Math.pow(a.clientX - b.clientX, 2) + Math.pow(a.clientY - b.clientY, 2));
  };

  // Reset pan/zoom on open/close
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
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
      <img
        ref={imgRef}
        src={image.url}
        alt={image.title}
        className="max-w-none max-h-none object-contain cursor-grab"
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
      />
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
