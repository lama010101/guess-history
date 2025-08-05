/**
 * Leaderboard System for Multiplayer
 * Handles detailed leaderboard emission, scoring, and display logic
 */

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  avatar: string;
  totalScore: number;
  accuracy: number;
  roundsWon: number;
  roundsPlayed: number;
  averageDistance: number;
  fastestSubmission: number;
  streak: number;
  rank: number;
}

export interface RoundResult {
  playerId: string;
  distance: number;
  score: number;
  submissionTime: number;
  isCorrect: boolean;
}

export class LeaderboardSystem {
  private scores: Map<string, LeaderboardEntry> = new Map();
  private roundResults: Map<string, RoundResult[]> = new Map();
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  /**
   * Add or update player score
   */
  updatePlayerScore(
    playerId: string,
    playerName: string,
    avatar: string,
    roundResult: RoundResult
  ): void {
    let entry = this.scores.get(playerId);
    
    if (!entry) {
      entry = {
        playerId,
        playerName,
        avatar,
        totalScore: 0,
        accuracy: 0,
        roundsWon: 0,
        roundsPlayed: 0,
        averageDistance: 0,
        fastestSubmission: Infinity,
        streak: 0,
        rank: 0,
      };
    }

    // Update round results
    if (!this.roundResults.has(playerId)) {
      this.roundResults.set(playerId, []);
    }
    this.roundResults.get(playerId)?.push(roundResult);

    // Calculate new metrics
    const playerRounds = this.roundResults.get(playerId) || [];
    const totalRounds = playerRounds.length;
    const totalScore = playerRounds.reduce((sum, r) => sum + r.score, 0);
    const roundsWon = playerRounds.filter(r => r.isCorrect).length;
    const totalDistance = playerRounds.reduce((sum, r) => sum + r.distance, 0);
    const fastestSubmission = Math.min(...playerRounds.map(r => r.submissionTime));
    const accuracy = totalRounds > 0 ? roundsWon / totalRounds : 0;
    const averageDistance = totalRounds > 0 ? totalDistance / totalRounds : 0;

    // Update entry
    const updatedEntry = {
      ...entry,
      totalScore,
      accuracy,
      roundsWon,
      roundsPlayed: totalRounds,
      averageDistance,
      fastestSubmission: fastestSubmission === Infinity ? 0 : fastestSubmission,
      streak: this.calculateStreak(playerId),
    };

    this.scores.set(playerId, updatedEntry);
    this.recalculateRanks();
    this.emit('leaderboard-updated', this.getLeaderboard());
  }

  /**
   * Get current leaderboard
   */
  getLeaderboard(): LeaderboardEntry[] {
    return Array.from(this.scores.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  /**
   * Get player statistics
   */
  getPlayerStats(playerId: string): LeaderboardEntry | undefined {
    return this.scores.get(playerId);
  }

  /**
   * Get round results for a player
   */
  getPlayerRounds(playerId: string): RoundResult[] {
    return this.roundResults.get(playerId) || [];
  }

  /**
   * Calculate win streak
   */
  private calculateStreak(playerId: string): number {
    const rounds = this.roundResults.get(playerId) || [];
    let streak = 0;
    
    for (let i = rounds.length - 1; i >= 0; i--) {
      if (rounds[i].isCorrect) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  /**
   * Recalculate ranks based on current scores
   */
  private recalculateRanks(): void {
    const leaderboard = this.getLeaderboard();
    leaderboard.forEach((entry, index) => {
      const existing = this.scores.get(entry.playerId);
      if (existing) {
        existing.rank = index + 1;
      }
    });
  }

  /**
   * Listen for leaderboard updates
   */
  onLeaderboardUpdate(callback: (data: any) => void): () => void {
    return this.on('leaderboard-updated', callback);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.scores.clear();
    this.roundResults.clear();
    this.listeners.clear();
  }

  private on(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(callback);

    return () => {
      const callbacks = this.listeners.get(type);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  private emit(type: string, data: any): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

/**
 * React hook for leaderboard system
 */
import { useEffect, useState } from 'react';

export function useLeaderboardSystem() {
  const [leaderboardSystem] = useState(() => new LeaderboardSystem());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = leaderboardSystem.onLeaderboardUpdate((data) => {
      setLeaderboard(data);
      setIsLoading(false);
    });

    setLeaderboard(leaderboardSystem.getLeaderboard());

    return () => {
      unsubscribe();
    };
  }, [leaderboardSystem]);

  return {
    leaderboardSystem,
    leaderboard,
    isLoading,
    updatePlayerScore: leaderboardSystem.updatePlayerScore.bind(leaderboardSystem),
    getPlayerStats: leaderboardSystem.getPlayerStats.bind(leaderboardSystem),
    getPlayerRounds: leaderboardSystem.getPlayerRounds.bind(leaderboardSystem),
  };
}

/**
 * Utility functions for leaderboard display
 */
export function formatScore(score: number): string {
  return score.toLocaleString();
}

export function formatAccuracy(accuracy: number): string {
  return `${(accuracy * 100).toFixed(1)}%`;
}

export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${distance.toFixed(0)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
}

export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(0)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Emit leaderboard data to multiplayer room
 */
export function emitLeaderboardUpdate(
  adapter: any,
  leaderboard: LeaderboardEntry[]
): void {
  adapter.send('LEADERBOARD_UPDATE', { leaderboard });
}

/**
 * Process round results for leaderboard
 */
export function processRoundResults(
  leaderboardSystem: LeaderboardSystem,
  results: Array<{
    playerId: string;
    playerName: string;
    avatar: string;
    distance: number;
    score: number;
    submissionTime: number;
    isCorrect: boolean;
  }>
): void {
  results.forEach(result => {
    leaderboardSystem.updatePlayerScore(
      result.playerId,
      result.playerName,
      result.avatar,
      {
        playerId: result.playerId,
        distance: result.distance,
        score: result.score,
        submissionTime: result.submissionTime,
        isCorrect: result.isCorrect,
      }
    );
  });
}
