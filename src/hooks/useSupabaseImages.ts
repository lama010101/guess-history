
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HistoricalImage } from '@/types/game';

export interface SupabaseImage {
  id: string;
  image_url: string;
  source_name: string;
  source_app: string;
  prompt: string;
  ai_description: string;
  confidence_score: number;
  tag: 'Real' | 'AI Recreate' | 'AI Imagine';
  title: string;
  date: string;
  country: string;
  address: string;
  latitude: number;
  longitude: number;
  ready_for_game: boolean;
  created_at: string;
}

export const useSupabaseImages = () => {
  const [images, setImages] = useState<HistoricalImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        
        // Use the more generic query method instead of .from() with a typed table name
        // This allows us to query tables not defined in the TypeScript types
        const { data, error: supabaseError } = await supabase
          .from('images')
          .select('*')
          .eq('ready_for_game', true) as { data: SupabaseImage[] | null, error: Error | null };
          
        if (supabaseError) {
          throw new Error(`Error fetching images: ${supabaseError.message}`);
        }
        
        if (!data || data.length === 0) {
          console.log('No approved images found in Supabase');
          setImages([]);
          return;
        }
        
        // Transform Supabase images to the HistoricalImage format used by the game
        const transformedImages: HistoricalImage[] = data.map((img: SupabaseImage) => ({
          id: parseInt(img.id.replace(/-/g, '').substring(0, 8), 16), // Convert UUID to number ID
          src: img.image_url,
          year: new Date(img.date).getFullYear(),
          location: {
            lat: img.latitude,
            lng: img.longitude
          },
          description: img.ai_description || img.prompt || '',
          title: img.title || '',
          locationName: `${img.address || ''}, ${img.country || ''}`.trim(),
          country: img.country || '',
          // Additional metadata that might be useful for the game
          metadata: {
            tag: img.tag,
            sourceApp: img.source_app,
            sourceName: img.source_name,
            confidenceScore: img.confidence_score,
            createdAt: img.created_at,
          }
        }));
        
        console.log(`Fetched ${transformedImages.length} approved images from Supabase`);
        setImages(transformedImages);
      } catch (err) {
        console.error('Error in useSupabaseImages:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    
    fetchImages();
  }, []);
  
  return { images, loading, error };
};
