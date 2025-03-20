
import { useState } from 'react';
import GamePanel from './game/GamePanel';
import GameControls from './game/GameControls';
import GameResult from './game/GameResult';

// Sample historical images
const sampleImages = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1565711561500-49678a10a63f?q=80&w=2940&auto=format&fit=crop',
    year: 1950,
    location: { lat: 48.8584, lng: 2.2945 },
    description: 'Eiffel Tower, Paris'
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1568797629192-789acf8e4df3?q=80&w=3174&auto=format&fit=crop',
    year: 1932,
    location: { lat: 40.7484, lng: -73.9857 },
    description: 'Empire State Building, New York'
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1526711657229-e7e080961425?q=80&w=2832&auto=format&fit=crop',
    year: 1969,
    location: { lat: 37.8199, lng: -122.4783 },
    description: 'Golden Gate Bridge, San Francisco'
  }
];

// Helper function to calculate distance between two coordinates in kilometers
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

const GameSection = () => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(1960);
  const [showResults, setShowResults] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const currentImage = sampleImages[currentImageIndex];
  
  // Calculate scores based on guesses
  const calculateScores = () => {
    if (!selectedLocation || !currentImage) return { locationScore: 0, yearScore: 0 };
    
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
    
    return { 
      locationScore, 
      yearScore, 
      distanceKm: distance, 
      yearDifference: yearDiff 
    };
  };
  
  const handleSubmit = () => {
    if (!selectedLocation) {
      return;
    }
    
    setShowResults(true);
  };
  
  const handleNextRound = () => {
    setSelectedLocation(null);
    setSelectedYear(1960);
    setShowResults(false);
    setCurrentImageIndex((currentImageIndex + 1) % sampleImages.length);
  };
  
  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
  };
  
  const { locationScore, yearScore, distanceKm, yearDifference } = calculateScores();

  return (
    <section id="game" className="h-full flex flex-col">
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <GamePanel 
            currentImage={currentImage} 
            onLocationSelect={handleLocationSelect} 
          />
        </div>
        
        <div className="bg-background border-t border-border shadow-lg">
          <GameControls 
            selectedLocation={selectedLocation}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            onSubmit={handleSubmit}
          />
        </div>
        
        {showResults && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <GameResult 
              isVisible={showResults}
              locationScore={locationScore}
              yearScore={yearScore}
              actualLocation={currentImage.location}
              guessedLocation={selectedLocation ?? undefined}
              actualYear={currentImage.year}
              guessedYear={selectedYear}
              distanceKm={distanceKm}
              yearDifference={yearDifference}
              onNextRound={handleNextRound}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default GameSection;
