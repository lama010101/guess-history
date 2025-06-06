
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string;
  email?: string;
  created_at: string;
  updated_at?: string;
  avatar_image_url: string;
}

export interface Avatar {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
}

export interface UserStats {
  games_played: number;
  avg_accuracy: number;
  best_accuracy: number;
  perfect_scores: number;
  total_xp: number;
  global_rank: number;
  time_accuracy: number;
  location_accuracy: number;
  challenge_accuracy: number;
}

// Define the structure of the user_metrics table in Supabase
export interface UserMetricsTable {
  id: string;
  user_id: string;
  xp_total: number;
  overall_accuracy: number;
  games_played: number;
  created_at: string;
  updated_at: string;
  best_accuracy?: number;
  perfect_games?: number;
  global_rank?: number;
  time_accuracy?: number;
  location_accuracy?: number;
  challenge_accuracy?: number;
  year_bullseye?: number;
  location_bullseye?: number;
}

export type UserMetricsRecord = Record<string, number>;

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  sound_enabled: boolean;
  notification_enabled: boolean;
  distance_unit: 'km' | 'mi';
  language: string;
}

// Fetch user profile
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  // If userId is not provided, return null early
  if (!userId) {
    console.log('No userId provided for profile fetch');
    return null;
  }
  
  console.log(`Fetching profile for user: ${userId}`);
  
  // Check if this is a guest user from localStorage first
  const guestSession = localStorage.getItem('guestSession');
  if (guestSession) {
    try {
      const guestUser = JSON.parse(guestSession);
      if (guestUser.id === userId) {
        console.log('Found guest user in localStorage:', guestUser.id);
        
        // Try to get the profile from the database first
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          // If we found the profile in the database, use that
          if (data && !error) {
            console.log('Found guest profile in database:', data);
            return data as unknown as UserProfile;
          }
        } catch (dbError) {
          console.log('Error fetching guest from database, using localStorage:', dbError);
        }
        
        // Return a simplified profile for guest users from localStorage
        return {
          id: guestUser.id,
          display_name: guestUser.display_name,
          avatar_url: guestUser.avatar_url || 'guest',
          avatar_image_url: guestUser.avatar_url || 'https://api.dicebear.com/6.x/adventurer/svg?seed=' + userId,
          created_at: new Date().toISOString()
        } as UserProfile;
      }
    } catch (e) {
      console.log('Error parsing guest session:', e);
    }
  }
  
  // Not a guest user or guest not found in localStorage, try database
  try {
    console.log(`Fetching profile from database for: ${userId}`);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    // Check if this is a guest user (marked by avatar_url = 'guest')
    if (data && data.avatar_url === 'guest') {
      console.log('Found guest user in database:', data);
    }

    return data as unknown as UserProfile;
  } catch (error) {
    console.error('Error in fetchUserProfile:', error);
    return null;
  }
}

// Update user avatar
// Find a matching avatar based on user's display name
export async function findMatchingAvatar(displayName: string | undefined, isGuest: boolean = false): Promise<Avatar | null> {
  try {
    if (!displayName) return null;
    
    // Get all available avatars
    const avatars = await fetchAvatars();
    if (avatars.length === 0) return null;
    
    // For guest users, try to find an avatar with 'guest' in the name
    if (isGuest) {
      const guestAvatars = avatars.filter(avatar => 
        avatar.name.toLowerCase().includes('guest'));
      
      if (guestAvatars.length > 0) {
        // Return a random guest avatar
        return guestAvatars[Math.floor(Math.random() * guestAvatars.length)];
      }
    }
    
    // Get the first letter of the display name
    const firstLetter = displayName.charAt(0).toLowerCase();
    
    // Try to find an avatar that starts with the same letter
    const matchingAvatars = avatars.filter(avatar => 
      avatar.name.charAt(0).toLowerCase() === firstLetter);
    
    if (matchingAvatars.length > 0) {
      // Return a random matching avatar
      return matchingAvatars[Math.floor(Math.random() * matchingAvatars.length)];
    }
    
    // If no match found, return a random avatar
    return avatars[Math.floor(Math.random() * avatars.length)];
  } catch (error) {
    console.error('Error in findMatchingAvatar:', error);
    return null;
  }
}

export async function updateUserAvatar(userId: string, avatarId: string, customImageUrl: string | null = null): Promise<boolean> {
  try {
    let imageUrl = customImageUrl;
    
    // If no custom image URL provided, fetch from avatars table
    if (!customImageUrl) {
      const { data: avatarData, error: avatarError } = await supabase
        .from('avatars')
        .select('image_url')
        .eq('id', avatarId)
        .single();
        
      if (avatarError || !avatarData) {
        console.error('Error fetching avatar:', avatarError);
        return false;
      }
      
      imageUrl = avatarData.image_url;
    }
    
    // Update the user profile with the new avatar
    const { error } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: avatarId,
        avatar_image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) {
      console.error('Error updating avatar:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateUserAvatar:', error);
    return false;
  }
}

// Create a new user profile if it doesn't exist
export async function createUserProfileIfNotExists(userId: string, displayName: string, isGuest: boolean = false): Promise<boolean> {
  try {
    console.log(`Checking if profile exists for user ${userId}`);
    
    // Check if profile exists
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
      
    // If profile exists, no need to create one
    if (data) {
      console.log(`Profile already exists for user ${userId}`);
      return true;
    }
    
    // If error is not "not found", then something else went wrong
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking profile existence:', fetchError);
      return false;
    }
    
    // Create new profile
    const defaultAvatarUrl = 'https://api.dicebear.com/6.x/adventurer/svg?seed=' + userId;
    
    // Prepare the profile data based on the actual database schema
    const profileData: any = {
      id: userId,
      display_name: displayName,
      avatar_image_url: defaultAvatarUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // If this is a guest user, mark it as such using avatar_url field
    if (isGuest) {
      profileData.avatar_url = 'guest';
    }
    
    console.log('Creating new profile with data:', profileData);
    
    const { data: insertData, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select();
      
    if (error) {
      console.error('Error creating profile:', error);
      return false;
    }
    
    console.log('Profile created successfully:', insertData);
    return true;
  } catch (error) {
    console.error('Error in createUserProfileIfNotExists:', error);
    return false;
  }
}

// Fetch available avatars
export async function fetchAvatars(): Promise<Avatar[]> {
  try {
    const { data, error } = await supabase
      .from('avatars')
      .select('*')
      .order('created_at');

    if (error) {
      console.error('Error fetching avatars:', error);
      return [];
    }

    return data as Avatar[];
  } catch (error) {
    console.error('Error in fetchAvatars:', error);
    return [];
  }
}

// Fetch user stats
export async function fetchUserStats(userId: string): Promise<UserStats | null> {
  try {
    const { data, error } = await supabase
      .from('user_metrics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }

    if (!data) return null;
    
    const metrics = data as UserMetricsTable;

    return {
      games_played: metrics.games_played || 0,
      avg_accuracy: metrics.overall_accuracy || 0,
      best_accuracy: metrics.best_accuracy || 0,
      perfect_scores: metrics.perfect_games || 0,
      total_xp: metrics.xp_total || 0,
      global_rank: metrics.global_rank || 0,
      time_accuracy: metrics.time_accuracy || 0,
      location_accuracy: metrics.location_accuracy || 0,
      challenge_accuracy: metrics.challenge_accuracy || 0
    };
  } catch (error) {
    console.error('Error in fetchUserStats:', error);
    return null;
  }
}

/**
 * Updates user metrics in Supabase after a game is completed
 * @param userId The user's ID
 * @param gameMetrics The metrics from the completed game
 * @returns Promise<boolean> indicating success or failure
 */
export const updateUserMetrics = async (
  userId: string,
  gameMetrics: {
    gameAccuracy: number;
    gameXP: number;
    isPerfectGame: boolean;
    locationAccuracy: number;
    timeAccuracy: number;
    yearBullseye?: boolean;
    locationBullseye?: boolean;
  },
  gameId?: string // Optional gameId for tracking
): Promise<boolean> => {
  console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] updateUserMetrics called with:`, {
    userId,
    gameMetrics,
    timestamp: new Date().toISOString()
  });
  
  if (typeof gameMetrics.gameXP !== 'number' || isNaN(gameMetrics.gameXP)) {
    console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Invalid gameXP (NaN or not a number):`, gameMetrics.gameXP);
    return false;
  }

  // Validate game metrics
  const MAX_XP_PER_GAME = 1000; // Maximum XP that can be earned in a single game (5 rounds * 200 XP max per round)
  
  // Ensure game metrics are valid numbers and within reasonable bounds
  let gameXP = Math.max(0, Math.min(Number(gameMetrics.gameXP) || 0, MAX_XP_PER_GAME));
  let gameAccuracy = Math.max(0, Math.min(Number(gameMetrics.gameAccuracy) || 0, 100));
  let locationAccuracy = Math.max(0, Math.min(Number(gameMetrics.locationAccuracy) || 0, 100));
  let timeAccuracy = Math.max(0, Math.min(Number(gameMetrics.timeAccuracy) || 0, 100));
  
  console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Validated metrics:`, {
    originalXP: gameMetrics.gameXP,
    validatedXP: gameXP,
    gameAccuracy: gameMetrics.gameAccuracy,
    locationAccuracy: gameMetrics.locationAccuracy,
    timeAccuracy: gameMetrics.timeAccuracy,
    isPerfectGame: gameMetrics.isPerfectGame
  });
  try {
    // Check if this is a guest user first
    const guestSession = localStorage.getItem('guestSession');
    let isGuestUser = false;
    
    if (guestSession) {
      try {
        const guestUser = JSON.parse(guestSession);
        if (guestUser.id === userId) {
          isGuestUser = true;
        }
      } catch (e) {
        console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Error parsing guest session:`, e);
      }
    }
    
    // Define a type that includes all possible metrics fields
    type UserMetricsUpsert = {
      user_id: string;
      xp_total: number;
      overall_accuracy: number;
      games_played: number;
      updated_at: string;
      best_accuracy?: number;
      perfect_games?: number;
      global_rank?: number;
      time_accuracy?: number;
      location_accuracy?: number;
      challenge_accuracy?: number;
      year_bullseye?: number;
      location_bullseye?: number;
    };
    
    // Initialize metrics object with required fields
    let metrics: UserMetricsUpsert = {
      user_id: userId,
      xp_total: 0,
      overall_accuracy: 0,
      games_played: 0,
      updated_at: new Date().toISOString()
    };
    
    // For guest users, get existing metrics from localStorage
    if (isGuestUser) {
      console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Updating metrics for GUEST user:`, { userId, gameMetrics });
      const storageKey = `user_metrics_${userId}`;
      const storedMetricsJson = localStorage.getItem(storageKey);
      
      if (storedMetricsJson) {
        try {
          const storedMetrics = JSON.parse(storedMetricsJson);
          const currentGamesPlayed = storedMetrics.games_played || 0;
          const gamesPlayed = currentGamesPlayed + 1;
          
          // Calculate new averages with detailed logging for debugging
          console.log('===== GLOBAL SCORE CALCULATION =====');
          
          // Get current stats with proper defaults
          const currentGames = Math.max(0, Number(storedMetrics.games_played) || 0);
          const currentAccuracy = Math.max(0, Math.min(Number(storedMetrics.overall_accuracy) || 0, 100));
          const currentXP = Math.max(0, Number(storedMetrics.xp_total) || 0);
          
          // Calculate new games played
          const totalGames = currentGames + 1;
          
          // Calculate new accuracy as a weighted average
          const newAccuracy = Math.min(100, Math.round(
            (currentAccuracy * currentGames + gameAccuracy) / totalGames
          ));
            
          // Calculate new XP (simple addition with bounds checking)
          const newXPTotal = Math.min(
            currentXP + gameXP,
            Number.MAX_SAFE_INTEGER
          );
          
          // Calculate new time and location accuracies
          const currentTimeTotal = (storedMetrics.time_accuracy || 0) * currentGames;
          const newTimeAccuracy = Math.min(100, Math.round(
            (currentTimeTotal + timeAccuracy) / totalGames
          ));
          
          const currentLocationTotal = (storedMetrics.location_accuracy || 0) * currentGames;
          const newLocationAccuracy = Math.min(100, Math.round(
            (currentLocationTotal + locationAccuracy) / totalGames
          ));
          
          // Calculate best accuracy (max of current best and this game's accuracy)
          const bestAccuracy = Math.max(
            Math.min(Number(storedMetrics.best_accuracy) || 0, 100),
            gameAccuracy
          );
          
          // Debug logging
          console.log('===== GUEST USER STATS UPDATE =====');
          console.log('Previous Games:', currentGames);
          console.log('Current Game Accuracy:', gameAccuracy);
          console.log('Current Game XP:', gameXP);
          console.log('New Accuracy:', newAccuracy);
          console.log('New XP Total:', newXPTotal);
          console.log('New Time Accuracy:', newTimeAccuracy);
          console.log('New Location Accuracy:', newLocationAccuracy);
          console.log('Best Accuracy:', bestAccuracy);
          console.log('==================================');

          // Sanity checks with error logging
          if (newXPTotal < currentXP) {
            console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Guest XP Sanity Check FAILED: newTotalXP (${newXPTotal}) < previousTotalXP (${currentXP})`);
          }
          
          if (gameXP > 0 && newXPTotal <= currentXP) {
            console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Guest XP Sanity Check FAILED: Added XP (${gameXP}) but total didn't increase (${currentXP} -> ${newXPTotal})`);
          }
          
          // Create the updated metrics object with validated values
          metrics = {
            ...metrics,
            games_played: totalGames,
            overall_accuracy: newAccuracy,
            best_accuracy: bestAccuracy,
            perfect_games: (storedMetrics.perfect_games || 0) + (gameMetrics.isPerfectGame ? 1 : 0),
            xp_total: newXPTotal,
            time_accuracy: newTimeAccuracy,
            location_accuracy: newLocationAccuracy,
            challenge_accuracy: Math.min(100, Number(storedMetrics.challenge_accuracy) || 0),
            year_bullseye: (storedMetrics.year_bullseye || 0) + (gameMetrics.yearBullseye ? 1 : 0),
            location_bullseye: (storedMetrics.location_bullseye || 0) + (gameMetrics.locationBullseye ? 1 : 0)
          };
          
          console.log('Final metrics to save:', {
            games_played: metrics.games_played,
            overall_accuracy: metrics.overall_accuracy,
            xp_total: metrics.xp_total
          });
        } catch (e) {
          console.error('Error parsing stored metrics for guest user:', e);
          // Initialize new metrics for this guest starting from 0
          metrics = {
            ...metrics,
            games_played: 1,
            overall_accuracy: gameMetrics.gameAccuracy,
            best_accuracy: gameMetrics.gameAccuracy,
            perfect_games: gameMetrics.isPerfectGame ? 1 : 0,
            // For new guest users, just use the current game's XP directly
            xp_total: Number(gameMetrics.gameXP || 0),
            time_accuracy: gameMetrics.timeAccuracy,
            location_accuracy: gameMetrics.locationAccuracy,
            challenge_accuracy: 0,
            global_rank: 0,
            year_bullseye: gameMetrics.yearBullseye ? 1 : 0,
            location_bullseye: gameMetrics.locationBullseye ? 1 : 0
          };
          console.log('Creating new guest metrics with initial XP:', gameMetrics.gameXP);
        }
      } else {
        // No stored metrics found, create new metrics
        metrics = {
          ...metrics,
          games_played: 1,
          overall_accuracy: gameMetrics.gameAccuracy,
          best_accuracy: gameMetrics.gameAccuracy,
          perfect_games: gameMetrics.isPerfectGame ? 1 : 0,
          xp_total: gameMetrics.gameXP,
          time_accuracy: gameMetrics.timeAccuracy,
          location_accuracy: gameMetrics.locationAccuracy,
          challenge_accuracy: 0,
          global_rank: 0,
          year_bullseye: gameMetrics.yearBullseye ? 1 : 0,
          location_bullseye: gameMetrics.locationBullseye ? 1 : 0
        };
      }
      
      // Save updated metrics to localStorage for guest users
      if (isGuestUser) {
        try {
          const storageKey = `user_metrics_${userId}`;
          localStorage.setItem(storageKey, JSON.stringify(metrics));
          console.log('Saved updated metrics to localStorage for guest user:', metrics);
          
          // Force a trigger event to ensure localStorage change is detected
          window.dispatchEvent(new Event('storage'));
          
          return true;
        } catch (error) {
          console.error('Error saving metrics to localStorage:', error);
          return false;
        }
      }
    }
    
    // For regular users, get existing metrics from Supabase
    console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Updating metrics for registered user:`, userId);
    const { data: existingData, error: fetchError } = await supabase
      .from('user_metrics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // No existing record, create new metrics starting from 0
      const initialXP = Math.max(0, Math.min(Number(gameMetrics.gameXP) || 0, MAX_XP_PER_GAME));
      metrics = {
        ...metrics,
        games_played: 1,
        overall_accuracy: gameMetrics.gameAccuracy,
        best_accuracy: gameMetrics.gameAccuracy,
        perfect_games: gameMetrics.isPerfectGame ? 1 : 0,
        xp_total: initialXP,
        time_accuracy: gameMetrics.timeAccuracy,
        location_accuracy: gameMetrics.locationAccuracy,
        challenge_accuracy: 0,
        global_rank: 0,
        year_bullseye: gameMetrics.yearBullseye ? 1 : 0,
        location_bullseye: gameMetrics.locationBullseye ? 1 : 0,
        updated_at: new Date().toISOString()
      };
      
      console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] New User Metrics:`, {
        userId,
        initialXP,
        gameXP: gameMetrics.gameXP,
        gameAccuracy: gameMetrics.gameAccuracy,
        isPerfectGame: gameMetrics.isPerfectGame,
        source: 'new-user-creation',
        timestamp: new Date().toISOString()
      });
    } else if (fetchError) {
      console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Error fetching existing metrics:`, fetchError);
      return false;
    } else {
      // Update existing metrics
      const existingMetrics = existingData as UserMetricsTable;
      
      // Calculate new averages with detailed logging
      console.log('===== REGISTERED USER SCORE CALCULATION =====');
      
      // Get current stats with proper defaults and validation
      const currentGames = Math.max(0, Number(existingMetrics.games_played) || 0);
      const currentAccuracy = Math.max(0, Math.min(Number(existingMetrics.overall_accuracy) || 0, 100));
      const currentXP = Math.max(0, Number(existingMetrics.xp_total) || 0);
      
      // Calculate new games played
      const totalGames = currentGames + 1;
      
      // Calculate new accuracy as a weighted average (capped at 100)
      const newAccuracy = Math.min(100, Math.round(
        (currentAccuracy * currentGames + gameMetrics.gameAccuracy) / totalGames
      ));
      
      // Calculate new XP (simple addition with bounds checking)
      const newXPTotal = Math.min(
        currentXP + gameMetrics.gameXP,
        Number.MAX_SAFE_INTEGER
      );
      
      // Calculate new time and location accuracies (weighted averages)
      const currentTimeTotal = (existingMetrics.time_accuracy || 0) * currentGames;
      const newTimeAccuracy = Math.min(100, Math.round(
        (currentTimeTotal + gameMetrics.timeAccuracy) / totalGames
      ));
      
      const currentLocationTotal = (existingMetrics.location_accuracy || 0) * currentGames;
      const newLocationAccuracy = Math.min(100, Math.round(
        (currentLocationTotal + gameMetrics.locationAccuracy) / totalGames
      ));
      
      // Calculate best accuracy (max of current best and this game's accuracy)
      const bestAccuracy = Math.max(
        Math.min(Number(existingMetrics.best_accuracy) || 0, 100),
        gameMetrics.gameAccuracy
      );
      
      // Debug logging
      console.log('===== REGISTERED USER STATS UPDATE =====');
      console.log('Previous Games:', currentGames);
      console.log('Current Game Accuracy:', gameMetrics.gameAccuracy);
      console.log('Current Game XP:', gameMetrics.gameXP);
      console.log('New Accuracy:', newAccuracy);
      console.log('New XP Total:', newXPTotal);
      console.log('New Time Accuracy:', newTimeAccuracy);
      console.log('New Location Accuracy:', newLocationAccuracy);
      console.log('Best Accuracy:', bestAccuracy);
      console.log('======================================');
      
      // Sanity checks with error logging
      if (newXPTotal < currentXP) {
        console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Registered User XP Sanity Check FAILED: newTotalXP (${newXPTotal}) < previousTotalXP (${currentXP})`);
      }
      
      if (gameMetrics.gameXP > 0 && newXPTotal <= currentXP) {
        console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Registered User XP Sanity Check FAILED: Added XP (${gameMetrics.gameXP}) but total didn't increase (${currentXP} -> ${newXPTotal})`);
      }
      
      // Update the metrics object with validated values
      metrics = {
        ...metrics,
        games_played: totalGames,
        overall_accuracy: newAccuracy,
        best_accuracy: bestAccuracy,
        perfect_games: (existingMetrics.perfect_games || 0) + (gameMetrics.isPerfectGame ? 1 : 0),
        xp_total: newXPTotal,
        time_accuracy: newTimeAccuracy,
        location_accuracy: newLocationAccuracy,
        challenge_accuracy: Math.min(100, Number(existingMetrics.challenge_accuracy) || 0),
        year_bullseye: (existingMetrics.year_bullseye || 0) + (gameMetrics.yearBullseye ? 1 : 0),
        location_bullseye: (existingMetrics.location_bullseye || 0) + (gameMetrics.locationBullseye ? 1 : 0),
        updated_at: new Date().toISOString()
      };
      
      try {
        // Upsert the metrics to Supabase
        console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Upserting metrics for user ${userId}:`, metrics);
        
        const { error: upsertError } = await supabase
          .from('user_metrics')
          .upsert(metrics, { onConflict: 'user_id' });

        if (upsertError) {
          console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Error upserting user metrics:`, upsertError);
          return false;
        }

        // Verify the update by fetching the latest metrics
        const { data: verifyData, error: verifyError } = await supabase
          .from('user_metrics')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (verifyError) {
          console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Error verifying metrics update:`, verifyError);
        } else {
          console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Successfully updated metrics for user ${userId}. Verified data from DB:`, verifyData);
          console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Verified xp_total from DB after update:`, verifyData?.xp_total);
        }
        
        return true;
      } catch (error) {
        console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Unexpected error in updateUserMetrics:`, error);
        return false;
      }
    }
    
    // If we reach here, something went wrong
    console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] No metrics were updated for user ${userId}`);
    return false;
    
  } catch (error) {
    console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Error in updateUserMetrics:`, error);
    return false;
  }
}

// Fetch user settings
export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('id', userId)
      .single();

    if (error) {
      // If settings don't exist, return default settings
      if (error.code === 'PGRST116') {
        const defaultSettings: UserSettings = {
          theme: 'system',
          sound_enabled: true,
          notification_enabled: true,
          distance_unit: 'km',
          language: 'en'
        };
        return defaultSettings;
      }
      
      console.error('Error fetching user settings:', error);
      return null;
    }

    // Add type assertion and handle potential JSON parsing
    const settings = data.value as unknown;
    return settings as UserSettings;
  } catch (error) {
    console.error('Error in fetchUserSettings:', error);
    return null;
  }
}

// Update user settings
export async function updateUserSettings(userId: string, settings: UserSettings): Promise<boolean> {
  try {
    // Check if settings exist for this user
    const { data, error: fetchError } = await supabase
      .from('settings')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking settings existence:', fetchError);
      return false;
    }
    
    // If settings exist, update them
    if (data) {
      // Convert settings to a JSON-compatible format
      const settingsJson = JSON.parse(JSON.stringify(settings));
      
      const { error } = await supabase
        .from('settings')
        .update({ 
          value: settingsJson,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId) as { error: any };
        
      if (error) {
        console.error('Error updating settings:', error);
        return false;
      }
    }
    // If settings don't exist, insert them
    else {
      // Convert settings to a JSON-compatible format
      const settingsJson = JSON.parse(JSON.stringify(settings));
      
      const { error } = await supabase
        .from('settings')
        .insert({
          id: userId,
          value: settingsJson,
          updated_at: new Date().toISOString()
        }) as { error: any };
        
      if (error) {
        console.error('Error creating settings:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateUserSettings:', error);
    return false;
  }
}
