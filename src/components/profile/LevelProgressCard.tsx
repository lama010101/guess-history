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
  const overallProgressPct = constraints.requiredOverallAccuracy > 0
    ? Math.max(0, Math.min(100, Math.round((overallAcc / constraints.requiredOverallAccuracy) * 100)))
    : 0;

  const timeProgressPct = constraints.requiredRoundAccuracy > 0
    ? Math.max(0, Math.min(100, Math.round((timeAcc / constraints.requiredRoundAccuracy) * 100)))
    : 0;

  const locationProgressPct = constraints.requiredRoundAccuracy > 0
    ? Math.max(0, Math.min(100, Math.round((locAcc / constraints.requiredRoundAccuracy) * 100)))
    : 0;

  return (
    <div className="rounded-xl p-6 mb-6 bg-[#333333]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-history-primary dark:text-history-light">Level Up Progress</h3>
        <div className="text-sm text-muted-foreground">Next: Level {nextLevel}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-[#3f424b] p-4 text-center bg-[#1d2026]">
          <div className="text-2xl font-bold text-history-primary dark:text-history-light">Level {currentLevel}</div>
          <div className="text-sm text-muted-foreground">Current</div>
        </div>
        <div className="rounded-lg border border-[#3f424b] p-4 text-center bg-[#1d2026]">
          <div className="text-2xl font-bold text-history-primary dark:text-history-light">{formatInteger(stats.total_xp || 0)}</div>
          <div className="text-sm text-muted-foreground">Total XP</div>
        </div>
        <div className="rounded-lg border border-[#3f424b] p-4 text-center bg-[#1d2026]">
          <div className="text-2xl font-bold text-history-primary dark:text-history-light">{formatInteger(stats.avg_accuracy || 0)}%</div>
          <div className="text-sm text-muted-foreground">Overall Accuracy</div>
        </div>
        <div className="rounded-lg border border-[#3f424b] p-4 text-center bg-[#1d2026]">
          <div className="text-2xl font-bold text-history-primary dark:text-history-light">{formatInteger(stats.time_accuracy || 0)}%</div>
          <div className="text-sm text-muted-foreground">Time Accuracy</div>
        </div>
        <div className="rounded-lg border border-[#3f424b] p-4 text-center bg-[#1d2026]">
          <div className="text-2xl font-bold text-history-primary dark:text-history-light">{formatInteger(stats.games_played || 0)}</div>
          <div className="text-sm text-muted-foreground">Games Played</div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Overall Accuracy</span>
            <span className="font-medium">{formatInteger(overallAcc)}% / {constraints.requiredOverallAccuracy}%</span>
          </div>
          <Progress value={overallProgressPct} className="h-2 bg-gray-700 dark:bg-gray-800 mode-levelup:bg-[#444444]" indicatorClassName="bg-hint-gradient" />
        </div>

        {stats.time_accuracy != null && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Time Accuracy</span>
              <span className="font-medium">{formatInteger(timeAcc)}% / {constraints.requiredRoundAccuracy}%</span>
            </div>
            <Progress value={timeProgressPct} className="h-2 bg-gray-700 dark:bg-gray-800 mode-levelup:bg-[#444444]" indicatorClassName="bg-hint-gradient" />
          </div>
        )}

        {stats.location_accuracy != null && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Location Accuracy</span>
              <span className="font-medium">{formatInteger(locAcc)}% / {constraints.requiredRoundAccuracy}%</span>
            </div>
            <Progress value={locationProgressPct} className="h-2 bg-gray-700 dark:bg-gray-800 mode-levelup:bg-[#444444]" indicatorClassName="bg-hint-gradient" />
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Requirements shown are for Level {nextLevel}. Year range: {constraints.levelYearRange.start}–{constraints.levelYearRange.end}. Timer: {constraints.timerSec}s.
      </div>
    </div>
  );
};

export default LevelProgressCard;
