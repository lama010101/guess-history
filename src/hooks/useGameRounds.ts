
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
  
  // Always pick random images when the component mounts or game is reset
  const selectRandomImages = () => {
    const availableImages = [...defaultImages];
    
    if (availableImages.length > configuredMaxRounds.current) {
      // Shuffle array and pick first n elements
      const shuffledImages = availableImages.sort(() => Math.random() - 0.5);
      return shuffledImages.slice(0, configuredMaxRounds.current);
    } else {
      // Not enough images, use all available ones
      return availableImages;
    }
  };
  
  // Load images and select random set on initial mount
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
    
    // Select random images
    if (availableImages.length > 0) {
      const selectedImages = availableImages.length > configuredMaxRounds.current
        ? [...availableImages].sort(() => Math.random() - 0.5).slice(0, configuredMaxRounds.current)
        : availableImages;
      
      setImages(selectedImages);
    }
    
    // Persist current game state to localStorage for refreshing
    const currentGameState = {
      currentRound,
      currentImageIndex,
      gameComplete,
      images: availableImages.length > 0 ? availableImages : defaultImages
    };
    localStorage.setItem('currentGameState', JSON.stringify(currentGameState));
    
  }, [defaultImages]);
  
  // Check for saved game state on page refresh
  useEffect(() => {
    const savedGameState = localStorage.getItem('currentGameState');
    if (savedGameState) {
      try {
        const gameState = JSON.parse(savedGameState);
        setCurrentRound(gameState.currentRound || 1);
        setCurrentImageIndex(gameState.currentImageIndex || 0);
        setGameComplete(gameState.gameComplete || false);
        if (gameState.images && gameState.images.length > 0) {
          setImages(gameState.images);
        }
      } catch (error) {
        console.error('Error loading game state:', error);
      }
    }
  }, []);
  
  // Save game state whenever it changes
  useEffect(() => {
    const currentGameState = {
      currentRound,
      currentImageIndex,
      gameComplete,
      images
    };
    localStorage.setItem('currentGameState', JSON.stringify(currentGameState));
  }, [currentRound, currentImageIndex, gameComplete, images]);
  
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
    
    // Select new random images for the game
    const newImages = selectRandomImages();
    setImages(newImages);
    
    // Update localStorage with the new game state
    const newGameState = {
      currentRound: 1,
      currentImageIndex: 0,
      gameComplete: false,
      images: newImages
    };
    localStorage.setItem('currentGameState', JSON.stringify(newGameState));
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
