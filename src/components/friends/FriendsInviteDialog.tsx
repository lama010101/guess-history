
import { useState } from "react";
import { Check, Search, User, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  name: string;
  avatar: string;
  status?: 'online' | 'offline';
  isFriend?: boolean;
}

// Mock data - In a real app, this would come from an API
const mockUsers: User[] = [
  { id: "1", name: "Alex Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex", status: "online" },
  { id: "2", name: "Sam Wilson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam", status: "offline" },
  { id: "3", name: "Jamie Smith", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jamie", status: "online" },
  { id: "4", name: "Taylor Brown", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor", status: "offline" },
  { id: "5", name: "Robin Lee", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robin", status: "online" },
  { id: "6", name: "Jordan Clark", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan", status: "online" },
  { id: "7", name: "Casey Martinez", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Casey", status: "offline" },
];

const mockFriends: User[] = [
  { id: "8", name: "Jane Smith", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane", status: "online", isFriend: true },
  { id: "9", name: "John Doe", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John", status: "offline", isFriend: true },
  { id: "10", name: "Sarah Wilson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", status: "online", isFriend: true },
];

interface FriendsInviteDialogProps {
  trigger?: React.ReactNode;
}

const FriendsInviteDialog = ({ trigger }: FriendsInviteDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"friends" | "search">("friends");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Toggle selection of a user
  const toggleSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  // Filter users based on search query
  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle inviting selected friends
  const handleInvite = () => {
    console.log("Inviting friends:", selectedUsers);
    // In a real app, this would send invites to the selected users
    setSelectedUsers([]);
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || <Button>Invite Friends</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
          <DialogDescription>
            Invite friends to play with you or add new friends.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex border-b border-border">
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              tab === "friends" ? "border-b-2 border-primary" : ""
            }`}
            onClick={() => setTab("friends")}
          >
            My Friends
          </button>
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              tab === "search" ? "border-b-2 border-primary" : ""
            }`}
            onClick={() => setTab("search")}
          >
            Find Users
          </button>
        </div>
        
        {tab === "search" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        
        <div className="max-h-[300px] overflow-y-auto space-y-2 my-2">
          {tab === "friends" ? (
            mockFriends.length > 0 ? (
              mockFriends.map((friend) => (
                <UserItem
                  key={friend.id}
                  user={friend}
                  isSelected={selectedUsers.includes(friend.id)}
                  onSelect={() => toggleSelect(friend.id)}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <User className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-muted-foreground">No friends yet</p>
                <p className="text-xs text-muted-foreground">
                  Search for users to add them as friends
                </p>
              </div>
            )
          ) : (
            filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <UserItem
                  key={user.id}
                  user={user}
                  isSelected={selectedUsers.includes(user.id)}
                  onSelect={() => toggleSelect(user.id)}
                  showAddButton={!user.isFriend}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            )
          )}
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {selectedUsers.length} users selected
          </p>
          <Button 
            variant="default" 
            onClick={handleInvite}
            disabled={selectedUsers.length === 0}
          >
            {tab === "friends" ? "Invite to Game" : "Add as Friends"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface UserItemProps {
  user: User;
  isSelected: boolean;
  onSelect: () => void;
  showAddButton?: boolean;
}

const UserItem = ({ user, isSelected, onSelect, showAddButton }: UserItemProps) => {
  return (
    <div 
      className={`p-2 rounded-lg flex justify-between items-center transition-colors ${
        isSelected ? "bg-primary/10" : "hover:bg-secondary"
      }`}
    >
      <div className="flex items-center">
        <div className="h-10 w-10 rounded-full overflow-hidden mr-3 relative">
          <img 
            src={user.avatar} 
            alt={user.name} 
            className="w-full h-full object-cover"
          />
          {user.status && (
            <span 
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
              }`}
            ></span>
          )}
        </div>
        <div>
          <p className="font-medium">{user.name}</p>
          {user.isFriend && (
            <p className="text-xs text-muted-foreground">Friend</p>
          )}
        </div>
      </div>
      <div>
        {showAddButton ? (
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8" 
            onClick={onSelect}
          >
            {isSelected ? (
              <X className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8" 
            onClick={onSelect}
          >
            {isSelected ? (
              <Check className="h-4 w-4" />
            ) : (
              <div className="h-4 w-4 rounded-sm border border-gray-400" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default FriendsInviteDialog;
