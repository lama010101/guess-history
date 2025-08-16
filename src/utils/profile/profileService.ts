
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string; // social avatar from OAuth providers
  avatar_name?: string; // unique historical avatar name e.g. "Albert Einstein #1234"
  avatar_image_url?: string; // image URL from avatars.firebase_url
  avatar_id?: string; // optional FK to avatars.id (if column added)
  email?: string;
  created_at: string;
  updated_at?: string;
}

export interface Avatar {
  id: string;
  first_name: string;
  last_name: string;
  description?: string;
  birth_day?: string;
  birth_city?: string;
  birth_country?: string;
  death_day?: string;
  death_city?: string;
  death_country?: string;
  firebase_url: string;
  ready?: boolean;
  created_at: string;

  // Helper derived fields (not in DB)
  name?: string; // `${first_name} ${last_name}`
  image_url?: string; // alias for firebase_url to keep old code working
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
  inertia_enabled: boolean;
}

// Fetch user profile (registered or anonymous). Always query Supabase.
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;

  try {
    // First get the profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    if (!data) {
      console.log(`No profile found for user: ${userId}`);
      return null;
    }
    
    // If profile has avatar_id but no avatar_image_url, fetch it from avatars table
    if (data.avatar_id && !data.avatar_image_url) {
      try {
        const { data: avatarData, error: avatarError } = await supabase
          .from('avatars')
          .select('firebase_url')
          .eq('id', data.avatar_id)
          .maybeSingle();
          
        if (!avatarError && avatarData) {
          // Update the profile with the firebase_url
          data.avatar_image_url = avatarData.firebase_url;
          
          // Also update it in the database for future queries
          await supabase
            .from('profiles')
            .update({ avatar_image_url: avatarData.firebase_url })
            .eq('id', userId);
        }
      } catch (avatarErr) {
        console.error('Error fetching avatar URL:', avatarErr);
      }
    }

    return data as UserProfile;
  } catch (err) {
    console.error('Unexpected error in fetchUserProfile:', err);
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

// Updates the user profile with a newly selected avatar
export async function updateUserAvatar(userId: string, avatarId: string, customImageUrl: string | null = null): Promise<boolean> {
  try {
    let imageUrl = customImageUrl;
    let avatarName: string | undefined;
    
    // If no custom image URL provided, fetch from avatars table
    if (!customImageUrl) {
      const { data: avatarData, error: avatarError } = await supabase
        .from('avatars')
        .select('*')
        .eq('id', avatarId)
        .single();
        
      if (avatarError || !avatarData) {
        console.error('Error fetching avatar:', avatarError);
        return false;
      }
      
      imageUrl = avatarData.firebase_url;
        // Build unique avatar name
        const baseName = `${avatarData.first_name} ${avatarData.last_name}`.trim();
        let uniqueName = baseName;
        for (let attempt = 0; attempt < 10; attempt++) {
          const suffix = Math.floor(1000 + Math.random() * 9000);
          const candidate = `${baseName} #${suffix}`;
          const { data: exists } = await supabase
            .from('profiles')
            .select('id')
            .eq('avatar_name', candidate)
            .single();
          if (!exists) {
            uniqueName = candidate;
            break;
          }
        }
        avatarName = uniqueName;
    }
    
    // Update the user profile with the new avatar fields
    // Important: Update both display_name and avatar_name to the new avatar name
    const { error } = await supabase
      .from('profiles')
      .update({ 
        avatar_image_url: imageUrl,
        avatar_id: avatarId,
        avatar_name: avatarName,
        display_name: avatarName, // Update display_name to match avatar_name
        updated_at: new Date().toISOString(),
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
// Creates a profile and assigns a random historical avatar if one does not already exist
export async function createUserProfileIfNotExists(userId: string, displayName: string): Promise<boolean> {
  try {
    console.log(`Checking if profile exists for user ${userId}`);
    
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // If profile exists but already has an avatar, nothing to do
    if (existingProfile && existingProfile.avatar_id) {
      console.log(`Profile already exists with avatar for user ${userId}`);
      return true;
    }
    
    // If error is not "not found", then something else went wrong
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking profile existence:', fetchError);
      return false;
    }
    
    // --- Avatar assignment logic (fixed 2025-07-19) ---
    // Fetch all ready avatars (id, firebase_url, first_name, last_name)
    const { data: avatarsList, error: avatarErr } = await supabase
      .from('avatars')
      .select('id, firebase_url, first_name, last_name')
      .eq('ready', true);

    if (avatarErr || !avatarsList || avatarsList.length === 0) {
      console.error('Error fetching ready avatars:', avatarErr);
    }

    // Pick one at random on the client
    const avatar = avatarsList && avatarsList.length > 0
      ? avatarsList[Math.floor(Math.random() * avatarsList.length)]
      : null;

    if (avatarErr) {
      console.error('Error fetching random avatar:', avatarErr);
    }

    let avatarName = displayName;
    let avatarImageUrl: string | undefined;
    let avatarId: string | undefined;

    if (avatar) {
      // Build base name from avatar table
      const baseName = `${avatar.first_name} ${avatar.last_name}`.trim();
      // Ensure uniqueness by trying different numeric suffixes up to 10 attempts
      for (let attempt = 0; attempt < 10; attempt++) {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const candidate = `${baseName} #${suffix}`;
        // Check uniqueness in profiles
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('avatar_name', candidate)
          .maybeSingle(); // Use maybeSingle to avoid errors if name is not unique yet
        if (!existing) {
          avatarName = candidate;
          break;
        }
      }

      avatarImageUrl = avatar.firebase_url;
      avatarId = avatar.id;
    }

    // Fallback avatar if query failed
    if (!avatarImageUrl) {
      avatarImageUrl = `https://api.dicebear.com/6.x/adventurer/svg?seed=${userId}`;
    }

    // Prepare the profile data (for insert or update)
    const profileData: any = {
      display_name: avatarName,
      avatar_name: avatarName,
      avatar_image_url: avatarImageUrl,
      avatar_id: avatarId ?? null,
      // Mark guest users when created from the guest flow
      is_guest: (displayName && displayName.toLowerCase() === 'guest') ? true : undefined,
      updated_at: new Date().toISOString(),
    };

    if (!existingProfile) {
      // New profile insert
      Object.assign(profileData, {
        id: userId,
        created_at: new Date().toISOString(),
      });
    }
    

    
    console.log('Creating new profile with data:', profileData);
    
    let dbError;
    if (existingProfile) {
      // Update existing profile missing avatar
      const { error: updErr } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId);
      dbError = updErr;
    } else {
      const { error: insErr } = await supabase
        .from('profiles')
        .insert(profileData);
      dbError = insErr;
    }
      
    if (dbError) {
      // If the error is a duplicate key violation (code 23505), it's okay.
      // It means the profile was likely created by a concurrent request.
      if (dbError.code === '23505') {
        console.log(`Profile for user ${userId} already exists or was created concurrently. Continuing.`);
        return true; // The profile exists, so we can consider this a success.
      }
      
      console.error('Error saving profile:', dbError);
      return false;
    }
    
    console.log('Profile upserted successfully for user', userId);
    return true;
  } catch (error) {
    console.error('Error in createUserProfileIfNotExists:', error);
    return false;
  }
}

// Fetch avatar by id
export async function fetchAvatarById(avatarId: string): Promise<Avatar | null> {
  try {
    const { data, error } = await supabase
      .from('avatars')
      .select('*')
      .eq('id', avatarId)
      .single();
    if (error || !data) {
      console.error('Error fetching avatar by id:', error);
      return null;
    }
    // Add helper fields for UI compatibility
    return {
      ...data,
      name: `${data.first_name} ${data.last_name}`,
      image_url: data.firebase_url,
    } as Avatar;
  } catch (error) {
    console.error('Error in fetchAvatarById:', error);
    return null;
  }
}

// Fetch available avatars
export async function fetchAvatars(onlyReady: boolean = true): Promise<Avatar[]> {
  try {
    const query = supabase
      .from('avatars')
      .select('*')
      .order('created_at');

    const { data, error } = onlyReady ? await query.eq('ready', true) : await query;

    if (error) {
      console.error('Error fetching avatars:', error);
      return [];
    }

    // Map DB fields into Avatar helper fields expected by UI (name & image_url)
    return (data as Avatar[]).map((a) => ({
      ...a,
      name: `${a.first_name} ${a.last_name}`,
      image_url: a.firebase_url,
    }));
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
  console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] updateUserMetrics START called with:`, {
    userId,
    gameMetrics,
    timestamp: new Date().toISOString()
  });

  if (!userId) {
    console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Invalid userId:`, userId);
    return false;
  }
  if (typeof gameMetrics.gameXP !== 'number' || isNaN(gameMetrics.gameXP)) {
    console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Invalid gameXP (NaN or not a number):`, gameMetrics.gameXP);
    return false;
  }
  if (typeof gameMetrics.gameAccuracy !== 'number' || isNaN(gameMetrics.gameAccuracy)) {
    console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Invalid gameAccuracy (NaN or not a number):`, gameMetrics.gameAccuracy);
    return false;
  }

  // Validate game metrics (use these validated values throughout the function)
  const MAX_XP_PER_GAME = 1000; // Max XP for a 5-round game (5 * 200)
  const validatedGameXP = Math.max(0, Math.min(Number(gameMetrics.gameXP) || 0, MAX_XP_PER_GAME));
  const validatedGameAccuracy = Math.max(0, Math.min(Number(gameMetrics.gameAccuracy) || 0, 100));
  const validatedLocationAccuracy = Math.max(0, Math.min(Number(gameMetrics.locationAccuracy) || 0, 100));
  const validatedTimeAccuracy = Math.max(0, Math.min(Number(gameMetrics.timeAccuracy) || 0, 100));

  console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Validated game input:`, {
    userId,
    gameId,
    originalGameXP: gameMetrics.gameXP,
    validatedGameXP,
    originalGameAccuracy: gameMetrics.gameAccuracy,
    validatedGameAccuracy,
    isPerfectGame: gameMetrics.isPerfectGame,
    locationAccuracy: validatedLocationAccuracy,
    timeAccuracy: validatedTimeAccuracy,
  });

  try {
    type UserMetricsUpsert = {
      user_id: string;
      xp_total: number;
      overall_accuracy: number;
      games_played: number;
      updated_at: string;
      best_accuracy?: number;
      perfect_games?: number;
      // global_rank is typically calculated by a separate process or view, not set here
      time_accuracy?: number;
      location_accuracy?: number;
      challenge_accuracy?: number; // Assuming this might be used later
      year_bullseye?: number;
      location_bullseye?: number;
    };

    let metricsToUpsert: UserMetricsUpsert;

    const { data: existingData, error: fetchError } = await supabase
      .from('user_metrics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // New user: No existing record found
      console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] No existing metrics for user ${userId}. Creating new record.`);
      metricsToUpsert = {
        user_id: userId,
        xp_total: validatedGameXP,
        overall_accuracy: validatedGameAccuracy,
        games_played: 1,
        updated_at: new Date().toISOString(),
        best_accuracy: validatedGameAccuracy,
        perfect_games: gameMetrics.isPerfectGame ? 1 : 0,
        time_accuracy: validatedTimeAccuracy,
        location_accuracy: validatedLocationAccuracy,
        challenge_accuracy: 0, // Default for new users
        year_bullseye: gameMetrics.yearBullseye ? 1 : 0,
        location_bullseye: gameMetrics.locationBullseye ? 1 : 0,
      };
      console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Prepared new user metrics:`, metricsToUpsert);
    } else if (fetchError) {
      // An error occurred fetching existing metrics (not 'PGRST116')
      console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Error fetching existing metrics for user ${userId}:`, fetchError);
      return false;
    } else {
      // Existing user: Record found
      const existingMetrics = existingData as UserMetricsTable;
      console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Found existing metrics for user ${userId}:`, existingMetrics);

      const currentGames = Math.max(0, Number(existingMetrics.games_played) || 0);
      const currentOverallAccuracy = Math.max(0, Math.min(Number(existingMetrics.overall_accuracy) || 0, 100));
      const currentXPTotal = Math.max(0, Number(existingMetrics.xp_total) || 0);
      const currentTimeAccuracy = Math.max(0, Math.min(Number(existingMetrics.time_accuracy) || 0, 100));
      const currentLocationAccuracy = Math.max(0, Math.min(Number(existingMetrics.location_accuracy) || 0, 100));
      const currentBestAccuracy = Math.max(0, Math.min(Number(existingMetrics.best_accuracy) || 0, 100));
      const currentPerfectGames = Math.max(0, Number(existingMetrics.perfect_games) || 0);
      const currentYearBullseyes = Math.max(0, Number(existingMetrics.year_bullseye) || 0);
      const currentLocBullseyes = Math.max(0, Number(existingMetrics.location_bullseye) || 0);

      const newGamesPlayed = currentGames + 1;
      const newXPTotal = currentXPTotal + validatedGameXP;
      
      // Weighted average for overall accuracy
      const newOverallAccuracy = parseFloat(((currentOverallAccuracy * currentGames + validatedGameAccuracy) / newGamesPlayed).toFixed(2));
      // Weighted average for time accuracy
      const newTimeAccuracy = parseFloat(((currentTimeAccuracy * currentGames + validatedTimeAccuracy) / newGamesPlayed).toFixed(2));
      // Weighted average for location accuracy
      const newLocationAccuracy = parseFloat(((currentLocationAccuracy * currentGames + validatedLocationAccuracy) / newGamesPlayed).toFixed(2));
      
      const newBestAccuracy = Math.max(currentBestAccuracy, validatedGameAccuracy);
      const newPerfectGames = currentPerfectGames + (gameMetrics.isPerfectGame ? 1 : 0);
      const newYearBullseyes = currentYearBullseyes + (gameMetrics.yearBullseye ? 1 : 0);
      const newLocBullseyes = currentLocBullseyes + (gameMetrics.locationBullseye ? 1 : 0);

      metricsToUpsert = {
        user_id: userId,
        xp_total: newXPTotal,
        overall_accuracy: newOverallAccuracy,
        games_played: newGamesPlayed,
        updated_at: new Date().toISOString(),
        best_accuracy: newBestAccuracy,
        perfect_games: newPerfectGames,
        time_accuracy: newTimeAccuracy,
        location_accuracy: newLocationAccuracy,
        challenge_accuracy: existingMetrics.challenge_accuracy || 0, // Preserve existing or default
        year_bullseye: newYearBullseyes,
        location_bullseye: newLocBullseyes,
      };
      console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Prepared updated metrics for user ${userId}:`, metricsToUpsert);
      
      // Sanity checks
      if (newXPTotal < currentXPTotal) {
        console.warn(`[ProfileService] [GameID: ${gameId || 'N/A'}] XP Sanity Check WARN: newTotalXP (${newXPTotal}) < previousTotalXP (${currentXPTotal}) for user ${userId}. This might happen if validatedGameXP was negative, which should be prevented by Math.max(0, ...).`);
      }
      if (validatedGameXP > 0 && newXPTotal <= currentXPTotal) {
         console.warn(`[ProfileService] [GameID: ${gameId || 'N/A'}] XP Sanity Check WARN: Added XP (${validatedGameXP}) but total didn't increase or decreased (${currentXPTotal} -> ${newXPTotal}) for user ${userId}.`);
      }
    }

    // Perform the upsert operation
    console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Attempting to upsert metrics for user ${userId}:`, metricsToUpsert);
    const { error: upsertError } = await supabase
      .from('user_metrics')
      .upsert(metricsToUpsert, { onConflict: 'user_id' });

    if (upsertError) {
      console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] Error upserting metrics for user ${userId}:`, upsertError);
      return false;
    }

    console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Successfully upserted metrics for user ${userId}.`);

    // Optional: Verify update by fetching (can be removed in production for performance if logs are sufficient)
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_metrics')
      .select('xp_total, overall_accuracy, games_played')
      .eq('user_id', userId)
      .single();

    if (verifyError) {
      console.warn(`[ProfileService] [GameID: ${gameId || 'N/A'}] Warning: Error verifying metrics update for user ${userId}, but upsert reported success. Error:`, verifyError);
    } else {
      console.log(`[ProfileService] [GameID: ${gameId || 'N/A'}] Verified metrics post-upsert for user ${userId}:`, verifyData);
      if (verifyData && verifyData.xp_total !== metricsToUpsert.xp_total) {
        console.warn(`[ProfileService] [GameID: ${gameId || 'N/A'}] XP Mismatch after upsert for user ${userId}. Expected: ${metricsToUpsert.xp_total}, Got: ${verifyData.xp_total}`);
      }
    }
    return true;

  } catch (error) {
    console.error(`[ProfileService] [GameID: ${gameId || 'N/A'}] UNEXPECTED ERROR in updateUserMetrics for user ${userId}:`, error);
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
      .maybeSingle();

    if (error) {
      console.error('Error fetching user settings:', error);
      return null;
    }

    if (!data) {
      // If settings don't exist, return default settings
      const defaultSettings: UserSettings = {
        theme: 'system',
        sound_enabled: true,
        notification_enabled: true,
        distance_unit: 'km',
        language: 'en',
        inertia_enabled: true,
      };
      return defaultSettings;
    }

    // Merge stored settings with defaults to ensure new fields (like inertia_enabled) are present
    const raw = (data.value as any) || {};
    const merged: UserSettings = {
      theme: raw.theme ?? 'system',
      sound_enabled: raw.sound_enabled ?? true,
      notification_enabled: raw.notification_enabled ?? true,
      distance_unit: raw.distance_unit ?? 'km',
      language: raw.language ?? 'en',
      inertia_enabled: raw.inertia_enabled ?? true,
    };
    return merged;
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
