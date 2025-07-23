import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  onGuestContinue?: () => void;
  initialTab?: "signIn" | "signUp";
}

export function AuthModal({ 
  isOpen, 
  onClose, 
  onAuthSuccess,
  onGuestContinue,
  initialTab
}: AuthModalProps) {
  const { continueAsGuest, signInWithGoogle, signInWithEmail, signUpWithEmail, isGuest, upgradeUser, updateUserPassword } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"signIn" | "signUp">(initialTab || "signIn");

  const handleGuestLogin = async () => {
    try {
      console.log("Starting guest login from modal");
      setIsLoading(true);
      
      // If there's a custom guest continue handler, use it
      if (onGuestContinue) {
        await continueAsGuest();
        await onGuestContinue();
        onClose();
        return;
      }
      
      // Fallback to default behavior if no onGuestContinue provided
      await continueAsGuest();
      console.log("Guest login successful");
      
      // Close the modal first
      onClose();
      
      // Then navigate to home after a small delay to ensure the modal is closed
      setTimeout(() => {
        window.location.replace('/test');
      }, 100);
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
        if (isGuest) {
          // Upgrade the existing guest user to a real account so metrics stay attached
          await upgradeUser(email);
          // Set password separately (Supabase requires separate call)
          await updateUserPassword(password);
          toast({
            title: "Account upgraded",
            description: "Your guest progress has been saved to your new account. Please verify your email.",
          });
        } else {
          await signUpWithEmail(email, password);
          toast({
            title: "Account created",
            description: "Please check your email to confirm your account",
          });
        }
      }
      
      // Call the auth success callback if provided
      if (onAuthSuccess) {
        onAuthSuccess();
      } else {
        // Default behavior if no callback provided
        onClose();
      }
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

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign in error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign in with Google. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Guess History</DialogTitle>
          <DialogDescription>
            Sign in to track your progress and compete with others
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <Button 
            variant="outline" 
            onClick={handleGuestLogin}
            disabled={isLoading}
          >
            Continue as Guest
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.28426 53.749 C -8.52426 55.229 -9.20451 56.514 -10.2843 57.424 L -10.2843 60.924 L -6.14576 60.924 C -3.15476 58.229 -3.264 54.569 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.80451 62.159 -6.14576 60.924 L -10.2843 57.424 C -11.4643 58.234 -12.9843 58.759 -14.754 58.759 C -17.694 58.759 -20.1343 56.869 -20.9643 54.179 L -25.0943 54.179 L -25.0943 57.789 C -22.9443 62.169 -19.194 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -20.9643 54.179 C -21.1843 53.469 -21.3043 52.709 -21.3043 51.929 C -21.3043 51.149 -21.1843 50.389 -20.9643 49.679 L -20.9643 46.069 L -25.0943 46.069 C -25.9043 47.889 -26.3343 49.899 -26.3343 51.929 C -26.3343 53.959 -25.9043 55.969 -25.0943 57.789 L -20.9643 54.179 Z"/>
                <path fill="#EA4335" d="M -14.754 45.098 C -12.9843 45.098 -11.4643 45.623 -10.2843 46.433 L -6.14576 42.924 C -8.80451 41.689 -11.514 40.619 -14.754 40.619 C -19.194 40.619 -22.9443 42.179 -25.0943 46.069 L -20.9643 49.679 C -20.1343 46.999 -17.694 45.098 -14.754 45.098 Z"/>
              </g>
            </svg>
            Continue with Google
          </Button>

          <Tabs 
            defaultValue="signIn" 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as "signIn" | "signUp")}
            className="mt-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signIn">Sign In</TabsTrigger>
              <TabsTrigger value="signUp">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signIn" className="mt-4">
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
            
            <TabsContent value="signUp" className="mt-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
