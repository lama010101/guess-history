import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface GameImage {
  id: string;
  url: string; // This will be populated from either mobile_image_url or desktop_image_url
  title: string;
  description: string;
  year: number;
  latitude: number;
  longitude: number;
  location_name: string;
}

// No placeholder images - we will only use optimized images from the database

export function useGameImages(gameId?: string) {
  const [images, setImages] = useState<GameImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to shuffle array
  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchReadyImages = async () => {
    console.log('Fetching ready images');
    setIsLoading(true);
    setError(null);
    
    try {
      // Query the images table for ready images that have optimized images
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('ready', true);

      if (error) {
        throw error;
      }

      console.log(`Found ${data?.length || 0} ready images`);

      // For each image, get the appropriate optimized URL
      const imagesWithUrls = await processImages(data || []);
      
      // Filter out any images that don't have valid optimized URLs
      const validImages = imagesWithUrls.filter(img => img !== null) as GameImage[];
      
      if (validImages.length === 0) {
        console.log('No valid optimized images found');
        setImages([]);
        setError('No optimized images available');
        setCurrentImageIndex(0);
        setIsLoading(false);
        return;
      }

      // Shuffle the images for randomization
      const shuffledImages = shuffleArray(validImages);
      setImages(shuffledImages);
      setCurrentImageIndex(0);
    } catch (err) {
      console.error('Error fetching images:', err);
      setError(err instanceof Error ? err.message : 'Failed to load images');
      setImages([]);
      setCurrentImageIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Process images to get URLs
  const processImages = async (imageData: any[]) => {
    // Detect if device is mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    return Promise.all(
      imageData.map(async (image) => {
        try {
          // Select the appropriate optimized image URL based on device type
          const imageField = isMobile ? 'mobile_image_url' : 'desktop_image_url';
          let url = image[imageField];
          
          // If the required optimized URL is not available, return null (skip this image)
          if (!url) {
            console.warn(`No ${imageField} available for image ${image.id}, skipping`);
            return null;
          }

          // If we have a Supabase storage path, get the public URL
          if (url && !url.startsWith('http')) {
            const { data: publicUrl } = supabase.storage
              .from('images')
              .getPublicUrl(url);
            url = publicUrl.publicUrl;
          }

          // If for some reason we still don't have a URL, skip this image
          if (!url) {
            console.warn(`Failed to get public URL for ${imageField} of image ${image.id}, skipping`);
            return null;
          }

          return {
            id: image.id,
            url: url,
            title: image.title || 'Historical Image',
            description: image.description || 'No description available',
            year: image.year || 1900,
            latitude: image.latitude || 0,
            longitude: image.longitude || 0,
            location_name: image.location_name || 'Unknown Location',
          };
        } catch (err) {
          console.error('Error processing image:', image.id, err);
          // Skip images with errors
          return null;
        }
      })
    );
  };

  // Get current image
  const currentImage = images.length > 0 ? images[currentImageIndex] : null;

  // Move to next image
  const nextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
      return true;
    }
    return false;
  };

  useEffect(() => {
    fetchReadyImages();
  }, [gameId]);

  return {
    images,
    currentImage,
    isLoading,
    error,
    nextImage,
    currentImageIndex,
  };
}
