
/**
 * Image fetching and management utilities
 */

import { supabase } from "@/integrations/supabase/client";
import { generateMockImageIds } from './placeholderData';

// Function to fetch random image IDs for a game
export async function fetchRandomImageIds(count: number): Promise<string[]> {
  try {
    console.log(`Attempting to fetch ${count} random images`);
    
    // First, check how many total images are available (prioritizing ready images)
    const { data: readyImages, error: readyError } = await supabase
      .from("images")
      .select("id")
      .eq("ready", true);
      
    if (readyError) {
      console.error("Error counting ready images:", readyError);
      return generateMockImageIds(count);
    }
    
    let availableImages = readyImages || [];
    console.log(`Found ${availableImages.length} ready images`);
    
    // If we don't have enough ready images, also include non-ready images
    if (availableImages.length < count) {
      console.log("Not enough ready images, including non-ready images");
      const { data: allImages, error: allError } = await supabase
        .from("images")
        .select("id");
        
      if (!allError && allImages && allImages.length > availableImages.length) {
        availableImages = allImages;
        console.log(`Using all available images: ${availableImages.length}`);
      }
    }

    if (availableImages.length === 0) {
      console.warn("No images found in database, generating mock IDs");
      return generateMockImageIds(count);
    }
    
    // Shuffle the available images to randomize them
    const shuffled = [...availableImages].sort(() => 0.5 - Math.random());
    
    // Take as many as we need, or as many as we have
    const selectedImages = shuffled.slice(0, Math.min(count, shuffled.length));
    
    // If we have fewer images than requested, repeat some to fill the count
    const resultIds: string[] = [];
    for (let i = 0; i < count; i++) {
      resultIds.push(selectedImages[i % selectedImages.length].id);
    }
    
    console.log(`Returning ${resultIds.length} image IDs`);
    return resultIds;
  } catch (err) {
    console.error("Error fetching random images:", err);
    return generateMockImageIds(count);
  }
}
