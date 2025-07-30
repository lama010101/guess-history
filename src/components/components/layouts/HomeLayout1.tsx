import React from 'react';
import { Button } from "@/components/ui/button";
import { Clock, Users, Calendar, Info } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const HomeLayout1 = () => {
  const navigate = useNavigate();
  const { user, continueAsGuest } = useAuth();
  const { toast } = useToast();

  const startGame = async (mode: 'solo' | 'multi' | 'daily') => {
    try {
      console.log("Starting game, current user:", user);
      let currentUser = user;
      
      if (!currentUser) {
        console.log("No user found, creating guest user");
        await continueAsGuest();
        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
        currentUser = user;
        console.log("Guest user created:", currentUser);
      }
      
      console.log("Creating game for user:", currentUser);

      // Create a unique guest ID if needed
      const guestId = currentUser?.isGuest ? currentUser.id : null;
      const userId = currentUser?.isGuest ? null : currentUser?.id;
      
      console.log("Guest ID:", guestId, "User ID:", userId);

      const { data: game, error } = await supabase
        .from('games')
        .insert({
          mode,
          user_id: userId,
          guest_id: guestId,
          created_at: new Date().toISOString(),
          completed: false,
          score: 0
        })
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
      navigate(`/test/game?mode=${mode}&id=${game.id}`);
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
              onClick={() => startGame('solo')}
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
              onClick={() => startGame('multi')}
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
              onClick={() => startGame('daily')}
            >
              Play Daily
            </Button>
          </div>
        </div>

        <div className="mt-16 text-center">
          <Button variant="outline" className="flex items-center gap-2">
            <Info className="h-4 w-4" /> 
            How to Play
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomeLayout1;
