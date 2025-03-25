
import { useState } from 'react';
import { Users, Check, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface FriendsInviteDialogProps {
  trigger: React.ReactNode;
  onInviteAndStart?: () => void;
}

const FriendsInviteDialog = ({ trigger, onInviteAndStart }: FriendsInviteDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const { toast } = useToast();

  // Mock friends data
  const friends = [
    { id: '1', name: 'Jane Smith', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane', status: 'online' },
    { id: '2', name: 'John Doe', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', status: 'offline' },
    { id: '3', name: 'Sarah Wilson', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', status: 'online' },
    { id: '4', name: 'Mike Johnson', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', status: 'offline' },
    { id: '5', name: 'Emily Davis', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily', status: 'online' },
  ];

  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
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

    // Close the dialog
    setIsOpen(false);
    
    // Notify the parent component
    if (onInviteAndStart) {
      onInviteAndStart();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
          <DialogDescription>
            Select friends to invite to your game.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative my-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search friends" 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {filteredFriends.length > 0 ? (
            <div className="space-y-2">
              {filteredFriends.map(friend => (
                <div 
                  key={friend.id} 
                  className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleFriendSelection(friend.id)}
                >
                  <Checkbox 
                    id={`friend-${friend.id}`} 
                    checked={selectedFriends.includes(friend.id)}
                    onCheckedChange={() => toggleFriendSelection(friend.id)}
                  />
                  <div className="h-10 w-10 rounded-full overflow-hidden">
                    <img 
                      src={friend.avatarUrl} 
                      alt={friend.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`friend-${friend.id}`} className="font-medium cursor-pointer">
                      {friend.name}
                    </Label>
                    <div className="flex items-center text-xs">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                        friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                      <span className="text-muted-foreground capitalize">{friend.status}</span>
                    </div>
                  </div>
                  {selectedFriends.includes(friend.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No friends found with that name
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleInviteAndStart}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Invite and Start Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsInviteDialog;
