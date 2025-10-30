import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';

const AccountManagement = () => {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const currentEmail = user?.email ?? 'Guest account (no email on file)';

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) {
      setError(error.message);
      toast({ title: "Error updating email", description: error.message, variant: 'destructive' });
    } else {
      setNewEmail('');
      toast({ title: "Email update initiated", description: "Please check your new email address for a confirmation link." });
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setError(error.message);
      toast({ title: "Error updating password", description: error.message, variant: 'destructive' });
    } else {
      setNewPassword('');
      toast({ title: "Password updated successfully", description: "Your password has been changed." });
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    // This needs to be a server-side operation for security.
    // We'll call an edge function.
    const { error } = await supabase.functions.invoke('delete-user', {
      method: 'POST',
    });

    if (error) {
      setError(error.message);
      toast({ title: "Error deleting account", description: error.message, variant: 'destructive' });
    } else {
      toast({ title: "Account deleted", description: "Your account has been permanently deleted." });
      // The user will be signed out automatically by Supabase policies.
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 pt-6">
        <h3 className="text-lg font-semibold mb-6 text-history-primary dark:text-history-light">Account Management</h3>

      {/* Change Email */}
      <div className='glass-card rounded-xl p-6'>
        <h4 className="text-md font-semibold mb-2 text-history-primary dark:text-history-light">Change Email</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Current email: <span className="font-medium text-history-primary dark:text-white">{currentEmail}</span>
        </p>
        <form onSubmit={handleEmailChange} className="space-y-4">
          <div>
            <Label htmlFor="new-email">New Email Address</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="your.new@email.com"
              required
              className="max-w-sm"
            />
          </div>
          <Button type="submit" variant="hintGradient" disabled={loading || !newEmail}>
            {loading ? 'Updating...' : 'Update Email'}
          </Button>
        </form>
      </div>

      {/* Change Password */}
      <div className='glass-card rounded-xl p-6'>
        <h4 className="text-md font-semibold mb-4 text-history-primary dark:text-history-light">Change Password</h4>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter a new secure password"
              minLength={6}
              required
              className="max-w-sm"
            />
          </div>
          <Button type="submit" variant="hintGradient" disabled={loading || !newPassword}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>

      {/* Delete Account */}
      <div className='glass-card rounded-xl p-6'>
        <h4 className="text-md font-semibold mb-4 text-history-primary dark:text-history-light">Delete Account</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-prose">
          This action is irreversible. All your personal data, game history, and achievements will be permanently deleted. 
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={loading}>
              Delete My Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
              >
                Yes, delete my account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );
};

export default AccountManagement;
