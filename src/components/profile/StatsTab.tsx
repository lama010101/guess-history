import React, { useMemo } from 'react';
import { Progress } from "@/components/ui/progress";
import { UserStats } from '@/utils/profile/profileService';
import { formatInteger } from '@/utils/format';
import { BadgeGrid } from '@/components/badges/BadgeGrid';
import { BadgeEvaluation } from '@/utils/badges/types';

interface StatsTabProps {
  stats: UserStats;
  isLoading: boolean;
  badgeEvaluations?: BadgeEvaluation[];
  badgesLoading?: boolean;
}

const StatsTab: React.FC<StatsTabProps> = ({ stats, isLoading, badgeEvaluations = [], badgesLoading = false }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-history-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Only show stats if user has played at least one game
  const hasPlayedGames = stats.games_played > 0;

  const modeBreakdown = useMemo(() => {
    if (!stats?.per_mode) return [];
    const entries = [
      { key: 'solo' as const, label: 'Solo' },
      { key: 'compete' as const, label: 'Compete' },
      { key: 'level' as const, label: 'Level Up' },
      { key: 'collaborate' as const, label: 'Collaborate' },
    ];

    return entries
      .map(({ key, label }) => {
        const aggregate = stats.per_mode?.[key];
        if (!aggregate) return null;
        const { games_played = 0, avg_accuracy = 0, total_xp = 0 } = aggregate;
        const hasData = games_played > 0 || total_xp > 0 || avg_accuracy > 0;
        if (!hasData) return null;
        return {
          key,
          label,
          games: games_played,
          accuracy: avg_accuracy,
          xp: total_xp,
        };
      })
      .filter(Boolean) as Array<{ key: keyof typeof stats.per_mode; label: string; games: number; accuracy: number; xp: number }>;
  }, [stats]);
  
  return (
    <div className="rounded-xl p-6 bg-[#333333]">
      <h3 className="text-lg font-semibold mb-6 text-history-primary dark:text-history-light">Your Statistics</h3>
      
      {!hasPlayedGames ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-2">No game statistics yet.</p>
          <p>Play your first game to see your stats!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-lg p-4 text-center bg-[#333333] border border-[#444444]">
              <div className="text-2xl font-bold text-history-primary dark:text-history-light">
                {formatInteger(stats.games_played)}
              </div>
              <div className="text-sm text-muted-foreground">Games Played</div>
            </div>
            
            {stats.avg_accuracy > 0 && (
              <div className="rounded-lg p-4 text-center bg-[#333333] border border-[#444444]">
                <div className="text-2xl font-bold text-history-primary dark:text-history-light">
                  {formatInteger(stats.avg_accuracy)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg. Accuracy</div>
              </div>
            )}
            
            {stats.best_accuracy > 0 && (
              <div className="rounded-lg p-4 text-center bg-[#333333] border border-[#444444]">
                <div className="text-2xl font-bold text-history-primary dark:text-history-light">
                  {formatInteger(stats.best_accuracy)}%
                </div>
                <div className="text-sm text-muted-foreground">Best Accuracy</div>
              </div>
            )}
            
            {stats.perfect_scores > 0 && (
              <div className="rounded-lg p-4 text-center bg-[#333333] border border-[#444444]">
                <div className="text-2xl font-bold text-history-primary dark:text-history-light">
                  {formatInteger(stats.perfect_scores)}
                </div>
                <div className="text-sm text-muted-foreground">Perfect Scores</div>
              </div>
            )}
            
            {stats.total_xp > 0 && (
              <div className="rounded-lg p-4 text-center bg-[#333333] border border-[#444444]">
                <div className="text-2xl font-bold text-history-primary dark:text-history-light">
                  {formatInteger(stats.total_xp)}
                </div>
                <div className="text-sm text-muted-foreground">Total XP</div>
              </div>
            )}
            
            {stats.global_rank > 0 && (
              <div className="rounded-lg p-4 text-center bg-[#333333] border border-[#444444]">
                <div className="text-2xl font-bold text-history-primary dark:text-history-light">
                  #{formatInteger(stats.global_rank)}
                </div>
                <div className="text-sm text-muted-foreground">Global Rank</div>
              </div>
            )}
          </div>

          {modeBreakdown.length > 0 && (
            <div className="rounded-lg p-4 mb-8 bg-[#333333] border border-[#444444]">
              <h4 className="font-medium mb-4 text-history-primary dark:text-history-light">Mode Breakdown</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {modeBreakdown.map((mode) => (
                  <div key={mode.key} className="rounded-lg border border-[#444444] bg-[#2d2d2d] p-4">
                    <div className="text-sm text-muted-foreground mb-2">{mode.label}</div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">Games</div>
                        <div className="text-lg font-semibold text-history-primary dark:text-history-light">{formatInteger(mode.games)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">Average Accuracy</div>
                        <div className="text-lg font-semibold text-history-primary dark:text-history-light">{formatInteger(mode.accuracy)}%</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">Total XP</div>
                        <div className="text-lg font-semibold text-history-primary dark:text-history-light">{formatInteger(mode.xp)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(stats.time_accuracy > 0 || stats.location_accuracy > 0 || stats.challenge_accuracy > 0) && (
            <div className="rounded-lg p-4 bg-[#333333] border border-[#444444]">
              <h4 className="font-medium mb-3 text-history-primary dark:text-history-light">Accuracy Breakdown</h4>
              
              <div className="space-y-3">
                {stats.time_accuracy > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Time Accuracy</span>
                      <span className="font-medium">{formatInteger(stats.time_accuracy)}%</span>
                    </div>
                    <Progress value={stats.time_accuracy} className="h-2 bg-gray-700 dark:bg-gray-800" indicatorClassName="bg-history-secondary" />
                  </div>
                )}
                
                {stats.location_accuracy > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Location Accuracy</span>
                      <span className="font-medium">{formatInteger(stats.location_accuracy)}%</span>
                    </div>
                    <Progress value={stats.location_accuracy} className="h-2 bg-gray-700 dark:bg-gray-800" indicatorClassName="bg-history-secondary" />
                  </div>
                )}
                
                {stats.challenge_accuracy > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Daily Challenges</span>
                      <span className="font-medium">{formatInteger(stats.challenge_accuracy)}%</span>
                    </div>
                    <Progress value={stats.challenge_accuracy} className="h-2 bg-gray-700 dark:bg-gray-800" indicatorClassName="bg-history-secondary" />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Earned badges preview */}
          {!badgesLoading && (
            <div className="mt-8 rounded-lg p-4 bg-[#333333] border border-[#444444]">
              <h4 className="font-medium mb-3 text-history-primary dark:text-history-light">Earned Badges</h4>
              <BadgeGrid
                badges={(badgeEvaluations || [])
                  .filter((e) => e.earned)
                  .map((e) => ({
                    badge: e.badge,
                    earned: e.earned,
                    progress: e.progress,
                  }))}
                showAllTabs={false}
                showProgress={false}
                emptyMessage="No badges earned yet. Keep playing!"
                size="sm"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StatsTab;