
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Clock, Users, Calendar, Info } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchRandomImageIds } from '@/utils/resultsFetching';
import { AuthModal } from '@/components/AuthModal';

const HomeLayout1 = () => {
  const navigate = useNavigate();
  const { user, continueAsGuest } = useAuth();
  const { toast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<'solo' | 'multi' | 'daily' | null>(null);

  // For debugging - log current auth state and modal state
  useEffect(() => {
    console.log("[DEBUG] HomeLayout1 mounted or user changed. user:", user, "isAuthenticated:", !!user);
  }, [user]);

  useEffect(() => {
    console.log(`[DEBUG] showAuthModal: ${showAuthModal}, pendingMode: ${pendingMode}`);
  }, [showAuthModal, pendingMode]);

  const startGame = async (mode: 'solo' | 'multi' | 'daily') => {
    try {
      console.log("Starting game, current user:", user);
      
      // Get current user or create a guest user - we'll work with the direct return value
      let currentUser = user;
      
      // This should never happen now as we're checking before calling startGame
      if (!currentUser) {
        console.log("No user found, but this shouldn't happen as we check before starting game");
        // Show auth modal instead of auto-creating guest
        setPendingMode(mode);
        setShowAuthModal(true);
        return;
      }
      
      // Double check we have a user
      if (!currentUser) {
        console.error("Failed to get or create user");
        throw new Error("Failed to get or create user");
      }
      
      console.log("Creating game for user:", currentUser);

      // Define the number of rounds for this game
      const roundCount = 5;

      // Create a unique game entry
      const gameData = {
        mode,
        user_id: currentUser.isGuest ? null : currentUser.id,
        guest_id: currentUser.isGuest ? currentUser.id : null,
        created_at: new Date().toISOString(),
        completed: false,
        score: 0,
        round_count: roundCount
      };
      
      console.log("Game data to insert:", gameData);

      try {
        // Get random image IDs for the rounds
        const imageIds = await fetchRandomImageIds(roundCount);
        console.log("Selected random image IDs:", imageIds);
        
        if (imageIds.length < roundCount) {
          toast({
            variant: 'destructive',
            title: 'Not enough images available',
            description: 'Could not find enough images for the game. Please try again.',
          });
          return;
        }

        // Create the game
        const { data: game, error } = await supabase
          .from('games')
          .insert(gameData)
          .select('id')
          .single();

        if (error) {
          console.error("Database error:", error);
          throw error;
        }
        
        if (!game?.id) {
          console.error("No game ID returned");
          throw new Error('No game ID returned');
        }
        
        console.log("Game created successfully, ID:", game.id);
        
        // Create game rounds for each round
        const gameRounds = imageIds.map((imageId, index) => ({
          game_id: game.id,
          image_id: imageId,
          round_index: index + 1,
        }));
        
        // Insert the game rounds
        const { error: roundsError } = await supabase
          .from('game_rounds')
          .insert(gameRounds);
          
        if (roundsError) {
          console.error("Error creating game rounds:", roundsError);
          // Even if this fails, we'll continue with the game
        } else {
          console.log("Created game rounds successfully");
        }
        
        navigate(`/test/game?mode=${mode}&id=${game.id}`);
      } catch (dbError) {
        // If we fail to create the game in the database, create a temporary game ID
        // This ensures the user can still play even if DB connection fails
        console.error("Failed to create game in database, creating temporary game:", dbError);
        const tempGameId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        console.log("Created temporary game ID:", tempGameId);
        navigate(`/test/game?mode=${mode}&id=${tempGameId}`);
      }
    } catch (err: any) {
      console.error('Error starting game:', err);
      toast({
        variant: 'destructive',
        title: 'Could not start game',
        description: err.message || 'An unexpected error occurred',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-history-light to-white dark:from-history-dark dark:to-gray-900">
      <div className="container mx-auto px-4 pt-12 pb-24">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-history-primary dark:text-history-light mb-4">
            Guess <span className="text-history-secondary">History</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Test your knowledge of historical places and times in this immersive guessing game
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="history-card rounded-xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <div className="h-48 bg-history-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Clock className="h-20 w-20 text-history-primary dark:text-history-light opacity-80" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-history-primary dark:text-history-light">Solo</h2>
            <p className="text-muted-foreground mb-6">Challenge yourself with historical images and test your knowledge of time and place.</p>
            <Button 
              className="w-full bg-history-primary hover:bg-history-primary/90 text-white"
              onClick={() => {
                console.log('[DEBUG] Play Solo clicked. user:', user);
                if (user) {
                  console.log('[DEBUG] User authenticated. Starting game: solo');
                  startGame('solo');
                } else {
                  console.log('[DEBUG] User not authenticated. Opening AuthModal for solo.');
                  setPendingMode('solo');
                  setShowAuthModal(true);
                }
              }}
            >
              Play Solo
            </Button>
          </div>

          <div className="history-card rounded-xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <div className="h-48 bg-history-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-20 w-20 text-history-primary dark:text-history-light opacity-80" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-history-primary dark:text-history-light">Multiplayer</h2>
            <p className="text-muted-foreground mb-6">Compete against friends or random opponents to see who knows history best.</p>
            <Button 
              className="w-full bg-history-primary hover:bg-history-primary/90 text-white"
              onClick={() => {
                console.log('[DEBUG] Play Multiplayer clicked. user:', user);
                if (user) {
                  console.log('[DEBUG] User authenticated. Starting game: multi');
                  startGame('multi');
                } else {
                  console.log('[DEBUG] User not authenticated. Opening AuthModal for multi.');
                  setPendingMode('multi');
                  setShowAuthModal(true);
                }
              }}
            >
              Play Multiplayer
            </Button>
          </div>

          <div className="history-card rounded-xl p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <div className="h-48 bg-history-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="h-20 w-20 text-history-primary dark:text-history-light opacity-80" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-history-primary dark:text-history-light">Daily</h2>
            <p className="text-muted-foreground mb-6">A new challenge every day. Compare your score with players worldwide.</p>
            <Button 
              className="w-full bg-history-primary hover:bg-history-primary/90 text-white"
              onClick={() => {
                console.log('[DEBUG] Play Daily clicked. user:', user);
                if (user) {
                  console.log('[DEBUG] User authenticated. Starting game: daily');
                  startGame('daily');
                } else {
                  console.log('[DEBUG] User not authenticated. Opening AuthModal for daily.');
                  setPendingMode('daily');
                  setShowAuthModal(true);
                }
              }}
            >
              Play Daily
            </Button>
          </div>
        </div>

        <div className="mt-16 text-center">
          <Button className="flex items-center gap-2">
            <Info className="h-4 w-4" /> 
            How to Play
          </Button>
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => { setShowAuthModal(false); setPendingMode(null); }}
        onAuthSuccess={() => {
          console.log('[DEBUG] AuthModal: onAuthSuccess triggered');
          setShowAuthModal(false);
          if (pendingMode) {
            console.log('[DEBUG] AuthModal: Starting game after auth:', pendingMode);
            startGame(pendingMode);
            setPendingMode(null);
          }
        }}
        onGuestContinue={() => {
          console.log('[DEBUG] AuthModal: onGuestContinue triggered');
          setShowAuthModal(false);
          if (pendingMode) {
            console.log('[DEBUG] AuthModal: Starting game after guest continue:', pendingMode);
            startGame(pendingMode);
            setPendingMode(null);
          }
        }}
      />
    </div>
  );
};

export default HomeLayout1;
