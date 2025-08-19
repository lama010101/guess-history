import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { usePWAInstall } from '@/pwa/usePWAInstall';
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

export const AccountSettings = () => {
  const { user, updateUserEmail, updateUserPassword, deleteUserAccount, isGuest } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const install = usePWAInstall();

  if (!user || isGuest) {
    return null;
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) {
      toast.error('Please enter a new email address.');
      return;
    }
    try {
      await updateUserEmail(newEmail);
      toast.success('A confirmation email has been sent to your new address.');
      setNewEmail('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Please enter a new password.');
      return;
    }
    try {
      await updateUserPassword(newPassword);
      toast.success('Your password has been updated successfully.');
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUserAccount();
      toast.success('Your account has been deleted.');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Email Address</CardTitle>
          <CardDescription>Current: {user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">New Email</Label>
              <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <Button type="submit">Update Email</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <Button type="submit">Update Password</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Install App</CardTitle>
          <CardDescription>
            Add Guess History to your device for faster access and full-screen play.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Status: {install.isStandalone || install.installedAt ? (
                <span className="text-green-600 dark:text-green-400">Installed</span>
              ) : install.canPrompt ? (
                'Install available'
              ) : install.platform === 'ios' ? (
                'Install via Add to Home Screen'
              ) : (
                'Unavailable in this browser'
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={async () => {
                  const result = await install.prompt();
                  if (result === 'accepted') {
                    toast.success('App installed.');
                  } else if (result === 'dismissed') {
                    toast.message('Install dismissed.');
                  } else if (result === 'unavailable' && install.platform === 'ios') {
                    setShowIOSHelp(true);
                  } else {
                    toast.message('Install not available in this browser.');
                  }
                }}
                disabled={install.isStandalone || Boolean(install.installedAt)}
              >
                Install Guess History
              </Button>
              {install.platform === 'ios' && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowIOSHelp((v) => !v)}
                >
                  {showIOSHelp ? 'Hide' : 'How to install on iPhone/iPad'}
                </Button>
              )}
            </div>
            {showIOSHelp && install.platform === 'ios' && !install.isStandalone && (
              <div className="mt-2 rounded-md border p-3 text-sm">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open this site in Safari.</li>
                  <li>Tap the Share button.</li>
                  <li>Select <strong>Add to Home Screen</strong>.</li>
                  <li>Confirm the name and tap <strong>Add</strong>.</li>
                </ol>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
          <CardDescription>Permanently delete your account and all associated data.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};
