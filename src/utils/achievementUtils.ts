
import { HistoricalImage, Coordinates } from '@/types/game';

export interface Achievements {
  perfectLocations: number;
  perfectYears: number;
  perfectCombos: number;
}

export const calculateDistanceInKm = (
  point1: Coordinates,
  point2: Coordinates
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (point2.lat - point1.lat) * (Math.PI / 180);
  const dLon = (point2.lng - point1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * (Math.PI / 180)) *
      Math.cos(point2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const isPerfectLocation = (
  selected: Coordinates,
  actual: Coordinates,
  threshold: number = 5 // Default threshold in km
): boolean => {
  const distance = calculateDistanceInKm(selected, actual);
  return distance <= threshold;
};

export const isPerfectYear = (
  selectedYear: number,
  actualYear: number
): boolean => {
  return selectedYear === actualYear;
};

export const isPerfectCombo = (
  isPerfectLoc: boolean,
  isPerfectYr: boolean
): boolean => {
  return isPerfectLoc && isPerfectYr;
};

export const getUserAchievements = (): Achievements => {
  try {
    const stored = localStorage.getItem('userAchievements');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error getting user achievements', e);
  }
  
  return {
    perfectLocations: 0,
    perfectYears: 0,
    perfectCombos: 0
  };
};

export const updateUserAchievements = (
  isPerfectLoc: boolean,
  isPerfectYr: boolean
): Achievements => {
  const achievements = getUserAchievements();
  
  if (isPerfectLoc) {
    achievements.perfectLocations += 1;
  }
  
  if (isPerfectYr) {
    achievements.perfectYears += 1;
  }
  
  if (isPerfectLoc && isPerfectYr) {
    achievements.perfectCombos += 1;
  }
  
  localStorage.setItem('userAchievements', JSON.stringify(achievements));
  return achievements;
};
