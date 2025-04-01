
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HistoricalImage } from '@/types/game';

export interface SupabaseImage {
  id: string;
  image_url: string;
  source_name: string;
  source_app: string;
  prompt: string;
  ai_description: string | null;
  confidence_score: number | null;
  tag: 'Real' | 'AI Recreate' | 'AI Imagine' | null;
  title: string | null;
  date: string | null;
  country: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
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
        
        // Use a generic approach to bypass TypeScript checking
        const response = await fetch(
          `${supabase.supabaseUrl}/rest/v1/images?ready_for_game=eq.true&select=*`,
          {
            headers: {
              'apikey': supabase.supabaseKey,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          throw new Error(`Error fetching images: ${response.statusText}`);
        }
        
        const data: SupabaseImage[] = await response.json();
        
        if (!data || data.length === 0) {
          console.log('No approved images found in Supabase');
          setImages([]);
          return;
        }
        
        // Transform Supabase images to the HistoricalImage format used by the game
        const transformedImages: HistoricalImage[] = data.map((img: SupabaseImage) => ({
          id: parseInt(img.id.replace(/-/g, '').substring(0, 8), 16), // Convert UUID to number ID
          src: img.image_url,
          year: img.date ? new Date(img.date).getFullYear() : 2000,
          location: {
            lat: img.latitude || 0,
            lng: img.longitude || 0
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
