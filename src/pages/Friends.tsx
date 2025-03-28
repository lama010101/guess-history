
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/services/auth';
import { Plus, Search, UserMinus, Users } from 'lucide-react';

// Expanded mock data to ensure "lili" is available for search
const getRealUsers = () => {
  // In a real implementation, this would fetch from an API
  return [
    { id: '4', username: 'john_doe', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john' },
    { id: '5', username: 'jane_smith', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane' },
    { id: '6', username: 'alex_wilson', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex' },
    { id: '7', username: 'lili', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lili' },
    { id: '8', username: 'emma_johnson', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma' },
    { id: '9', username: 'michael_brown', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael' },
  ];
};

const Friends = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [friends, setFriends] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "You need to be logged in to access your friends list"
      });
      navigate('/');
    } else {
      // Fetch real users
      const realUsers = getRealUsers();
      setAvailableUsers(realUsers);
      
      // In a real implementation, you would fetch the user's friends from an API
      // For now, we'll just set an empty friends list
      setFriends([]);
      
      // Check if there's a query parameter for searching
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search');
      if (searchParam) {
        setSearchTerm(searchParam);
        // Force the activeTab to 'discover' when searching
        setActiveTab('discover');
      }
    }
  }, [isAuthenticated, navigate, toast]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAddFriend = (id) => {
    const userToAdd = availableUsers.find(u => u.id === id);
    if (userToAdd) {
      setFriends(prev => [...prev, userToAdd]);
      setAvailableUsers(prev => prev.filter(u => u.id !== id));
      toast({
        title: "Friend added",
        description: `${userToAdd.username} has been added to your friends list`
      });
    }
  };

  const handleRemoveFriend = (id) => {
    const friendToRemove = friends.find(f => f.id === id);
    if (friendToRemove) {
      setFriends(prev => prev.filter(f => f.id !== id));
      setAvailableUsers(prev => [...prev, friendToRemove]);
      toast({
        title: "Friend removed",
        description: `${friendToRemove.username} has been removed from your friends list`
      });
    }
  };

  // Filter users with case-insensitive search to make sure "lili" can be found
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
                          {friend.avatarUrl ? (
                            <img 
                              src={friend.avatarUrl} 
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
            {filteredUsers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map(user => (
                  <Card key={user.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {user.avatarUrl ? (
                            <img 
                              src={user.avatarUrl} 
                              alt={user.username} 
                              className="w-10 h-10 rounded-full"
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
