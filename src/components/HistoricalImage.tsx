
import { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HistoricalImageProps {
  src: string;
  alt?: string;
  metadata?: {
    tag?: 'Real' | 'AI Recreate' | 'AI Imagine';
    sourceApp?: string;
    sourceName?: string;
    confidenceScore?: number;
    createdAt?: string;
  };
}

const HistoricalImage = ({ src, alt = "Historical image", metadata }: HistoricalImageProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [processedSrc, setProcessedSrc] = useState(src);

  useEffect(() => {
    // Process the source URL to handle different image sources
    if (src) {
      let finalSrc = src;
      
      // Handle Wikimedia Commons URLs
      if (src.includes('wikimedia.org/wiki/File:')) {
        // Extract file name
        const fileNameMatch = src.match(/File:([^/]+)$/);
        if (fileNameMatch && fileNameMatch[1]) {
          const fileName = fileNameMatch[1];
          // Convert to direct image URL using Wikimedia thumbnail API
          finalSrc = `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}?width=800`;
        }
      }
      // Handle Supabase Storage URLs - ensure they're public URLs
      else if (src.includes('supabase') && src.includes('storage') && !src.includes('public')) {
        try {
          // Extract bucket and path from URL if it's not a public URL
          const urlParts = src.split('/storage/v1/object/');
          if (urlParts.length > 1) {
            const pathParts = urlParts[1].split('/');
            const bucket = pathParts[0];
            const filePath = pathParts.slice(1).join('/');
            
            // Get the public URL
            const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
            if (data && data.publicUrl) {
              finalSrc = data.publicUrl;
            }
          }
        } catch (err) {
          console.error('Error processing Supabase storage URL:', err);
        }
      }
      
      setProcessedSrc(finalSrc);
      setLoading(true);
      setError(false);
    }
  }, [src]);

  const handleImageLoad = () => {
    setLoading(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
    console.error("Failed to load image:", processedSrc);
  };

  // Display a badge for AI-generated images when appropriate
  const renderImageSourceBadge = () => {
    if (!metadata?.tag || metadata.tag === 'Real') return null;
    
    return (
      <div className="absolute top-0 right-0 m-2 px-2 py-1 text-xs font-medium rounded bg-gray-900/70 text-white">
        {metadata.tag}
      </div>
    );
  };

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl shadow-lg">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <div className="flex flex-col items-center">
            <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Loading image...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="flex flex-col items-center">
            <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Failed to load image</p>
          </div>
        </div>
      )}

      {renderImageSourceBadge()}

      <img
        src={processedSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loading || error ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ minHeight: '300px' }}
      />

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent text-white">
        <p className="text-sm">When and where was this photo taken?</p>
      </div>
    </div>
  );
};

export default HistoricalImage;
