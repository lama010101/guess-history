import React from 'react';
import { formatScore, formatAccuracy } from '../multiplayer/LeaderboardSystem';

interface LeaderboardPanelProps {
  entries: any[];
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ entries }) => {
  return (
    <div className="leaderboard-panel bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-3">Leaderboard</h3>
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div 
            key={entry.playerId} 
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-600">
                #{entry.rank || index + 1}
              </span>
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <img 
                  src={entry.avatar} 
                  alt={entry.playerName}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-medium">{entry.playerName}</span>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatScore(entry.totalScore || 0)}</div>
              <div className="text-sm text-gray-600">
                {formatAccuracy(entry.accuracy || 0)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
