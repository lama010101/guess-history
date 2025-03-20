
import { useState } from 'react';

export const useHints = (initialCoins = 10) => {
  const [hintCoins, setHintCoins] = useState(initialCoins);
  const [locationHintUsed, setLocationHintUsed] = useState(false);
  const [yearHintUsed, setYearHintUsed] = useState(false);
  
  // Reset hints when moving to a new round
  const resetHints = () => {
    setLocationHintUsed(false);
    setYearHintUsed(false);
  };
  
  // Hint handlers
  const handleUseLocationHint = () => {
    if (hintCoins > 0) {
      setLocationHintUsed(true);
      setHintCoins(prev => prev - 1);
    }
  };
  
  const handleUseYearHint = () => {
    if (hintCoins > 0) {
      setYearHintUsed(true);
      setHintCoins(prev => prev - 1);
    }
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
