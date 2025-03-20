
// Helper function to calculate distance between two coordinates in kilometers
export const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

// Calculate scores based on guesses
export const calculateScores = (
  selectedLocation: { lat: number; lng: number } | null,
  selectedYear: number,
  currentImage: { location: { lat: number; lng: number }; year: number },
  locationHintUsed: boolean,
  yearHintUsed: boolean
) => {
  if (!selectedLocation) return { locationScore: 0, yearScore: 0, distanceKm: 0, yearDifference: 0, hintPenalty: 0 };
  
  // Calculate distance in kilometers using Haversine formula
  const distance = getDistanceFromLatLonInKm(
    selectedLocation.lat,
    selectedLocation.lng,
    currentImage.location.lat,
    currentImage.location.lng
  );
  
  // Calculate location score (max 5000 points, decreasing by distance)
  const locationScore = Math.max(0, 5000 - Math.round(distance));
  
  // Calculate year difference
  const yearDiff = Math.abs(selectedYear - currentImage.year);
  
  // Calculate year score (max 5000 points, losing 100 per year off)
  const yearScore = Math.max(0, 5000 - yearDiff * 100);
  
  // Calculate hint penalty (500 points per hint used)
  const hintPenalty = (locationHintUsed ? 500 : 0) + (yearHintUsed ? 500 : 0);
  
  return { 
    locationScore, 
    yearScore, 
    distanceKm: distance, 
    yearDifference: yearDiff,
    hintPenalty
  };
};
