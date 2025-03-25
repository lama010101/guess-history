
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
  const [images, setImages] = useState<HistoricalImage[]>([]);
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
  
  // Load images and select random set
  useEffect(() => {
    const savedEventsJson = localStorage.getItem('savedEvents');
    let availableImages: HistoricalImage[] = [];
    
    if (savedEventsJson) {
      try {
        const savedEvents = JSON.parse(savedEventsJson);
        if (Array.isArray(savedEvents) && savedEvents.length > 0) {
          console.log('Loading saved images from localStorage:', savedEvents);
          availableImages = savedEvents;
        } else {
          availableImages = defaultImages;
        }
      } catch (error) {
        console.error('Error loading saved images:', error);
        availableImages = defaultImages;
      }
    } else {
      availableImages = defaultImages;
    }
    
    // Select random images for this game session
    if (availableImages.length > configuredMaxRounds.current) {
      // Shuffle array and pick first n elements
      const shuffledImages = [...availableImages].sort(() => Math.random() - 0.5);
      setImages(shuffledImages.slice(0, configuredMaxRounds.current));
    } else {
      // Not enough images, use all available ones
      setImages(availableImages);
    }
  }, [defaultImages]);
  
  // Current image based on the current image index
  const currentImage = images.length > 0 
    ? images[currentImageIndex] 
    : defaultImages[0]; // Fallback to first default image
  
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
    setCurrentImageIndex(prevIndex => prevIndex + 1);
  };
  
  // Reset the game
  const resetGame = () => {
    setCurrentRound(1);
    setCurrentImageIndex(0);
    setGameComplete(false);
    
    // Regenerate random set of images
    if (defaultImages.length > configuredMaxRounds.current) {
      const shuffledImages = [...defaultImages].sort(() => Math.random() - 0.5);
      setImages(shuffledImages.slice(0, configuredMaxRounds.current));
    }
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
