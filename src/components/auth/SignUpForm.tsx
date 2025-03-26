
import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface SignUpFormProps {
  onLogin: () => void;
  onSuccess: () => void;
}

const SignUpForm = ({ onLogin, onSuccess }: SignUpFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, login } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // Register the user
      await signUp(values.email, values.password, values.username);
      
      // After successful registration, automatically log the user in
      await login(values.email, values.password);
      
      toast({
        title: "Welcome!",
        description: "Your account has been created and you're now logged in.",
      });
      onSuccess();
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "This email may already be in use. Please try another.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4 py-2 pb-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="johndoe" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="john.doe@example.com" type="email" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input placeholder="******" type="password" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex flex-col space-y-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </div>
        </form>
      </Form>
      
      <div className="text-center text-sm">
        Already have an account?{" "}
        <button 
          type="button"
          onClick={onLogin} 
          className="text-primary hover:underline focus:outline-none"
          disabled={isLoading}
        >
          Log in
        </button>
      </div>
    </div>
  );
};

export default SignUpForm;
