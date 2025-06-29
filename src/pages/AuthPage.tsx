import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';

const AuthPage = () => {
  const { user, isLoading: authLoading, signInWithEmail, signInWithGoogle, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmail(email);
      toast({
        title: 'Check your email',
        description: 'A sign-in link has been sent to your email address.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: error.message || 'Failed to send sign-in link. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsSubmitting(true);
    try {
      await continueAsGuest();
      navigate('/home');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Guest Login Failed',
        description: error.message || 'Could not log in as a guest. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Welcome to Guess History</CardTitle>
            <CardDescription className="text-center">Sign in or create an account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label htmlFor="email" className="block mb-1">Email</label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={authLoading || isSubmitting}>Sign In with Email</Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
            </div>
            <Button
              className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground"
              disabled={authLoading || isSubmitting}
              onClick={signInWithGoogle}
            >
              Sign in with Google
            </Button>
            <Button 
              className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground"
              onClick={handleGuestLogin} 
              disabled={authLoading || isSubmitting}
            >
              Continue as Guest
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage; 