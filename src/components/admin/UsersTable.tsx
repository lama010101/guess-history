
import { useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, UserMinus } from "lucide-react";
import { format } from 'date-fns';

interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  avatarUrl?: string;
}

export default function UsersTable() {
  // Mock user data - in a real application, this would come from an API
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      createdAt: new Date('2023-01-01'),
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
    },
    {
      id: '2',
      username: 'test_user',
      email: 'test@example.com',
      createdAt: new Date('2023-02-15'),
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test'
    },
    {
      id: '3',
      username: 'john_doe',
      email: 'john@example.com',
      createdAt: new Date('2023-03-10'),
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john'
    },
    {
      id: '4',
      username: 'jane_smith',
      email: 'jane@example.com',
      createdAt: new Date('2023-04-05'),
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane'
    },
    {
      id: '5',
      username: 'alex_wilson',
      email: 'alex@example.com',
      createdAt: new Date('2023-05-20'),
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex'
    },
    {
      id: '6',
      username: 'lili',
      email: 'lili@example.com',
      createdAt: new Date('2023-06-15'),
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lili'
    }
  ]);

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  // Handle individual user selection
  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  // Handle batch delete
  const handleBatchDelete = () => {
    // Filter out selected users
    const remainingUsers = users.filter(user => !selectedUsers.includes(user.id));
    setUsers(remainingUsers);
    setSelectedUsers([]);
    setSelectAll(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Registered Users</h2>
        {selectedUsers.length > 0 && (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleBatchDelete}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedUsers.length})
          </Button>
        )}
      </div>
      
      <div className="border rounded-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-medium">
                <Checkbox 
                  checked={selectAll} 
                  onCheckedChange={handleSelectAll} 
                />
              </th>
              <th className="p-3 text-left font-medium">User</th>
              <th className="p-3 text-left font-medium">Email</th>
              <th className="p-3 text-left font-medium">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Registration Date
                </div>
              </th>
              <th className="p-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map(user => (
                <tr key={user.id} className="border-b hover:bg-muted/20">
                  <td className="p-3">
                    <Checkbox 
                      checked={selectedUsers.includes(user.id)} 
                      onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)} 
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.username} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-primary text-xs font-bold">
                            {user.username.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="font-medium">{user.username}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{user.email}</td>
                  <td className="p-3 text-muted-foreground">
                    {format(user.createdAt, 'PPP')}
                  </td>
                  <td className="p-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleSelectUser(user.id, !selectedUsers.includes(user.id))}
                    >
                      <UserMinus className="h-4 w-4" />
                      <span className="sr-only">Delete User</span>
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
