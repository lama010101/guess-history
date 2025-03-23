
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, UserPlus, Users, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Friend {
  id: string;
  username: string;
  avatar: string;
  online: boolean;
}

interface FriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock data for friends
const mockFriends: Friend[] = [
  { id: '1', username: 'JaneDoe', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane', online: true },
  { id: '2', username: 'JohnSmith', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', online: false },
  { id: '3', username: 'SarahConnor', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', online: true },
];

// Mock data for all users
const mockAllUsers: Friend[] = [
  ...mockFriends,
  { id: '4', username: 'AlexJohnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', online: false },
  { id: '5', username: 'EmilyDavis', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily', online: true },
  { id: '6', username: 'MichaelBrown', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael', online: false },
];

const FriendsModal = ({ open, onOpenChange }: FriendsModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'all'>('friends');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const { toast } = useToast();

  // Filter friends or all users based on search term
  const filteredUsers = (activeTab === 'friends' ? mockFriends : mockAllUsers)
    .filter(user => user.username.toLowerCase().includes(searchTerm.toLowerCase()));

  // Handle friend selection for invite
  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId) 
        : [...prev, friendId]
    );
  };

  // Handle invite button click
  const handleInviteFriends = () => {
    if (selectedFriends.length === 0) {
      toast({
        title: "No friends selected",
        description: "Please select at least one friend to invite.",
        variant: "destructive"
      });
      return;
    }

    const selectedFriendsNames = selectedFriends
      .map(id => mockAllUsers.find(user => user.id === id)?.username)
      .filter(Boolean)
      .join(', ');

    toast({
      title: "Invitation sent!",
      description: `You've invited ${selectedFriendsNames} to play.`
    });

    // Close the modal
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Invite Friends
          </DialogTitle>
          <DialogDescription>
            Select friends to invite to play with you.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex border-b mb-4">
          <button
            className={`flex-1 py-2 text-sm font-medium ${activeTab === 'friends' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('friends')}
          >
            My Friends
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium ${activeTab === 'all' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('all')}
          >
            Find Users
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No {activeTab === 'friends' ? 'friends' : 'users'} found
            </div>
          ) : (
            filteredUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-2 hover:bg-secondary rounded-md">
                <div className="flex items-center">
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div 
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background
                        ${user.online ? 'bg-green-500' : 'bg-gray-400'}`}
                    />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                {activeTab === 'friends' ? (
                  <Checkbox
                    id={`select-${user.id}`}
                    checked={selectedFriends.includes(user.id)}
                    onCheckedChange={() => toggleFriendSelection(user.id)}
                  />
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-0 h-8 w-8"
                    onClick={() => {
                      toast({
                        title: "Friend request sent",
                        description: `You've sent a friend request to ${user.username}.`
                      });
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInviteFriends} disabled={selectedFriends.length === 0}>
            Invite Selected ({selectedFriends.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsModal;
