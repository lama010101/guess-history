import { useState, useEffect } from "react";
import LazyImage from '@/components/ui/LazyImage';
import { Button } from "@/components/ui/button";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase";
import localImagePaths from '@/data/heroImages.json';

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
        // --- Primary: Load local images from JSON ---
        if (localImagePaths && localImagePaths.length > 0) {
          const loadPromises = localImagePaths.map(url => {
            return new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.src = url;
              img.onload = () => resolve();
              img.onerror = reject;
            });
          });
          await Promise.all(loadPromises);
          setCarouselImages(localImagePaths);
        } else {
          throw new Error("No local images found in JSON. Attempting Firebase fallback.");
        }
      } catch (localError) {
        console.warn(localError); // Log the fallback trigger
        try {
          // --- Fallback: Load from Firebase Storage ---
          const listRef = ref(storage, 'hero');
          const res = await listAll(listRef);
          const urlPromises = res.items.map(item => getDownloadURL(item));
          const firebaseImageUrls = await Promise.all(urlPromises);

          if (firebaseImageUrls.length === 0) {
            console.error("Fallback failed: No images found in Firebase.");
            return;
          }

          const loadPromises = firebaseImageUrls.map(url => {
            return new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.src = url;
              img.onload = () => resolve();
              img.onerror = reject;
            });
          });

          await Promise.all(loadPromises);
          setCarouselImages(firebaseImageUrls);

        } catch (firebaseError) {
          console.error('Error loading images from Firebase fallback:', firebaseError);
        }
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
