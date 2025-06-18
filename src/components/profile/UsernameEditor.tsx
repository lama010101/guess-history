import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, X } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface UsernameEditorProps {
  userId: string;
  currentUsername: string;
  onUsernameUpdated: (newUsername: string) => void;
}

const UsernameEditor: React.FC<UsernameEditorProps> = ({ 
  userId, 
  currentUsername,
  onUsernameUpdated
}) => {
  const [username, setUsername] = useState(currentUsername);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('UsernameEditor render, isEditing:', isEditing, 'username:', username, 'currentUsername prop:', currentUsername);

  useEffect(() => {
    setUsername(currentUsername);
  }, [currentUsername]);

  const handleSave = async () => {
    if (!username.trim()) {
      setError('Username cannot be empty');
      return;
    }

    if (username === currentUsername) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: username })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Username updated",
        description: "Your username has been updated successfully.",
      });

      onUsernameUpdated(username);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating username:', error);
      setError(error instanceof Error ? error.message : 'Failed to update username');
      toast({
        title: "Update failed",
        description: "There was a problem updating your username. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setUsername(currentUsername);
    setError(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center">
        <span className="text-lg font-medium">{username}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-2 text-history-primary hover:bg-history-primary/10"
          onClick={() => { console.log('Edit button clicked, setting isEditing to true'); setIsEditing(true); }}
        >
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className={error ? 'border-red-500' : ''}
          />
          {error && (
            <p className="mt-1 text-sm text-red-500">{error}</p>
          )}
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleSave}
          disabled={isSaving}
          className="text-green-600 hover:text-green-700"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleCancel}
          disabled={isSaving}
          className="text-red-600 hover:text-red-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Press Enter to save, or Escape to cancel
      </p>
    </div>
  );
};

export default UsernameEditor;
