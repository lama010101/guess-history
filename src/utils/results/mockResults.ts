
/**
 * Mock result generation utilities
 */

import { RoundResult } from './types';
import { 
  calculateDistanceKm, 
  calculateLocationAccuracy, 
  calculateTimeAccuracy, 
  calculateXP,
  getTimeDifferenceDescription
} from '@/utils/gameCalculations';
import { 
  PLACEHOLDER_IMAGES, 
  findPlaceholderImageById,
  generatePlaceholderGuess 
} from './placeholderData';
import { MAX_RADIUS_KM, MAX_YEARS_DIFFERENCE, XP_WHERE_MAX, XP_WHEN_MAX } from './types';

/**
 * Helper function to generate results from a stored guess object
 */
export function generateResultFromStoredGuess(guess: any): { result: RoundResult, error: null } {
  // Use the image ID from the guess to find the corresponding placeholder image
  const mockImage = findPlaceholderImageById(guess.imageId) || {
    id: guess.imageId || `mock_${Date.now()}`,
    title: "Paris, France",
    description: "This historical photograph shows the Eiffel Tower shortly after its completion for the 1889 World's Fair. The tower was initially criticized by some of France's leading artists and intellectuals but has since become a global icon of France and one of the most recognizable structures in the world.",
    image_url: "https://source.unsplash.com/random/?eiffel+tower,paris,historical",
    year: 1889,
    latitude: 48.8584,
    longitude: 2.2945,
    location_name: "Paris, France"
  };
  
  // Generate a result using the stored guess and either real or mock image data
  const distanceKm = calculateDistanceKm(
    guess.guessLat, 
    guess.guessLng, 
    mockImage.latitude, 
    mockImage.longitude
  );
  
  const yearDifference = Math.abs(guess.guessYear - mockImage.year);
  const locationAccuracy = calculateLocationAccuracy(distanceKm, MAX_RADIUS_KM);
  const timeAccuracy = calculateTimeAccuracy(guess.guessYear, mockImage.year, MAX_YEARS_DIFFERENCE);
  const { xpWhere, xpWhen, xpTotal } = calculateXP(locationAccuracy, timeAccuracy, XP_WHERE_MAX, XP_WHEN_MAX);
  const timeDifferenceDesc = getTimeDifferenceDescription(guess.guessYear, mockImage.year);
  
  const mockResult: RoundResult = {
    imageId: mockImage.id,
    imageTitle: mockImage.title,
    imageDescription: mockImage.description,
    imageUrl: mockImage.image_url,
    eventYear: mockImage.year,
    eventLat: mockImage.latitude,
    eventLng: mockImage.longitude,
    locationName: mockImage.location_name,
    guessYear: guess.guessYear,
    guessLat: guess.guessLat,
    guessLng: guess.guessLng,
    distanceKm,
    yearDifference,
    locationAccuracy,
    timeAccuracy,
    xpWhere,
    xpWhen,
    xpTotal,
    timeDifferenceDesc
  };
  
  return { result: mockResult, error: null };
}

/**
 * Helper function to generate a mock result when real data isn't available
 */
export function generateMockResult(): { result: RoundResult, error: null } {
  // Get a random placeholder image
  const mockImage = PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];
  
  // Generate random user guess data that's somewhat close to correct
  const guessYearVariance = Math.floor(Math.random() * 20) - 10; // +/- 10 years
  const guessLatVariance = (Math.random() * 2 - 1) * 2; // +/- 2 degrees
  const guessLngVariance = (Math.random() * 2 - 1) * 2; // +/- 2 degrees
  
  const mockGuess = {
    guess_year: mockImage.year + guessYearVariance,
    guess_lat: mockImage.latitude + guessLatVariance,
    guess_lng: mockImage.longitude + guessLngVariance
  };
  
  // Calculate results
  const distanceKm = calculateDistanceKm(
    mockGuess.guess_lat, 
    mockGuess.guess_lng, 
    mockImage.latitude, 
    mockImage.longitude
  );
  
  const yearDifference = Math.abs(mockGuess.guess_year - mockImage.year);
  const locationAccuracy = calculateLocationAccuracy(distanceKm, MAX_RADIUS_KM);
  const timeAccuracy = calculateTimeAccuracy(mockGuess.guess_year, mockImage.year, MAX_YEARS_DIFFERENCE);
  const { xpWhere, xpWhen, xpTotal } = calculateXP(locationAccuracy, timeAccuracy, XP_WHERE_MAX, XP_WHEN_MAX);
  const timeDifferenceDesc = getTimeDifferenceDescription(mockGuess.guess_year, mockImage.year);
  
  const mockResult: RoundResult = {
    imageId: mockImage.id,
    imageTitle: mockImage.title,
    imageDescription: mockImage.description,
    imageUrl: mockImage.image_url,
    eventYear: mockImage.year,
    eventLat: mockImage.latitude,
    eventLng: mockImage.longitude,
    locationName: mockImage.location_name,
    guessYear: mockGuess.guess_year,
    guessLat: mockGuess.guess_lat,
    guessLng: mockGuess.guess_lng,
    distanceKm,
    yearDifference,
    locationAccuracy,
    timeAccuracy,
    xpWhere,
    xpWhen,
    xpTotal,
    timeDifferenceDesc
  };
  
  return { result: mockResult, error: null };
}

/**
 * Helper function to generate a result from image and guess data
 */
export function generateResultWithImageData(imageData: any, guessData: any): { result: RoundResult, error: null } {
  // Calculate results
  const eventYear = imageData.year;
  const eventLat = imageData.latitude;
  const eventLng = imageData.longitude;
  const guessYear = guessData.guess_year;
  const guessLat = guessData.guess_lat;
  const guessLng = guessData.guess_lon;
  
  const distanceKm = calculateDistanceKm(guessLat, guessLng, eventLat, eventLng);
  const yearDifference = Math.abs(guessYear - eventYear);
  const locationAccuracy = calculateLocationAccuracy(distanceKm, MAX_RADIUS_KM);
  const timeAccuracy = calculateTimeAccuracy(guessYear, eventYear, MAX_YEARS_DIFFERENCE);
  const { xpWhere, xpWhen, xpTotal } = calculateXP(
    locationAccuracy, 
    timeAccuracy, 
    XP_WHERE_MAX, 
    XP_WHEN_MAX
  );
  const timeDifferenceDesc = getTimeDifferenceDescription(guessYear, eventYear);
  
  // Set the result object with rounded values
  const result: RoundResult = {
    imageId: imageData.id,
    imageTitle: imageData.title,
    imageDescription: imageData.description,
    imageUrl: imageData.image_url,
    eventYear,
    eventLat,
    eventLng,
    locationName: imageData.location_name,
    guessYear,
    guessLat,
    guessLng,
    distanceKm: Math.round(distanceKm),
    yearDifference: Math.round(yearDifference),
    locationAccuracy: Math.round(locationAccuracy),
    timeAccuracy: Math.round(timeAccuracy),
    xpWhere,
    xpWhen,
    xpTotal,
    timeDifferenceDesc
  };
  
  return { result, error: null };
}
