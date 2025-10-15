import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import LazyImage from '@/components/ui/LazyImage';
import { MapPin, Calendar, Target, Zap } from "lucide-react";
import { formatInteger, formatDistanceFromKm } from '@/utils/format';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { calculateLocationAccuracy, calculateTimeAccuracy } from "@/utils/gameCalculations";
import { Image, RoundResult } from '../types';

interface RoundResultCardProps {
  image: Image;
  result: RoundResult;
  index: number;
}

const RoundResultCard: React.FC<RoundResultCardProps> = ({ image, result, index }) => {
  const distanceUnit = useSettingsStore(s => s.distanceUnit);
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const yearDifference = result.guessYear && image.year ? Math.abs(result.guessYear - image.year) : 0;
  const roundPercentage = result.accuracy ?? ((result.xpWhere ?? 0) + (result.xpWhen ?? 0)) / 2;

  return (
    <article key={image.id} className="bg-white dark:bg-transparent rounded-xl shadow-lg overflow-hidden">
      <div className="flex flex-col">
        <div className="w-full h-40 sm:h-48">
          <LazyImage src={image.url} alt={`Round ${index + 1} - ${image.title}`} className="w-full h-full object-cover" skeletonClassName="w-full h-full" />
        </div>
        <div className="p-4">
          <div className="cursor-pointer w-full" onClick={() => setIsOpen(!isOpen)} tabIndex={0} role="button" aria-expanded={isOpen} aria-controls={`details-${image.id}`}>
            <h3 className="text-lg font-normal text-history-primary dark:text-history-light">{image.title || ""}</h3>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center space-x-2">
                <Badge variant="accuracy" className="flex items-center gap-1" aria-label={`Accuracy: ${formatInteger(roundPercentage)}%`}>
                  <Target className="h-3 w-3" />
                  <span>{formatInteger(roundPercentage)}%</span>
                </Badge>
                <Badge variant="xp" className="flex items-center gap-1" aria-label={`XP: ${formatInteger(result.score || 0)}`}>
                  <Zap className="h-3 w-3" />
                  <span>{formatInteger(result.score || 0)}</span>
                </Badge>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <svg 
                  className={`ml-1 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-orange-400 font-semibold text-xs">{image.location_name} ({image.year})</span>
            </div>
          </div>
          {isOpen && (
            <div className="details mt-4" id={`details-${image.id}`}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 p-3 rounded-lg bg-gray-100 dark:bg-[#262626]">
                    <h4 className="flex items-center mb-2 text-sm font-medium text-history-primary dark:text-history-light"><Calendar className="h-4 w-4 mr-1" />WHEN</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{result.guessYear ? (yearDifference === 0 ? <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span> : `${yearDifference} years off`) : 'No guess'}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="accuracy" className="text-xs">{formatInteger(calculateTimeAccuracy(result.guessYear || 0, image.year || 0))}%</Badge>
                        <Badge variant="xp" className="text-xs">{formatInteger(result.xpWhen ?? 0)} XP</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-gray-100 dark:bg-[#2a2a2a]">
                    <h4 className="flex items-center mb-2 text-sm font-medium text-history-primary dark:text-history-light"><MapPin className="h-4 w-4 mr-1" />WHERE</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{result.distanceKm == null ? 'No guess' : (result.distanceKm === 0 ? <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span> : (() => { const d = formatDistanceFromKm(result.distanceKm, distanceUnit); return `${d.value} ${d.unitLabel} away`; })())}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="accuracy"
                          className="text-xs"
                        >
                          {formatInteger(result.distanceKm == null ? 0 : calculateLocationAccuracy(result.distanceKm))}%
                        </Badge>
                        <Badge variant="xp" className="text-xs">{formatInteger(result.xpWhere ?? 0)} XP</Badge>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default RoundResultCard;
