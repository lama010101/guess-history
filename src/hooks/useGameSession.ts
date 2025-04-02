
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/services/auth';
import { useToast } from './use-toast';
import { useSupabaseImages } from './useSupabaseImages';

export interface GameConfig {
  gameMode: 'solo' | 'daily' | 'multiplayer' | 'challenge';
  distanceUnit: 'km' | 'miles';
  timerEnabled: boolean;
  timerDuration: number;
  maxRounds?: number;
}

export const useGameSession = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { images } = useSupabaseImages();

  const createGameSession = async (config: GameConfig) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You need to be logged in to create a game session.",
        variant: "destructive"
      });
      return null;
    }

    setIsCreating(true);

    try {
      // Generate a seed for consistent random selection
      const seed = Math.floor(Math.random() * 1000000).toString();
      
      // Add seed to config for consistent image selection
      const gameConfig = {
        ...config,
        seed,
        created_at: new Date().toISOString()
      };

      // Create game session
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          creator_id: user.id,
          settings: gameConfig,
          game_mode: config.gameMode
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating game session:', error);
        toast({
          title: "Failed to create game",
          description: "There was an error creating your game session.",
          variant: "destructive"
        });
        return null;
      }

      toast({
        title: "Game created",
        description: `Your ${config.gameMode} game has been created.`
      });

      return data.id;
    } catch (error) {
      console.error('Error in createGameSession:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const createMultiplayerGame = async (friendIds: string[], config: GameConfig) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You need to be logged in to create a multiplayer game.",
        variant: "destructive"
      });
      return null;
    }

    setIsCreating(true);

    try {
      // Ensure consistent image selection for all players
      const seed = crypto.randomUUID();
      const enhancedConfig = {
        ...config,
        seed,
        created_at: new Date().toISOString()
      };

      // Since we can't use the RPC function directly due to TypeScript issues,
      // we'll create the game session directly
      const { data: gameSession, error: gameError } = await supabase
        .from('game_sessions')
        .insert({
          creator_id: user.id,
          settings: enhancedConfig,
          game_mode: config.gameMode
        })
        .select('id')
        .single();

      if (gameError) {
        console.error('Error creating multiplayer game:', gameError);
        toast({
          title: "Failed to create game",
          description: "There was an error creating your multiplayer game.",
          variant: "destructive"
        });
        return null;
      }

      const gameId = gameSession.id;

      // Send notifications to invited friends
      for (const friendId of friendIds) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            sender_id: user.id,
            receiver_id: friendId,
            type: 'invite',
            message: `${user.username || 'Someone'} invited you to play a multiplayer game!`,
            game_id: gameId
          });
          
        if (notificationError) {
          console.error('Error sending invitation notification:', notificationError);
        }
      }

      toast({
        title: "Multiplayer game created",
        description: `Game created with ${friendIds.length} friends invited.`
      });

      return gameId;
    } catch (error) {
      console.error('Error in createMultiplayerGame:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const getImageSetForGame = (gameId: string, maxRounds: number = 5) => {
    if (!images || images.length === 0) {
      return [];
    }

    // Get game session to find seed
    return supabase
      .from('game_sessions')
      .select('settings')
      .eq('id', gameId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.error('Error getting game session:', error);
          return [];
        }
        
        const seedValue = typeof data.settings === 'object' && data.settings !== null
          ? (data.settings as any).seed || gameId
          : gameId;
        
        // Use seeded random selection instead of seedrandom library
        const shuffledImages = [...images].sort(() => {
          // Simple deterministic shuffle based on the seed
          const hashCode = (s: string) => {
            let hash = 0;
            for (let i = 0; i < s.length; i++) {
              hash = ((hash << 5) - hash) + s.charCodeAt(i);
              hash |= 0; // Convert to 32bit integer
            }
            return hash;
          };
          
          const randomValue = Math.sin(hashCode(seedValue + images.length.toString())) * 10000;
          return (randomValue - Math.floor(randomValue)) - 0.5;
        });
        
        // Take first maxRounds images
        return shuffledImages.slice(0, maxRounds);
      });
  };

  return {
    createGameSession,
    createMultiplayerGame,
    getImageSetForGame,
    isCreating
  };
};
