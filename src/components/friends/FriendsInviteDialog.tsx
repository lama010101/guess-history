
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Search, UserPlus, Check } from "lucide-react";

// Mock user data - would come from an API in a real app
const mockUsers = [
  { id: '1', username: 'user1', email: 'user1@example.com', avatar: null },
  { id: '2', username: 'user2', email: 'user2@example.com', avatar: null },
  { id: '3', username: 'user3', email: 'user3@example.com', avatar: null },
];

interface FriendsInviteDialogProps {
  trigger: React.ReactNode;
  onInviteAndStart: () => void;
}

const FriendsInviteDialog = ({ trigger, onInviteAndStart }: FriendsInviteDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Filter users based on search term
  const filteredUsers = mockUsers.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const toggleFriendSelection = (userId: string) => {
    setSelectedFriends(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const handleInviteAndStart = () => {
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
            // Remove autoFocus here
          />
        </div>
        
        <ScrollArea className="max-h-[280px] pr-4 -mr-4">
          {filteredUsers.length > 0 ? (
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
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{user.username}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
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
