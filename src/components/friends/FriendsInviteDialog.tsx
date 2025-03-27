
// Since we can't modify the original FriendsInviteDialog, we'll need to create a new component
// that wraps it and prevents autofocus

import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus } from 'lucide-react';

interface FriendsInviteDialogProps {
  trigger: React.ReactNode;
  onInviteAndStart: () => void;
}

const FriendsInviteDialog = ({ trigger, onInviteAndStart }: FriendsInviteDialogProps) => {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Prevent autofocus on mobile devices
  useEffect(() => {
    // Check if on mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Only focus input on desktop devices
    if (open && inputRef.current && !isMobile) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite friends</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-2 my-4">
          <div className="grid flex-1 gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search friends by username..."
                className="pl-8"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
              {/* Sample friends list - in a real implementation, this would be filtered based on search */}
              <div className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/20"></div>
                  <span>JaneDoe</span>
                </div>
                <Button variant="ghost" size="sm">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-accent rounded-md">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/20"></div>
                  <span>JohnSmith</span>
                </div>
                <Button variant="ghost" size="sm">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => {
            onInviteAndStart();
            setOpen(false);
          }}>
            Invite & Start Game
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsInviteDialog;
