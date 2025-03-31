import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/services/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, SearchIcon, UserPlusIcon, UsersIcon } from 'lucide-react';

interface PlayWithFriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PlayWithFriendsDialog({ open, onOpenChange }: PlayWithFriendsDialogProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (open && isAuthenticated) {
      fetchFriends();
    }
  }, [open, isAuthenticated]);
  
  const fetchFriends = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch friends from Supabase
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('*, friend_profile:profiles!friend_id(*)')
        .eq('user_id', user.id);
      
      if (friendsError) {
        console.error('Error fetching friends:', friendsError);
        toast({
          title: "Error",
          description: "Failed to load your friends list",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Filter out test/fake users
      const realFriends = (friendsData || [])
        .filter(friend => {
          const username = friend.friend_profile?.username?.toLowerCase() || '';
          return !username.includes('test') && 
                !username.includes('bot') && 
                !username.includes('admin') &&
                !username.includes('system');
        })
        .map(friend => ({
          id: friend.friend_id,
          username: friend.friend_profile?.username || 'Unknown User',
          avatar: friend.friend_profile?.avatar_url || null
        }));
      
      setFriends(realFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
    setLoading(false);
  };
  
  const toggleFriendSelection = (friendId) => {
    setSelectedFriends(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };
  
  const createGameAndInviteFriends = async () => {
    if (!user || selectedFriends.length === 0) return;
    
    try {
      // Create a new game session
      const { data: gameData, error: gameError } = await supabase
        .from('game_sessions')
        .insert({
          creator_id: user.id,
          game_mode: 'multiplayer',
          settings: {
            gameMode: 'multiplayer',
            distanceUnit: 'km',
            timerEnabled: true,
            timerDuration: 5
          }
        })
        .select();
        
      if (gameError) {
        console.error('Error creating game session:', gameError);
        toast({
          title: "Error",
          description: "Failed to create game session",
          variant: "destructive"
        });
        return;
      }
      
      const gameId = gameData[0].id;
      
      // Send notifications to each selected friend
      for (const friendId of selectedFriends) {
        try {
          // Use the edge function to send a push notification
          const { error } = await supabase.functions.invoke('send-notification', {
            body: {
              recipientId: friendId,
              message: `${user.username || 'A friend'} has invited you to play a game!`,
              title: "Game Invitation",
              data: {
                type: 'invite',
                sender_id: user.id,
                game_id: gameId
              }
            }
          });
          
          if (error) {
            console.error('Error sending notification:', error);
          }
        } catch (error) {
          console.error('Error sending invite to friend:', error);
        }
      }
      
      toast({
        title: "Invitations sent",
        description: `Invited ${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''} to play`
      });
      
      // Navigate to the game
      onOpenChange(false);
      navigate(`/play?game=${gameId}`);
    } catch (error) {
      console.error('Error in invite process:', error);
      toast({
        title: "Error",
        description: "Failed to send invitations",
        variant: "destructive"
      });
    }
  };
  
  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends to Play</DialogTitle>
          <DialogDescription>
            Select friends to invite to a multiplayer game session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mb-4">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {selectedFriends.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedFriends.map(id => {
              const friend = friends.find(f => f.id === id);
              return friend ? (
                <Badge key={id} variant="secondary" className="px-2 py-1">
                  {friend.username}
                </Badge>
              ) : null;
            })}
          </div>
        )}
        
        <ScrollArea className="max-h-[280px] pr-4 -mr-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <p className="text-muted-foreground">Loading friends...</p>
            </div>
          ) : filteredFriends.length > 0 ? (
            <div className="space-y-2">
              {filteredFriends.map(friend => (
                <Card 
                  key={friend.id} 
                  className={`hover:bg-accent cursor-pointer transition-colors ${
                    selectedFriends.includes(friend.id) ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => toggleFriendSelection(friend.id)}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {friend.avatar ? (
                          <img 
                            src={friend.avatar} 
                            alt={friend.username} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <UsersIcon className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <span className="font-medium">{friend.username}</span>
                    </div>
                    
                    {selectedFriends.includes(friend.id) && (
                      <CheckIcon className="h-5 w-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? "No matches found" : "No friends yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Try a different search term" 
                  : "Add some friends to play with them"}
              </p>
              {!searchTerm && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/friends');
                  }}
                >
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  Find Friends
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={createGameAndInviteFriends}
            disabled={selectedFriends.length === 0}
          >
            Start Game & Invite ({selectedFriends.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
