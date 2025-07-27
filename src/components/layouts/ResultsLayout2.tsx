import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Award,
  Calendar,
  ChevronRight,
  Home,
  MapPin,
  Star,
  Target,
  Zap
} from "lucide-react";
import ResultsHeader from "@/components/results/ResultsHeader";
import { RoundResult as BaseRoundResult, XP_WHERE_MAX, XP_WHEN_MAX } from '@/utils/results/types';
import { formatInteger } from '@/utils/format';
import { HINT_TYPE_NAMES } from '@/constants/hints';

// Import Leaflet components and CSS
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Polyline } from 'react-leaflet';
import { FullscreenControl } from 'react-leaflet-fullscreen';
import 'react-leaflet-fullscreen/styles.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

import { Badge as BadgeType } from '@/utils/badges/types';
import { BadgeEarnedPopup } from '@/components/badges/BadgeEarnedPopup';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

// Helper to get hint label if not present in debt object
const getHintLabel = (hintId: string): string => {
  return HINT_TYPE_NAMES[hintId] || hintId;
};

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

interface HintDebt {
  hintId: string;
  xpDebt: number;
  accDebt: number;
  label: string;
  hint_type: string;
}

interface RoundResult extends BaseRoundResult {
  hintDebts?: HintDebt[];
}

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
  
  if (error) {
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
              Oops! Something went wrong
            </h2>
            <p className="mb-6 text-muted-foreground">{error}</p>
            {onNext && (
              <Button 
                className="bg-history-primary hover:bg-history-primary/90 text-white"
                onClick={onNext}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
              Loading results...
            </h2>
          </div>
        </div>
      </div>
    );
  }

  const totalAccuracy = Math.round((result.locationAccuracy + result.timeAccuracy) / 2);
  const xpTotal = result.xpTotal ?? 0;
  const xpDebt = result.hintDebts?.reduce((sum, d) => sum + d.xpDebt, 0) ?? 0;
  const accDebt = result.hintDebts?.reduce((sum, d) => sum + d.accDebt, 0) ?? 0;

  const netXP = Math.max(0, xpTotal - xpDebt);
  const netAccuracy = Math.max(0, totalAccuracy - accDebt);

  const xpDebtWhen = result.hintDebts?.filter(d => d.hint_type === 'when').reduce((sum, d) => sum + d.xpDebt, 0) ?? 0;
  const accDebtWhen = result.hintDebts?.filter(d => d.hint_type === 'when').reduce((sum, d) => sum + d.accDebt, 0) ?? 0;
  const netXpWhen = Math.max(0, result.xpWhen - xpDebtWhen);
  const netTimeAccuracy = Math.max(0, result.timeAccuracy - accDebtWhen);

  const xpDebtWhere = result.hintDebts?.filter(d => d.hint_type === 'where').reduce((sum, d) => sum + d.xpDebt, 0) ?? 0;
  const netXpWhere = Math.max(0, result.xpWhere - xpDebtWhere);
  const accDebtWhere = result.hintDebts?.filter(d => d.hint_type === 'where').reduce((sum, d) => sum + d.accDebt, 0) ?? 0;
  const netLocationAccuracy = Math.max(0, result.locationAccuracy - accDebtWhere);

  const correctLat = result.eventLat;
  const correctLng = result.eventLng;
  const userLat = result.guessLat;
  const userLng = result.guessLng;
  const mapCenter: L.LatLngExpression = [correctLat, correctLng];
  const hasUserGuess = userLat !== null && userLng !== null;
  const bounds = hasUserGuess ? L.latLngBounds([correctLat, correctLng], [userLat, userLng]) : undefined;

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

  const userPosition: [number, number] = [userLat || 0, userLng || 0];
  const correctPosition: [number, number] = [correctLat, correctLng];

  const handleBadgePopupClose = () => {
    setEarnedBadge(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <ResultsHeader 
        round={round} 
        totalRounds={5} 
        onNext={onNext} 
        isLoading={isLoading} 
        currentRoundXP={netXP}
        currentRoundAccuracy={netAccuracy}
      />
      
      <div className="max-w-7xl mx-auto p-4 pt-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
              <h2 className="text-2xl font-bold mb-1 text-history-primary dark:text-history-light">Your Score</h2>
              {(xpDebt > 0 || accDebt > 0) && (
                <div className="text-[11px] text-red-500 dark:text-red-400 mb-5">(Hint cost deducted)</div>
              )}
              
              <div className="flex justify-center items-center gap-6 mb-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 mb-2">
                    <div className="text-blue-600 dark:text-blue-400 font-bold">{netAccuracy}%</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                  {accDebt > 0 && (
                    <div className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">- {formatInteger(accDebt)}%</div>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center bg-green-100 dark:bg-green-900/30 rounded-full w-16 h-16 mb-2">
                    <div className="text-green-600 dark:text-green-400 font-bold">+{formatInteger(netXP)} XP</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Experience</div>
                  {xpDebt > 0 && (
                    <div className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">- {formatInteger(xpDebt)} XP</div>
                  )}
                </div>
              </div>
            </div>
            
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
                  <Badge variant="selectedValue" className="ml-1 text-xl">{result.eventYear}</Badge>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Badge variant="accuracy" className="text-sm flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {formatInteger(netTimeAccuracy)}%
                  {accDebtWhen > 0 && <div className="text-[10px] text-red-500 dark:text-red-400">-{formatInteger(accDebtWhen)}%</div>}
                </Badge>
                <Badge variant="xp" className="text-sm flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  +{formatInteger(netXpWhen)} XP
                  {xpDebtWhen > 0 && <div className="text-[10px] text-red-500 dark:text-red-400">-{formatInteger(xpDebtWhen)} XP</div>}
                </Badge>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="font-bold text-lg text-history-primary dark:text-history-light flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Where
                </h2>
                <div className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm">
                  {result.distanceKm === 0 ? <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span> : `${formatInteger(result.distanceKm)} km off`}
                </div>
              </div>
              <div className="p-4 border-b border-border">
                <div className="flex justify-end text-sm mb-4">
                  <div className="text-center">
                    <div className="text-foreground mb-1">Correct: </div>
                    <Badge variant="selectedValue" className="text-xl block mx-auto">{result.locationName}</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <Badge variant="accuracy" className="text-sm flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {formatInteger(netLocationAccuracy)}%
                  </Badge>
                  <Badge variant="xp" className="text-sm flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    +{formatInteger(netXpWhere)} XP
                  </Badge>
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
                  <Marker position={correctPosition} icon={correctIcon}><Popup>Correct Location: {result.locationName}</Popup></Marker>
                  {hasUserGuess && <Marker position={userPosition} icon={userIcon}><Popup>Your Guess</Popup></Marker>}
                  {hasUserGuess && <Polyline positions={[userPosition, correctPosition]} pathOptions={{ dashArray: '4 4', color: '#666' }} />}
                  <FullscreenControl position="topright" />
                  <ZoomControl position="topleft" zoomInText="+" zoomOutText="–" />
                </MapContainer>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-1/2 space-y-6">
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
                  <Badge variant="selectedValue" className="ml-1 text-xl">{result.eventYear}</Badge>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Badge variant="accuracy" className="text-sm flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {formatInteger(netTimeAccuracy)}%
                  {accDebtWhen > 0 && <div className="text-[10px] text-red-500 dark:text-red-400">-{formatInteger(accDebtWhen)}%</div>}
                </Badge>
                <Badge variant="xp" className="text-sm flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  +{formatInteger(netXpWhen)} XP
                  {xpDebtWhen > 0 && <div className="text-[10px] text-red-500 dark:text-red-400">-{formatInteger(xpDebtWhen)} XP</div>}
                </Badge>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="relative">
                <img 
                  src={result.imageUrl} 
                  alt="Historical event" 
                  className="w-full h-auto max-h-[50vh] object-contain"
                />
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.imageDescription}
                </p>
              </div>
            </div>

            {result.hintDebts && result.hintDebts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
                <h2 className="font-bold text-lg text-history-primary dark:text-history-light flex items-center mb-3">
                  <Zap className="mr-2 h-4 w-4" />
                  Hint Debts
                </h2>
                <ul className="space-y-1">
                  {result.hintDebts.map((debt, idx) => (
                    <li key={idx} className="flex justify-between text-sm">
                      <span className="truncate">{debt.label || getHintLabel(debt.hintId)}</span>
                      <span className="text-destructive font-semibold">-{debt.xpDebt} XP / -{debt.accDebt}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center space-x-4">
              {extraButtons}
            </div>
          </div>
        </div>
      </div>
      
      {earnedBadge && <BadgeEarnedPopup badge={earnedBadge} onClose={handleBadgePopupClose} />}
    </div>
  );
};

export default ResultsLayout2;
