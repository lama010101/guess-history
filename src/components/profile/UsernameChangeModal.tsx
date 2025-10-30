import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface UsernameChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  userId: string;
  onUsernameUpdated: (newUsername: string) => void;
}

export const UsernameChangeModal: React.FC<UsernameChangeModalProps> = ({
  isOpen,
  onClose,
  currentUsername,
  userId,
  onUsernameUpdated,
}) => {
  const [newUsername, setNewUsername] = useState(currentUsername);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      toast({
        title: "Invalid username",
        description: "Username cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (newUsername.trim() === currentUsername) {
      toast({
        title: "No changes",
        description: "Username is the same as current",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: newUsername.trim(),
          display_name: newUsername.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating username:', error);
        toast({
          title: "Update failed",
          description: "There was a problem updating your username. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Username updated",
        description: "Your username has been updated successfully.",
      });
      
      onUsernameUpdated(newUsername.trim());
      // Dispatch global event for username sync
      window.dispatchEvent(new CustomEvent('usernameUpdated', { detail: newUsername.trim() }));
      onClose();
    } catch (error) {
      console.error('Error in handleSaveUsername:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Username</DialogTitle>
          <DialogDescription>
            Enter a new username for your profile. This will be visible to other users.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Username
            </Label>
            <Input
              id="username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="col-span-3"
              placeholder="Enter new username"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="hintGradient"
            onClick={handleSaveUsername}
            disabled={isLoading}
            className="mb-3 sm:mb-0"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
