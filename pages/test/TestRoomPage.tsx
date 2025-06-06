
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Users,
  Clock,
  Share2,
  Lightbulb,
  Play,
  Copy,
  Check,
  User
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type RoomSettings = {
  timerMinutes: number;
  hintCount: number;
  invitedFriends: string[];
};

type Player = {
  id: string;
  username: string;
  ready: boolean;
  isHost: boolean;
};

const TestRoomPage = () => {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('id');
  const invitedFriendId = searchParams.get('invite');
  
  const [settings, setSettings] = useState<RoomSettings>({
    timerMinutes: 2,
    hintCount: 1,
    invitedFriends: invitedFriendId ? [invitedFriendId] : [],
  });
  
  const [players, setPlayers] = useState<Player[]>([
    { id: 'current-user', username: 'You (Host)', ready: false, isHost: true },
  ]);
  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isHost, setIsHost] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('guessHistory_roomSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(prevSettings => ({
        ...prevSettings,
        timerMinutes: parsedSettings.timerMinutes || 2,
        hintCount: parsedSettings.hintCount || 1,
      }));
    }
    
    // If invited via link, set as non-host
    if (searchParams.get('join') === 'true') {
      setIsHost(false);
    }
  }, [searchParams]);
  
  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('guessHistory_roomSettings', JSON.stringify({
      timerMinutes: settings.timerMinutes,
      hintCount: settings.hintCount,
    }));
  }, [settings.timerMinutes, settings.hintCount]);
  
  // Simulate real-time updates from other players
  useEffect(() => {
    if (!isHost) {
      // In a real app, this would use PartyKit or Supabase Realtime
      const timer = setTimeout(() => {
        setPlayers([
          { id: 'host-user', username: 'Host', ready: true, isHost: true },
          { id: 'current-user', username: 'You', ready: isReady, isHost: false },
        ]);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    return () => {};
  }, [isHost, isReady]);
  
  // Handle countdown timer
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      startGame();
    }
    
    return () => {};
  }, [countdown]);
  
  const shareRoom = () => {
    const url = `${window.location.origin}/test/room?id=${gameId}&join=true`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Link copied!",
        description: "Share this link with friends to invite them.",
      });
    }).catch(err => {
      console.error('Failed to copy room link:', err);
    });
  };
  
  const toggleReady = () => {
    setIsReady(!isReady);
    
    // In a real app, this would update the state in PartyKit or Supabase
    if (!isHost && !isReady) {
      toast({
        title: "You're ready!",
        description: "Waiting for the host to start the game.",
      });
    }
  };
  
  const checkAllReady = () => {
    return players.every(player => player.ready || player.isHost);
  };
  
  const beginCountdown = () => {
    if (isHost && checkAllReady()) {
      setCountdown(3);
      
      toast({
        title: "Game starting soon!",
        description: "Get ready to guess!",
      });
    }
  };
  
  const startGame = async () => {
    try {
      if (!gameId) {
        throw new Error('Missing game ID');
      }
      
      // In a real app, we would fetch the game rounds and set them up
      navigate(`/test/game?mode=multi&id=${gameId}`);
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        variant: "destructive",
        title: "Failed to start game",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };
  
  const updateTimerSetting = (value: number[]) => {
    setSettings(prev => ({ ...prev, timerMinutes: value[0] }));
  };
  
  const updateHintSetting = (value: number[]) => {
    setSettings(prev => ({ ...prev, hintCount: value[0] }));
  };
  
  if (!gameId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-400">Invalid game room. Returning to home page...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              {isHost ? 'Host Game Room' : 'Game Room'}
            </h1>
            <Button
              variant="outline"
              onClick={shareRoom}
              className="flex items-center gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Share Room'}
            </Button>
          </div>
          
          {countdown !== null ? (
            <div className="text-center py-12">
              <h2 className="text-4xl font-bold mb-4">Game Starting</h2>
              <div className="text-6xl font-bold text-history-secondary mb-8">
                {countdown}
              </div>
              <p className="text-gray-600 dark:text-gray-400">Get ready to play!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left side - Settings (host only) */}
              {isHost && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Round Timer
                    </h2>
                    <div className="flex items-center mb-2">
                      <Slider
                        value={[settings.timerMinutes]}
                        min={0}
                        max={5}
                        step={1}
                        onValueChange={updateTimerSetting}
                        className="flex-grow"
                      />
                      <span className="ml-4 min-w-[60px] text-center">
                        {settings.timerMinutes === 0 ? 'No limit' : `${settings.timerMinutes} min`}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Set the time limit for each round
                    </p>
                  </div>
                  
                  <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2" />
                      Hints Per Round
                    </h2>
                    <div className="flex items-center mb-2">
                      <Slider
                        value={[settings.hintCount]}
                        min={0}
                        max={3}
                        step={1}
                        onValueChange={updateHintSetting}
                        className="flex-grow"
                      />
                      <span className="ml-4 min-w-[60px] text-center">
                        {settings.hintCount}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Number of hints each player can use per round
                    </p>
                  </div>
                </div>
              )}
              
              {/* Right side - Players */}
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Players ({players.length}/4)
                </h2>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <ul className="space-y-3">
                    {players.map(player => (
                      <li 
                        key={player.id} 
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm"
                      >
                        <div className="flex items-center">
                          <User className="h-5 w-5 mr-2 text-gray-500" />
                          <span className="font-medium">{player.username}</span>
                          {player.isHost && (
                            <span className="ml-2 px-2 py-0.5 bg-history-secondary text-white text-xs rounded-full">
                              Host
                            </span>
                          )}
                        </div>
                        {player.ready && !player.isHost && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 text-xs rounded-full">
                            Ready
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex justify-center">
                  {isHost ? (
                    <Button 
                      onClick={beginCountdown}
                      disabled={!checkAllReady() || players.length === 1}
                      className="bg-history-secondary hover:bg-history-secondary/90 text-white min-w-[160px]"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Game
                    </Button>
                  ) : (
                    <Button 
                      onClick={toggleReady}
                      variant={isReady ? "outline" : "default"}
                      className={isReady ? "border-green-500 text-green-500" : "bg-history-secondary hover:bg-history-secondary/90 text-white"}
                      size="lg"
                    >
                      {isReady ? "I'm Ready!" : "Ready Up"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/test')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestRoomPage;
