import React from 'react';
import { Badge } from "@/components/ui/badge";
import LazyImage from '@/components/ui/LazyImage';
import { MapPin, Calendar, Target, Zap } from "lucide-react";
import { formatInteger } from '@/utils/format';
import { calculateLocationAccuracy, calculateTimeAccuracy } from "@/utils/gameCalculations";
import { Image, RoundResult } from '../types';

interface RoundResultCardProps {
  image: Image;
  result: RoundResult;
  index: number;
}

const RoundResultCard: React.FC<RoundResultCardProps> = ({ image, result, index }) => {
  const [open, setOpen] = React.useState(false);

  const yearDifference = result.guessYear && image.year ? Math.abs(result.guessYear - image.year) : 0;
  const roundPercentage = result.accuracy ?? ((result.xpWhere ?? 0) + (result.xpWhen ?? 0)) / 2;

  return (
    <article key={image.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
      <div className="flex flex-col">
        <div className="w-full h-40 sm:h-48">
          <LazyImage src={image.url} alt={`Round ${index + 1} - ${image.title}`} className="w-full h-full object-cover" skeletonClassName="w-full h-full" />
        </div>
        <div className="p-4">
          <div className="cursor-pointer w-full" onClick={() => setOpen(!open)} tabIndex={0} role="button" aria-expanded={open} aria-controls={`details-${image.id}`}>
            <h3 className="text-lg font-bold text-history-primary dark:text-history-light">{image.title || ""}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="accuracy" className="flex items-center gap-1" aria-label={`Accuracy: ${formatInteger(roundPercentage)}%`}>
                <Target className="h-3 w-3" />
                <span>{formatInteger(roundPercentage)}%</span>
              </Badge>
              <Badge variant="xp" className="flex items-center gap-1" aria-label={`XP: ${formatInteger(result.score || 0)}`}>
                <Zap className="h-3 w-3" />
                <span>{formatInteger(result.score || 0)}</span>
              </Badge>
            </div>
            <div className="mt-2">
              <Badge variant="selectedValue" className="text-xs">{image.location_name} ({image.year})</Badge>
            </div>
          </div>
          {open && (
            <div className="details mt-4" id={`details-${image.id}`}>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-history-primary/10 dark:bg-history-primary/20">
                  <h4 className="flex items-center mb-2 text-sm font-medium text-history-primary dark:text-history-light"><MapPin className="h-4 w-4 mr-1" />WHERE</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{formatInteger(result.distanceKm || 0)} kms off</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="accuracy" className="text-xs">{formatInteger(calculateLocationAccuracy(result.distanceKm || 0))}%</Badge>
                      <Badge variant="xp" className="text-xs">{formatInteger(result.xpWhere ?? 0)} XP</Badge>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-history-primary/10 dark:bg-history-primary/20">
                  <h4 className="flex items-center mb-2 text-sm font-medium text-history-primary dark:text-history-light"><Calendar className="h-4 w-4 mr-1" />WHEN</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{yearDifference} years off</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="accuracy" className="text-xs">{formatInteger(calculateTimeAccuracy(result.guessYear || 0, image.year || 0))}%</Badge>
                      <Badge variant="xp" className="text-xs">{formatInteger(result.xpWhen ?? 0)} XP</Badge>
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
