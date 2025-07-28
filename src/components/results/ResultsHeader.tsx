import React from 'react';
import { SegmentedProgressBar } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader } from "lucide-react";

interface ResultsHeaderProps {
  round?: number;
  totalRounds?: number;
  currentRoundXP?: number;
  currentRoundAccuracy?: number;
  nextRoundButton?: React.ReactNode;
}

const ResultsHeader: React.FC<ResultsHeaderProps> = ({
  round,
  totalRounds,
  currentRoundXP,
  currentRoundAccuracy,
  nextRoundButton
}) => {

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
            {round && totalRounds && <SegmentedProgressBar current={round} total={totalRounds} />}
          </div>

          <div>
            {nextRoundButton}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ResultsHeader;
