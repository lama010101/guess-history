import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { useGame } from "@/contexts/GameContext";

const SLIDE_DURATION_MS = 3000;

const LandingPage: React.FC = () => {
  const [currentImageIndex, setCurrent] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const { user } = useAuth();
  const [navVisible, setNavVisible] = useState(false);
  const { startGame, images, isLoading } = useGame();

  // Scroll event for navbar visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setNavVisible(true);
      } else {
        setNavVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load hero images
  useEffect(() => {
    const loadImages = async () => {
      try {
        console.log('Loading hero images...');
        setImagesLoading(true);
        
        // Dynamically import all images from src/assets/hero directory (any extension)
        const heroImageModules = import.meta.glob('@/assets/hero/*.{webp,jpg,jpeg,png}', { eager: true });
        const heroImages = Object.values(heroImageModules).map((mod: any) => mod.default) as string[];
        setCarouselImages(heroImages);
        console.log('Loaded hero images:', heroImages);
      } catch (error) {
        console.error('Error loading images:', error);
      } finally {
        setImagesLoading(false);
      }
    };

    loadImages();
  }, []);

  // Redirect authenticated user straight to the home page (avoid while auth modal is open or a game is starting)
  useEffect(() => {
    if (user && !authOpen && !isLoading && images.length === 0) {
      window.location.replace("/test");
    }
  }, [user, authOpen, isLoading, images.length]);

  // Cycle through hero images every 3 seconds
  useEffect(() => {
    if (carouselImages.length > 0) {
      const interval = setInterval(() => {
        setCurrent((prev) => (prev + 1) % carouselImages.length);
      }, SLIDE_DURATION_MS);
      return () => clearInterval(interval);
    }
  }, [carouselImages.length]);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black">
      {/* Fixed Top Bar - Overlays Hero */}
      <header
        className={`fixed top-0 left-0 right-0 z-30 grid grid-cols-3 items-center px-6 py-4 transition-all duration-500
          ${navVisible ? 'bg-black/80' : 'bg-transparent'}
        `}
      >
        {/* Left column intentionally blank (scores removed) */}
        <div className="col-start-1" />
        {/* Right-side call to action */}
        <Button
          onClick={() => setAuthOpen(true)}
          variant="secondary"
          className={`bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2 rounded-xl shadow-md transition-all duration-500 col-start-3 justify-self-end
            ${navVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          `}
        >
          Jump In Now
        </Button>
      </header>

      {/* Hero Fullscreen Section */}
      <section className="relative h-screen flex flex-col items-center justify-center">
        {/* Background Carousel */}
        {imagesLoading ? (
          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
            <p className="text-white">Loading images...</p>
          </div>
        ) : carouselImages.length > 0 ? (
          carouselImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImageIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={image}
                alt={`Historical moment ${index + 1}`}
                className="w-full h-full object-cover"
                onLoad={() => console.log(`Successfully loaded carousel image: ${image}`)}
                onError={() => {
                  console.error('Failed to load carousel image:', image);
                }}
              />
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/50" />
            </div>
          ))
        ) : (
          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
            <p className="text-white">No images available</p>
          </div>
        )}

        {/* Hero content */}
        <main className="relative z-20 flex flex-col items-center justify-center text-center text-white px-4 h-full">
          <h1
            className="text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl"
            style={{
              fontFamily: 'Verdana, Geneva, Tahoma, sans-serif',
              textShadow: '0 4px 24px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.7), 0 1px 1px #000',
              letterSpacing: '0.01em',
              lineHeight: '1.1',
            }}
          >
            When and where <br /> did it happen?
          </h1>
          <p className="mt-8 text-lg md:text-2xl drop-shadow-lg">Time travel through historical events.</p>
          <Button
            className="mt-14 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-xl shadow-xl flex items-center gap-2"
            onClick={() => setAuthOpen(true)}
          >
            <span>Start Guessing</span>
          </Button>
          <span className="mt-4 text-sm opacity-80">No signup needed - Play immediately as a guest</span>
        </main>
      </section>
      
      {/* How does it work section - Temporarily hidden for reimplementation
      <section
        className="relative z-10 flex flex-col items-center justify-center text-center bg-black py-16 px-4"
        style={{ minHeight: '100vh', height: 'auto' }}
      >
        <h2
          className="text-3xl md:text-4xl font-bold mb-10 drop-shadow-lg text-white"
          style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}
        >
          How does it work?
        </h2>
        <div className="flex flex-col md:flex-row gap-8 max-w-5xl w-full justify-center"
          style={{ minHeight: 'unset', height: 'unset' }}
        >
          <div className="flex-1 bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border border-orange-100">
            <div className="mb-4 text-4xl">🖼️</div>
            <h3
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}
            >
              Analyze the Image
            </h3>
            <p className="text-base text-gray-600">Study a real historical photo and look for clues in people, fashion, architecture, and more.</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border border-orange-100">
            <div className="mb-4 text-4xl">📍</div>
            <h3
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}
            >
              Guess Time & Location
            </h3>
            <p className="text-base text-gray-600">Enter your best guess for when and where the event took place. Compete for accuracy!</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border border-orange-100">
            <div className="mb-4 text-4xl">🔎</div>
            <h3
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}
            >
              Discover & Learn
            </h3>
            <p className="text-base text-gray-600">See how close you were, get the real answer, and read a short story about the event.</p>
          </div>
        </div>
        <style>{`
          @media (min-width: 768px) {
            section[style*='min-height: 100vh'] {
              height: 100vh !important;
              min-height: 100vh !important;
            }
          }
        `}</style>
      </section>
      */}
      {/* Authentication modal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={() => {
          setAuthOpen(false);
          window.location.replace("/test");
        }}
        onGuestContinue={async () => {
          // AuthModal already performed continueAsGuest before invoking this callback.
          // Start a solo game programmatically; navigation is handled inside startGame.
          await startGame?.();
        }}
      />
    </div>
  );
};

export default LandingPage;
