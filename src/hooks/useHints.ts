
import { useState, useEffect } from 'react';

export const useHints = (initialCoins = 10) => {
  const [hintCoins, setHintCoins] = useState(initialCoins);
  const [locationHintUsed, setLocationHintUsed] = useState(false);
  const [yearHintUsed, setYearHintUsed] = useState(false);
  
  // Load initial coins from localStorage if available
  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings && typeof settings.initialHintCoins === 'number') {
          setHintCoins(settings.initialHintCoins);
        }
      } catch (error) {
        console.error('Error loading game settings:', error);
      }
    }
  }, []);
  
  // Reset hints when moving to a new round
  const resetHints = () => {
    setLocationHintUsed(false);
    setYearHintUsed(false);
  };
  
  // Hint handlers
  const handleUseLocationHint = () => {
    if (hintCoins > 0 && !locationHintUsed) {
      setLocationHintUsed(true);
      setHintCoins(prev => prev - 1);
      return true;
    }
    return false;
  };
  
  const handleUseYearHint = () => {
    if (hintCoins > 0 && !yearHintUsed) {
      setYearHintUsed(true);
      setHintCoins(prev => prev - 1);
      return true;
    }
    return false;
  };

  const addHintCoins = (amount: number) => {
    setHintCoins(prev => prev + amount);
  };

  return {
    hintCoins,
    locationHintUsed,
    yearHintUsed,
    resetHints,
    handleUseLocationHint,
    handleUseYearHint,
    addHintCoins
  };
};
