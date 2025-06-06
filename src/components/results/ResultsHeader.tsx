import React from 'react';
import { SegmentedProgressBar } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader } from "lucide-react";

interface ResultsHeaderProps {
  round: number;
  totalRounds: number;
  onNext?: () => void;
  isLoading?: boolean;
  currentRoundXP?: number;
  currentRoundAccuracy?: number;
}

const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  round,
  totalRounds,
  onNext,
  isLoading = false,
  currentRoundXP,
  currentRoundAccuracy
}) => {
  const progress = (round / totalRounds) * 100;

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <h2 className="text-xl font-bold text-history-primary dark:text-history-light">
              Round {round} / {totalRounds}
            </h2>
          </div>

          <div className="flex-grow mx-4">
            <SegmentedProgressBar current={round} total={totalRounds} />
          </div>

          <div>
            {onNext && (
              <Button 
                onClick={onNext} 
                disabled={isLoading}
                className="bg-history-primary hover:bg-history-primary/90 text-white"
              >
                {isLoading ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="ml-2">{round === totalRounds ? 'Final Score' : 'Next Round'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ResultsHeader;
