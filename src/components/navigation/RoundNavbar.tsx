import React from 'react';
import { Button } from "@/components/ui/button";
import { Menu, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SegmentedProgressBar } from "@/components/ui";

interface RoundNavbarProps {
  currentRound: number;
  totalRounds: number;
  currentAccuracy?: number;
  currentScore?: number;
  onMenuClick?: () => void;
}

const RoundNavbar: React.FC<RoundNavbarProps> = ({
  currentRound,
  totalRounds,
  currentAccuracy = 0,
  currentScore = 0,
  onMenuClick
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Round indicator */}
          <div className="flex-shrink-0">
            <h2 className="text-xl font-bold text-history-primary dark:text-history-light">
              Round {currentRound} / {totalRounds}
            </h2>
          </div>

          {/* This Game Score */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">This Game:</span>
              <Badge variant="accuracy" className="flex items-center gap-1" aria-label={`Accuracy: ${Math.round(currentAccuracy)}%`}>
                <Target className="h-3 w-3" />
                <span>{Math.round(currentAccuracy)}%</span>
              </Badge>
              <Badge variant="xp" className="ml-2 flex items-center gap-1" aria-label={`Score: ${Math.round(currentScore)}`}>
                <Zap className="h-3 w-3" />
                <span>{Math.round(currentScore)}</span>
              </Badge>
            </div>
            
            {/* Menu button */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onMenuClick}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-history-primary">
        <div className="max-w-7xl mx-auto px-4">
          <SegmentedProgressBar current={currentRound} total={totalRounds} className="w-full -mb-0.5" />
        </div>
      </div>
    </header>
  );
};

export default RoundNavbar;
