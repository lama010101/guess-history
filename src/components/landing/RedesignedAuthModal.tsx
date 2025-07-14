
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest } from "@/lib/auth/supabase";
import { Mail, UserX } from "lucide-react";

interface RedesignedAuthModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const RedesignedAuthModal = ({ open, onOpenChange }: RedesignedAuthModalProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string; general?: string}>({});
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: {email?: string; password?: string} = {};
    
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrors({ general: error.message });
      }
    } catch (error) {
      setErrors({ general: "Failed to sign in with Google" });
    }
    setIsLoading(false);
  };

  const handleEmailSignIn = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    try {
      const result = await signInWithEmail(email, password);

      if (result.error) {
        if (result.error.message.includes("Invalid login credentials")) {
          setErrors({ general: "Wrong email or password" });
        } else {
          setErrors({ general: result.error.message });
        }
      } else {
        toast({
          title: "Success",
          description: "Successfully signed in!",
        });
        onOpenChange?.(false);
        window.location.href = "https://home.guess-history.com/";
      }
    } catch (error) {
      setErrors({ general: "Failed to sign in" });
    }
    setIsLoading(false);
  };

  const handleEmailSignUp = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});
    try {
      const result = await signUpWithEmail(email, password);
      
      if (result.error) {
        setErrors({ general: result.error.message });
      } else {
        toast({
          title: "Success",
          description: "Account created! Please check your email to verify your account.",
        });
        onOpenChange?.(false);
      }
    } catch (error) {
      setErrors({ general: "Failed to sign up" });
    }
    setIsLoading(false);
  };

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      await signInAsGuest();
      toast({
        title: "Welcome, Guest!",
        description: "You're now playing as a guest. Your progress will be saved temporarily.",
      });
      onOpenChange?.(false);
      window.location.href = "https://home.guess-history.com/";
    } catch (error) {
      setErrors({ general: "Failed to sign in as guest. Please try again." });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-3xl font-black" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
            <span className="text-black">GUESS-</span>
            <span className="text-orange-500">HISTORY</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100">
            <TabsTrigger 
              value="signin" 
              className="data-[state=active]:bg-white data-[state=active]:text-orange-500 data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-orange-500"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="data-[state=active]:bg-white data-[state=active]:text-orange-500 data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-orange-500"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="space-y-4">
            {/* Enhanced Guest Button - Primary CTA */}
            <Button
              onClick={handleGuestSignIn}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg shadow-lg hover:shadow-orange-500/25 transition-all duration-200"
              disabled={isLoading}
            >
              <UserX className="w-5 h-5 mr-3" />
              Continue as Guest
            </Button>
            
            <Button
              onClick={handleGoogleSignIn}
              className="w-full py-4 text-left justify-center bg-black hover:bg-gray-800 text-white font-semibold"
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            <p className="text-center text-sm text-slate-600 -mt-2">
              Play instantly — no sign-up required
            </p>
            
            {/* General Error Display */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {errors.general}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="signin-email" className="font-semibold">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`py-3 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="signin-password" className="font-semibold">Password</Label>
              <Input
                id="signin-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`py-3 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password}</p>
              )}
            </div>
            
            <Button
              onClick={handleEmailSignIn}
              className="w-full bg-black hover:bg-gray-800 text-white py-3 font-semibold"
              disabled={isLoading}
            >
              <Mail className="w-5 h-5 mr-3" />
              Sign In
            </Button>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4">
            {/* Enhanced Guest Button - Primary CTA */}
            <Button
              onClick={handleGuestSignIn}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg shadow-lg hover:shadow-orange-500/25 transition-all duration-200"
              disabled={isLoading}
            >
              <UserX className="w-5 h-5 mr-3" />
              Continue as Guest
            </Button>
            
            <Button
              onClick={handleGoogleSignIn}
              className="w-full py-4 text-left justify-center bg-black hover:bg-gray-800 text-white font-semibold"
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            <p className="text-center text-sm text-slate-600 -mt-2">
              Play instantly — no sign-up required
            </p>
            
            {/* General Error Display */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {errors.general}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="signup-email" className="font-semibold">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`py-3 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="signup-password" className="font-semibold">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`py-3 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password}</p>
              )}
            </div>
            
            <Button
              onClick={handleEmailSignUp}
              className="w-full bg-black hover:bg-gray-800 text-white py-3 font-semibold"
              disabled={isLoading}
            >
              <Mail className="w-5 h-5 mr-3" />
              Sign Up
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default RedesignedAuthModal;
