
import { useState, useEffect, useRef } from 'react';
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
  const configuredMaxRounds = useRef(maxRounds);
  
  // Load max rounds from localStorage if available
  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings && typeof settings.maxRoundsPerGame === 'number') {
          configuredMaxRounds.current = settings.maxRoundsPerGame;
        }
      } catch (error) {
        console.error('Error loading game settings:', error);
      }
    }
  }, []);
  
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
    if (currentRound >= configuredMaxRounds.current) {
      // Game complete
      setGameComplete(true);
      return;
    }
    
    // Move to next round
    setCurrentRound(prevRound => prevRound + 1);
    
    // Move to the next image
    setCurrentImageIndex(prevIndex => {
      // Make sure we don't repeat images if we have enough
      const nextIndex = prevIndex + 1;
      const totalImages = images.length || defaultImages.length;
      
      // If we're about to overflow, start from a random point
      if (nextIndex >= totalImages) {
        return Math.floor(Math.random() * totalImages);
      }
      return nextIndex;
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
    maxRounds: configuredMaxRounds.current,
    gameComplete,
    nextRound,
    resetGame,
    images: images.length > 0 ? images : defaultImages
  };
};
