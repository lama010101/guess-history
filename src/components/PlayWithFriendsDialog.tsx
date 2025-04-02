import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Share2, Bell, Users, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/services/auth';
import { useFriends } from '@/hooks/useFriends';
import { useGameSession, GameConfig } from '@/hooks/useGameSession';

interface PlayWithFriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PlayWithFriendsDialog = ({ open, onOpenChange }: PlayWithFriendsDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { friends, loading: loadingFriends } = useFriends();
  const { createMultiplayerGame } = useGameSession();
  const navigate = useNavigate();
  
  const gameLink = `${window.location.origin}/play?invite=${user?.id || 'guest'}&mode=multiplayer`;
  
  useEffect(() => {
    if (open) {
      setSelectedFriends([]);
    }
  }, [open]);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(gameLink);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Share this link with your friends to play together"
    });
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleFriendSelect = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId) 
        : [...prev, friendId]
    );
  };
  
  const handleInviteAndStart = async () => {
    if (selectedFriends.length === 0) {
      toast({
        title: "No friends selected",
        description: "Please select at least one friend to invite"
      });
      return;
    }
    
    setIsCreatingGame(true);
    
    try {
      const gameConfig: GameConfig = {
        gameMode: 'multiplayer',
        distanceUnit: localStorage.getItem('distanceFormat') === 'miles' ? 'miles' : 'km',
        timerEnabled: false,
        timerDuration: 60,
        maxRounds: 5
      };
      
      const gameId = await createMultiplayerGame(selectedFriends, gameConfig);
      
      if (gameId) {
        navigate(`/play?game=${gameId}&mode=multiplayer`);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating multiplayer game:', error);
      toast({
        title: "Failed to create game",
        description: "There was an error creating your multiplayer game",
        variant: "destructive"
      });
    } finally {
      setIsCreatingGame(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Play with Friends</DialogTitle>
          <DialogDescription>
            Invite friends to play a game together
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Game link</label>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={gameLink}
                  readOnly
                />
              </div>
              <Button type="submit" size="sm" onClick={handleCopy}>
                {copied ? "Copied" : "Copy"}
                <Copy className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Select friends to invite</label>
              <span className="text-xs text-muted-foreground">
                {selectedFriends.length} selected
              </span>
            </div>
            
            <div className="border rounded-md divide-y max-h-[240px] overflow-y-auto">
              {loadingFriends ? (
                <div className="p-4 text-center">
                  <p>Loading friends...</p>
                </div>
              ) : friends.length > 0 ? (
                friends.map(friend => (
                  <div key={friend.id} className="flex items-center p-3 hover:bg-muted/50">
                    <Checkbox 
                      id={`friend-${friend.id}`}
                      checked={selectedFriends.includes(friend.id)}
                      onCheckedChange={() => handleFriendSelect(friend.id)}
                      className="mr-3"
                    />
                    <label 
                      htmlFor={`friend-${friend.id}`}
                      className="flex-1 flex items-center cursor-pointer"
                    >
                      <div className="relative">
                        <img 
                          src={friend.avatar} 
                          alt={friend.username} 
                          className="h-10 w-10 rounded-full mr-3"
                        />
                      </div>
                      <span>{friend.username}</span>
                    </label>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No friends found</p>
                  <p className="text-xs mt-1">Add friends in the Friends tab to play with them</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex items-center gap-1.5"
            >
              <Share2 className="h-4 w-4" />
              Share Link
            </Button>
            
            <Button
              onClick={handleInviteAndStart}
              className="flex items-center gap-1.5"
              disabled={selectedFriends.length === 0 || isCreatingGame}
            >
              <Bell className="h-4 w-4" />
              {isCreatingGame ? "Creating..." : "Invite & Start"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayWithFriendsDialog;
