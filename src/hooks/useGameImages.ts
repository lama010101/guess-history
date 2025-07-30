import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface GameImage {
  id: string;
  url: string; 
  placeholderUrl: string; // URL for the low-quality blurred placeholder
  title: string;
  description: string;
  year: number;
  latitude: number;
  longitude: number;
  location_name: string;
  firebase_url?: string;
  confidence?: number;
  source_citation?: string | null;
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
        .select('id, title, description, year, latitude, longitude, location_name, mobile_image_url, desktop_image_url, firebase_url, confidence, source_citation')
        .eq('ready', true);

      console.log('Fetched raw image data:', data);

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
          // If firebase_url is present, use it as the source of truth and skip other processing
          if (image.firebase_url) {
            return {
              id: image.id,
              url: image.firebase_url,
              placeholderUrl: image.firebase_url, // Use it for placeholder as well
              title: image.title || 'Historical Image',
              description: image.description || 'No description available',
              year: image.year || 1900,
              latitude: image.latitude || 0,
              longitude: image.longitude || 0,
              location_name: image.location_name || 'Unknown Location',
              firebase_url: image.firebase_url,
              confidence: image.confidence,
              source_citation: image.source_citation,
            };
          }

          // Select the appropriate optimized image URL based on device type
          const imageField = isMobile ? 'mobile_image_url' : 'desktop_image_url';
          let url = image[imageField];
          
          // If the required optimized URL is not available, return null (skip this image)
          if (!url) {
            console.warn(`No ${imageField} available for image ${image.id}, skipping`);
            return null;
          }

          // If we have a Supabase storage path, get the public URLs for both placeholder and full image
          let fullUrl = null;
          let placeholderUrl = null;

          if (url && !url.startsWith('http')) {
            // Generate placeholder URL (tiny, low-quality)
            const { data: placeholderPublicUrl } = supabase.storage
              .from('images')
              .getPublicUrl(url, { transform: { width: 40, quality: 30, resize: 'contain' } });
            placeholderUrl = placeholderPublicUrl.publicUrl;

            // Generate full-size optimized URL
            const { data: fullPublicUrl } = supabase.storage
              .from('images')
              .getPublicUrl(url, { transform: { width: isMobile ? 800 : 1600, quality: 85, resize: 'contain' } });
            fullUrl = fullPublicUrl.publicUrl;
            
            console.log(`[Image URLs] Full: ${fullUrl}, Placeholder: ${placeholderUrl}`);
          } else if (url) {
            // If the URL is already a full http path, use it directly (fallback, no optimization)
            fullUrl = url;
            placeholderUrl = url; // No separate placeholder available
          }

          // If firebase_url exists, it should be the source of truth.
          if (image.firebase_url) {
            fullUrl = image.firebase_url;
            placeholderUrl = image.firebase_url; // Use the same for placeholder to simplify
          } else if (!fullUrl || !placeholderUrl) {
            // Fallback if firebase_url is missing and Supabase URL generation failed
            console.warn(`Failed to get public URL for ${imageField} of image ${image.id}, skipping`);
            return null;
          }

          return {
            id: image.id,
            url: fullUrl,
            placeholderUrl: placeholderUrl,
            title: image.title || 'Historical Image',
            description: image.description || 'No description available',
            year: image.year || 1900,
            latitude: image.latitude || 0,
            longitude: image.longitude || 0,
            location_name: image.location_name || 'Unknown Location',
            firebase_url: image.firebase_url,
            confidence: image.confidence,
            source_citation: image.source_citation,
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
