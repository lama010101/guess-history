import React, { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { UserProfile, UserStats } from '@/utils/profile/profileService';
import { getLevelUpConstraints } from '@/lib/levelUpConfig';
import { formatInteger } from '@/utils/format';

interface LevelProgressCardProps {
  profile: UserProfile | null;
  stats: UserStats;
  isLoading?: boolean;
}

const LevelProgressCard: React.FC<LevelProgressCardProps> = ({ profile, stats, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-history-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentLevel = Math.max(1, Math.min(100, Number(profile?.level_up_best_level || 1)));
  const nextLevel = Math.min(100, currentLevel + 1);

  const constraints = useMemo(() => getLevelUpConstraints(nextLevel), [nextLevel]);

  const overallAcc = Math.max(0, Math.min(100, Number(stats.avg_accuracy || 0)));
  const timeAcc = Math.max(0, Math.min(100, Number(stats.time_accuracy || 0)));
  const locAcc = Math.max(0, Math.min(100, Number(stats.location_accuracy || 0)));
  const bestAxis = timeAcc >= locAcc ? { label: 'Time', value: timeAcc } : { label: 'Location', value: locAcc };

  const overallProgressPct = constraints.requiredOverallAccuracy > 0
    ? Math.max(0, Math.min(100, Math.round((overallAcc / constraints.requiredOverallAccuracy) * 100)))
    : 0;

  const roundProgressPct = constraints.requiredRoundAccuracy > 0
    ? Math.max(0, Math.min(100, Math.round((bestAxis.value / constraints.requiredRoundAccuracy) * 100)))
    : 0;

  return (
    <div className="glass-card rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-history-primary dark:text-history-light">Level Up Progress</h3>
        <div className="text-sm text-muted-foreground">Next: Level {nextLevel}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-history-primary dark:text-history-light">Level {currentLevel}</div>
          <div className="text-sm text-muted-foreground">Current</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-history-primary dark:text-history-light">{formatInteger(stats.total_xp || 0)}</div>
          <div className="text-sm text-muted-foreground">Total XP</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-history-primary dark:text-history-light">{formatInteger(stats.avg_accuracy || 0)}%</div>
          <div className="text-sm text-muted-foreground">Overall Accuracy</div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-history-primary dark:text-history-light">{formatInteger(Math.max(timeAcc, locAcc))}%</div>
          <div className="text-sm text-muted-foreground">Best Axis</div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Overall Accuracy</span>
            <span className="font-medium">{formatInteger(overallAcc)}% / {constraints.requiredOverallAccuracy}%</span>
          </div>
          <Progress value={overallProgressPct} className="h-2" />
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span>{bestAxis.label} Accuracy</span>
            <span className="font-medium">{formatInteger(bestAxis.value)}% / {constraints.requiredRoundAccuracy}%</span>
          </div>
          <Progress value={roundProgressPct} className="h-2" />
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Requirements shown are for Level {nextLevel}. Year range: {constraints.levelYearRange.start}–{constraints.levelYearRange.end}. Timer: {constraints.timerSec}s.
      </div>
    </div>
  );
};

export default LevelProgressCard;
