
import { Coordinates } from '@/types/game';

// Define the threshold for "perfect" location guess in kilometers
const PERFECT_LOCATION_THRESHOLD = 200;

/**
 * Determines if the guessed location is close enough to the actual location
 * to be considered "perfect"
 */
export const isPerfectLocation = (
  guessedLocation: Coordinates,
  actualLocation: Coordinates,
  threshold = PERFECT_LOCATION_THRESHOLD
): boolean => {
  // Calculate distance between the two points
  const R = 6371; // Earth's radius in km
  const dLat = (actualLocation.lat - guessedLocation.lat) * Math.PI / 180;
  const dLng = (actualLocation.lng - guessedLocation.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(guessedLocation.lat * Math.PI / 180) * Math.cos(actualLocation.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance < threshold;
};

/**
 * Determines if the guessed year matches the actual year exactly
 */
export const isPerfectYear = (guessedYear: number, actualYear: number): boolean => {
  return guessedYear === actualYear;
};

/**
 * Determines if both location and year are perfect (combo achievement)
 */
export const isPerfectCombo = (perfectLocation: boolean, perfectYear: boolean): boolean => {
  return perfectLocation && perfectYear;
};

/**
 * Updates the user's achievement counts in localStorage
 */
export const updateUserAchievements = (
  isPerfectLoc: boolean,
  isPerfectYr: boolean
): void => {
  const userAchievements = localStorage.getItem('userAchievements');
  let achievements = {
    locationCount: 0,
    yearCount: 0,
    comboCount: 0
  };
  
  if (userAchievements) {
    try {
      achievements = JSON.parse(userAchievements);
    } catch (error) {
      console.error('Error parsing user achievements:', error);
    }
  }
  
  if (isPerfectLoc) {
    achievements.locationCount = (achievements.locationCount || 0) + 1;
  }
  
  if (isPerfectYr) {
    achievements.yearCount = (achievements.yearCount || 0) + 1;
  }
  
  if (isPerfectLoc && isPerfectYr) {
    achievements.comboCount = (achievements.comboCount || 0) + 1;
  }
  
  localStorage.setItem('userAchievements', JSON.stringify(achievements));
};

/**
 * Gets the user's achievement counts from localStorage
 */
export const getUserAchievements = () => {
  const userAchievements = localStorage.getItem('userAchievements');
  let achievements = {
    locationCount: 0,
    yearCount: 0,
    comboCount: 0
  };
  
  if (userAchievements) {
    try {
      achievements = JSON.parse(userAchievements);
    } catch (error) {
      console.error('Error parsing user achievements:', error);
    }
  }
  
  return achievements;
};
