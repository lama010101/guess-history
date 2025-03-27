
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import { useEffect, useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'signup';
  autoFocus?: boolean;
}

const AuthModal = ({ 
  isOpen, 
  onClose, 
  initialTab = 'login',
  autoFocus = false 
}: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold mb-2">Welcome</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <LoginForm onSuccess={onClose} autoFocus={autoFocus} />
          </TabsContent>
          
          <TabsContent value="signup">
            <SignUpForm 
              onSuccess={() => {
                setActiveTab('login');
              }} 
              autoFocus={autoFocus}
              onLogin={() => setActiveTab('login')}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
