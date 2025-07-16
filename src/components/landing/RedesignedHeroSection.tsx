
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface RedesignedHeroSectionProps {
  onAuthModalOpen?: () => void;
}

const RedesignedHeroSection = ({ onAuthModalOpen }: RedesignedHeroSectionProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setImagesLoading(true);
        
        const imageUrls = [];
        const imagePromises = [];
        // List of hero image filenames (update as needed)
        const heroImages = [
          'HERO (1).webp',
          'HERO (2).webp',
          'HERO (3).webp',
          'hero (8).webp',
          'hero (9).webp',
          'hero (12).webp',
          'hero (14).webp',
          'hero (17).webp',
          'hero (18).webp',
          'hero (19).webp',
          'hero (22).webp',
        ];
        for (const filename of heroImages) {
          const imageUrl = `/images/hero/${filename}`;
          const imagePromise = new Promise<void>((resolve) => {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
              imageUrls.push(imageUrl);
              resolve();
            };
            img.onerror = () => {
              console.warn(`Failed to load image: ${imageUrl}`);
              resolve();
            };
          });
          imagePromises.push(imagePromise);
        }
        
        // Wait for all image checks to complete
        await Promise.all(imagePromises);
        
        if (imageUrls.length === 0) {
          console.error('No images could be loaded');
          // Optionally set some fallback images here if needed
        } else {
          setCarouselImages(imageUrls);
        }
      } catch (error) {
        console.error('Error setting up images:', error);
      } finally {
        setImagesLoading(false);
      }
    };

    fetchImages();
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
            <img
              src={image}
              alt={`Historical moment ${index + 1}`}
              className="w-full h-full object-cover"
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
