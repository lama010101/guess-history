
import { useState, useEffect } from 'react';
import { RoundScore } from '@/types/game';
import { getDistanceFromLatLonInKm } from '@/utils/scoreCalculations';

interface ScoringParams {
  maxLocationScore?: number;
  maxYearScore?: number;
  locationScalingFactor?: number;
  yearScalingFactor?: number;
  perfectScoreBonus?: number;
  hintPenalty?: number;
}

export const useGameScoring = (defaultParams: ScoringParams = {}) => {
  const [params, setParams] = useState({
    maxLocationScore: defaultParams.maxLocationScore || 5000,
    maxYearScore: defaultParams.maxYearScore || 5000,
    locationScalingFactor: defaultParams.locationScalingFactor || 1,
    yearScalingFactor: defaultParams.yearScalingFactor || 100,
    perfectScoreBonus: defaultParams.perfectScoreBonus || 500,
    hintPenalty: defaultParams.hintPenalty || 500
  });
  
  const [totalScore, setTotalScore] = useState(0);
  const [roundScores, setRoundScores] = useState<RoundScore[]>([]);
  
  // Load scoring parameters from localStorage if available
  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings) {
          setParams({
            maxLocationScore: settings.maxLocationScore || params.maxLocationScore,
            maxYearScore: settings.maxYearScore || params.maxYearScore,
            locationScalingFactor: settings.locationScalingFactor || params.locationScalingFactor,
            yearScalingFactor: settings.yearScalingFactor || params.yearScalingFactor,
            perfectScoreBonus: settings.perfectScoreBonus || params.perfectScoreBonus,
            hintPenalty: settings.hintPenalty || params.hintPenalty
          });
        }
      } catch (error) {
        console.error('Error loading game settings:', error);
      }
    }
  }, []);
  
  // Calculate location score
  const calculateLocationScore = (
    guessedLocation: { lat: number; lng: number },
    actualLocation: { lat: number; lng: number }
  ) => {
    // Calculate distance in kilometers
    const distance = getDistanceFromLatLonInKm(
      guessedLocation.lat,
      guessedLocation.lng,
      actualLocation.lat,
      actualLocation.lng
    );
    
    // Calculate location score (max points, decreasing by distance)
    return Math.max(0, params.maxLocationScore - Math.round(distance * params.locationScalingFactor));
  };
  
  // Calculate year score
  const calculateYearScore = (guessedYear: number, actualYear: number) => {
    // Calculate year difference
    const yearDiff = Math.abs(guessedYear - actualYear);
    
    // Calculate year score (max points, losing points per year off)
    return Math.max(0, params.maxYearScore - yearDiff * params.yearScalingFactor);
  };
  
  // Calculate a complete score for a round
  const calculateRoundScore = (
    guessedLocation: { lat: number; lng: number } | null,
    guessedYear: number,
    actualLocation: { lat: number; lng: number },
    actualYear: number,
    locationHintUsed: boolean,
    yearHintUsed: boolean
  ) => {
    if (!guessedLocation) return {
      locationScore: 0,
      yearScore: 0,
      distanceKm: 0,
      yearDifference: 0,
      hintPenalty: 0,
      totalRoundScore: 0
    };
    
    // Calculate distance and year difference
    const distance = getDistanceFromLatLonInKm(
      guessedLocation.lat,
      guessedLocation.lng,
      actualLocation.lat,
      actualLocation.lng
    );
    const yearDiff = Math.abs(guessedYear - actualYear);
    
    // Calculate scores
    const locationScore = calculateLocationScore(guessedLocation, actualLocation);
    const yearScore = calculateYearScore(guessedYear, actualYear);
    
    // Calculate hint penalty
    const totalHintPenalty = (locationHintUsed ? params.hintPenalty : 0) + (yearHintUsed ? params.hintPenalty : 0);
    
    // Calculate perfect score bonus (if both location and year are perfect)
    const isPerfectLocation = distance < 0.1; // Less than 100 meters
    const isPerfectYear = yearDiff === 0;
    const bonus = isPerfectLocation && isPerfectYear ? params.perfectScoreBonus : 0;
    
    // Calculate total round score
    const totalRoundScore = locationScore + yearScore + bonus - totalHintPenalty;
    
    return {
      locationScore,
      yearScore,
      distanceKm: distance,
      yearDifference: yearDiff,
      hintPenalty: totalHintPenalty,
      bonus,
      totalRoundScore
    };
  };
  
  // Add score for a round
  const addRoundScore = (
    imageIndex: number,
    locationScore: number,
    yearScore: number,
    locationHintUsed: boolean,
    yearHintUsed: boolean,
    hintPenalty: number
  ) => {
    const roundScore: RoundScore = {
      locationScore,
      yearScore,
      image: imageIndex,
      locationHintUsed,
      yearHintUsed,
      hintPenalty
    };
    
    setRoundScores(prevScores => [...prevScores, roundScore]);
    
    // Add to total score
    const roundTotal = locationScore + yearScore - hintPenalty;
    setTotalScore(prevTotal => prevTotal + roundTotal);
    
    return roundTotal;
  };
  
  // Reset scores
  const resetScores = () => {
    setTotalScore(0);
    setRoundScores([]);
  };
  
  return {
    totalScore,
    roundScores,
    calculateLocationScore,
    calculateYearScore,
    calculateRoundScore,
    addRoundScore,
    resetScores
  };
};
