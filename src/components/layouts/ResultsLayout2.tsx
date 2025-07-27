import React, { useEffect, useState } from 'react';
import { formatInteger } from '@/utils/format';
import { Button } from "@/components/ui/button";
import LazyImage from '@/components/ui/LazyImage';
// Remove Progress component if no longer used
// import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight,
  Award,
  Share2,
  MapPin,
  Calendar,
  Star,
  Target,
  Zap,
  Home
} from "lucide-react";
import ResultsHeader from "@/components/results/ResultsHeader";
// Import the specific RoundResult type this component uses
import { RoundResult, XP_WHERE_MAX, XP_WHEN_MAX } from '@/utils/resultsFetching';
// import { HINT_PENALTY } from '@/hooks/useHint'; // Legacy, removed
// TODO: Replace with V2 hint constants if needed

// Update RoundResult to include hint-related fields
declare module '@/utils/resultsFetching' {
  interface RoundResult {
    placeholderUrl?: string;
    hintsUsed?: number;
    hintPenalty?: number;
    hintPenaltyPercent?: number;
  }
} 

// Import Leaflet components and CSS
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Polyline } from 'react-leaflet';
import { FullscreenControl } from 'react-leaflet-fullscreen';
import 'react-leaflet-fullscreen/styles.css';
import 'leaflet/dist/leaflet.css';
// Import Leaflet's default icon handling (important for markers)
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Import the new CircularProgress component
import CircularProgress from '@/components/ui/CircularProgress';
import { checkAndAwardBadges } from '@/utils/badges/badgeService';
import { Badge as BadgeType } from '@/utils/badges/types';
import { BadgeEarnedPopup } from '@/components/badges/BadgeEarnedPopup';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

// Component to automatically adjust map bounds
const MapBoundsUpdater: React.FC<{ bounds: L.LatLngBoundsExpression }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
};

// Component to handle fullscreen events
const FullscreenHandler: React.FC = () => {
  const map = useMap();
  
  useEffect(() => {
    map.on('enterFullscreen', () => document.body.classList.add('leaflet-fullscreen-on'));
    map.on('exitFullscreen', () => document.body.classList.remove('leaflet-fullscreen-on'));
    
    return () => {
      map.off('enterFullscreen');
      map.off('exitFullscreen');
    };
  }, [map]);
  
  return null;
};

// Define proper props interface
interface ResultsLayout2Props {
  onNext?: () => void;
  onConfirmNavigation?: (navigateTo: () => void) => void;
  round?: number;
  gameId?: string;
  isLoading?: boolean;
  error?: string | null;
  result?: RoundResult | null;
  avatarUrl?: string;
  extraButtons?: React.ReactNode;
}

const ResultsLayout2: React.FC<ResultsLayout2Props> = ({ 
  onNext, 
  onConfirmNavigation,
  round = 1, 
  gameId,
  isLoading = false,
  error,
  result,
  avatarUrl = '/assets/default-avatar.png',
  extraButtons
}) => {
  const { user } = useAuth();
  const [earnedBadge, setEarnedBadge] = useState<BadgeType | null>(null);
  
  // Display an error message if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <ResultsHeader 
          round={round} 
          totalRounds={5} 
          onNext={onNext} 
          isLoading={isLoading} 
          currentRoundXP={result?.xpTotal}
          currentRoundAccuracy={result ? Math.round((result.locationAccuracy + result.timeAccuracy) / 2) : undefined}
        />
        <div className="max-w-7xl mx-auto p-4 pt-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-history-primary dark:text-history-light">
              Oops! Something went wrong
            </h2>
            <p className="mb-6 text-muted-foreground">{error}</p>
            {onNext && (
              <Button 
                className="bg-history-primary hover:bg-history-primary/90 text-white"
                onClick={onNext}
              >
                Continue to Next Round
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If no result is available, show a placeholder
  if (!result) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <ResultsHeader 
          round={round} 
          totalRounds={5} 
          onNext={onNext} 
          isLoading={isLoading} 
        />
        <div className="max-w-7xl mx-auto p-4 pt-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-history-primary dark:text-history-light">
              Failed to load your guess
            </h2>
            {onNext && (
              <Button 
                className="bg-history-primary hover:bg-history-primary/90 text-white"
                onClick={onNext}
              >
                Continue to Next Round
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Use the round information from props
  const progressPercentage = (round / 5) * 100;
  
  // Calculate total accuracy as average of where and when
  // Calculate base totals before penalties
  const totalAccuracy = Math.round((result.locationAccuracy + result.timeAccuracy) / 2);
  const xpTotal = result.xpTotal ?? 0;
  // Hint penalties – these come from the mapped LayoutRoundResultType (already aggregated per-round)
  const xpDebt = result.hintPenalty ?? 0;
  const accDebt = result.hintPenaltyPercent ?? 0;

  // Net values after deducting hint costs (per PRD section 5)
  const netXP = Math.max(0, xpTotal - xpDebt);
  const netAccuracy = Math.max(0, totalAccuracy - accDebt);

  // Calculate net XP for each category, ensuring it doesn't drop below zero.
  const xpWhenRatio = xpTotal > 0 ? result.xpWhen / xpTotal : 0;
  const xpWhereRatio = xpTotal > 0 ? result.xpWhere / xpTotal : 0;

  const xpDebtWhen = Math.round(xpDebt * xpWhenRatio);
  const xpDebtWhere = Math.round(xpDebt * xpWhereRatio);

  const netXpWhen = Math.max(0, result.xpWhen - xpDebtWhen);
  const netXpWhere = Math.max(0, result.xpWhere - xpDebtWhere);
  
  // Max XP possible
  const maxXP = XP_WHERE_MAX + XP_WHEN_MAX;
  
  // Coordinates for the map - handle potential null guess
  const correctLat = result.eventLat;
  const correctLng = result.eventLng;
  const userLat = result.guessLat;
  const userLng = result.guessLng;
  const mapCenter: L.LatLngExpression = [correctLat, correctLng]; // Default center to correct location
  const hasUserGuess = userLat !== null && userLng !== null;
  const bounds = hasUserGuess ? L.latLngBounds([correctLat, correctLng], [userLat, userLng]) : undefined;
  
  // Create custom icons for markers
  const userIcon = new L.DivIcon({ 
    html: `<img src="${avatarUrl || '/assets/default-avatar.png'}" class="rounded-full w-8 h-8 border-2 border-white" alt="Your guess" />`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
  
  const correctIcon = new L.DivIcon({ 
    html: `<div class="rounded-full w-8 h-8 bg-green-500 flex items-center justify-center text-white">✓</div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  // Define positions for the polyline
  const userPosition: [number, number] = [userLat || 0, userLng || 0];
  const correctPosition: [number, number] = [correctLat, correctLng];

  
  
  const handleBadgePopupClose = () => {
    setEarnedBadge(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sticky header with progress visualization */}
      <ResultsHeader 
        round={round} 
        totalRounds={5} 
        onNext={onNext} 
        isLoading={isLoading} 
        currentRoundXP={netXP}
        currentRoundAccuracy={netAccuracy}
      />
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto p-4 pt-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left column - Score & Map */}
          <div className="w-full md:w-1/2 space-y-6">
            {/* Score card - updated to match screenshot format */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
              <h2 className="text-2xl font-bold mb-6 text-history-primary dark:text-history-light">Your Score</h2>
              
              <div className="flex justify-center items-center gap-6 mb-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 mb-2">
                    <div className="text-blue-600 dark:text-blue-400 font-bold">{netAccuracy}%</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center bg-green-100 dark:bg-green-900/30 rounded-full w-16 h-16 mb-2">
                    <div className="text-green-600 dark:text-green-400 font-bold">+{netXP}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Experience (XP)</div>
                </div>
              </div>
              
              {/* Hint penalties summary */}
              {(xpDebt > 0 || accDebt > 0) && (
                <div className="mt-2 text-sm text-muted-foreground italic">
                  (including -{accDebt}% and -{xpDebt}XP from hints)
                </div>
              )}
              
              {/* Display earned badges if any */}
              {result.earnedBadges && result.earnedBadges.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2 flex items-center justify-center">
                    <Award className="h-4 w-4 mr-1 text-yellow-500" /> 
                    Badges Earned
                  </h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {result.earnedBadges.map(badge => (
                      <Badge 
                        key={badge.id} 
                        variant="outline" 
                        className="flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                      >
                        <Award className="h-3 w-3" />
                        {badge.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Time accuracy card for mobile screens */}
            <div className="md:hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <div className="border-b border-border pb-3 mb-3 flex justify-between items-center">
                <h2 className="font-bold text-lg text-history-primary dark:text-history-light flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  When
                </h2>
                <Badge variant="hint" className="text-sm">
                  {result.yearDifference === 0 ? <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span> : `${formatInteger(Math.abs(result.yearDifference))} ${Math.abs(result.yearDifference) === 1 ? 'year' : 'years'} off`}
                </Badge>
              </div>
              
              <div className="flex justify-between text-sm mb-4">
                <div>Your guess: <span className="font-medium">{result.guessYear}</span></div>
                <div>
                  <span className="text-foreground">Correct: </span>
                  <Badge variant="selectedValue" className="ml-1 text-xl">
                    {result.eventYear}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <div className="text-center">
                  <Badge variant="accuracy" className="text-sm flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {formatInteger(result.timeAccuracy)}%
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
                </div>
                <div className="text-center">
                  <Badge variant="xp" className="text-sm flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    +{formatInteger(netXpWhen)}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">XP</div>
                </div>
              </div>
            </div>
            
            {/* Map card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="font-bold text-lg text-history-primary dark:text-history-light flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Where
                </h2>
                <div className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm">
                  {result.guessLat === null || result.guessLng === null ? (
                    <span className="text-gray-600 dark:text-gray-400 font-medium">No guess</span>
                  ) : result.distanceKm === 0 ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span>
                  ) : (
                    `${formatInteger(result.distanceKm)} km off`
                  )}
                </div>
              </div>
              
              <div className="p-4 border-b border-border">
                <div className="flex justify-end text-sm mb-4">
                  <div className="text-center">
                    <div className="text-foreground mb-1">Correct: </div>
                    <Badge variant="selectedValue" className="text-xl block mx-auto">
                      {result.locationName}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="text-center">
                    <Badge variant="accuracy" className="text-sm flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {formatInteger(result.locationAccuracy)}%
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
                  </div>
                  <div className="text-center">
                    <Badge variant="xp" className="text-sm flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      +{formatInteger(netXpWhere)}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">XP</div>
                    {xpDebtWhere > 0 && (
                      <div className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">- {formatInteger(xpDebtWhere)} XP</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-80 w-full">
                <MapContainer
                  id="results-map"
                  className="results-map-container leaflet-container"
                  center={mapCenter}
                  zoom={3}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                  zoomControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  <FullscreenHandler />
              {bounds && <MapBoundsUpdater bounds={bounds} />}
                  
                  {/* Marker for Correct Location */}
                  <Marker position={correctPosition} icon={correctIcon}>
                    <Popup>Correct Location: {result.locationName}</Popup>
                  </Marker>
                  
                  {/* Marker for User Guess (only if coordinates exist) */}
                  {hasUserGuess && (
                    <Marker position={userPosition} icon={userIcon}>
                      <Popup>Your Guess</Popup>
                    </Marker>
                  )}
                  
                  {/* Connector line between the two points */}
                  {hasUserGuess && (
                    <Polyline 
                      positions={[userPosition, correctPosition]} 
                      pathOptions={{ dashArray: '4 4', color: '#666' }} 
                    />
                  )}
                  
                  {/* Add fullscreen and zoom controls in desired order */}
                  <FullscreenControl position="topright" />
                  <ZoomControl position="topleft" zoomInText="+" zoomOutText="–" />
                </MapContainer>
              </div>
            </div>
            
            {/* Time accuracy card for mobile screens is now above the map */}
          </div>
          
          {/* Right column - Image & Description */}
          <div className="w-full md:w-1/2 space-y-6">
            {/* Time accuracy card for desktop screens */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <div className="border-b border-border pb-3 mb-3 flex justify-between items-center">
                <h2 className="font-bold text-lg text-history-primary dark:text-history-light flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  When
                </h2>
                <Badge variant="hint" className="text-sm">
                  {result.yearDifference === 0 ? <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span> : `${formatInteger(Math.abs(result.yearDifference))} ${Math.abs(result.yearDifference) === 1 ? 'year' : 'years'} off`}
                </Badge>
              </div>
              
              <div className="flex justify-between text-sm mb-4">
                <div>Your guess: <span className="font-medium">{result.guessYear}</span></div>
                <div>
                  <span className="text-foreground">Correct: </span>
                  <Badge variant="selectedValue" className="ml-1 text-xl">
                    {result.eventYear}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <div className="text-center">
                  <Badge variant="accuracy" className="text-sm flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {formatInteger(result.timeAccuracy)}%
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
                </div>
                <div className="text-center">
                  <Badge variant="xp" className="text-sm flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    +{formatInteger(netXpWhen)}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">XP</div>
                </div>
              </div>
            </div>
            

            
            {/* Historical image and description */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                  <LazyImage 
                    src={result.imageUrl} 
                    alt={result.imageTitle || 'Historical image'} 
                    className="w-full h-48 object-cover"
                    skeletonClassName="w-full h-48"
                  />
              
              <div className="p-6">
                <h2 className="text-xl font-bold mb-2 text-history-primary dark:text-history-light">
                  {result.imageTitle} ({result.eventYear})
                </h2>
                <div className="max-h-48 overflow-y-auto pr-2 text-muted-foreground">
                  <p>{result.imageDescription}</p>
                </div>
              </div>
            </div>
            
            {/* Home button and extra buttons */}
            <div className="mt-6 flex justify-center">
              <Button 
                variant="outline"
                size="icon"
                onClick={() => {
                  const navigateHome = () => window.location.href = '/test';
                  if (onConfirmNavigation) {
                    onConfirmNavigation(navigateHome);
                  } else {
                    navigateHome();
                  }
                }}
                className="h-12 w-12 rounded-full bg-white/90 hover:bg-white shadow-md"
                aria-label="Return to home"
              >
                <Home className="h-5 w-5" />
              </Button>
              {extraButtons}
            </div>
          </div>
        </div>
        
        {/* Sticky footer with action button for mobile only */}
        <div className="md:hidden sticky bottom-4 mt-6 px-4">
          {onNext && (
            <Button 
              onClick={onNext}
              disabled={isLoading}
              className="w-full py-6 font-semibold text-lg bg-history-primary hover:bg-history-primary/90 text-white shadow-lg rounded-xl"
            >
              {round === 5 ? 'Final Score' : 'Next Round'}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Badge earned popup */}
      <BadgeEarnedPopup 
        badge={earnedBadge} 
        onClose={handleBadgePopupClose} 
      />
    </div>
  );
};

export default ResultsLayout2;
