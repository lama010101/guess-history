
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import HintSystem from './game/HintSystem';

interface HintDisplayProps {
  availableHints: number;
  onClose: () => void;
  onUseLocationHint: () => boolean;
  onUseYearHint: () => boolean;
  locationHintUsed: boolean;
  yearHintUsed: boolean;
  currentImage: {
    year: number;
    location: { lat: number; lng: number };
    description: string;
    locationName?: string;
    country?: string;
  };
}

const HintDisplay = ({ 
  availableHints, 
  onClose, 
  onUseLocationHint, 
  onUseYearHint, 
  locationHintUsed, 
  yearHintUsed, 
  currentImage 
}: HintDisplayProps) => {
  const [isClosing, setIsClosing] = useState(false);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };
  
  return (
    <div className={`transition-opacity duration-150 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <div className="relative">
        <button 
          className="absolute -top-2 -right-2 p-1 rounded-full bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 shadow-sm"
          onClick={handleClose}
          aria-label="Close hints"
        >
          <X className="h-4 w-4" />
        </button>
        
        <HintSystem 
          hintCoins={availableHints}
          onUseLocationHint={onUseLocationHint}
          onUseYearHint={onUseYearHint}
          locationHintUsed={locationHintUsed}
          yearHintUsed={yearHintUsed}
          currentImage={currentImage}
        />
      </div>
    </div>
  );
};

export default HintDisplay;
