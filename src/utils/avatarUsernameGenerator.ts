import { supabase } from '@/integrations/supabase/client';

/**
 * Extract base name from an avatar filename (remove extension)
 * @param filename The avatar filename (e.g. "napoleon.png")
 * @returns The base name without extension (e.g. "napoleon")
 */
export function getBaseName(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

/**
 * Generate a username from an avatar filename with a random 3-digit suffix
 * @param filename The avatar filename
 * @returns A username in the format basename_XXX (e.g. "napoleon_123")
 */
export function generateUsernameFromAvatar(filename: string): string {
  const base = getBaseName(filename);
  const suffix = Math.floor(100 + Math.random() * 900); // 3-digit number between 100-999
  return `${base}_${suffix}`;
}

/**
 * Check if a username already exists in the profiles table
 * @param username Username to check
 * @returns True if the username exists, false otherwise
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('display_name', username)
      .limit(1);

    if (error) {
      console.error('Error checking username:', error);
      return false; // Assume not taken in case of error to prevent blocking
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error in isUsernameTaken:', error);
    return false; // Assume not taken in case of error to prevent blocking
  }
}

/**
 * Generate a unique username from an avatar filename
 * This will check the database and ensure the username is unique
 * If the generated username is already taken, it will try again with a new random suffix
 * 
 * @param filename The avatar filename
 * @returns A unique username
 */
export async function generateUniqueAvatarUsername(filename: string): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10; // Prevent infinite loop
  let username: string;
  
  do {
    // Generate a new username with random suffix
    username = generateUsernameFromAvatar(filename);
    attempts++;
    
    // Check if username is taken
    const taken = await isUsernameTaken(username);
    if (!taken) {
      return username;
    }
    
    // If we've reached max attempts, add a timestamp to ensure uniqueness
    if (attempts >= maxAttempts) {
      const timestamp = Date.now().toString().slice(-6);
      username = `${getBaseName(filename)}_${timestamp}`;
      return username;
    }
  } while (attempts < maxAttempts);
  
  return username;
}
