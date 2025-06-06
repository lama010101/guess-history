import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/components/ui/use-toast';

const AuthPage = () => {
  const { user, isLoading: authLoading, signInWithEmail, signUpWithEmail, signInWithGoogle, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<"signIn" | "signUp">("signIn");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (activeTab === "signIn") {
        await signInWithEmail(email, password);
        navigate('/test'); // Keep /test for now
      } else {
        await signUpWithEmail(email, password);
        toast({
          title: "Account created",
          description: "Please check your email to confirm your account",
        });
        // Maybe navigate to /test or stay here?
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        variant: "destructive",
        title: activeTab === "signIn" ? "Sign In Failed" : "Sign Up Failed",
        description: error.message || "Authentication failed. Please try again.",
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
            <CardDescription className="text-center">Sign in or create an account to track your progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signIn" value={activeTab} onValueChange={(value) => setActiveTab(value as "signIn" | "signUp")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signIn">Sign In</TabsTrigger>
                <TabsTrigger value="signUp">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signIn">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {/* Email input */}
                  <div>
                    <label htmlFor="email" className="block mb-1">Email</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2 border rounded" />
                  </div>
                  {/* Password input */}
                  <div>
                    <label htmlFor="password" className="block mb-1">Password</label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-2 border rounded" />
                  </div>
                  <Button type="submit" className="w-full" disabled={authLoading || isSubmitting}>Sign In</Button>
                </form>
              </TabsContent>
              <TabsContent value="signUp">
                 <form onSubmit={handleEmailAuth} className="space-y-4">
                   {/* Email input */}
                   <div>
                    <label htmlFor="email-signup" className="block mb-1">Email</label>
                    <input id="email-signup" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2 border rounded" />
                   </div>
                   {/* Password input */}
                   <div>
                    <label htmlFor="password-signup" className="block mb-1">Password</label>
                    <input id="password-signup" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-2 border rounded" />
                   </div>
                   <Button type="submit" className="w-full" disabled={authLoading || isSubmitting}>Create Account</Button>
                 </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
             {/* Divider */}
             <div className="relative w-full">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
            </div>
            {/* Google Button */}
            <Button
              className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground"
              disabled={authLoading || isSubmitting}
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch (error: any) {
                  toast({
                    variant: "destructive",
                    title: "Google Sign In Failed",
                    description: error?.message || "Google authentication failed. Please try again.",
                  });
                }
              }}
            >
              Sign in with Google
            </Button>
            {/* Guest Button */}
            <Button className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground" onClick={async () => { /* ... Guest login logic ... */ }} disabled={authLoading || isSubmitting}>Continue as Guest</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage; 