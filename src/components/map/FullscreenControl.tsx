
import React, { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Add global type for TypeScript
declare global {
  interface Document {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  }
  
  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  }
}

const FullscreenControl = () => {
  const map = useMap();
  const mapContainerRef = useRef<HTMLElement | null>(null);
  
  const toggleFullscreen = useCallback(async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    
    const doc = document;
    const container = mapContainerRef.current || map.getContainer();
    
    if (!container) return;
    
    try {
      // Get all elements in the body that are not the map or fullscreen control
      const allElements = Array.from(document.body.children).filter(el => 
        !el.classList.contains('leaflet-container') && 
        !el.classList.contains('leaflet-control-fullscreen')
      );
      
      if (!doc.fullscreenElement && 
          !doc.webkitFullscreenElement && 
          !(doc as any).mozFullScreenElement && 
          !(doc as any).msFullscreenElement) {
        // Enter fullscreen
        
        // Hide all elements except map and fullscreen control
        allElements.forEach(el => {
          if (el instanceof HTMLElement) {
            // Save original styles
            el.dataset.originalDisplay = el.style.display;
            el.dataset.originalVisibility = el.style.visibility;
            el.dataset.originalOpacity = el.style.opacity;
            el.dataset.originalPointerEvents = el.style.pointerEvents;
            el.dataset.originalPosition = el.style.position;
            el.dataset.originalZIndex = el.style.zIndex;
            
            // Hide the element
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            el.style.position = 'absolute';
            el.style.zIndex = '-1000';
            el.style.width = '1px';
            el.style.height = '1px';
            el.style.overflow = 'hidden';
            el.style.clip = 'rect(0, 0, 0, 0)';
            el.style.whiteSpace = 'nowrap';
            el.style.border = '0';
          }
        });
        
        // Add fullscreen classes
        container.classList.add('leaflet-fullscreen-on');
        document.body.classList.add('map-fullscreen-active');
        
        // Now enter fullscreen
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        }
        
        // Add classes for CSS selectors
        container.classList.add('leaflet-fullscreen-on');
        document.body.classList.add('map-fullscreen-active');
      } else {
        // Find all elements we modified and restore their original styles
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          if (el instanceof HTMLElement && el.dataset.originalDisplay !== undefined) {
            // Restore original styles
            el.style.display = el.dataset.originalDisplay || '';
            el.style.visibility = el.dataset.originalVisibility || '';
            el.style.opacity = el.dataset.originalOpacity || '';
            el.style.pointerEvents = el.dataset.originalPointerEvents || '';
            el.style.position = el.dataset.originalPosition || '';
            el.style.zIndex = el.dataset.originalZIndex || '';
            
            // Remove the data attributes
            delete el.dataset.originalDisplay;
            delete el.dataset.originalVisibility;
            delete el.dataset.originalOpacity;
            delete el.dataset.originalPointerEvents;
            delete el.dataset.originalPosition;
            delete el.dataset.originalZIndex;
            
            // Remove inline styles if they were empty
            if (!el.style.cssText.trim()) {
              el.removeAttribute('style');
            }
          }
        });
        
        // Remove fullscreen classes
        container.classList.remove('leaflet-fullscreen-on');
        document.body.classList.remove('map-fullscreen-active');
        
        // Now exit fullscreen
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if ((doc as any).mozCancelFullScreen) {
          await (doc as any).mozCancelFullScreen();
        } else if ((doc as any).msExitFullscreen) {
          await (doc as any).msExitFullscreen();
        }
      }
      
      // Force update map size after a short delay to ensure proper rendering
      setTimeout(() => map.invalidateSize(), 100);
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  }, [map]);
  
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const container = map.getContainer();
    container.style.position = 'relative'; // Ensure proper positioning context
    mapContainerRef.current = container;
    
    // Create our own fullscreen control
    const FullscreenControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-control-fullscreen leaflet-bar leaflet-control');
        const button = L.DomUtil.create('a', 'leaflet-control-fullscreen-button', container);
        button.href = '#';
        button.title = 'View Fullscreen';
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/></svg>';
        
        // Ensure the button stays on top
        container.style.zIndex = '10000';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        
        L.DomEvent.on(button, 'click', toggleFullscreen);
        
        return container;
      }
    });
    
    // Add the control to the map
    const fullscreenControl = new FullscreenControl();
    map.addControl(fullscreenControl);
    
    // Ensure the fullscreen control is always on top
    const fullscreenButton = document.querySelector('.leaflet-control-fullscreen');
    if (fullscreenButton) {
      (fullscreenButton as HTMLElement).style.zIndex = '10000';
      (fullscreenButton as HTMLElement).style.position = 'fixed';
      (fullscreenButton as HTMLElement).style.top = '10px';
      (fullscreenButton as HTMLElement).style.right = '10px';
    }
    
    // Handle fullscreen change events
    const handleFullscreenChange = () => {
      const fullscreenButton = document.querySelector('.leaflet-control-fullscreen-button');
      const isFullscreen = document.fullscreenElement !== null || 
                         (document as any).webkitFullscreenElement !== null ||
                         (document as any).mozFullScreenElement !== null ||
                         (document as any).msFullscreenElement !== null;
      
      if (isFullscreen) {
        // Entering fullscreen
        if (fullscreenButton) {
          (fullscreenButton as HTMLElement).title = 'Exit Fullscreen';
        }
        if (mapContainerRef.current) {
          mapContainerRef.current.classList.add('leaflet-fullscreen-on');
          document.body.classList.add('map-fullscreen-active');
        }
      } else {
        // Exiting fullscreen - restore all elements
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          if (el instanceof HTMLElement && el.dataset.originalDisplay !== undefined) {
            // Restore original styles
            el.style.display = el.dataset.originalDisplay || '';
            el.style.visibility = el.dataset.originalVisibility || '';
            el.style.opacity = el.dataset.originalOpacity || '';
            el.style.pointerEvents = el.dataset.originalPointerEvents || '';
            el.style.position = el.dataset.originalPosition || '';
            el.style.zIndex = el.dataset.originalZIndex || '';
            
            // Remove the data attributes
            delete el.dataset.originalDisplay;
            delete el.dataset.originalVisibility;
            delete el.dataset.originalOpacity;
            delete el.dataset.originalPointerEvents;
            delete el.dataset.originalPosition;
            delete el.dataset.originalZIndex;
            
            // Remove inline styles if they were empty
            if (!el.style.cssText.trim()) {
              el.removeAttribute('style');
            }
          }
        });
        
        if (fullscreenButton) {
          (fullscreenButton as HTMLElement).title = 'View Fullscreen';
          const container = fullscreenButton.parentElement;
          if (container) {
            L.DomUtil.removeClass(container, 'leaflet-fullscreen-on');
          }
        }
        
        if (mapContainerRef.current) {
          mapContainerRef.current.classList.remove('leaflet-fullscreen-on');
          document.body.classList.remove('map-fullscreen-active');
        }
      }
      
      // Force update map size after a short delay to ensure proper rendering
      setTimeout(() => map.invalidateSize(), 100);
    };
    
    // Add event listeners for all fullscreen change events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [map, toggleFullscreen]);
  
  return null;
};

export default FullscreenControl;
