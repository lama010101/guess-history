import { useState, useEffect } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, UserMinus, UserPlus, Check, X } from "lucide-react";
import { format } from 'date-fns';
import { useAuth } from '@/services/auth.tsx';

interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  avatarUrl?: string;
  isAI?: boolean;
}

export default function UsersTable() {
  const { user, users } = useAuth();
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (users && users.length > 0) {
      const mappedUsers = users.map(user => ({
        id: user.id || String(Math.random()),
        username: user.username || user.email?.split('@')[0] || 'Unknown',
        email: user.email || 'No email',
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || Math.random()}`,
        isAI: user.isAI === false ? false : true
      }));
      setRegisteredUsers(mappedUsers);
      return;
    }
    
    const savedUsersString = localStorage.getItem('registeredUsers');
    if (savedUsersString) {
      try {
        let savedUsers = JSON.parse(savedUsersString);
        savedUsers = savedUsers.map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          isAI: user.isAI === false ? false : true
        }));
        setRegisteredUsers(savedUsers);
      } catch (error) {
        console.error('Error loading registered users:', error);
        createSampleUsers();
      }
    } else {
      createSampleUsers();
    }
  }, [users]);

  const createSampleUsers = () => {
    const sampleUsers: User[] = [
      {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        createdAt: new Date('2023-01-01'),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        isAI: true
      },
      {
        id: '2',
        username: 'test_user',
        email: 'test@example.com',
        createdAt: new Date('2023-02-15'),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
        isAI: true
      },
      {
        id: '3',
        username: 'john_doe',
        email: 'john@example.com',
        createdAt: new Date('2023-03-10'),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
        isAI: true
      }
    ];
    
    if (user) {
      sampleUsers.push({
        id: user.id || '999',
        username: user.username || user.email?.split('@')[0] || 'Current User',
        email: user.email || 'current@user.com',
        createdAt: new Date(),
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || Math.random()}`,
        isAI: false
      });
    }
    
    setRegisteredUsers(sampleUsers);
    localStorage.setItem('registeredUsers', JSON.stringify(sampleUsers));
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedUsers(registeredUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleBatchDelete = () => {
    const remainingUsers = registeredUsers.filter(user => !selectedUsers.includes(user.id));
    setRegisteredUsers(remainingUsers);
    setSelectedUsers([]);
    setSelectAll(false);
    
    localStorage.setItem('registeredUsers', JSON.stringify(remainingUsers));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Registered Users ({registeredUsers.length})</h2>
        <div className="flex space-x-2">
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
      </div>
      
      <div className="border rounded-md overflow-hidden">
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
              <th className="p-3 text-left font-medium">Type</th>
              <th className="p-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {registeredUsers.length > 0 ? (
              registeredUsers.map(user => (
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
                    {user.isAI ? (
                      <span className="px-2 py-1 text-xs rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex items-center w-fit">
                        <X size={12} className="mr-1" /> AI Sample
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center w-fit">
                        <Check size={12} className="mr-1" /> Real User
                      </span>
                    )}
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
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
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
