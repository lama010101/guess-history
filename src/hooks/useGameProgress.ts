
import { useState, useEffect } from 'react';
import { RoundScore } from '@/types/game';

export const useGameProgress = (initialGameComplete = false) => {
  const [showResults, setShowResults] = useState(false);
  const [gameComplete, setGameComplete] = useState(initialGameComplete);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(1960);

  // Load game progress from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('currentGameState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.selectedLocation) {
          setSelectedLocation(state.selectedLocation);
        }
        if (state.selectedYear) {
          setSelectedYear(state.selectedYear);
        }
        if (state.showResults !== undefined) {
          setShowResults(state.showResults);
        }
        if (state.gameComplete !== undefined) {
          setGameComplete(state.gameComplete);
        }
      } catch (error) {
        console.error('Error loading saved game state:', error);
      }
    }
  }, []);

  // Save game progress to localStorage whenever it changes
  useEffect(() => {
    const savedState = localStorage.getItem('currentGameState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        const updatedState = {
          ...state,
          selectedLocation,
          selectedYear,
          showResults,
          gameComplete
        };
        localStorage.setItem('currentGameState', JSON.stringify(updatedState));
      } catch (error) {
        console.error('Error saving game state:', error);
      }
    }
  }, [selectedLocation, selectedYear, showResults, gameComplete]);

  return {
    selectedLocation,
    selectedYear,
    showResults,
    gameComplete,
    setSelectedLocation,
    setSelectedYear,
    setShowResults,
    setGameComplete
  };
};
