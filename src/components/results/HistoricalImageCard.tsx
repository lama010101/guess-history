
import React, { useState } from 'react';

interface HistoricalImageCardProps {
  imageUrl: string;
  placeholderUrl: string;
  imageTitle: string;
  eventYear: number;
  locationName: string;
  imageDescription: string;
}

const HistoricalImageCard: React.FC<HistoricalImageCardProps> = ({ 
  imageUrl, 
  placeholderUrl, 
  imageTitle, 
  eventYear, 
  locationName, 
  imageDescription 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700">
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-history-primary rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Error placeholder */}
        {hasError && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3h4v4h-4z"></path>
              <path d="m10 3-1-1"></path>
              <path d="m15 3 1-1"></path>
              <path d="M3 10h18"></path>
              <path d="M15 3v4"></path>
              <path d="M10 3v4"></path>
              <path d="M3 10v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-8"></path>
              <path d="M10 14h4"></path>
              <path d="M10 18h4"></path>
            </svg>
            <p className="mt-2 text-sm">Image unavailable</p>
          </div>
        )}
        
        <img
          src={placeholderUrl}
          alt={`${imageTitle} placeholder`}
          className="absolute inset-0 w-full h-full object-cover filter blur-md scale-110 transition-opacity duration-300"
          style={{ opacity: isLoading ? 1 : 0 }}
          aria-hidden="true"
        />
        <img 
          src={imageUrl} 
          alt={imageTitle} 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      </div>
      
      <div className="p-6">
        <h2 className="text-xl font-bold mb-2 text-history-primary dark:text-history-light">
          {imageTitle} ({eventYear})
        </h2>
        <h3 className="text-sm text-muted-foreground mb-3">
          {locationName}
        </h3>
        <div className="max-h-48 overflow-y-auto pr-2 text-muted-foreground">
          <p>{imageDescription}</p>
        </div>
      </div>
    </div>
  );
};

export default HistoricalImageCard;
