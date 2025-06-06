
/**
 * Badge Service - Handles badge-related operations
 * 
 * NOTE: Type assertions are used throughout this file as a workaround for TypeScript errors
 * related to the Supabase schema. In a production environment, it would be better to
 * properly define the database schema types in the Supabase client configuration.
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  Badge, 
  BadgeCategory, 
  BadgeDifficulty, 
  BadgeEvaluation, 
  BadgeRequirementCode 
} from './types';

// Define badge database schema type
interface BadgeRecord {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  category: string;
  difficulty: string;
  requirement_code: string;
  requirement_value: number;
  image_url?: string;
  created_at: string;
}

/**
 * Badge Service - Handles badge-related operations
 * 
 * This service provides functions for managing badges in the application.
 * We've updated the Supabase schema types to include the badges table.
 */

// Function to fetch all available badges from the database
export async function fetchAllBadges(): Promise<Badge[]> {
  try {
    const { data, error } = await supabase
      .from('badges')
      .select('*');

    if (error) {
      console.error('Error fetching badges:', error);
      return [];
    }

    if (!data) return [];

    return data.map(badgeData => ({
      id: badgeData.id,
      name: badgeData.name,
      description: badgeData.description,
      iconName: badgeData.icon_name,
      category: badgeData.category as BadgeCategory,
      difficulty: badgeData.difficulty as BadgeDifficulty,
      requirementCode: badgeData.requirement_code as BadgeRequirementCode,
      requirementValue: badgeData.requirement_value,
      imageUrl: badgeData.image_url
    }));
  } catch (error) {
    console.error('Error in fetchAllBadges:', error);
    return [];
  }
}

// Define profile database schema type
interface ProfileRecord {
  id: string;
  display_name?: string;
  avatar_url?: string;
  email?: string;
  created_at: string;
  updated_at?: string;
  earned_badges?: string[];
}

// Function to fetch earned badges for a user
export async function fetchUserBadges(userId: string): Promise<string[]> {
  try {
    // First check if user has a profile
    const { data, error } = await supabase
      .from('profiles')
      .select('earned_badges')
      .eq('id', userId)
      .single();

    if (error) {
      // If profile doesn't exist, create it (especially for guest users)
      if (error.code === 'PGRST116') {
        console.log('Profile does not exist, creating one for user:', userId);
        await createUserProfile(userId);
        return []; // Return empty badges for new profile
      }
      
      console.error('Error fetching user badges:', error);
      return [];
    }

    return data.earned_badges || [];
  } catch (error) {
    console.error('Error in fetchUserBadges:', error);
    return [];
  }
}

// Function to create a user profile
async function createUserProfile(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        earned_badges: [],
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error creating user profile:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    return false;
  }
}

// Function to award a badge to a user
export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
  try {
    // Get current badges
    const currentBadges = await fetchUserBadges(userId);
    
    // If user already has this badge, no need to award it again
    if (currentBadges.includes(badgeId)) {
      return true;
    }
    
    // Add new badge to the list
    const updatedBadges = [...currentBadges, badgeId];
    
    // Update profile with new badge
    const { error } = await supabase
      .from('profiles')
      .update({ 
        earned_badges: updatedBadges,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) {
      console.error('Error awarding badge:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in awardBadge:', error);
    return false;
  }
}

// Function to evaluate player metrics against all badges
export async function evaluateUserBadges(
  userId: string,
  userMetrics: Record<BadgeRequirementCode, number>
): Promise<BadgeEvaluation[]> {
  try {
    // Fetch all available badges and user's earned badges
    const [allBadges, earnedBadgeIds] = await Promise.all([
      fetchAllBadges(),
      fetchUserBadges(userId)
    ]);
    
    // Evaluate each badge
    const evaluations = allBadges.map(badge => {
      const earned = earnedBadgeIds.includes(badge.id);
      const currentValue = userMetrics[badge.requirementCode] || 0;
      const targetValue = badge.requirementValue;
      const progress = Math.min(100, Math.round((currentValue / targetValue) * 100));
      
      return {
        badge,
        earned,
        progress,
        value: currentValue
      };
    });
    
    return evaluations;
  } catch (error) {
    console.error('Error in evaluateUserBadges:', error);
    return [];
  }
}

// Function to check for newly earned badges and award them
export async function checkAndAwardBadges(
  userId: string,
  userMetrics: Record<BadgeRequirementCode, number>
): Promise<Badge[]> {
  try {
    const evaluations = await evaluateUserBadges(userId, userMetrics);
    const newlyEarnedBadges: Badge[] = [];
    
    // Check for badges that should be awarded
    for (const evaluation of evaluations) {
      if (!evaluation.earned && evaluation.value >= evaluation.badge.requirementValue) {
        const awarded = await awardBadge(userId, evaluation.badge.id);
        if (awarded) {
          newlyEarnedBadges.push(evaluation.badge);
        }
      }
    }
    
    return newlyEarnedBadges;
  } catch (error) {
    console.error('Error in checkAndAwardBadges:', error);
    return [];
  }
}

// Admin function to create a new badge
export async function createBadge(badge: Omit<Badge, 'id'>): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('badges')
      .insert({
        name: badge.name,
        description: badge.description,
        icon_name: badge.iconName,
        category: badge.category,
        difficulty: badge.difficulty,
        requirement_code: badge.requirementCode,
        requirement_value: badge.requirementValue,
        image_url: badge.imageUrl
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating badge:', error);
      return null;
    }

    if (!data) return null;
    return data.id;
  } catch (error) {
    console.error('Error in createBadge:', error);
    return null;
  }
}

// Admin function to update a badge
export async function updateBadge(badge: Badge): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('badges')
      .update({
        name: badge.name,
        description: badge.description,
        icon_name: badge.iconName,
        category: badge.category,
        difficulty: badge.difficulty,
        requirement_code: badge.requirementCode,
        requirement_value: badge.requirementValue,
        image_url: badge.imageUrl
      })
      .eq('id', badge.id);

    if (error) {
      console.error('Error updating badge:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateBadge:', error);
    return false;
  }
}

// Admin function to delete a badge
export async function deleteBadge(badgeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('badges')
      .delete()
      .eq('id', badgeId);

    if (error) {
      console.error('Error deleting badge:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteBadge:', error);
    return false;
  }
}

// Function to award badges based on round performance
export async function awardRoundBadges(
  userId: string,
  roomId: string,
  roundIndex: number,
  yearAccuracy: number,
  locationAccuracy: number,
  guessYear: number,
  actualYear: number
): Promise<Badge[]> {
  try {
    // Prepare metrics based on this round's performance
    const roundMetrics: Record<BadgeRequirementCode, number> = {
      games_played: 0, // This is for overall games, not affected here
      perfect_rounds: yearAccuracy >= 95 && locationAccuracy >= 95 ? 1 : 0,
      perfect_games: 0, // This is for full games, not affected here
      time_accuracy: yearAccuracy,
      location_accuracy: locationAccuracy,
      overall_accuracy: (yearAccuracy + locationAccuracy) / 2,
      win_streak: 0, // Not affected by a single round
      daily_streak: 0, // Not affected by a single round
      xp_total: Math.round((yearAccuracy + locationAccuracy) / 2),
      year_bullseye: yearAccuracy === 100 ? 1 : 0,
      location_bullseye: locationAccuracy >= 98 ? 1 : 0
    };

    // Check for time-period specific badges (e.g., correctly guessing specific eras)
    if (actualYear >= 1900 && actualYear <= 1945 && Math.abs(guessYear - actualYear) <= 10) {
      // Early 20th century badge logic
      roundMetrics.time_accuracy += 10; // Bonus for accurate early 20th century guesses
    } else if (actualYear >= 1946 && actualYear <= 1989 && Math.abs(guessYear - actualYear) <= 10) {
      // Mid-century badge logic
      roundMetrics.time_accuracy += 10; // Bonus for accurate mid-century guesses
    }

    // Award badges based on the round metrics
    const earnedBadges = await checkAndAwardBadges(userId, roundMetrics);
    return earnedBadges;
  } catch (error) {
    console.error('Error in awardRoundBadges:', error);
    return [];
  }
}
