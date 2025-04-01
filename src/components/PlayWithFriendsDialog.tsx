
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Share2, Bell, Users, Copy as CopyIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/services/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  online?: boolean;
}

interface PlayWithFriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PlayWithFriendsDialog = ({ open, onOpenChange }: PlayWithFriendsDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const gameLink = `${window.location.origin}/play?invite=${user?.id || 'guest'}&mode=multiplayer`;
  
  useEffect(() => {
    if (open && user) {
      fetchFriends();
    }
  }, [open, user]);

  const fetchFriends = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First get friend IDs
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');
      
      if (friendsError) {
        console.error('Error fetching friends:', friendsError);
        setLoading(false);
        return;
      }
      
      if (friendsData && friendsData.length > 0) {
        const friendIds = friendsData.map(item => item.friend_id);
        
        // Then get profiles for those IDs
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', friendIds);
        
        if (profilesError) {
          console.error('Error fetching friend profiles:', profilesError);
          setLoading(false);
          return;
        }
        
        const formattedFriends = profilesData?.map(profile => ({
          id: profile.id,
          name: profile.username || 'User',
          avatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username || Math.random()}`,
          online: Math.random() > 0.5 // Random online status for demo purposes
        })) || [];
        
        setFriends(formattedFriends);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Error in fetchFriends:', error);
    }
    setLoading(false);
  };
  
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
    
    // Create a game session
    const { data: gameSession, error: gameSessionError } = await supabase
      .from('game_sessions')
      .insert({
        creator_id: user?.id,
        game_mode: 'multiplayer',
        settings: {
          gameMode: 'multiplayer',
          distanceUnit: 'km',
          timerEnabled: false,
          timerDuration: 60
        }
      })
      .select()
      .single();
    
    if (gameSessionError || !gameSession) {
      console.error('Error creating game session:', gameSessionError);
      toast({
        title: "Error",
        description: "Failed to create game session",
        variant: "destructive"
      });
      return;
    }
    
    // Send invitations to selected friends
    for (const friendId of selectedFriends) {
      const friendName = friends.find(f => f.id === friendId)?.name || 'Friend';
      
      try {
        await sendGameInvite(gameSession.id, friendId);
        
        toast({
          title: "Invitation sent!",
          description: `Game invitation sent to ${friendName}`
        });
      } catch (error) {
        console.error(`Error sending invitation to ${friendName}:`, error);
      }
    }
    
    navigate(`/play?game=${gameSession.id}&mode=multiplayer`);
    onOpenChange(false);
  };
  
  const sendGameInvite = async (gameId: string, friendId: string) => {
    if (!user) return;
    
    try {
      // Use the edge function to send a notification
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          recipientId: friendId,
          message: `${user?.username || 'Someone'} invited you to play a game!`,
          title: "Game Invitation",
          data: {
            type: 'invite',
            game_id: gameId,
            sender_id: user?.id
          }
        }
      });
      
      if (error) {
        console.error('Error sending game invitation:', error);
      }
      
      return data;
    } catch (error) {
      console.error('Error sending game invitation:', error);
      throw error;
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
                <CopyIcon className="ml-2 h-4 w-4" />
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
              {loading ? (
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
                          alt={friend.name} 
                          className="h-10 w-10 rounded-full mr-3"
                        />
                        {friend.online && (
                          <span className="absolute bottom-0 right-2 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white"></span>
                        )}
                      </div>
                      <span>{friend.name}</span>
                    </label>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No friends found</p>
                  <p className="text-xs mt-1">Add friends to play with them</p>
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
              disabled={selectedFriends.length === 0}
            >
              <Bell className="h-4 w-4" />
              Invite & Start
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayWithFriendsDialog;
