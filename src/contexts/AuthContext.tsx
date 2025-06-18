
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { assignRandomAvatarAndUsername, needsAvatarOrUsername } from '@/services/avatarService';

// Define types for our users
export type AuthUser = User & {
  type?: 'auth';
  isGuest?: false;
};

export type GuestUser = {
  id: string;
  type: 'guest';
  isGuest: true;
  display_name: string;
  avatar_url?: string;
};

// Define the shape of our Auth Context
export interface AuthState {
  user: AuthUser | GuestUser | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  isGoogleUser: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<GuestUser>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | GuestUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isGoogleUser, setIsGoogleUser] = useState<boolean>(false);

  // Check for existing session on mount
  useEffect(() => {
    console.log("AuthProvider: Initializing auth state");
    
    // First set up auth state listener to ensure we don't miss any auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession ? "Session exists" : "No session");
        
        if (currentSession) {
          // Process auth user data
          const authUser = currentSession.user as AuthUser;
          authUser.type = 'auth';
          authUser.isGuest = false;
          setUser(authUser);
          setSession(currentSession);
          setIsGuest(false);
          
          // Check if user is authenticated via Google
          const isGoogle = currentSession.user.app_metadata?.provider === 'google';
          setIsGoogleUser(isGoogle);
          console.log("User authenticated via Google:", isGoogle);
        } else {
          // Check for guest session when auth session is null
          const guestSession = localStorage.getItem('guestSession');
          if (guestSession) {
            try {
              const guestUser = JSON.parse(guestSession) as GuestUser;
              console.log("Using guest session:", guestUser.id);
              setUser(guestUser);
              setSession(null);
              setIsGuest(true);
              setIsGoogleUser(false);
            } catch (error) {
              console.error("Failed to parse guest session", error);
              localStorage.removeItem('guestSession');
              setUser(null);
              setSession(null);
              setIsGuest(false);
              setIsGoogleUser(false);
            }
          } else {
            setUser(null);
            setSession(null);
            setIsGuest(false);
            setIsGoogleUser(false);
          }
        }
      }
    );

    // Then check for existing session
    const checkSession = async () => {
      setIsLoading(true);

      try {
        // First check for guest session in localStorage
        const guestSession = localStorage.getItem('guestSession');
        if (guestSession) {
          try {
            const guestUser = JSON.parse(guestSession) as GuestUser;
            console.log("Found guest session:", guestUser);
            
            // Check if the guest user has an avatar and username
            // If not, assign them (this handles existing guest sessions without avatars)
            if (!guestUser.avatar_url || !guestUser.display_name) {
              console.log("Guest user missing avatar or username, assigning...");
              const { avatar, username } = await assignRandomAvatarAndUsername();
              
              if (avatar && username) {
                guestUser.avatar_url = avatar.url;
                guestUser.display_name = username;
                // Update localStorage with the updated guest user
                localStorage.setItem('guestSession', JSON.stringify(guestUser));
              }
            }
            
            setUser(guestUser);
            setSession(null);
            setIsGuest(true);
            setIsGoogleUser(false);
          } catch (error) {
            console.error("Failed to parse guest session", error);
            localStorage.removeItem('guestSession');
          }
        }

        // Then check for Supabase auth session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("Found authenticated session:", session);
          const authUser = session.user as AuthUser;
          authUser.type = 'auth';
          authUser.isGuest = false;
          
          // Check if the authenticated user needs an avatar or username
          const needsAssignment = await needsAvatarOrUsername(authUser.id);
          
          // If they need an avatar or username, assign one
          if (needsAssignment) {
            console.log("User missing avatar or username, assigning...");
            const { avatar, username } = await assignRandomAvatarAndUsername();
            
            if (avatar && username) {
              // Update the user's profile in Supabase
              await supabase.from('profiles').upsert({
                id: authUser.id,
                avatar_url: avatar.url,
                avatar_name: avatar.name,
                avatar_image_url: avatar.url,
                display_name: username,
                updated_at: new Date().toISOString()
              });
              
              console.log("Assigned avatar and username to user:", username, avatar.url);
            }
          }
          
          setUser(authUser);
          setSession(session);
          setIsGuest(false);
          
          // Check if user is authenticated via Google
          const isGoogle = session.user.app_metadata?.provider === 'google';
          setIsGoogleUser(isGoogle);
          console.log("User authenticated via Google:", isGoogle);
        }
      } catch (error) {
        console.error("Failed to get auth session", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user as AuthUser);
      setIsGuest(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // User will need to confirm email before being logged in
    } finally {
      setIsLoading(false);
    }
  };

  const continueAsGuest = async (): Promise<GuestUser> => {
    console.log("========== [1] Starting continueAsGuest function ==========");
    try {
      setIsLoading(true);
      console.log("[2] Loading state set to true");
      
      // Create a guest ID with the guest_ prefix
      const guestId = `guest_${uuidv4()}`;
      console.log(`[3] Generated guest ID: ${guestId}`);
      
      // Get a random avatar and username from our new utility function
      const { avatar, username } = await assignRandomAvatarAndUsername();
      
      if (!avatar || !username) {
        throw new Error("Failed to assign avatar and username");
      }
      
      console.log(`[4] Assigned avatar: ${avatar.name} and username: ${username}`);
      
      // Create guest user object
      const guestUser: GuestUser = {
        id: guestId,
        type: 'guest',
        isGuest: true,
        display_name: username,
        avatar_url: avatar.url
      };
      console.log(`[5] Created guest user object:`, JSON.stringify(guestUser));

      console.log("[7] Saving guest to localStorage first");
      localStorage.setItem('guestSession', JSON.stringify(guestUser));
      
      console.log("[8] Updating React state");
      setUser(guestUser);
      setSession(null);
      setIsGuest(true);
      setIsGoogleUser(false);
      
      console.log("[9] Creating anonymous session in Supabase");
      const { data, error } = await supabase.auth.signUp({
        email: `${guestId}@anonymous.user`,
        password: uuidv4(),
      });
      
      if (error) {
        console.error("[10] Error creating anonymous session:", error);
      } else {
        console.log("[10] Anonymous session created successfully");
        
        // Create profile for the anonymous user
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            console.log("[11] Creating profile for anonymous user:", user.id);
            // Create profile with the same display name and avatar
            const { error: profileError } = await supabase
              .from('profiles')
              .insert([
                { 
                  id: user.id,
                  display_name: username,
                  avatar_url: avatar.url,
                  avatar_name: avatar.name,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  avatar_image_url: avatar.url,
                  earned_badges: []
                },
              ]);
            
            if (profileError) {
              console.error("[12] Error creating profile:", profileError);
            } else {
              console.log("[12] Profile created successfully");
            }
          }
        } catch (profileError) {
          console.error("[11] Error in profile creation:", profileError);
        }
      }
      // Continue since we already updated localStorage and state
    } catch (error) {
      console.error("[CRITICAL ERROR] Error in continueAsGuest:", error);
      
      // Fallback: Create a new guest user and save only to localStorage
      console.log("[FALLBACK] Creating emergency guest user");
      const fallbackGuestId = `guest_${uuidv4()}`;
      const fallbackName = `Guest${Math.floor(Math.random() * 10000)}`;
      
      // Try to get a simple avatar from our bucket, or use dicebear as last resort
      let fallbackAvatarUrl = `https://api.dicebear.com/6.x/adventurer/svg?seed=${fallbackName}`;
      
      try {
        const { data: files } = await supabase.storage
          .from('avatars')
          .list();
        
        if (files && files.length > 0) {
          // Get the first .png or .jpg file we can find
          const avatarFile = files.find(f => f.name.endsWith('.png') || f.name.endsWith('.jpg'));
          if (avatarFile) {
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(avatarFile.name);
            fallbackAvatarUrl = publicUrl;
          }
        }
      } catch (e) {
        console.error("Error getting fallback avatar", e);
      }
      
      const fallbackGuestUser: GuestUser = {
        id: fallbackGuestId,
        type: 'guest',
        isGuest: true,
        display_name: fallbackName,
        avatar_url: fallbackAvatarUrl
      };
      
      localStorage.setItem('guestSession', JSON.stringify(fallbackGuestUser));
      console.log("[FALLBACK] Saved emergency guest to localStorage");
      
      setUser(fallbackGuestUser);
      setIsGuest(true);
      console.log("[FALLBACK] Updated state with emergency guest");
      
      return fallbackGuestUser;
    } finally {
      setIsLoading(false);
      console.log("========== [10] End of continueAsGuest function ==========");
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log("Initiating Google sign in");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      console.log("Google auth initiated successfully, redirecting...");
      
      // No need to update state here as we're redirecting to OAuth provider
      // State will update on return via Supabase's auth state listener
    } catch (error) {
      console.error("Google sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isGuest) {
        // Clear guest session from localStorage
        localStorage.removeItem('guestSession');
      } else {
        // Sign out from Supabase auth
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      setUser(null);
      setIsGuest(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isGuest,
      isGoogleUser,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      continueAsGuest
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
