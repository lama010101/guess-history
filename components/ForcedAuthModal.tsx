import React from 'react';
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "components/ui/dialog";
import { Button } from "components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs";
import { Input } from "components/ui/input";
import { Label } from "components/ui/label";

interface ForcedAuthModalProps {
  isOpen: boolean;
  onAuthenticated: () => void;
}

export function ForcedAuthModal({ isOpen, onAuthenticated }: ForcedAuthModalProps) {
  const { continueAsGuest, signInWithGoogle, signInWithEmail, signUpWithEmail, user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"signIn" | "signUp">("signIn");

  // If user is already authenticated, close the modal
  React.useEffect(() => {
    if (user) {
      onAuthenticated();
    }
  }, [user, onAuthenticated]);

  const handleGuestLogin = async () => {
    try {
      console.log("Starting guest login from forced modal");
      setIsLoading(true);
      await continueAsGuest();
      console.log("Guest login successful");
      onAuthenticated();
    } catch (error) {
      console.error("Guest login error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to continue as guest. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please enter both email and password",
      });
      return;
    }

    try {
      setIsLoading(true);
      if (activeTab === "signIn") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
        toast({
          title: "Account created",
          description: "Please check your email to confirm your account",
        });
      }
      onAuthenticated();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: activeTab === "signIn" ? "Sign In Failed" : "Sign Up Failed",
        description: error.message || "Authentication failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing the dialog by clicking outside or pressing escape
      if (!open && !user) {
        return;
      }
      if (!open && user) {
        onAuthenticated();
      }
    }}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Welcome to Guess History</DialogTitle>
          <DialogDescription>
            Sign in to track your progress and compete with others
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="signIn" value={activeTab} onValueChange={(value) => setActiveTab(value as "signIn" | "signUp")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="signIn">Sign In</TabsTrigger>
            <TabsTrigger value="signUp">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signIn">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                Sign In
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signUp">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-signup">Email</Label>
                <Input
                  id="email-signup"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <Input
                  id="password-signup"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        <div className="relative mt-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-4 mt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGuestLogin}
            disabled={isLoading}
          >
            Continue as Guest
          </Button>
          {/* Google sign-in */}
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              setIsLoading(true);
              try {
                await signInWithGoogle();
              } catch (error: any) {
                toast({
                  variant: "destructive",
                  title: "Google Sign-In Failed",
                  description: error.message || "Could not sign in with Google."
                });
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
          >
            Continue with Google
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
