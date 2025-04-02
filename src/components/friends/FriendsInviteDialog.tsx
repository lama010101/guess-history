
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Search, UserPlus, Check, AlertCircle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
}

interface FriendsInviteDialogProps {
  trigger: React.ReactNode;
  onInviteAndStart: () => void;
}

const FriendsInviteDialog = ({ trigger, onInviteAndStart }: FriendsInviteDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch users when dialog opens
  useEffect(() => {
    if (dialogOpen && user) {
      fetchUsers();
    }
  }, [dialogOpen, user]);
  
  const fetchUsers = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching users, current user ID:', user.id);
      
      // First try to fetch friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('friend_id, profiles:profiles!friends_friend_id_fkey(id, username, avatar_url)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');
      
      if (friendsError) {
        console.error('Error fetching friends:', friendsError);
      }
      
      // If we have friends, use them
      if (friendsData && friendsData.length > 0) {
        console.log('Found friends:', friendsData);
        const formattedUsers: User[] = friendsData.map(friend => ({
          id: friend.friend_id,
          username: friend.profiles?.username || 'User',
          avatar_url: friend.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.profiles?.username || Math.random()}`
        }));
        setUsers(formattedUsers);
      } else {
        // If no friends found, fetch all users except current user
        console.log('No friends found, fetching all profiles');
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .neq('id', user.id);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          setError('Failed to load users list');
          toast({
            title: 'Error',
            description: 'Failed to load users list',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }
        
        console.log('Profiles query response:', profilesData);
        
        if (profilesData && profilesData.length > 0) {
          const formattedUsers: User[] = profilesData.map(profile => ({
            id: profile.id,
            username: profile.username || 'User',
            avatar_url: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username || Math.random()}`
          }));
          
          setUsers(formattedUsers);
          console.log(`Fetched ${formattedUsers.length} users:`, formattedUsers);
        } else {
          console.log('No users found in profiles table');
          setUsers([]);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const toggleFriendSelection = (userId: string) => {
    setSelectedFriends(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const handleInviteAndStart = () => {
    if (selectedFriends.length === 0) {
      toast({
        title: "No friends selected",
        description: "Please select at least one friend to invite",
        variant: "destructive"
      });
      return;
    }
    
    onInviteAndStart();
    setDialogOpen(false);
  };
  
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
          <DialogDescription>
            Select friends to invite to the game
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <ScrollArea className="max-h-[280px] pr-4 -mr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Loading users...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-2">
              {filteredUsers.map(user => (
                <div 
                  key={user.id} 
                  className={`flex items-center p-2 rounded cursor-pointer ${
                    selectedFriends.includes(user.id) ? 'bg-primary/10' : 'hover:bg-accent'
                  }`}
                  onClick={() => toggleFriendSelection(user.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-3">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.username} 
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{user.username}</p>
                    {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
                  </div>
                  {selectedFriends.includes(user.id) && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
              <p className="text-xs mt-1">
                {searchTerm ? 'Try a different search term' : 'Make sure profiles exist in database'}
              </p>
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInviteAndStart} disabled={selectedFriends.length === 0}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite and Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsInviteDialog;
