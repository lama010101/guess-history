import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

interface GameModeCardProps {
  title: string;
  description: string;
  mode: "classic" | "time-attack" | "challenge";
  icon: LucideIcon;
}

export function GameModeCard({ title, description, mode, icon: Icon }: GameModeCardProps) {
  const navigate = useNavigate();
  const { user, continueAsGuest } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const startGame = async () => {
    try {
      setIsLoading(true);
      console.log("Starting game from GameModeCard, current user:", user);
      let currentUser = user;
      
      if (!currentUser) {
        console.log("No user found, creating guest user");
        currentUser = await continueAsGuest();
        console.log("Guest user created:", currentUser);
      }
      
      console.log("Creating game for user:", currentUser);
      const guestId = currentUser?.isGuest ? currentUser.id : null;
      const userId = currentUser?.isGuest ? null : currentUser?.id;
      
      const { data: game, error } = await supabase
        .from('games')
        .insert({
          mode: mode === "classic" ? "solo" : mode === "time-attack" ? "time" : "challenge",
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-900 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="text-center">
        <div className="h-40 flex items-center justify-center mb-4">
          <Icon className="h-20 w-20 text-history-primary dark:text-history-light opacity-80" />
        </div>
        <CardTitle className="text-2xl font-bold text-history-primary dark:text-history-light">
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full bg-history-secondary hover:bg-history-secondary/90 text-white"
          onClick={startGame}
          disabled={isLoading}
        >
          Play {title}
        </Button>
      </CardContent>
    </Card>
  );
}
