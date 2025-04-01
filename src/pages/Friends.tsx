import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/services/auth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, UserMinus, Users, BellRing } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
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
      fetchProfiles();
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
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error fetching friends:', error);
        return;
      }

      if (data && data.length > 0) {
        const friendIds = data.map(item => item.friend_id);
        
        const { data: friendProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', friendIds);
          
        if (profilesError) {
          console.error('Error fetching friend profiles:', profilesError);
          return;
        }
        
        setFriends(friendProfiles || []);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchProfiles = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .neq('id', user.id)
        .not('id', 'in', `(SELECT friend_id FROM friends WHERE user_id = "${user.id}")`) as any;

      if (error) {
        console.error('Error fetching profiles:', error);
        toast({
          title: "Error",
          description: "Failed to load user profiles",
          variant: "destructive"
        });
        return;
      }
      
      setAvailableUsers(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAddFriend = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) {
        console.error('Error adding friend:', error);
        toast({
          title: "Error",
          description: "Failed to add friend",
          variant: "destructive"
        });
        return;
      }

      await supabase.functions.invoke('send-notification', {
        body: {
          recipientId: friendId,
          message: `${user.username} wants to be your friend!`,
          title: "Friend Request",
          data: {
            type: 'friend_request',
            sender_id: user.id
          }
        }
      });

      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent"
      });

      fetchProfiles();
      fetchFriends();
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId);

      if (error) {
        console.error('Error removing friend:', error);
        return;
      }

      toast({
        title: "Friend removed",
        description: "Friend has been removed from your list"
      });

      fetchFriends();
      fetchProfiles();
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = availableUsers.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return null;
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
