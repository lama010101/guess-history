import React, { useEffect, useRef, useState } from 'react';

export type ImmersiveCylViewerProps = {
  imageUrl: string;
  lockFov?: number;          // default 70
  curvatureDeg?: number;     // default 150 (total yaw span)
  enableGyro?: boolean;      // default true on mobile
  caption?: string;
  onClose?: () => void;
};

const ImmersiveCylViewer: React.FC<ImmersiveCylViewerProps> = ({
  imageUrl,
  lockFov = 70,
  curvatureDeg = 150,
  enableGyro = true,
  caption,
  onClose,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Three.js refs and state
  const threeRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const meshRef = useRef<any>(null);
  const textureRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);

  // Motion/interaction state
  const yawRef = useRef<number>(0);
  const pitchRef = useRef<number>(0);
  const vxRef = useRef<number>(0);
  const vyRef = useRef<number>(0);
  const draggingRef = useRef<boolean>(false);
  const lastXRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);

  const yawMax = (curvatureDeg * Math.PI) / 180 / 2;
  const pitchMax = (30 * Math.PI) / 180;
  const decay = 0.95; // inertia decay

  const [gyroEligible, setGyroEligible] = useState<boolean>(false);
  const [gyroEnabled, setGyroEnabled] = useState<boolean>(false);

  // Accessibility: focus trap
  const focusSentinelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const init = async () => {
      const THREE = await import('three');
      threeRef.current = THREE;

      const container = document.getElementById('gh-immersive-root');
      if (!container) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: undefined });
      rendererRef.current = renderer;
      let w = container.clientWidth;
      let h = container.clientHeight;
      if (!w || !h) {
        const rect = container.getBoundingClientRect();
        w = rect.width || window.innerWidth;
        h = rect.height || window.innerHeight;
      }
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      canvasRef.current = renderer.domElement;

      const camera = new THREE.PerspectiveCamera(lockFov ?? 70, w / h, 0.1, 1000);
      cameraRef.current = camera;
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const loader = new THREE.TextureLoader();
      // Allow cross-origin textures (e.g., Supabase/Firebase/CDN)
      if (loader.setCrossOrigin) loader.setCrossOrigin('anonymous');
      const texture = loader.load(
        imageUrl,
        () => {},
        undefined,
        (err) => {
          // eslint-disable-next-line no-console
          console.error('[ImmersiveCylViewer] texture load error', err);
        }
      );
      // NPOT-safe settings for WebGL1: disable mipmaps and use linear filtering
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      if ('SRGBColorSpace' in THREE) {
        texture.colorSpace = (THREE as any).SRGBColorSpace;
      }
      texture.needsUpdate = true;
      textureRef.current = texture;

      const radius = 1;
      const height = 2;
      const geo = new THREE.CylinderGeometry(radius, radius, height, 128, 1, true);
      const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
      const mesh = new THREE.Mesh(geo, mat);
      meshRef.current = { geo, mat, mesh };
      scene.add(mesh);

      // Prefer sRGB output if available
      if (renderer.outputColorSpace !== undefined && 'SRGBColorSpace' in THREE) {
        renderer.outputColorSpace = (THREE as any).SRGBColorSpace;
      }

      const render = () => {
        const yaw = yawRef.current + vxRef.current;
        const pitch = pitchRef.current + vyRef.current;
        vxRef.current *= decay;
        vyRef.current *= decay;
        yawRef.current = Math.max(-yawMax, Math.min(yawMax, yaw));
        pitchRef.current = Math.max(-pitchMax, Math.min(pitchMax, pitch));
        camera.rotation.set(pitchRef.current, yawRef.current, 0);
        renderer.render(scene, camera);
        rafRef.current = requestAnimationFrame(render);
      };
      render();

      const onResize = () => {
        if (!rendererRef.current || !cameraRef.current) return;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        rendererRef.current.setSize(cw, ch);
        cameraRef.current.aspect = cw / ch;
        cameraRef.current.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      // Pointer input
      const sens = 0.0025;
      const onPointerDown = (e: PointerEvent) => {
        draggingRef.current = true;
        lastXRef.current = e.clientX;
        lastYRef.current = e.clientY;
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!draggingRef.current) return;
        const dx = e.clientX - lastXRef.current;
        const dy = e.clientY - lastYRef.current;
        yawRef.current -= dx * sens;
        pitchRef.current -= dy * sens;
        vxRef.current = -dx * sens;
        vyRef.current = -dy * sens;
        lastXRef.current = e.clientX;
        lastYRef.current = e.clientY;
      };
      const onPointerUp = () => {
        draggingRef.current = false;
      };

      canvasRef.current?.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp);

      // Prevent zoom/pinch inside modal
      const wheelPrevent = (e: Event) => e.preventDefault();
      const gesturePrevent = (e: Event) => e.preventDefault();
      container.addEventListener('wheel', wheelPrevent, { passive: false });
      container.addEventListener('gesturestart', gesturePrevent as any, { passive: false } as any);
      container.addEventListener('gesturechange', gesturePrevent as any, { passive: false } as any);
      container.addEventListener('gestureend', gesturePrevent as any, { passive: false } as any);

      // Gyro eligibility
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if (enableGyro && isMobile) {
        setGyroEligible(true);
      }

      // Keyboard controls & Esc
      const onKeyDown = (e: KeyboardEvent) => {
        const base = 10; // px equiv units
        const coarse = e.shiftKey ? 4 : 1;
        const step = (base * coarse) * 0.0025; // align with sens
        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            onClose?.();
            break;
          case 'ArrowLeft':
            yawRef.current -= step;
            vxRef.current = -step;
            break;
          case 'ArrowRight':
            yawRef.current += step;
            vxRef.current = step;
            break;
          case 'ArrowUp':
            pitchRef.current -= step;
            vyRef.current = -step;
            break;
          case 'ArrowDown':
            pitchRef.current += step;
            vyRef.current = step;
            break;
          case 'r':
          case 'R':
            yawRef.current = 0;
            pitchRef.current = 0;
            vxRef.current = 0;
            vyRef.current = 0;
            break;
          default:
            break;
        }
      };
      window.addEventListener('keydown', onKeyDown);

      // Cleanup
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointermove', onPointerMove as any);
        window.removeEventListener('pointerup', onPointerUp as any);
        window.removeEventListener('keydown', onKeyDown);
        container.removeEventListener('wheel', wheelPrevent as any);
        container.removeEventListener('gesturestart', gesturePrevent as any);
        container.removeEventListener('gesturechange', gesturePrevent as any);
        container.removeEventListener('gestureend', gesturePrevent as any);

        if (canvasRef.current) {
          canvasRef.current.removeEventListener('pointerdown', onPointerDown as any);
        }

        if (meshRef.current) {
          sceneRef.current?.remove(meshRef.current.mesh);
          meshRef.current.geo.dispose();
          meshRef.current.mat.dispose();
        }
        if (textureRef.current) textureRef.current.dispose();
        rendererRef.current?.dispose?.();
      };
    };

    const cleanupPromise = init();
    return () => {
      // Ensure cleanup awaits if init is still resolving
      void cleanupPromise;
    };
  }, [imageUrl, lockFov, curvatureDeg, enableGyro]);

  // Gyroscope handling
  useEffect(() => {
    if (!gyroEligible) return;
    let removeListener: (() => void) | null = null;

    const startGyro = () => {
      const maxTilt = 15; // deg
      const handler = (e: DeviceOrientationEvent) => {
        const gamma = (e.gamma ?? 0);
        const beta = (e.beta ?? 0);
        const g = Math.max(-maxTilt, Math.min(maxTilt, gamma));
        const b = Math.max(-maxTilt, Math.min(maxTilt, beta));
        const targetYaw = (g / maxTilt) * ((curvatureDeg * Math.PI) / 180 / 2);
        const targetPit = -(b / maxTilt) * ((30 * Math.PI) / 180);
        yawRef.current += (targetYaw - yawRef.current) * 0.08;
        pitchRef.current += (targetPit - pitchRef.current) * 0.08;
      };
      window.addEventListener('deviceorientation', handler as EventListener, true);
      removeListener = () => window.removeEventListener('deviceorientation', handler as EventListener, true);
    };

    const enable = async () => {
      try {
        const DME: any = (window as any).DeviceMotionEvent;
        let granted = false;
        if (DME && typeof DME.requestPermission === 'function') {
          const res = await DME.requestPermission();
          granted = res === 'granted';
        } else {
          granted = true; // non iOS or no permission API
        }
        if (granted) {
          setGyroEnabled(true);
          startGyro();
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[ImmersiveCylViewer] Motion permission error', e);
      }
    };

    // We will not auto-enable; wait for user action via chip
    return () => {
      if (removeListener) removeListener();
    };
  }, [gyroEligible, curvatureDeg]);

  // Focus trap on mount
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.focus();
  }, []);

  const handleRequestGyro = async () => {
    try {
      const DME: any = (window as any).DeviceMotionEvent;
      if (DME && typeof DME.requestPermission === 'function') {
        const res = await DME.requestPermission();
        if (res === 'granted') {
          setGyroEnabled(true);
          // Start gyro listener now
          const evt = new Event('gh-start-gyro');
          window.dispatchEvent(evt);
        }
      } else {
        setGyroEnabled(true);
        const evt = new Event('gh-start-gyro');
        window.dispatchEvent(evt);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[ImmersiveCylViewer] Gyro request failed', e);
    }
  };

  // React to our synthetic event to start gyro (to keep effect dependencies simple)
  useEffect(() => {
    const onStart = () => {
      const maxTilt = 15; // deg
      const handler = (e: DeviceOrientationEvent) => {
        const gamma = (e.gamma ?? 0);
        const beta = (e.beta ?? 0);
        const g = Math.max(-maxTilt, Math.min(maxTilt, gamma));
        const b = Math.max(-maxTilt, Math.min(maxTilt, beta));
        const targetYaw = (g / maxTilt) * ((curvatureDeg * Math.PI) / 180 / 2);
        const targetPit = -(b / maxTilt) * ((30 * Math.PI) / 180);
        yawRef.current += (targetYaw - yawRef.current) * 0.08;
        pitchRef.current += (targetPit - pitchRef.current) * 0.08;
      };
      window.addEventListener('deviceorientation', handler as EventListener, true);
      const cleanup = () => window.removeEventListener('deviceorientation', handler as EventListener, true);
      window.addEventListener('gh-immersive-cleanup', cleanup as EventListener, { once: true });
    };
    window.addEventListener('gh-start-gyro', onStart as EventListener);
    return () => window.removeEventListener('gh-start-gyro', onStart as EventListener);
  }, [curvatureDeg]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      aria-label="Immersive image viewer"
      role="dialog"
      aria-modal="true"
      ref={rootRef}
      tabIndex={-1}
    >
      <button
        className="absolute top-3 right-3 text-white px-3 py-2 rounded-md bg-black/40 hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close"
        onClick={() => {
          // signal cleanup of gyro listener
          window.dispatchEvent(new Event('gh-immersive-cleanup'));
          onClose?.();
        }}
      >
        Close
      </button>

      {!gyroEnabled && gyroEligible && (
        <button
          className="absolute top-3 left-3 text-black px-3 py-1 rounded-full bg-white text-sm"
          onClick={handleRequestGyro}
          aria-label="Enable Motion"
        >
          Enable Motion
        </button>
      )}

      {caption && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded-md">
          {caption}
        </div>
      )}

      <div id="gh-immersive-root" className="w-screen h-screen" />

      {/* Focus trap sentinel to cycle focus inside */}
      <button ref={focusSentinelRef} className="sr-only" aria-hidden="true" />
    </div>
  );
};

export default ImmersiveCylViewer;
