
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/services/auth";

interface FriendsInviteDialogProps {
  trigger: React.ReactNode;
  onInviteAndStart?: () => void;
}

const FriendsInviteDialog = ({ trigger, onInviteAndStart }: FriendsInviteDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  
  // Mock data - would be replaced with actual API calls
  const [friends, setFriends] = useState([
    { id: '1', username: 'friend1', selected: false },
    { id: '2', username: 'friend2', selected: false },
    { id: '3', username: 'friend3', selected: false },
  ]);
  
  // Reset search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      // Reset selected state
      setFriends(friends.map(f => ({ ...f, selected: false })));
    }
  }, [isOpen]);
  
  const handleSelect = (id: string) => {
    setFriends(friends.map(friend => 
      friend.id === id ? { ...friend, selected: !friend.selected } : friend
    ));
  };
  
  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleInviteAndStart = () => {
    setIsOpen(false);
    if (onInviteAndStart) {
      onInviteAndStart();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus={false}
          />
        </div>
        
        <div className="max-h-60 overflow-y-auto mb-4">
          {filteredFriends.length > 0 ? (
            <div className="space-y-2">
              {filteredFriends.map(friend => (
                <div 
                  key={friend.id}
                  className={`p-2 rounded-md flex items-center justify-between cursor-pointer ${
                    friend.selected ? 'bg-primary/10' : 'hover:bg-primary/5'
                  }`}
                  onClick={() => handleSelect(friend.id)}
                >
                  <span>{friend.username}</span>
                  <Button 
                    variant={friend.selected ? "default" : "outline"} 
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    {friend.selected ? "Selected" : "Select"}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No friends match your search." : "You don't have any friends yet."}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInviteAndStart}>
            Invite and Start Game
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsInviteDialog;
