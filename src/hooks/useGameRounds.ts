
import { useState, useEffect } from 'react';
import { HistoricalImage } from '@/types/game';

interface UseGameRoundsOptions {
  images: HistoricalImage[];
  maxRounds?: number;
}

export const useGameRounds = ({ images: defaultImages, maxRounds = 5 }: UseGameRoundsOptions) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [images, setImages] = useState<HistoricalImage[]>(defaultImages);
  
  // Load images from localStorage if available
  useEffect(() => {
    const savedEventsJson = localStorage.getItem('savedEvents');
    if (savedEventsJson) {
      try {
        const savedEvents = JSON.parse(savedEventsJson);
        if (Array.isArray(savedEvents) && savedEvents.length > 0) {
          console.log('Loading saved images from localStorage:', savedEvents);
          setImages(savedEvents);
        }
      } catch (error) {
        console.error('Error loading saved images:', error);
      }
    }
  }, []);
  
  // Current image based on the current image index
  const currentImage = images.length > 0 
    ? images[currentImageIndex % images.length] 
    : defaultImages[currentImageIndex % defaultImages.length];
  
  // Move to the next round
  const nextRound = () => {
    // Check if game is complete
    if (currentRound >= maxRounds) {
      // Game complete
      setGameComplete(true);
      return;
    }
    
    // Move to next round
    setCurrentRound(prevRound => prevRound + 1);
    
    // Important fix: Use a function to ensure we get the latest state
    setCurrentImageIndex(prevIndex => {
      // Move to the next image with modulo to stay within bounds
      return (prevIndex + 1) % (images.length || defaultImages.length);
    });
  };
  
  // Reset the game
  const resetGame = () => {
    setCurrentRound(1);
    setCurrentImageIndex(0);
    setGameComplete(false);
  };
  
  return {
    currentRound,
    currentImage,
    currentImageIndex,
    maxRounds,
    gameComplete,
    nextRound,
    resetGame,
    images: images.length > 0 ? images : defaultImages
  };
};
