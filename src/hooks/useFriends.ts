import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/services/auth';
import { useToast } from './use-toast';

export interface Friend {
  id: string;
  username: string;
  avatar: string;
  since?: Date;
}

export const useFriends = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const refreshFriends = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setFriends([]);
      setPendingRequests([]);
      setAvailableUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching friends for user:', user.id);
      
      // Get accepted friends using a direct query
      const { data: acceptedFriends, error: friendsError } = await supabase
        .from('friends')
        .select('friend_id, profiles:profiles!friends_friend_id_fkey(username, avatar_url)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (friendsError) {
        console.error('Error fetching friends:', friendsError);
        toast({
          title: "Error loading friends",
          description: "There was a problem loading your friends list.",
          variant: "destructive"
        });
      } else {
        console.log('Raw friends data:', acceptedFriends);
        
        const friendsList = acceptedFriends?.map(friend => ({
          id: friend.friend_id,
          username: friend.profiles?.username || 'User',
          avatar: friend.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.profiles?.username || Math.random()}`,
          since: undefined // We don't have this information in this query
        })) || [];
        
        console.log('Processed friends list:', friendsList);
        setFriends(friendsList);
      }

      // Get pending friend requests
      const { data: pendingFriends, error: pendingError } = await supabase
        .from('friends')
        .select('friend_id, profiles:profiles!friends_friend_id_fkey(username, avatar_url)')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (pendingError) {
        console.error('Error fetching pending requests:', pendingError);
      } else {
        const pendingList = pendingFriends?.map(req => ({
          id: req.friend_id,
          username: req.profiles?.username || 'User',
          avatar: req.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.profiles?.username || Math.random()}`
        })) || [];
        setPendingRequests(pendingList);
      }

      // Always fetch all available users regardless of whether we have friends or not
      await fetchAvailableUsers();
    } catch (error) {
      console.error('Error in refreshFriends:', error);
    }
    setLoading(false);
  }, [user, isAuthenticated, toast]);

  const fetchAvailableUsers = useCallback(async () => {
    if (!user) return [];
    
    try {
      console.log('Fetching all available users for potential friends...');
      
      // Get all profiles except current user
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .neq('id', user.id);
      
      if (error) {
        console.error('Error fetching available users:', error);
        return [];
      }
      
      const usersList = data?.map(profile => ({
        id: profile.id,
        username: profile.username || 'User',
        avatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username || Math.random()}`
      })) || [];
      
      console.log(`Found ${usersList.length} available users:`, usersList);
      setAvailableUsers(usersList);
      
      // If we have no friends yet, use available users as the displayed list
      if (friends.length === 0) {
        console.log('No friends found, using available users as fallback');
        setFriends(usersList);
      }
      
      return usersList;
    } catch (error) {
      console.error('Error in fetchAvailableUsers:', error);
      return [];
    }
  }, [user, friends.length]);

  const sendFriendRequest = async (friendId: string) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) {
        console.error('Error sending friend request:', error);
        
        // Check if it's a duplicate friendship
        if (error.code === '23505') { // Unique violation
          toast({
            title: "Friend request already sent",
            description: "You already have a pending request with this user.",
          });
        } else {
          toast({
            title: "Failed to send request",
            description: error.message,
            variant: "destructive"
          });
        }
        return false;
      }

      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully."
      });
      
      await refreshFriends();
      return true;
    } catch (error) {
      console.error('Error in sendFriendRequest:', error);
      return false;
    }
  };

  const acceptFriendRequest = async (friendId: string) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', friendId)
        .eq('friend_id', user.id);

      if (error) {
        console.error('Error accepting friend request:', error);
        toast({
          title: "Failed to accept request",
          description: error.message,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Friend request accepted",
        description: "You are now friends with this user."
      });
      
      await refreshFriends();
      return true;
    } catch (error) {
      console.error('Error in acceptFriendRequest:', error);
      return false;
    }
  };

  const rejectFriendRequest = async (friendId: string) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', user.id);

      if (error) {
        console.error('Error rejecting friend request:', error);
        toast({
          title: "Failed to reject request",
          description: error.message,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Friend request rejected",
        description: "The friend request has been rejected."
      });
      
      await refreshFriends();
      return true;
    } catch (error) {
      console.error('Error in rejectFriendRequest:', error);
      return false;
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return false;
    
    try {
      // We need to check both directions of friendship
      await supabase
        .from('friends')
        .delete()
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .or(`user_id.eq.${friendId},friend_id.eq.${friendId}`);
      
      toast({
        title: "Friend removed",
        description: "You have removed this friend from your list."
      });
      
      await refreshFriends();
      return true;
    } catch (error) {
      console.error('Error in removeFriend:', error);
      toast({
        title: "Failed to remove friend",
        description: "There was an error removing this friend.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Set up realtime subscription to friends table
  useEffect(() => {
    if (!user) return;
    
    console.log('Setting up friends subscription for user:', user.id);
    refreshFriends();
    
    // Subscribe to changes on the friends table that involve this user
    const channel = supabase
      .channel('friends_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friends',
        filter: `user_id=eq.${user.id}` 
      }, () => {
        console.log('Friend change detected for user_id');
        refreshFriends();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friends',
        filter: `friend_id=eq.${user.id}`
      }, () => {
        console.log('Friend change detected for friend_id');
        refreshFriends();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshFriends]);

  return {
    friends,
    pendingRequests,
    availableUsers,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    refreshFriends,
    fetchAvailableUsers
  };
};
