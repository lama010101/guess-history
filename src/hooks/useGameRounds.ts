
import { useState, useEffect, useRef } from 'react';
import { HistoricalImage } from '@/types/game';
import { useSupabaseImages } from './useSupabaseImages';

interface UseGameRoundsOptions {
  images: HistoricalImage[];
  maxRounds?: number;
}

export const useGameRounds = ({ images: defaultImages, maxRounds = 5 }: UseGameRoundsOptions) => {
  const { images: supabaseImages, loading: loadingSupabaseImages } = useSupabaseImages();
  const [currentRound, setCurrentRound] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [images, setImages] = useState<HistoricalImage[]>([]);
  const configuredMaxRounds = useRef(maxRounds);
  const hasInitialized = useRef(false);
  
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

  // Use Supabase images when available, otherwise fall back to default images
  useEffect(() => {
    if (!loadingSupabaseImages && supabaseImages.length > 0) {
      console.log('Using Supabase images for the game:', supabaseImages.length);
      // Only recreate the game if we haven't already initialized with valid images
      if (!hasInitialized.current || images.length === 0) {
        const newImages = selectRandomImages(supabaseImages);
        setImages(newImages);
        
        // Save the selected images to localStorage
        const currentGameState = localStorage.getItem('currentGameState');
        if (currentGameState) {
          try {
            const gameState = JSON.parse(currentGameState);
            const updatedGameState = {
              ...gameState,
              images: newImages
            };
            localStorage.setItem('currentGameState', JSON.stringify(updatedGameState));
          } catch (error) {
            console.error('Error updating game state with Supabase images:', error);
          }
        }
      }
    }
  }, [supabaseImages, loadingSupabaseImages]);
  
  // Always pick random images when the component mounts or game is reset
  const selectRandomImages = (availableImages: HistoricalImage[]) => {
    if (availableImages.length > configuredMaxRounds.current) {
      // Shuffle array and pick first n elements
      const shuffledImages = availableImages.sort(() => Math.random() - 0.5);
      return shuffledImages.slice(0, configuredMaxRounds.current);
    } else {
      // Not enough images, use all available ones
      return availableImages;
    }
  };
  
  // Load game state from localStorage on initial mount
  useEffect(() => {
    // Only run this effect once
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    // First try to load saved game state if it exists
    const savedGameState = localStorage.getItem('currentGameState');
    if (savedGameState) {
      try {
        const gameState = JSON.parse(savedGameState);
        
        // Check if the saved state has valid data
        if (gameState && gameState.images && gameState.images.length > 0) {
          setCurrentRound(gameState.currentRound || 1);
          setCurrentImageIndex(gameState.currentImageIndex || 0);
          setGameComplete(gameState.gameComplete || false);
          setImages(gameState.images);
          console.log('Loaded saved game state:', gameState);
          return; // Exit early as we've loaded the saved state
        }
      } catch (error) {
        console.error('Error loading game state:', error);
      }
    }
    
    // If no valid saved state, then load images and select random ones
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
    
    // Select random images and initialize new game state
    if (availableImages.length > 0) {
      const selectedImages = availableImages.length > configuredMaxRounds.current
        ? [...availableImages].sort(() => Math.random() - 0.5).slice(0, configuredMaxRounds.current)
        : availableImages;
      
      setImages(selectedImages);
      
      // Initialize new game state
      const newGameState = {
        currentRound: 1,
        currentImageIndex: 0,
        gameComplete: false,
        images: selectedImages
      };
      
      // Save to localStorage
      localStorage.setItem('currentGameState', JSON.stringify(newGameState));
    }
  }, [defaultImages]);
  
  // Save game state whenever it changes
  useEffect(() => {
    if (images.length > 0) {
      const currentGameState = {
        currentRound,
        currentImageIndex,
        gameComplete,
        images
      };
      localStorage.setItem('currentGameState', JSON.stringify(currentGameState));
      console.log('Saved game state:', currentGameState);
    }
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
    
    // Prioritize Supabase images if available
    const imagesToUse = supabaseImages.length > 0 ? supabaseImages : defaultImages;
    
    // Select new random images for the game
    const newImages = selectRandomImages(imagesToUse);
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
