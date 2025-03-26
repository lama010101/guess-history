
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useHints = () => {
  const [hintCoins, setHintCoins] = useState(0);
  const [locationHintUsed, setLocationHintUsed] = useState(false);
  const [yearHintUsed, setYearHintUsed] = useState(false);
  const [persistentHints, setPersistentHints] = useState({
    location: { used: false, data: null },
    year: { used: false, data: null }
  });
  const { toast } = useToast();
  
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
    setPersistentHints({
      location: { used: false, data: null },
      year: { used: false, data: null }
    });
  };
  
  // Hint handlers
  const handleUseLocationHint = (): boolean => {
    if (hintCoins > 0 && !locationHintUsed) {
      setLocationHintUsed(true);
      setHintCoins(prev => prev - 1);
      
      // Save the hint state persistently
      setPersistentHints(prev => ({
        ...prev,
        location: { used: true, data: null }
      }));
      
      return true;
    }
    if (hintCoins <= 0) {
      toast({
        title: "No hint coins left",
        description: "You don't have enough hint coins to use this hint.",
        variant: "destructive"
      });
    }
    return false;
  };
  
  const handleUseYearHint = (): boolean => {
    if (hintCoins > 0 && !yearHintUsed) {
      setYearHintUsed(true);
      setHintCoins(prev => prev - 1);
      
      // Save the hint state persistently
      setPersistentHints(prev => ({
        ...prev,
        year: { used: true, data: null }
      }));
      
      return true;
    }
    if (hintCoins <= 0) {
      toast({
        title: "No hint coins left",
        description: "You don't have enough hint coins to use this hint.",
        variant: "destructive"
      });
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
    persistentHints,
    resetHints,
    handleUseLocationHint,
    handleUseYearHint,
    addHintCoins
  };
};
