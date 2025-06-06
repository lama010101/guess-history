
import React from 'react';

interface HistoricalImageCardProps {
  imageUrl: string;
  imageTitle: string;
  eventYear: number;
  locationName: string;
  imageDescription: string;
}

const HistoricalImageCard: React.FC<HistoricalImageCardProps> = ({ 
  imageUrl, 
  imageTitle, 
  eventYear, 
  locationName, 
  imageDescription 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      <img 
        src={imageUrl} 
        alt={imageTitle} 
        className="w-full h-48 object-cover"
      />
      
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
