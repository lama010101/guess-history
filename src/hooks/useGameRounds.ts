
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
    const savedImagesJson = localStorage.getItem('savedEvents');
    if (savedImagesJson) {
      try {
        const savedImages = JSON.parse(savedImagesJson);
        if (Array.isArray(savedImages) && savedImages.length > 0) {
          console.log('Loading saved images from localStorage:', savedImages.length);
          setImages(savedImages);
        }
      } catch (error) {
        console.error('Error loading saved images:', error);
      }
    }
  }, []);
  
  // Current image based on the current image index
  const currentImage = images[currentImageIndex % images.length];
  
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
    setCurrentImageIndex(prevIndex => (prevIndex + 1) % images.length);
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
    images
  };
};
