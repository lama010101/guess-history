
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, UserMinus, Mail } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Friend = {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
};

const TestFriendsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load friends on mount
  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      // In a real app, this would fetch from a friends table in Supabase
      // For now, we'll use localStorage as a mock
      const storedFriends = localStorage.getItem('guessHistory_friends');
      if (storedFriends) {
        setFriends(JSON.parse(storedFriends));
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const saveFriends = (updatedFriends: Friend[]) => {
    try {
      localStorage.setItem('guessHistory_friends', JSON.stringify(updatedFriends));
      setFriends(updatedFriends);
    } catch (error) {
      console.error('Error saving friends:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      // Mock search results - in a real app, this would be a Supabase query
      // to a users or profiles table
      const mockResults: Friend[] = [
        { id: 'user1', username: 'historybuff', email: 'history@example.com' },
        { id: 'user2', username: 'timeTraveler', email: 'time@example.com' },
        { id: 'user3', username: 'pastExplorer', email: 'past@example.com' },
      ].filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setSearchResults(mockResults);
      
      if (mockResults.length === 0) {
        toast({
          title: "No users found",
          description: "Try a different search term.",
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        variant: "destructive",
        title: "Search failed",
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const addFriend = (friend: Friend) => {
    const existing = friends.find(f => f.id === friend.id);
    if (existing) {
      toast({
        title: "Already friends",
        description: `You're already friends with ${friend.username}.`,
      });
      return;
    }
    
    const updatedFriends = [...friends, friend];
    saveFriends(updatedFriends);
    
    toast({
      title: "Friend added",
      description: `${friend.username} has been added to your friends list.`,
    });
  };

  const removeFriend = (friendId: string) => {
    const updatedFriends = friends.filter(friend => friend.id !== friendId);
    saveFriends(updatedFriends);
    
    toast({
      title: "Friend removed",
      description: "Friend has been removed from your list.",
    });
  };

  const inviteFriendToGame = async (friend: Friend) => {
    try {
      // Create a new multiplayer game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert([{ 
          mode: 'multi',
          round_count: 5,
          current_round: 1,
          completed: false
        }])
        .select()
        .single();

      if (gameError) throw gameError;
      
      // Navigate to the room page with the friend's info
      navigate(`/test/room?id=${game.id}&invite=${friend.id}`);
      
    } catch (error) {
      console.error('Error inviting friend:', error);
      toast({
        variant: "destructive",
        title: "Invitation failed",
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Friends</h1>
      
      {/* Search for new friends */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Find Friends</h2>
        <div className="flex gap-2 mb-4">
          <div className="flex-grow relative">
            <Input
              placeholder="Search by username or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              className="pr-10"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          <Button 
            onClick={searchUsers} 
            disabled={isSearching}
            className="bg-history-secondary hover:bg-history-secondary/90"
          >
            Search
          </Button>
        </div>
        
        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-8">
            <h3 className="text-lg font-semibold mb-3">Search Results</h3>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {searchResults.map(user => (
                <li key={user.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => addFriend(user)}
                          className="ml-2"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add friend</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Friends list */}
      <div>
        <h2 className="text-xl font-semibold mb-4">My Friends</h2>
        {friends.length > 0 ? (
          <ul className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
            {friends.map(friend => (
              <li key={friend.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{friend.username}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{friend.email}</p>
                </div>
                <div className="flex space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => inviteFriendToGame(friend)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Invite to game</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => removeFriend(friend.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove friend</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              You haven't added any friends yet. Use the search above to find friends.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestFriendsPage;
