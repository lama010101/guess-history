import { supabase } from '@/integrations/supabase/client';
import { generateUniqueAvatarUsername } from '@/utils/avatarUsernameGenerator';

export interface Avatar {
  id: string;
  name: string;
  url: string;
  created_at: string;
  updated_at?: string;
  gender?: 'male' | 'female' | 'unknown';
}

const AVATARS_BUCKET = 'avatars';

/**
 * Fetches all available avatars from the Supabase storage bucket
 * Only includes .png and .jpg files
 * Attempts to determine gender based on folder structure
 */
export async function fetchAvatars(): Promise<Avatar[]> {
  try {
    // First try to list by folder structure (preferred method)
    const folders = ['male', 'female'];
    let allAvatars: Avatar[] = [];
    
    for (const gender of folders) {
      const { data: files, error } = await supabase.storage
        .from(AVATARS_BUCKET)
        .list(gender);

      if (!error && files && files.length > 0) {
        // Process files in this gender folder
        const genderAvatars = await Promise.all(
          files
            .filter(file => file.name.endsWith('.png') || file.name.endsWith('.jpg'))
            .map(async (file) => {
              const { data: { publicUrl } } = supabase.storage
                .from(AVATARS_BUCKET)
                .getPublicUrl(`${gender}/${file.name}`);

              return {
                id: file.id || file.name,
                name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
                url: publicUrl,
                created_at: file.created_at || new Date().toISOString(),
                updated_at: file.updated_at,
                gender: gender as 'male' | 'female'
              };
            })
        );
        
        allAvatars = [...allAvatars, ...genderAvatars];
      }
    }
    
    // If we didn't find any avatars in gender folders, fall back to root directory
    if (allAvatars.length === 0) {
      const { data: files, error } = await supabase.storage
        .from(AVATARS_BUCKET)
        .list();

      if (error) {
        console.error('Error fetching avatars:', error);
        return [];
      }

      if (!files || files.length === 0) {
        console.warn('No avatars found in the storage bucket');
        return [];
      }

      // Get public URLs for avatar files (.png and .jpg only)
      const avatarPromises = files
        .filter(file => file.name.endsWith('.png') || file.name.endsWith('.jpg'))
        .map(async (file) => {
          const { data: { publicUrl } } = supabase.storage
            .from(AVATARS_BUCKET)
            .getPublicUrl(file.name);

          return {
            id: file.id || file.name,
            name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
            url: publicUrl,
            created_at: file.created_at || new Date().toISOString(),
            updated_at: file.updated_at,
            gender: 'unknown' as const
          };
        });

      allAvatars = await Promise.all(avatarPromises);
    }
    
    return allAvatars;
  } catch (error) {
    console.error('Error in fetchAvatars:', error);
    return [];
  }
}

/**
 * Gets a random avatar from the available avatars
 */
export async function getRandomAvatar(): Promise<Avatar | null> {
  try {
    const avatars = await fetchAvatars();
    
    if (avatars.length === 0) {
      console.error('No avatars available');
      return null;
    }
    
    // Return a random avatar
    return avatars[Math.floor(Math.random() * avatars.length)];
  } catch (error) {
    console.error('Error getting random avatar:', error);
    return null;
  }
}

/**
 * Gets a specific avatar by ID
 */
export async function getAvatarById(avatarId: string): Promise<Avatar | null> {
  try {
    const avatars = await fetchAvatars();
    return avatars.find(avatar => avatar.id === avatarId) || null;
  } catch (error) {
    console.error('Error getting avatar by ID:', error);
    return null;
  }
}

/**
 * Updates a user's avatar in their profile
 */
export async function updateUserAvatar(userId: string, avatarId: string, newUsername?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the avatar details
    const avatar = await getAvatarById(avatarId);
    
    if (!avatar) {
      return { success: false, error: 'Avatar not found' };
    }
    
    // Update the user's profile with the new avatar
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatar.url,
        avatar_name: avatar.name,
        ...(newUsername && { display_name: newUsername }), // Conditionally add display_name
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating user avatar:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in updateUserAvatar:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Assigns a random avatar and generates a unique username for a user
 * This is used for both guest users and registered users who lack an avatar or username
 * 
 * @returns An object containing the avatar and the unique username
 */
export async function assignRandomAvatarAndUsername(): Promise<{ 
  avatar: Avatar | null; 
  username: string | null;
}> {
  try {
    // Get a random avatar
    const avatar = await getRandomAvatar();
    
    if (!avatar) {
      console.error('Failed to get random avatar');
      return { avatar: null, username: null };
    }
    
    // Generate a unique username based on the avatar filename
    const username = await generateUniqueAvatarUsername(avatar.name);
    
    return {
      avatar,
      username
    };
  } catch (error) {
    console.error('Error assigning avatar and username:', error);
    return { avatar: null, username: null };
  }
}

/**
 * Check if a user needs an avatar or username based on their profile
 * @param userId User ID to check
 * @returns Boolean indicating if assignment is needed
 */
export async function needsAvatarOrUsername(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url, display_name')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error checking user profile:', error);
      return true; // Assume assignment is needed if there's an error
    }
    
    // Check if avatar or display name is missing
    return !data || !data.avatar_url || !data.display_name;
  } catch (error) {
    console.error('Error in needsAvatarOrUsername:', error);
    return true; // Assume assignment is needed if there's an error
  }
}

export default {
  fetchAvatars,
  getRandomAvatar,
  getAvatarById,
  updateUserAvatar,
  assignRandomAvatarAndUsername,
  needsAvatarOrUsername
};
