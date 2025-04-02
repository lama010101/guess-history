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

  useEffect(() => {
    if (!loadingSupabaseImages && supabaseImages.length > 0) {
      console.log('Using Supabase images for the game:', supabaseImages.length);
      if (!hasInitialized.current || images.length === 0) {
        const newImages = selectRandomImages(supabaseImages);
        setImages(newImages);
        
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
  
  const selectRandomImages = (availableImages: HistoricalImage[]) => {
    if (availableImages.length > configuredMaxRounds.current) {
      const shuffledImages = availableImages.sort(() => Math.random() - 0.5);
      return shuffledImages.slice(0, configuredMaxRounds.current);
    } else {
      return availableImages;
    }
  };
  
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    const savedGameState = localStorage.getItem('currentGameState');
    if (savedGameState) {
      try {
        const gameState = JSON.parse(savedGameState);
        if (gameState && gameState.images && gameState.images.length > 0) {
          setCurrentRound(gameState.currentRound || 1);
          setCurrentImageIndex(gameState.currentImageIndex || 0);
          setGameComplete(gameState.gameComplete || false);
          setImages(gameState.images);
          console.log('Loaded saved game state:', gameState);
          return;
        }
      } catch (error) {
        console.error('Error loading game state:', error);
      }
    }
    
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
    
    if (availableImages.length > 0) {
      const selectedImages = availableImages.length > configuredMaxRounds.current
        ? [...availableImages].sort(() => Math.random() - 0.5).slice(0, configuredMaxRounds.current)
        : availableImages;
      
      setImages(selectedImages);
      
      const newGameState = {
        currentRound: 1,
        currentImageIndex: 0,
        gameComplete: false,
        images: selectedImages
      };
      
      localStorage.setItem('currentGameState', JSON.stringify(newGameState));
    }
  }, [defaultImages]);
  
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
  
  const currentImage = images.length > 0 
    ? images[currentImageIndex] 
    : defaultImages[0];
  
  const nextRound = () => {
    if (currentRound >= configuredMaxRounds.current) {
      setGameComplete(true);
      return;
    }
    
    setCurrentRound(prevRound => prevRound + 1);
    setCurrentImageIndex(prevIndex => prevIndex + 1);
  };
  
  const resetGame = () => {
    setCurrentRound(1);
    setCurrentImageIndex(0);
    setGameComplete(false);
    
    const imagesToUse = supabaseImages.length > 0 ? supabaseImages : defaultImages;
    
    const newImages = selectRandomImages(imagesToUse);
    setImages(newImages);
    
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
