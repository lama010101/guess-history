
import { useState } from "react";
import { Eye, EyeOff, LogIn, Mail } from "lucide-react";
import { useAuth } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginForm = ({ isOpen, onClose }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showUsernameField, setShowUsernameField] = useState(false);
  const { login, signUp, continueAsGuest, googleLogin, isLoading, error } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (showUsernameField) {
        // This is a new user, handle signup
        await signUp(email, password, username);
        toast({
          title: "Account created!",
          description: "You've successfully signed up for EventGuesser.",
        });
      } else {
        try {
          // Try login first
          await login(email, password);
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
        } catch (loginError) {
          // If login fails, show username field for signup
          setShowUsernameField(true);
          toast({
            title: "Please create an account",
            description: "Enter a username to sign up",
          });
          return; // Don't close modal, wait for user to complete signup
        }
      }
      onClose();
    } catch (error) {
      toast({
        title: showUsernameField ? "Sign up failed" : "Login failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
      toast({
        title: "Welcome!",
        description: "You have successfully logged in with Google.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Google login failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleGuestLogin = () => {
    continueAsGuest();
    toast({
      title: "Playing as guest",
      description: "Your scores won't be saved to the leaderboard.",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {showUsernameField ? "Create your account" : "Login to EventGuesser"}
          </DialogTitle>
          <DialogDescription>
            {showUsernameField 
              ? "Please choose a username to complete signup" 
              : "Login or create a new account"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          {showUsernameField && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="#" className="text-xs text-primary hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[50%] transform -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <div className="pt-2 space-y-3">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (showUsernameField ? "Creating account..." : "Logging in...") : "Login"}
              <LogIn className="ml-2 h-4 w-4" />
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">
                  or
                </span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGuestLogin}
            >
              <Mail className="h-5 w-5 mr-2" />
              Continue as Guest
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoginForm;
