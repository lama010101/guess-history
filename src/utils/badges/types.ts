/**
 * Type definitions for the badge system
 */

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  category: BadgeCategory;
  difficulty: BadgeDifficulty;
  requirementCode: BadgeRequirementCode;
  requirementValue: number;
  imageUrl?: string;
}

export type BadgeCategory = 
  | 'time' 
  | 'location' 
  | 'streak' 
  | 'perfect' 
  | 'challenge' 
  | 'overall';

export type BadgeDifficulty = 
  | 'bronze' 
  | 'silver' 
  | 'gold' 
  | 'platinum';

export type BadgeRequirementCode = 
  | 'games_played'
  | 'perfect_rounds'
  | 'perfect_games'
  | 'time_accuracy'
  | 'location_accuracy'
  | 'overall_accuracy'
  | 'win_streak'
  | 'daily_streak'
  | 'xp_total'
  | 'year_bullseye'
  | 'location_bullseye';

export interface BadgeEvaluation {
  badge: Badge;
  earned: boolean;
  progress: number; // Value between 0-100
  value: number; // Current actual value
}

export interface BadgeEarnedEvent {
  userId: string;
  badge: Badge;
  earnedAt: Date;
} 