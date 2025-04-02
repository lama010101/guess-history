
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

      // Use our new RPC function to create game with participants
      const { data, error } = await supabase.rpc(
        'create_game_with_participants',
        {
          creator_id: user.id,
          config: enhancedConfig,
          participant_ids: [user.id, ...friendIds]
        }
      );

      if (error) {
        console.error('Error creating multiplayer game:', error);
        toast({
          title: "Failed to create game",
          description: "There was an error creating your multiplayer game.",
          variant: "destructive"
        });
        return null;
      }

      // Send notifications to invited friends
      for (const friendId of friendIds) {
        await supabase
          .from('notifications')
          .insert({
            sender_id: user.id,
            receiver_id: friendId,
            type: 'invite',
            message: `${user.username || 'Someone'} invited you to play a multiplayer game!`,
            game_id: data
          });
      }

      toast({
        title: "Multiplayer game created",
        description: `Game created with ${friendIds.length} friends invited.`
      });

      return data;
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
        
        const seed = data.settings.seed || gameId;
        
        // Use the seed to get a consistent set of images
        const seedRng = new Math.seedrandom(seed);
        
        // Make a copy of images and shuffle it deterministically
        const shuffledImages = [...images].sort(() => seedRng() - 0.5);
        
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
