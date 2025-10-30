import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, UserMinus, Loader, AlertCircle, User } from "lucide-react";
import { LockedFeatureOverlay } from "@/components/LockedFeatureOverlay";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from '@/components/ui/sonner';
import { getAvatarFrameGradient, getAvatarTextGradientStyle } from '@/utils/avatarGradient';

// Interface for raw profile data from Supabase
interface ProfileFromSupabase {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_image_url: string | null;
  avatar_name?: string | null; // e.g., "Ada Lovelace #7726"
}

type Friend = {
  id: string;
  username: string;
  avatar_url?: string;
  avatar_image_url?: string;
  display_name?: string;
};

type User = {
  id: string;
  avatar_url?: string;
  avatar_image_url?: string;
  display_name?: string;
  original_name?: string;
  avatar_name?: string;
};

type FriendsPageProps = {
  showHeading?: boolean;
};

const FriendsPage = ({ showHeading = true }: FriendsPageProps) => {
  const { user, isGuest } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [friendsFilter, setFriendsFilter] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const navigate = useNavigate();

  // If no user, redirect to login
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="mb-6">Please log in or create an account to view this page.</p>
        <Button onClick={() => navigate('/solo/auth')}>Login / Register</Button>
      </div>
    );
  }
  
  // For guest users, show the page with a lock overlay
  if (isGuest) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-history-primary dark:text-history-light">Friends</h1>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
          <LockedFeatureOverlay message="You need an account to connect with friends." />
        </div>
      </div>
    );
  }

  useEffect(() => { // For loadAllUsers
    if (activeTab === 'search' && user && allUsers.length === 0) {
      loadAllUsers();
    }
  }, [activeTab, user, allUsers.length]); // Added allUsers.length to dependency array for correctness

  useEffect(() => { // Moved this useEffect after the main user email check
    // The main component guard ensures 'user' is valid.
    // This check is for TypeScript's benefit within this specific scope.
    if (user) {
      loadFriends();
    } else {
      // This case should ideally not be hit if the main guard is effective
      // and user state updates correctly.
      setFriends([]);
    }
  }, [user]);

  const handleNavigateToProfile = (profileId: string) => {
    navigate(`/profile/${profileId}`);
  };

  const loadFriends = async () => {
    if (!user) return; // Ensure user is registered

    setIsLoading(true);
    try {
      // Get friends from the friends table
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id);

      if (friendsError) throw friendsError;

      if (friendsData && friendsData.length > 0) {
        const friendIds = friendsData.map((f) => f.friend_id);

        // Get friend profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, avatar_image_url')
          .in('id', friendIds);

        if (profilesError) {
          console.error('Error loading friend profiles:', profilesError);
          toast.error('Failed to load friend details.');
          throw profilesError;
        }

        const allFetchedProfiles = (profilesData as unknown as ProfileFromSupabase[] | null) || [];

        if (allFetchedProfiles.length > 0) {
          const friendsList = allFetchedProfiles.map((profile) => ({
            id: profile.id,
            username: profile.display_name || 'User',
            avatar_url: profile.avatar_url || undefined,
            avatar_image_url: profile.avatar_image_url || undefined,
            display_name: profile.display_name || 'User',
          }));
          setFriends(friendsList);
        } else {
          setFriends([]); // Ensure friends list is cleared if no registered friends found
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
    if (!user) return; // Ensure user is registered

    setIsLoadingUsers(true);
    try {
      // Page through profiles to avoid truncating after early letters (A-C)
      const pageSize = 200;
      const maxToFetch = 1000; // safety cap
      let offset = 0;
      const aggregated: ProfileFromSupabase[] = [];

      // Fetch pages until fewer than pageSize returned or max cap reached
      // Keep ordering stable by display_name asc
      while (aggregated.length < maxToFetch) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, avatar_image_url, avatar_name')
          .neq('id', user.id)
          .order('display_name', { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.error('Error loading all users (paged):', error);
          toast.error('Failed to load users.');
          throw error;
        }

        const batch = (data as unknown as ProfileFromSupabase[] | null) || [];
        if (batch.length === 0) break;
        aggregated.push(...batch);
        if (batch.length < pageSize) break; // last page
        offset += pageSize;
      }

      const allFetchedUsers = aggregated;

      if (allFetchedUsers.length > 0) {
        const friendIds = friends.map((f) => f.id);
        const nameCount: Record<string, number> = {};
        const processedUsers = allFetchedUsers
          .filter((u) => !friendIds.includes(u.id))
          .map((profile) => {
            const baseName = profile.display_name || 'User';
            nameCount[baseName] = (nameCount[baseName] || 0) + 1;
            const displayName =
              nameCount[baseName] > 1
                ? `${baseName} ${nameCount[baseName] - 1}`
                : baseName;
            return {
              id: profile.id,
              display_name: displayName,
              original_name: baseName,
              avatar_url: profile.avatar_url || undefined,
              avatar_image_url: profile.avatar_image_url || undefined,
              avatar_name: profile.avatar_name || undefined,
            } as User; // Cast to User type
          });
        setAllUsers(processedUsers);
      } else {
        setAllUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim() || !user) return; // Ensure user is registered

    setIsSearching(true);
    try {
      const term = searchTerm.trim();
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, avatar_image_url, avatar_name')
        .or(`display_name.ilike.%${term}%,avatar_name.ilike.%${term}%`)
        .neq('id', user.id) // user.id is safe here due to the function guard
        .limit(100);

      if (usersError) {
        console.error('Error searching users:', usersError);
        toast.error('Failed to search users.');
        throw usersError;
      }

      const allSearchedUsers = (usersData as unknown as ProfileFromSupabase[] | null) || [];

      if (allSearchedUsers.length > 0) {
        const friendIds = friends.map((f) => f.id);
        const nameCount: Record<string, number> = {};
        const processedUsers = allSearchedUsers
          .filter((u) => !friendIds.includes(u.id))
          .map((profile) => {
            const baseName = profile.display_name || 'User';
            nameCount[baseName] = (nameCount[baseName] || 0) + 1;
            const displayName =
              nameCount[baseName] > 1
                ? `${baseName} ${nameCount[baseName] - 1}`
                : baseName;
            return {
              id: profile.id,
              display_name: displayName,
              original_name: baseName,
              avatar_url: profile.avatar_url || undefined,
              avatar_image_url: profile.avatar_image_url || undefined,
              avatar_name: profile.avatar_name || undefined,
            } as User; // Cast to User type
          });
        setSearchResults(processedUsers);
      } else {
        setSearchResults([]);
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
        avatar_url: friend.avatar_url,
        avatar_image_url: friend.avatar_image_url,
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
          avatar_url: removedFriend.avatar_url,
          avatar_image_url: removedFriend.avatar_image_url,
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
      
      // Navigate to Compete hub for invitations (room flow handled elsewhere)
      navigate(`/compete`);
      
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Failed to create game');
    }
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  // Get the list of users to display based on search state
  // Prefer instant client-side filtering from loaded users while typing,
  // and use server results (searchResults) when explicitly requested.
  const filteredFriends = useMemo(() => {
    const normalized = friendsFilter.trim().toLowerCase();
    if (!normalized) return friends;
    return friends.filter((friend) => {
      const name = (friend.display_name || friend.username || '').toLowerCase();
      return name.includes(normalized);
    });
  }, [friends, friendsFilter]);

  const normalizedTerm = searchTerm.trim().toLowerCase();
  const locallyFiltered = normalizedTerm
    ? allUsers.filter((u) =>
        (u.display_name || '').toLowerCase().includes(normalizedTerm) ||
        (u.original_name || '').toLowerCase().includes(normalizedTerm) ||
        (u.avatar_name || '').toLowerCase().includes(normalizedTerm)
      )
    : allUsers;
  const displayUsers = normalizedTerm
    ? (searchResults.length > 0 ? searchResults : locallyFiltered)
    : allUsers;

  return (
    <div className={`max-w-4xl mx-auto px-4 ${showHeading ? 'py-8' : 'py-4'}`}>
      {showHeading && (
        <h1 className="text-2xl font-bold mb-6 text-history-primary dark:text-history-light">Friends</h1>
      )}
      
      <Tabs value={activeTab} defaultValue="friends" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-2 gap-2">
          <TabsTrigger value="friends" className="flex flex-1 items-center justify-center gap-2">
            <User className="h-4 w-4" />
            Your Friends
          </TabsTrigger>
          <TabsTrigger value="search" className="flex flex-1 items-center justify-center gap-2">
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
            <div className="text-center py-12 bg-[#333333] text-white rounded-lg shadow">
              <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No friends yet</h3>
              <p className="text-gray-300 mb-4">Start adding friends to play together!</p>
              <Button onClick={() => setActiveTab('search')}>
                Find Friends
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={friendsFilter}
                  onChange={(e) => setFriendsFilter(e.target.value)}
                  placeholder="Filter your friends by name..."
                  aria-label="Filter friends"
                  className="rounded-lg border border-[#3f424b] bg-[#1d2026] pl-9 text-sm text-white placeholder:text-neutral-500"
                />
              </div>
              {filteredFriends.length === 0 ? (
                <div className="rounded-lg bg-[#333333] p-4 text-center text-sm text-gray-300">
                  No friends match your filter.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFriends.map((friend) => {
                    const nameSeed = friend.id || friend.username;
                    const nameStyle = getAvatarTextGradientStyle(nameSeed);
                    const frameStyle = { background: getAvatarFrameGradient(nameSeed) };
                    const avatarSrc = friend.avatar_image_url || friend.avatar_url;
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between rounded-lg bg-[#333333] p-4 text-white shadow"
                      >
                        <div className="flex items-center">
                          <div
                            className="mr-4 h-10 w-10 cursor-pointer rounded-full p-[2px]"
                            style={frameStyle}
                            onClick={() => handleNavigateToProfile(friend.id)}
                          >
                            <Avatar className="h-full w-full border border-[#3f424b] bg-[#262930]">
                              {avatarSrc ? (
                                <AvatarImage src={avatarSrc} alt={friend.username} />
                              ) : (
                                <AvatarFallback>{getInitial(friend.username)}</AvatarFallback>
                              )}
                            </Avatar>
                          </div>
                          <div>
                            <div
                              className="font-medium cursor-pointer"
                              style={nameStyle}
                              onClick={() => handleNavigateToProfile(friend.id)}
                            >
                              {friend.display_name || friend.username}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFriend(friend.id)}
                            className="text-red-400 hover:bg-transparent hover:text-red-500 focus-visible:ring-offset-0"
                            aria-label="Remove friend"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search">
          {isLoadingUsers || isSearching ? (
            <div className="flex justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-history-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      searchUsers();
                    }
                  }}
                  placeholder="Search users by name..."
                  aria-label="Search users"
                  className="rounded-lg border border-[#3f424b] bg-[#1d2026] pl-9 text-sm text-white placeholder:text-neutral-500"
                />
              </div>
              {displayUsers.length === 0 ? (
                <div className="text-center py-8 bg-[#333333] text-white rounded-lg shadow">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-300">
                    No users available{searchTerm.trim() ? ` matching "${searchTerm}"` : ''}
                  </p>
                </div>
              ) : (
                <>
                  {searchTerm.trim() ? (
                    <div className="text-sm text-muted-foreground">
                      Found {displayUsers.length} users matching "{searchTerm}"
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Showing all available users ({displayUsers.length})
                    </div>
                  )}
                  <div className="space-y-4">
                    {displayUsers.map((user) => {
                      const nameSeed = user.id || user.display_name || 'user';
                      const nameStyle = getAvatarTextGradientStyle(nameSeed);
                      const frameStyle = { background: getAvatarFrameGradient(nameSeed) };
                      const avatarSrc = user.avatar_image_url || user.avatar_url;
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between rounded-lg bg-[#333333] p-4 text-white shadow"
                        >
                          <div className="flex items-center">
                            <div
                              className="mr-4 h-10 w-10 cursor-pointer rounded-full p-[2px]"
                              style={frameStyle}
                              onClick={() => handleNavigateToProfile(user.id)}
                            >
                              <Avatar className="h-full w-full border border-[#3f424b] bg-[#262930]">
                                {avatarSrc ? (
                                  <AvatarImage src={avatarSrc} alt={user.display_name || 'User'} />
                                ) : (
                                  <AvatarFallback>{getInitial(user.display_name || 'User')}</AvatarFallback>
                                )}
                              </Avatar>
                            </div>
                            <div>
                              <div
                                className="font-medium cursor-pointer"
                                style={nameStyle}
                                onClick={() => handleNavigateToProfile(user.id)}
                              >
                                {user.display_name || 'User'}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => addFriend(user)}
                            className="text-green-400 hover:bg-transparent hover:text-green-500 focus-visible:ring-offset-0"
                            aria-label="Add friend"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FriendsPage;