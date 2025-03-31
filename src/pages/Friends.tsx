
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/services/auth';
import { Plus, Search, UserMinus, Users, BellRing } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  friend_profile?: Profile;
}

const Friends = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [friends, setFriends] = useState<Profile[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "You need to be logged in to access your friends list"
      });
      navigate('/');
    } else {
      fetchFriends();
      
      // Check if there's a query parameter for searching
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search');
      if (searchParam) {
        setSearchTerm(searchParam);
        setActiveTab('discover');
      }
    }
  }, [isAuthenticated, navigate, toast]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      // First, get all my friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('*, friend_profile:profiles!friend_id(*)')
        .eq('user_id', user?.id || '');
      
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
      
      // Convert to the Profile format
      const myFriends: Profile[] = (friendsData || []).map(friend => ({
        id: friend.friend_id,
        username: friend.friend_profile?.username || 'Unknown User',
        avatar_url: friend.friend_profile?.avatar_url
      }));
      
      setFriends(myFriends);
      
      // Now fetch available users (non-friends)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .neq('id', user?.id || '');
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          title: "Error",
          description: "Failed to load user profiles",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Filter out users that are already friends
      const friendIds = myFriends.map(friend => friend.id);
      const nonFriendProfiles = (profilesData || []).filter(profile => 
        !friendIds.includes(profile.id) && 
        // Filter out fake/test/bot users
        !profile.username.toLowerCase().includes('test') && 
        !profile.username.toLowerCase().includes('bot') &&
        !profile.username.toLowerCase().includes('admin') &&
        !profile.username.toLowerCase().includes('system')
      );
      
      setAvailableUsers(nonFriendProfiles);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching friends and profiles:', error);
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAddFriend = async (id) => {
    const userToAdd = availableUsers.find(u => u.id === id);
    if (userToAdd) {
      try {
        // Add to the friends table in Supabase
        const { error } = await supabase
          .from('friends')
          .insert({
            user_id: user?.id,
            friend_id: id,
            status: 'active'
          });
          
        if (error) {
          console.error('Error adding friend to database:', error);
          toast({
            title: "Error",
            description: "Failed to add friend to your list",
            variant: "destructive"
          });
          return;
        }
        
        // Update local state
        setFriends(prev => [...prev, userToAdd]);
        setAvailableUsers(prev => prev.filter(u => u.id !== id));
        
        // Create a notification for the user
        const { error: notificationError } = await supabase.functions.invoke('send-notification', {
          body: {
            recipientId: id,
            message: `${user?.username || 'Someone'} added you as a friend!`,
            title: "Friend Request",
            data: {
              type: 'friend_request',
              sender_id: user?.id
            }
          }
        });
          
        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        }
        
        toast({
          title: "Friend added",
          description: `${userToAdd.username} has been added to your friends list`
        });
      } catch (error) {
        console.error('Error adding friend:', error);
        toast({
          title: "Error",
          description: "Failed to add friend",
          variant: "destructive"
        });
      }
    }
  };

  const handleRemoveFriend = async (id) => {
    const friendToRemove = friends.find(f => f.id === id);
    if (friendToRemove) {
      try {
        // Remove from Supabase friends table
        const { error } = await supabase
          .from('friends')
          .delete()
          .eq('user_id', user?.id)
          .eq('friend_id', id);
          
        if (error) {
          console.error('Error removing friend from database:', error);
          toast({
            title: "Error",
            description: "Failed to remove friend from your list",
            variant: "destructive"
          });
          return;
        }
        
        // Update local state
        setFriends(prev => prev.filter(f => f.id !== id));
        setAvailableUsers(prev => [...prev, friendToRemove]);
        
        toast({
          title: "Friend removed",
          description: `${friendToRemove.username} has been removed from your friends list`
        });
      } catch (error) {
        console.error('Error removing friend:', error);
        toast({
          title: "Error",
          description: "Failed to remove friend",
          variant: "destructive"
        });
      }
    }
  };

  // Filter users with case-insensitive search
  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Make sure search works case-insensitively
  const filteredUsers = availableUsers.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 py-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Friends</h1>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search by username..." 
            className="pl-10"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="friends">My Friends</TabsTrigger>
            <TabsTrigger value="discover">Discover Users</TabsTrigger>
          </TabsList>
          
          <TabsContent value="friends">
            {filteredFriends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFriends.map(friend => (
                  <Card key={friend.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {friend.avatar_url ? (
                            <img 
                              src={friend.avatar_url} 
                              alt={friend.username} 
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{friend.username}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRemoveFriend(friend.id)}
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Unfriend
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No friends found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No friends match your search." : "You haven't added any friends yet."}
                </p>
                <Button onClick={() => setActiveTab('discover')}>
                  Discover Users
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="discover">
            {loading ? (
              <div className="text-center py-12">
                <p>Loading users...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map(user => (
                  <Card key={user.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.username} 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user.username}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAddFriend(user.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Friend
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? "No users match your search." : "There are no other users to add at the moment."}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Friends;
