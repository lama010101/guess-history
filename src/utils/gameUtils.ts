
import { supabase } from '@/integrations/supabase/client';

// Function to save guess with retry mechanism and exponential backoff
export const saveGuessWithRetry = async (
  guessData: any, 
  maxRetries = 2
): Promise<boolean> => {
  let retries = 0;
  let success = false;

  while (retries <= maxRetries && !success) {
    try {
      const { error } = await supabase.from('guesses').insert(guessData);
      
      if (error) {
        console.error(`Attempt ${retries + 1} failed:`, error);
        retries++;
        
        // If we still have retries left, wait a bit before trying again with exponential backoff
        if (retries <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retries - 1))); // Exponential backoff
        } else {
          console.error('Error saving guess after all retries:', error);
          return false;
        }
      } else {
        success = true;
        return true;
      }
    } catch (err) {
      console.error(`Attempt ${retries + 1} failed with exception:`, err);
      retries++;
      
      if (retries <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retries - 1))); // Exponential backoff
      } else {
        console.error('Error saving guess after all retries:', err);
        return false;
      }
    }
  }
  
  return success;
};
