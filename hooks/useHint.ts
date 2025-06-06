
import { useState, useEffect } from 'react';

export type HintType = 'where' | 'when' | 'what' | null;

interface HintState {
  selectedHintType: HintType;
  hintContent: string | null;
}

// Mock data for development - in a real implementation this would come from props or context
const mockImageData = {
  location_name: "Berlin, Germany",
  gps: { lat: 52.5200, lng: 13.4050 },
  year: 1989,
  title: "Fall of the Berlin Wall",
  description: "Historic moment when the Berlin Wall was dismantled, marking the reunification of East and West Germany."
};

// Helper functions to generate hint content
const getRegionHint = (data: typeof mockImageData): string => {
  // In a real implementation, you might use a geo library to determine the region
  // For now, using a simplified mapping based on location name or coordinates
  if (data.location_name.includes("Berlin")) return "Central Europe";
  if (data.location_name.includes("Paris")) return "Western Europe";
  if (data.location_name.includes("Tokyo")) return "East Asia";
  // Default fallback
  return "Europe";
};

const getDecadeHint = (data: typeof mockImageData): string => {
  const decade = Math.floor(data.year / 10) * 10;
  return `${decade}s`;
};

const getDescriptionHint = (data: typeof mockImageData): string => {
  // Remove specific location and date references
  let description = data.description;
  
  // Remove location references (simple approach, could be more sophisticated)
  description = description.replace(/\b(in|at|near|from|to)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/g, "in this location");
  description = description.replace(/\b[A-Z][a-z]+(,\s+[A-Z][a-z]+)*/g, "this location");
  
  // Remove year references
  description = description.replace(/\b(19|20)\d{2}\b/g, "during this time");
  
  return description;
};

export const useHint = (imageData = mockImageData) => {
  // Initialize with values from localStorage if they exist
  const [hintState, setHintState] = useState<HintState>(() => {
    const savedHint = localStorage.getItem('currentHint');
    return savedHint ? JSON.parse(savedHint) : {
      selectedHintType: null,
      hintContent: null
    };
  });

  // Save to localStorage whenever the hint state changes
  useEffect(() => {
    if (hintState.selectedHintType) {
      localStorage.setItem('currentHint', JSON.stringify(hintState));
    }
  }, [hintState]);

  const selectHint = (hintType: HintType) => {
    if (hintState.selectedHintType) return; // Already selected a hint for this round

    let content: string | null = null;
    
    switch (hintType) {
      case 'where':
        content = getRegionHint(imageData);
        break;
      case 'when':
        content = getDecadeHint(imageData);
        break;
      case 'what':
        content = getDescriptionHint(imageData);
        break;
      default:
        content = null;
    }

    setHintState({
      selectedHintType: hintType,
      hintContent: content
    });
  };

  const resetHint = () => {
    localStorage.removeItem('currentHint');
    setHintState({
      selectedHintType: null,
      hintContent: null
    });
  };

  return {
    selectedHintType: hintState.selectedHintType,
    hintContent: hintState.hintContent,
    selectHint,
    resetHint
  };
};
