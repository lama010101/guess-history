import React from 'react';
import { Progress } from "@/components/ui/progress";
import { UserStats } from '@/utils/profile/profileService';
import { formatInteger } from '@/utils/format';

interface StatsTabProps {
  stats: UserStats;
  isLoading: boolean;
}

const StatsTab: React.FC<StatsTabProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-history-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Only show stats if user has played at least one game
  const hasPlayedGames = stats.games_played > 0;
  
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-6 text-history-primary dark:text-history-light">Your Statistics</h3>
      
      {!hasPlayedGames ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-2">No game statistics yet.</p>
          <p>Play your first game to see your stats!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-history-primary dark:text-history-light">
                {formatInteger(stats.games_played)}
              </div>
              <div className="text-sm text-muted-foreground">Games Played</div>
            </div>
            
            {stats.avg_accuracy > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-history-primary dark:text-history-light">
                  {formatInteger(stats.avg_accuracy)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg. Accuracy</div>
              </div>
            )}
            
            {stats.best_accuracy > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-history-primary dark:text-history-light">
                  {formatInteger(stats.best_accuracy)}%
                </div>
                <div className="text-sm text-muted-foreground">Best Accuracy</div>
              </div>
            )}
            
            {stats.perfect_scores > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-history-primary dark:text-history-light">
                  {formatInteger(stats.perfect_scores)}
                </div>
                <div className="text-sm text-muted-foreground">Perfect Scores</div>
              </div>
            )}
            
            {stats.total_xp > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-history-primary dark:text-history-light">
                  {formatInteger(stats.total_xp)}
                </div>
                <div className="text-sm text-muted-foreground">Total XP</div>
              </div>
            )}
            
            {stats.global_rank > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-history-primary dark:text-history-light">
                  #{formatInteger(stats.global_rank)}
                </div>
                <div className="text-sm text-muted-foreground">Global Rank</div>
              </div>
            )}
          </div>
          
          {(stats.time_accuracy > 0 || stats.location_accuracy > 0 || stats.challenge_accuracy > 0) && (
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
              <h4 className="font-medium mb-3 text-history-primary dark:text-history-light">Accuracy Breakdown</h4>
              
              <div className="space-y-3">
                {stats.time_accuracy > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Time Accuracy</span>
                      <span className="font-medium">{formatInteger(stats.time_accuracy)}%</span>
                    </div>
                    <Progress value={stats.time_accuracy} className="h-2" />
                  </div>
                )}
                
                {stats.location_accuracy > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Location Accuracy</span>
                      <span className="font-medium">{formatInteger(stats.location_accuracy)}%</span>
                    </div>
                    <Progress value={stats.location_accuracy} className="h-2" />
                  </div>
                )}
                
                {stats.challenge_accuracy > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Daily Challenges</span>
                      <span className="font-medium">{formatInteger(stats.challenge_accuracy)}%</span>
                    </div>
                    <Progress value={stats.challenge_accuracy} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StatsTab; 