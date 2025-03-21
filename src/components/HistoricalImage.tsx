
import { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface HistoricalImageProps {
  src: string;
  alt?: string;
}

const HistoricalImage = ({ src, alt = "Historical image" }: HistoricalImageProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [processedSrc, setProcessedSrc] = useState(src);

  useEffect(() => {
    // Process the source URL to handle Wikimedia Commons links
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
