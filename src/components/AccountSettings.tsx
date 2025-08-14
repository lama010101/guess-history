import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
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
