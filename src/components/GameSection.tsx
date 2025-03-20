
import { useState } from 'react';
import { Maps, Clock, Globe, ArrowRight, X, CheckCircle } from 'lucide-react';
import YearSlider from './YearSlider';
import MapComponent from './MapComponent';
import HistoricalImage from './HistoricalImage';
import ScoreDisplay from './ScoreDisplay';

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

const GameSection = () => {
  const [activeTab, setActiveTab] = useState<'image' | 'map'>('image');
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
      // Show error
      return;
    }
    
    setShowResults(true);
  };
  
  const handleReset = () => {
    setSelectedLocation(null);
    setSelectedYear(1960);
    setShowResults(false);
    setActiveTab('image');
    setCurrentImageIndex((currentImageIndex + 1) % sampleImages.length);
  };
  
  const { locationScore, yearScore, distanceKm, yearDifference } = calculateScores();

  return (
    <section id="game" className="py-20 bg-gradient-to-b from-background to-secondary/30">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Play EventGuesser</h2>
          <p className="max-w-2xl mx-auto text-muted-foreground">
            View the historical image, then guess when and where it was taken. Your score depends on how accurate your guesses are.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          {/* Game interface */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Game panel - takes up 3 columns on desktop */}
            <div className="md:col-span-3 glass-card rounded-2xl overflow-hidden">
              <div className="h-[500px] relative">
                {/* Tab buttons */}
                <div className="absolute top-4 left-0 right-0 z-10 flex justify-center">
                  <div className="bg-black/30 backdrop-blur-md rounded-full p-1 flex">
                    <button
                      onClick={() => setActiveTab('image')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        activeTab === 'image'
                          ? 'bg-white text-black'
                          : 'text-white/90 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1.5" />
                        Image
                      </span>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('map')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        activeTab === 'map'
                          ? 'bg-white text-black'
                          : 'text-white/90 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center">
                        <Maps className="h-4 w-4 mr-1.5" />
                        Map
                      </span>
                    </button>
                  </div>
                </div>
                
                {/* Image view */}
                <div className={`absolute inset-0 transition-all duration-500 ${
                  activeTab === 'image' ? 'opacity-100 z-[1]' : 'opacity-0 z-0'
                }`}>
                  <HistoricalImage src={currentImage.src} />
                </div>
                
                {/* Map view */}
                <div className={`absolute inset-0 transition-all duration-500 ${
                  activeTab === 'map' ? 'opacity-100 z-[1]' : 'opacity-0 z-0'
                }`}>
                  <MapComponent onLocationSelect={(lat, lng) => setSelectedLocation({ lat, lng })} />
                </div>
              </div>
              
              {/* Controls section */}
              <div className="p-6 border-t border-border bg-white/50">
                <div className="mb-4">
                  <YearSlider onChange={setSelectedYear} />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-sm">
                    {selectedLocation ? (
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Location selected
                      </span>
                    ) : (
                      <span className="flex items-center text-amber-600">
                        <X className="h-4 w-4 mr-1" />
                        No location selected
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedLocation}
                    className={`px-5 py-2.5 rounded-lg flex items-center ${
                      selectedLocation
                        ? 'bg-primary text-primary-foreground btn-transition hover:shadow-md hover:brightness-110'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    Submit Guess
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Results or game info panel - takes up 2 columns on desktop */}
            <div className="md:col-span-2">
              {showResults ? (
                <ScoreDisplay
                  isVisible={showResults}
                  locationScore={locationScore}
                  yearScore={yearScore}
                  actualLocation={currentImage.location}
                  guessedLocation={selectedLocation ?? undefined}
                  actualYear={currentImage.year}
                  guessedYear={selectedYear}
                  distanceKm={distanceKm}
                  yearDifference={yearDifference}
                />
              ) : (
                <div className="glass-card p-6 h-full">
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                        <Globe className="h-6 w-6 text-primary" />
                      </div>
                      
                      <h3 className="text-xl font-bold mb-2">How to Play</h3>
                      
                      <div className="space-y-4 text-sm">
                        <div className="flex items-start gap-2">
                          <div className="flex items-center justify-center rounded-full bg-primary/10 w-6 h-6 text-primary shrink-0 mt-0.5">1</div>
                          <p>Look at the historical image and try to recognize the location and time period.</p>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <div className="flex items-center justify-center rounded-full bg-primary/10 w-6 h-6 text-primary shrink-0 mt-0.5">2</div>
                          <p>Switch to the map and drop a pin where you think the photo was taken.</p>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <div className="flex items-center justify-center rounded-full bg-primary/10 w-6 h-6 text-primary shrink-0 mt-0.5">3</div>
                          <p>Use the slider to select the year when you think the photo was taken.</p>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <div className="flex items-center justify-center rounded-full bg-primary/10 w-6 h-6 text-primary shrink-0 mt-0.5">4</div>
                          <p>Submit your guess and see how accurate you were!</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-4">
                      <h4 className="text-sm font-medium">Scoring System</h4>
                      <div className="flex gap-3 items-center text-xs text-muted-foreground">
                        <div className="flex-1 flex items-center">
                          <Maps className="h-4 w-4 mr-1 text-primary" />
                          <p>5,000 pts for perfect location</p>
                        </div>
                        <div className="flex-1 flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-primary" />
                          <p>5,000 pts for exact year</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Actions for next game */}
          {showResults && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-primary/30 rounded-full text-primary hover:bg-primary/5 transition-colors"
              >
                Try Another Image
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

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

export default GameSection;
