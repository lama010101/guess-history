
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/services/auth';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  sender_id: string;
  receiver_id: string;
  type: string;
  message: string;
  created_at: string;
  read: boolean;
  game_id?: string;
  sender?: {
    username: string;
    avatar_url?: string;
  };
}

interface SenderProfile {
  id: string;
  username: string;
  avatar_url?: string;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          // Refetch notifications when a new one is inserted
          fetchNotifications();
          
          // Show a toast notification
          toast({
            title: "New notification",
            description: payload.new.message || "You have a new notification"
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      // Use type assertion to bypass TypeScript type checking
      const { data: notificationsData, error: notificationsError } = await (supabase
        .from('notifications') as any)
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });
        
      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        return;
      }
      
      // For each notification, fetch sender profile info
      const notificationsWithSenders: Notification[] = [];
      
      for (const notification of notificationsData || []) {
        let senderProfile: SenderProfile | undefined;
        
        if (notification.sender_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', notification.sender_id)
            .single() as any;
            
          senderProfile = profileData as SenderProfile;
        }
        
        notificationsWithSenders.push({
          ...notification,
          sender: senderProfile ? {
            username: senderProfile.username || 'Unknown',
            avatar_url: senderProfile.avatar_url
          } : {
            username: 'System'
          }
        });
      }
      
      setNotifications(notificationsWithSenders);
      setUnreadCount(notificationsWithSenders.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Use type assertion to bypass TypeScript type checking
      const { error } = await (supabase
        .from('notifications') as any)
        .update({ read: true })
        .eq('id', notificationId)
        .eq('receiver_id', user?.id);
        
      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationAction = async (notification: Notification) => {
    // Mark notification as read
    await markAsRead(notification.id);
    
    // Handle different notification types
    if (notification.type === 'invite' && notification.game_id) {
      navigate(`/play?game=${notification.game_id}`);
      setOpen(false);
    } else if (notification.type === 'friend_request') {
      navigate('/friends');
      setOpen(false);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      // Use type assertion to bypass TypeScript type checking
      const { error } = await (supabase
        .from('notifications') as any)
        .update({ read: true })
        .eq('receiver_id', user.id)
        .eq('read', false);
        
      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
      
      toast({
        title: "Notifications cleared",
        description: "All notifications have been marked as read"
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-1" />
                Mark all as read
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification.id} className={`p-3 rounded-lg ${notification.read ? 'bg-background' : 'bg-muted'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium">
                      {notification.sender?.username || 'System'}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      {!notification.read && (
                        <Badge variant="secondary" className="h-2 w-2 rounded-full p-0 bg-primary" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm mb-2">{notification.message}</p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">{notification.type}</Badge>
                    {(notification.type === 'invite' || notification.type === 'friend_request') && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleNotificationAction(notification)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {notification.type === 'invite' ? 'Join Game' : 'View'}
                      </Button>
                    )}
                    {!notification.read && (
                      <Button 
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Notifications;
