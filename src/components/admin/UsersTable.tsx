import { useState, useEffect } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, UserMinus, UserPlus, Check, X, Filter, XCircle, Search } from "lucide-react";
import { format, formatDistance } from 'date-fns';
import { useAuth } from '@/services/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  avatarUrl?: string;
  isAI?: boolean;
  registrationMethod?: 'email' | 'google' | 'guest' | 'system';
  user_type?: 'real' | 'ai';
}

export default function UsersTable() {
  const { user, users: authUsers } = useAuth();
  const { toast } = useToast();
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    showRealUsers: true,
    showAIUsers: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching users from Supabase:', error);
        fallbackToAuthUsers();
        return;
      }
      
      if (data && data.length > 0) {
        const mappedUsers = data.map(profile => ({
          id: profile.id,
          username: profile.username || 'Unknown',
          email: '',
          createdAt: profile.created_at ? new Date(profile.created_at) : new Date(),
          avatarUrl: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username || Math.random()}`,
          isAI: profile.role !== 'admin',
          registrationMethod: 'email' as const,
          user_type: profile.role === 'admin' ? 'real' as const : 'ai' as const
        }));
        
        setRegisteredUsers(mappedUsers);
        console.log("Loaded users from Supabase:", mappedUsers);
      } else {
        fallbackToAuthUsers();
      }
    } catch (error) {
      console.error('Error fetching Supabase users:', error);
      fallbackToAuthUsers();
    }
  };

  const fallbackToAuthUsers = () => {
    if (authUsers && authUsers.length > 0) {
      const mappedUsers = authUsers.map(user => ({
        id: user.id || String(Math.random()),
        username: user.username || user.email?.split('@')[0] || 'Unknown',
        email: user.email || 'No email',
        createdAt: user.createdAt ? new Date(user.createdAt as string) : new Date(),
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || Math.random()}`,
        isAI: user.isAI === false ? false : true,
        registrationMethod: user.registrationMethod || 'system',
        user_type: user.user_type || (user.isAI ? 'ai' : 'real')
      }));
      setRegisteredUsers(mappedUsers);
      console.log("Using auth context users:", mappedUsers);
      return;
    }
    
    const savedUsersString = localStorage.getItem('registeredUsers');
    if (savedUsersString) {
      try {
        let savedUsers = JSON.parse(savedUsersString);
        savedUsers = savedUsers.map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          isAI: user.isAI === false ? false : true,
          registrationMethod: user.registrationMethod || 'system',
          user_type: user.user_type || (user.isAI ? 'ai' : 'real')
        }));
        setRegisteredUsers(savedUsers);
        console.log("Loaded users from localStorage:", savedUsers);
      } catch (error) {
        console.error('Error loading registered users:', error);
        createSampleUsers();
      }
    } else {
      createSampleUsers();
    }
  };

  const createSampleUsers = () => {
    const sampleUsers: User[] = [
      {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        createdAt: new Date('2023-01-01'),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        isAI: true,
        registrationMethod: 'system',
        user_type: 'ai'
      },
      {
        id: '2',
        username: 'test_user',
        email: 'test@example.com',
        createdAt: new Date('2023-02-15'),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
        isAI: true,
        registrationMethod: 'system',
        user_type: 'ai'
      },
      {
        id: '3',
        username: 'john_doe',
        email: 'john@example.com',
        createdAt: new Date('2023-03-10'),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
        isAI: true,
        registrationMethod: 'system',
        user_type: 'ai'
      }
    ];
    
    if (user) {
      sampleUsers.push({
        id: user.id || '999',
        username: user.username || user.email?.split('@')[0] || 'Current User',
        email: user.email || 'current@user.com',
        createdAt: new Date(),
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || Math.random()}`,
        isAI: false,
        registrationMethod: 'email',
        user_type: 'real'
      });
    }
    
    setRegisteredUsers(sampleUsers);
    localStorage.setItem('registeredUsers', JSON.stringify(sampleUsers));
    console.log("Created sample users:", sampleUsers);
    
    sampleUsers.forEach(async (user) => {
      try {
        await supabase.from('users').upsert({
          id: user.id,
          email: user.email,
          name: user.username,
          signup_method: user.registrationMethod,
          user_type: user.user_type || 'ai',
          created_at: user.createdAt.toISOString(),
        });
      } catch (error) {
        console.error('Error adding sample user to Supabase:', error);
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id));
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

  const handleBatchDelete = async () => {
    try {
      for (const userId of selectedUsers) {
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) {
          console.error(`Error deleting user ${userId} from Supabase:`, error);
        }
      }
      
      const remainingUsers = registeredUsers.filter(user => !selectedUsers.includes(user.id));
      setRegisteredUsers(remainingUsers);
      setSelectedUsers([]);
      setSelectAll(false);
      
      localStorage.setItem('registeredUsers', JSON.stringify(remainingUsers));
      
      toast({
        title: "Users deleted",
        description: `${selectedUsers.length} users have been removed`
      });
    } catch (error) {
      console.error('Error deleting users:', error);
      toast({
        title: "Error",
        description: "Failed to delete users",
        variant: "destructive"
      });
    }
  };

  const getRegistrationMethodLabel = (method?: 'email' | 'google' | 'guest' | 'system') => {
    switch(method) {
      case 'email': return 'Email';
      case 'google': return 'Google';
      case 'guest': return 'Guest';
      case 'system': return 'System';
      default: return 'Unknown';
    }
  };

  const getRegistrationMethodColor = (method?: 'email' | 'google' | 'guest' | 'system') => {
    switch(method) {
      case 'email': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'google': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'guest': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'system': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const toggleFilter = (filter: 'showRealUsers' | 'showAIUsers') => {
    setFilterOptions(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  };

  const filteredUsers = registeredUsers
    .filter(user => {
      if (searchTerm) {
        return (
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return true;
    })
    .filter(user => {
      const isAI = user.user_type === 'ai' || user.isAI;
      if (!filterOptions.showRealUsers && !isAI) return false;
      if (!filterOptions.showAIUsers && isAI) return false;
      return true;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Registered Users ({registeredUsers.length})</h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-10 w-full sm:w-[250px]"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full aspect-square p-0 text-muted-foreground"
                onClick={clearSearch}
              >
                <XCircle className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant={filterOptions.showRealUsers ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFilter('showRealUsers')}
              className="text-xs flex items-center gap-1"
            >
              <Check className={`h-3 w-3 ${filterOptions.showRealUsers ? "opacity-100" : "opacity-0"}`} />
              Real Users
            </Button>
            <Button
              variant={filterOptions.showAIUsers ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFilter('showAIUsers')}
              className="text-xs flex items-center gap-1"
            >
              <Check className={`h-3 w-3 ${filterOptions.showAIUsers ? "opacity-100" : "opacity-0"}`} />
              AI Users
            </Button>
          </div>
        </div>
      </div>
      
      {selectedUsers.length > 0 && (
        <div className="flex justify-end mb-2">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleBatchDelete}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedUsers.length})
          </Button>
        </div>
      )}
      
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length} 
                  onCheckedChange={handleSelectAll} 
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Registration
                </div>
              </TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedUsers.includes(user.id)} 
                      onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)} 
                    />
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col">
                      <span>{format(user.createdAt, 'MMM dd, yyyy')}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistance(user.createdAt, new Date(), { addSuffix: true })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={`${getRegistrationMethodColor(user.registrationMethod)} font-normal`}
                    >
                      {getRegistrationMethodLabel(user.registrationMethod)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.user_type === 'ai' || user.isAI ? (
                      <span className="px-2 py-1 text-xs rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex items-center w-fit">
                        <X size={12} className="mr-1" /> AI Sample
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center w-fit">
                        <Check size={12} className="mr-1" /> Real User
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleSelectUser(user.id, !selectedUsers.includes(user.id))}
                    >
                      <UserMinus className="h-4 w-4" />
                      <span className="sr-only">Delete User</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Filter className="h-8 w-8 mb-2 opacity-50" />
                    <p>No users match the current filters</p>
                    <Button
                      variant="link"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterOptions({ showRealUsers: true, showAIUsers: true });
                      }}
                      className="mt-1.5"
                    >
                      Reset filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
