import React, { useState, useEffect, useMemo } from 'react';
import { Badge as BadgeType } from '@/utils/badges/types';
import { BadgeEarnedPopup } from '@/components/badges/BadgeEarnedPopup';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Fullscreen, MapPin, Calendar, Target, Zap } from 'lucide-react';
import ResultsHeader from '@/components/results/ResultsHeader';
import SourceModal from '@/components/modals/SourceModal';
import HintDebtsCard from '@/components/results/HintDebtsCard';
import { RoundResult as BaseRoundResult, XP_WHERE_MAX, XP_WHEN_MAX, HintDebt } from '@/utils/results/types';
import { formatInteger } from '@/utils/format';
import { HINT_TYPE_NAMES } from '@/constants/hints';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Import Leaflet components and CSS
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.fullscreen/Control.FullScreen.css';
import L from 'leaflet';
import { FullscreenControl } from 'react-leaflet-fullscreen';

// Custom icons
const createUserIcon = (avatarUrl: string) => L.divIcon({
  html: `<div style="width: 30px; height: 30px; border-radius: 50%; background-image: url(${avatarUrl}); background-size: cover; border: 2px solid white;"></div>`,
  className: 'user-avatar-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

const correctIcon = L.divIcon({
  html: `<div style="background-color: #10B981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
  className: 'correct-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

// Helper to get hint label if not present in debt object
const getHintLabel = (hintId: string): string => {
  return HINT_TYPE_NAMES[hintId] || hintId;
};

// Component to automatically adjust map bounds
const MapBoundsUpdater = ({ bounds }: { bounds: L.LatLngBounds | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

const FullscreenHandler = () => {
  const map = useMap();
  useEffect(() => {
    const lControl = document.querySelector('.leaflet-control-zoom-in');
    if (lControl) {
      L.DomEvent.disableClickPropagation(lControl as HTMLElement);
    }
  }, [map]);
  return null;
};

interface RoundResult extends BaseRoundResult {
  hintDebts?: HintDebt[];
  confidence?: number;
  source_citation?: string;
}

export interface ResultsLayoutProps {
  loading: boolean;
  error: string | null;
  result?: RoundResult | null;
  avatarUrl?: string;
  extraButtons?: React.ReactNode;
  homeButton?: React.ReactNode;
  round?: number;
  totalRounds?: number;
  nextRoundButton?: React.ReactNode;
  rateButton?: React.ReactNode;
}

const ResultsLayout2: React.FC<ResultsLayoutProps> = ({ 
  loading,
  error,
  result,
  avatarUrl = '/assets/default-avatar.png',
  extraButtons,
  homeButton,
  round,
  totalRounds,
  nextRoundButton,
  rateButton
}) => {
  const { user } = useAuth();
  const [earnedBadge, setEarnedBadge] = useState<BadgeType | null>(null);
  const [isSourceModalOpen, setSourceModalOpen] = useState(false);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="text-red-500 text-lg mb-4">{error}</div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (loading || !result) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Calculating results...</div>
        </div>
      </div>
    );
  }

  const handleBadgePopupClose = () => {
    setEarnedBadge(null);
  };

  useEffect(() => {
    if (result?.earnedBadges && result.earnedBadges.length > 0) {
      setEarnedBadge(result.earnedBadges[0]);
    }
  }, [result]);

  const xpDebt = result.hintDebts?.reduce((sum, d) => sum + d.xpDebt, 0) ?? 0;
  const accDebt = result.hintDebts?.reduce((sum, d) => sum + d.accDebt, 0) ?? 0;

  // `xpTotal` provided in `result` is already **after** hint debt has been deducted.
  // Therefore, do NOT subtract `xpDebt` again here, otherwise we double-count
  // the deduction and show an incorrect (often zero) score.
  const netXP = Math.max(0, result.xpTotal);
  const netAccuracy = Math.max(0, (result.locationAccuracy + result.timeAccuracy) / 2 - accDebt);

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

  const hasUserGuess = userLat !== null && userLng !== null;
  const correctPosition: L.LatLngTuple = [correctLat, correctLng];
  const userPosition: L.LatLngTuple = hasUserGuess ? [userLat, userLng] : correctPosition;

  const bounds = useMemo(() => {
    if (hasUserGuess) {
      return L.latLngBounds(userPosition, correctPosition);
    }
    return null;
  }, [userPosition, correctPosition, hasUserGuess]);
  
  const mapCenter = hasUserGuess ? L.latLngBounds(userPosition, correctPosition).getCenter() : correctPosition;

  const userIcon = useMemo(() => createUserIcon(avatarUrl), [avatarUrl]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#000000] text-gray-900 dark:text-gray-100 pb-20">
      <ResultsHeader 
        round={round}
        totalRounds={totalRounds}
        currentRoundXP={netXP}
        currentRoundAccuracy={netAccuracy}
        nextRoundButton={nextRoundButton}
      />
      
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-[#333333] rounded-2xl shadow-lg p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex flex-col items-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Score</h2>
                  {(xpDebt > 0 || accDebt > 0) && (
                    <div className="text-xs text-red-500 dark:text-red-500 mt-1">(Hint penalties deducted)</div>
                  )}
                </div>
                <div className="flex justify-center items-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="text-sm text-muted-foreground mb-1">Accuracy</div>
                    <div className="flex flex-col items-center justify-center">
                      <Badge variant="accuracy" className="text-base flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" />
                        {netAccuracy.toFixed(0)}%
                      </Badge>
                      {accDebt > 0 && <Badge variant="hint" className={cn("text-xs font-semibold mt-1", {
                        "text-red-500 dark:text-red-500": accDebt > 0
                      })}>(-{accDebt.toFixed(0)}%)</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-sm text-muted-foreground mb-1">Experience</div>
                    <div className="flex flex-col items-center justify-center">
                      <Badge variant="xp" className="text-base flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" />
                        +{formatInteger(netXP)} XP
                      </Badge>
                      {xpDebt > 0 && <Badge variant="hint" className={cn("text-xs font-semibold mt-1", {
                        "text-red-500 dark:text-red-500": xpDebt > 0
                      })}>(-{formatInteger(xpDebt)} XP)</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#333333] rounded-2xl shadow-lg overflow-hidden">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-lg">
                <img src={result.imageUrl} alt={result.imageTitle} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <h3 className="text-xl font-bold mb-2 text-foreground">{result.imageTitle}</h3>
                <p className="text-muted-foreground text-sm mb-4">{result.imageDescription}</p>

                {/* Confidence and Source Link */}
                <div className="flex justify-between items-center mb-4 text-sm border-t border-b border-gray-200 dark:border-gray-700 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Confidence:</span>
                    <span className="text-muted-foreground">{result.confidence !== undefined ? `${(result.confidence <= 1 ? result.confidence * 100 : result.confidence).toFixed(0)}%` : 'N/A'}</span>
                    {result.source_citation && (
                      <Button 
                        className="px-2 py-1 h-auto text-xs bg-[#444444] text-white hover:bg-[#444444] border border-[#444444] dark:bg-[#444444] dark:text-white dark:hover:bg-[#444444]"
                        onClick={() => setSourceModalOpen(true)}
                      >
                        Source
                      </Button>
                    )}
                  </div>
                  <div>
                    {rateButton}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-7">
            <div className="bg-white dark:bg-[#333333] rounded-2xl shadow-lg p-4">
              <div className="border-b border-border pb-3 mb-3 flex justify-between items-center">
                <h2 className="font-normal text-lg text-gray-900 dark:text-gray-100 flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  When
                </h2>
                <Badge variant="hint" className="text-sm">
                  {result?.guessYear == null
                    ? 'No guess'
                    : (result.yearDifference === 0
                        ? <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span>
                        : `${formatInteger(Math.abs(result.yearDifference))} ${Math.abs(result.yearDifference) === 1 ? 'year' : 'years'} off`)}
                </Badge>
              </div>
              {/* badges moved below progress bar */}
              <div className="text-sm mb-4 mt-4">
                <div className="flex items-center">
                  <span className="text-foreground">Correct: </span>
                  <span className="ml-2 text-orange-400 font-semibold text-lg">{result.eventYear}</span>
                </div>
                <div className="flex items-center mt-1">
                  <span className="text-foreground">Your guess:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{result?.guessYear == null ? 'No guess' : result.guessYear}</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${result.timeAccuracy}%` }} />
                </div>
                <span className="sr-only">Time accuracy progress</span>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <Badge variant="accuracy" className="text-sm flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {result.timeAccuracy.toFixed(0)}%

                </Badge>
                <Badge variant="xp" className="text-sm flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  +{formatInteger(result.xpWhen)} XP

                </Badge>
              </div>
            </div>

            <div className="bg-white dark:bg-[#333333] rounded-2xl shadow-lg p-4">
              <div className="border-b border-border pb-3 mb-3 flex justify-between items-center">
                <h2 className="font-normal text-lg text-gray-900 dark:text-gray-100 flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Where
                </h2>
                <Badge variant="hint" className="text-sm">
                  {result?.distanceKm == null ? 'No guess' : `${formatInteger(result.distanceKm)} km away`}
                </Badge>
              </div>
              {/* badges moved below progress bar */}
              <div className="flex items-center mb-2">
                <span className="text-foreground mr-2">Correct:</span>
                <span className="text-orange-400 font-semibold">{result.locationName}</span>
              </div>
              <div className="relative h-64 md:h-80 rounded-lg overflow-hidden mb-4 z-0">
                <MapContainer 
                  center={mapCenter} 
                  zoom={3} 
                  style={{ height: '100%', width: '100%', backgroundColor: '#1f2937' }}
                  zoomControl={false}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <ZoomControl position="topright" />
                  <FullscreenControl position="topright" />
                  <FullscreenHandler />
                  {/* Show the green correct icon if the answer is correct */}
                  {result.isCorrect && (
                    <Marker 
                      position={[result.eventLat, result.eventLng]} 
                      icon={correctIcon}
                      zIndexOffset={1000}  // Ensure it's on top
                    >
                      <Popup>Correct Answer</Popup>
                    </Marker>
                  )}
                  
                  {/* Always show the actual location marker */}
                  <Marker 
                    position={[result.eventLat, result.eventLng]} 
                    icon={correctIcon}
                    opacity={result.isCorrect ? 0 : 1}  // Hide if we're showing the correct icon
                  >
                    <Popup>Correct Location</Popup>
                  </Marker>
                  
                  {/* Show user's guess if it exists and isn't exactly on the correct location */}
                  {result.guessLat && result.guessLng && 
                    (result.guessLat !== result.eventLat || result.guessLng !== result.eventLng) && (
                      <Marker 
                        position={[result.guessLat, result.guessLng]} 
                        icon={userIcon}
                      >
                        <Popup>Your Guess</Popup>
                      </Marker>
                  )}
                  {result.guessLat && result.guessLng && (
                    <Polyline positions={[[result.guessLat, result.guessLng], [result.eventLat, result.eventLng]]} color="white" dashArray="5, 10" />
                  )}
                  <MapBoundsUpdater bounds={bounds} />
                </MapContainer>
              </div>
              <div className="mt-4">
                <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div className="h-1.5 rounded-full bg-orange-500" style={{ width: `${result.locationAccuracy}%` }} />
                </div>
                <span className="sr-only">Location accuracy progress</span>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <Badge variant="accuracy" className="text-sm flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {result.locationAccuracy.toFixed(0)}%

                </Badge>
                <Badge variant="xp" className="text-sm flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  +{formatInteger(result.xpWhere)} XP

                </Badge>
              </div>
            </div>

            {result.hintDebts && result.hintDebts.length > 0 && (
              <HintDebtsCard 
                hintDebts={result.hintDebts.map(debt => {
                  const hintInfo = result.hintsUsed?.find(h => h.id === debt.hintId || h.hint_type === debt.hint_type);
                  return {
                    ...debt,
                    hintId: hintInfo?.id || debt.hintId,
                    hint_type: hintInfo?.hint_type || debt.hint_type,
                  };
                })}
                yearDifference={result.yearDifference ?? null}
                distanceKm={result.distanceKm ?? null}
              />
            )}

            {/* Desktop-only action buttons placed after the Hint Penalties/Debt card */}
            <div className="hidden lg:flex justify-center items-center space-x-4 mt-4">
              {extraButtons}
              {homeButton}
            </div>
          </div>
        </div>

        {/* Mobile/tablet action buttons at bottom; hidden on desktop (Next Round removed) */}
        <div className="mt-8 flex justify-center items-center space-x-4 md:col-span-2 lg:hidden">
          {extraButtons}
          {homeButton}
        </div>
      </div>

      {earnedBadge && (
        <BadgeEarnedPopup 
          badge={earnedBadge} 
          onClose={handleBadgePopupClose} 
        />
      )}

      <SourceModal 
        isOpen={isSourceModalOpen} 
        onClose={() => setSourceModalOpen(false)} 
        url={result.source_citation || ''} 
      />
    </div>
  );
};

export default ResultsLayout2;
