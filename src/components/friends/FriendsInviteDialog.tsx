
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Search, UserPlus, Check, AlertCircle } from "lucide-react";
import { useAuth } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { useFriends } from '@/hooks/useFriends';

interface FriendsInviteDialogProps {
  trigger: React.ReactNode;
  onInviteAndStart: (selectedFriends: string[]) => void;
}

const FriendsInviteDialog = ({ trigger, onInviteAndStart }: FriendsInviteDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { friends, availableUsers, loading, fetchAvailableUsers } = useFriends();
  
  // Fetch users when dialog opens
  useEffect(() => {
    if (dialogOpen && user) {
      console.log('FriendsInviteDialog: Dialog opened, fetching available users');
      fetchAvailableUsers();
    }
  }, [dialogOpen, user, fetchAvailableUsers]);
  
  // Choose which users to display - friends if available, otherwise all users
  const usersToDisplay = friends.length > 0 ? friends : availableUsers;
  
  // If we still have no users to display, log this for debugging
  useEffect(() => {
    if (dialogOpen && usersToDisplay.length === 0 && !loading) {
      console.log('FriendsInviteDialog: No users available to display after fetching');
    } else if (dialogOpen && usersToDisplay.length > 0) {
      console.log(`FriendsInviteDialog: Displaying ${usersToDisplay.length} users`);
    }
  }, [dialogOpen, usersToDisplay, loading]);
  
  // Filter users based on search term
  const filteredUsers = usersToDisplay.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
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
    
    onInviteAndStart(selectedFriends);
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
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.username} 
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <Users className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{user.username}</p>
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
                {searchTerm ? 'Try a different search term' : 'Unable to find any users. Please try refreshing.'}
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
