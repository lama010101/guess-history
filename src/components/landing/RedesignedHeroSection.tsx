import { useState, useEffect } from "react";
import LazyImage from '@/components/ui/LazyImage';
import { Button } from "@/components/ui/button";

// Explicit list of hero images located in the public/images/hero directory.
// Add or remove entries as you update the folder.
const heroImages: string[] = [
  '/images/hero/HERO (1).webp',
  '/images/hero/HERO (2).webp',
  '/images/hero/HERO (3).webp',
  '/images/hero/hero (8).webp',
  '/images/hero/hero (9).webp',
  '/images/hero/hero (12).webp',
  '/images/hero/hero (14).webp',
  '/images/hero/hero (17).webp',
  '/images/hero/hero (18).webp',
  '/images/hero/hero (19).webp',
  '/images/hero/hero (22).webp',
];

interface RedesignedHeroSectionProps {
  onAuthModalOpen?: () => void;
}

const RedesignedHeroSection = ({ onAuthModalOpen }: RedesignedHeroSectionProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);

  useEffect(() => {
    const preload = async () => {
      try {
        await Promise.all(
          heroImages.map(
            (url) =>
              new Promise<void>((resolve) => {
                const img = new Image();
                img.src = url;
                img.onload = () => resolve();
            img.onerror = reject;
          });
        const loaded = await Promise.all(heroImages.map(load));
              })
          )
        );

        setCarouselImages(loaded);
      } catch (error) {
        console.error('Error loading hero images:', error);
      } finally {
        setImagesLoading(false);
      }
    };

    loadImages();
  }, []);

  useEffect(() => {
    if (carouselImages.length > 0) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [carouselImages.length]);

  const handleStartGuessing = () => {
    if (onAuthModalOpen) {
      onAuthModalOpen();
    } else {
      window.location.href = "https://home.guess-history.com/";
    }
  };

  return (
    <section className="relative h-screen overflow-hidden">
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
            <LazyImage
              src={image}
              alt={`Historical moment ${index + 1}`}
              className="w-full h-full object-cover"
              skeletonClassName="w-full h-full"
              onError={e => {
                const target = e.currentTarget as HTMLImageElement;
                // Only swap if not already using fallback
                if (!target.src.includes('fallback')) {
                  target.src = '/assets/fallback-image.jpg';
                }
              }}
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ))
      ) : (
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
          <p className="text-white">No images available</p>
        </div>
      )}
      
      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col h-full justify-center items-center text-white px-6">
        <div className="text-center max-w-4xl animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-8 animate-scale-in" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.8)' }}>
            When and where<br />did it happen?
          </h1>
          
          <div className="space-y-4 mb-8">
            <p className="text-xl md:text-2xl text-slate-200 animate-fade-in mb-6" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)', animationDelay: '0.2s' }}>
              Time travel through historical events.
            </p>
            
            <Button 
              size="lg" 
              className="bg-orange-500 hover:bg-orange-600 text-white px-12 py-3 text-lg font-semibold rounded-full shadow-xl transition-all duration-200 animate-scale-in hover:scale-105"
              onClick={handleStartGuessing}
              style={{ animationDelay: '0.4s' }}
            >
              🎮 Start Guessing
            </Button>
            
            <p className="text-sm text-slate-300 animate-fade-in" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)', animationDelay: '0.6s' }}>
              No signup needed - Play immediately as a guest
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RedesignedHeroSection;
