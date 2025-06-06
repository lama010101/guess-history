import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, UserMinus, Mail, Loader, AlertCircle, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from '@/components/ui/sonner';

type Friend = {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  display_name?: string;
};

type User = {
  id: string;
  email?: string;
  avatar_url?: string;
  display_name?: string;
  original_name?: string;
};

const FriendsPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadFriends();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'search' && user && allUsers.length === 0) {
      loadAllUsers();
    }
  }, [activeTab, user]);

  const loadFriends = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get friends from the friends table
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id);
      
      if (friendsError) throw friendsError;
      
      if (friendsData && friendsData.length > 0) {
        const friendIds = friendsData.map(f => f.friend_id);
        
        // Get friend profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, avatar_image_url')
          .in('id', friendIds);
        
        if (profilesError) throw profilesError;
        
        if (profilesData) {
          const friendsList = profilesData.map(profile => ({
            id: profile.id,
            username: profile.display_name || 'User',
            email: '', // Email is usually not publicly accessible
            avatar_url: profile.avatar_url || profile.avatar_image_url
          }));
          
          setFriends(friendsList);
        }
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      toast.error('Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllUsers = async () => {
    if (!user) return;
    
    setIsLoadingUsers(true);
    try {
      // Get all profiles except current user
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, avatar_image_url')
        .neq('id', user.id)
        .order('display_name', { ascending: true })
        .limit(50);
      
      if (usersError) throw usersError;
      
      if (usersData) {
        // Filter out existing friends
        const friendIds = friends.map(f => f.id);
        
        // Process users to ensure unique display names
        const nameCount: Record<string, number> = {};
        const filteredUsers = usersData
          .filter(u => !friendIds.includes(u.id))
          .map(profile => {
            const baseName = profile.display_name || 'User';
            
            // Track name occurrences and add suffix if needed
            nameCount[baseName] = (nameCount[baseName] || 0) + 1;
            
            // Only add suffix if this is not the first occurrence of the name
            const displayName = nameCount[baseName] > 1 
              ? `${baseName} ${nameCount[baseName] - 1}`
              : baseName;
            
            return {
              id: profile.id,
              display_name: displayName,
              original_name: baseName, // Keep original for reference
              avatar_url: profile.avatar_url || profile.avatar_image_url
            };
          });
        
        setAllUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim() || !user) return;
    
    setIsSearching(true);
    try {
      // Search for users by display name (partial match)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, avatar_image_url')
        .ilike('display_name', `%${searchTerm}%`)
        .neq('id', user.id)
        .limit(20);
      
      if (usersError) throw usersError;
      
      if (usersData) {
        // Filter out existing friends
        const friendIds = friends.map(f => f.id);
        
        // Process users to ensure unique display names
        const nameCount: Record<string, number> = {};
        const filteredUsers = usersData
          .filter(u => !friendIds.includes(u.id))
          .map(profile => {
            const baseName = profile.display_name || 'User';
            
            // Track name occurrences and add suffix if needed
            nameCount[baseName] = (nameCount[baseName] || 0) + 1;
            
            // Only add suffix if this is not the first occurrence of the name
            const displayName = nameCount[baseName] > 1 
              ? `${baseName} ${nameCount[baseName] - 1}`
              : baseName;
            
            return {
              id: profile.id,
              display_name: displayName,
              original_name: baseName, // Keep original for reference
              avatar_url: profile.avatar_url || profile.avatar_image_url
            };
          });
        
        setSearchResults(filteredUsers);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const addFriend = async (friend: User) => {
    if (!user) return;
    
    try {
      // Insert into friends table
      const { error } = await supabase
        .from('friends')
        .insert([
          { user_id: user.id, friend_id: friend.id }
        ]);
      
      if (error) throw error;
      
      // Add to local state - use original_name if available
      const newFriend: Friend = {
        id: friend.id,
        username: friend.original_name || friend.display_name || 'User',
        avatar_url: friend.avatar_url
      };
      
      setFriends([...friends, newFriend]);
      
      // Remove from search results and all users
      setSearchResults(searchResults.filter(u => u.id !== friend.id));
      setAllUsers(allUsers.filter(u => u.id !== friend.id));
      
      toast.success(`Added ${friend.display_name || 'User'} as a friend`);
    } catch (error) {
      console.error('Error adding friend:', error);
      toast.error('Failed to add friend');
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return;
    
    try {
      // Delete from friends table
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId);
      
      if (error) throw error;
      
      // Get the removed friend's data
      const removedFriend = friends.find(f => f.id === friendId);
      
      // Update local state
      setFriends(friends.filter(f => f.id !== friendId));
      
      // Add the removed friend back to allUsers if they're not there
      if (removedFriend && !allUsers.some(u => u.id === friendId)) {
        const userToAdd: User = {
          id: removedFriend.id,
          display_name: removedFriend.username,
          avatar_url: removedFriend.avatar_url
        };
        setAllUsers([...allUsers, userToAdd]);
      }
      
      toast.success('Friend removed');
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    }
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
          completed: false,
          user_id: user?.id
        }])
        .select()
        .single();

      if (gameError) throw gameError;
      
      // Navigate to the room page with invitation params
      navigate(`/test/room?id=${game.id}&invite=${friend.id}`);
      
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Failed to create game');
    }
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  // Get the list of users to display based on search state
  const displayUsers = searchTerm.trim() ? searchResults : allUsers;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-history-primary dark:text-history-light">Friends</h1>
      
      <Tabs defaultValue="friends" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Friends
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find Users
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="friends">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-history-primary" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
              <User className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No friends yet</h3>
              <p className="text-muted-foreground mb-4">Start adding friends to play together!</p>
              <Button onClick={() => document.querySelector('[value="search"]')?.dispatchEvent(new Event('click'))}>
                Find Friends
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {friends.map(friend => (
                <div 
                  key={friend.id} 
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-4">
                      {friend.avatar_url ? (
                        <AvatarImage src={friend.avatar_url} alt={friend.username} />
                      ) : (
                        <AvatarFallback>{getInitial(friend.username)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-medium">{friend.username}</div>
                      {friend.email && <div className="text-sm text-muted-foreground">{friend.email}</div>}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => inviteFriendToGame(friend)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Invite to Game</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeFriend(friend.id)}
                          >
                            <UserMinus className="h-4 w-4 text-red-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove Friend</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="search" className="space-y-6">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users by name..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              />
            </div>
            <Button 
              onClick={searchUsers} 
              disabled={isSearching || !searchTerm.trim()}
            >
              {isSearching ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          </div>
          
          {isSearching || isLoadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-history-primary" />
            </div>
          ) : displayUsers.length === 0 ? (
            searchTerm.trim() ? (
              <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                <h3 className="text-lg font-medium mb-2">No users found</h3>
                <p className="text-muted-foreground">Try a different search term</p>
              </div>
            ) : (
              <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No users available</p>
              </div>
            )
          ) : (
            <div>
              {searchTerm.trim() ? (
                <div className="mb-4 text-sm text-muted-foreground">
                  Found {displayUsers.length} users matching "{searchTerm}"
                </div>
              ) : (
                <div className="mb-4 text-sm text-muted-foreground">
                  Showing all available users ({displayUsers.length})
                </div>
              )}
              <div className="space-y-4">
                {displayUsers.map(user => (
                  <div 
                    key={user.id} 
                    className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-4">
                        {user.avatar_url ? (
                          <AvatarImage src={user.avatar_url} alt={user.display_name || 'User'} />
                        ) : (
                          <AvatarFallback>{getInitial(user.display_name || '')}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.display_name || 'User'}</div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => addFriend(user)}
                      className="flex items-center"
                    >
                      <UserPlus className="h-4 w-4 mr-2 text-green-500" />
                      Add Friend
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FriendsPage; 