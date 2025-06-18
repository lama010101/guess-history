import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GameProvider, useGame } from "@/contexts/GameContext"; // Added useGame
import { LogProvider, useConsoleLogging } from "@/contexts/LogContext";
import { LogWindowModal } from "@/components/LogWindowModal";
import { AuthGate } from "components/AuthGate";

import TestLayout from "./layouts/TestLayout";
import HomePage from "./pages/HomePage";
import GameRoundPage from "./pages/GameRoundPage";
import FinalResultsPage from "./pages/FinalResultsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import GameRoomPage from "./pages/GameRoomPage";
import FriendsPage from "./pages/FriendsPage";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import AdminImagesPage from "./pages/AdminImagesPage";
import AdminBadgesPage from "./pages/AdminBadgesPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import RoundResultsPage from "./pages/RoundResultsPage";

// Enhanced AuthRedirectHandler with better session handling
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check for hash fragment which indicates a redirect from OAuth
    const handleAuthRedirect = async () => {
      // Get current URL hash and query params
      const hashParams = window.location.hash;
      const queryParams = new URLSearchParams(window.location.search);
      
      // Check for Supabase auth callback in either hash or query params
      const isAuthCallback = 
        (hashParams && hashParams.includes('access_token')) || 
        queryParams.get('code') || 
        queryParams.get('error_description');
      
      if (isAuthCallback) {
        console.log("Detected OAuth redirect");
        
        try {
          // Let Supabase handle the redirect automatically
          // This will parse the URL and set up the session
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("Error getting session after OAuth redirect:", error);
            return;
          }
          
          // If no session, try to exchange the code for a session
          if (!data?.session && queryParams.get('code')) {
            console.log("Attempting to exchange code for session");
            const { data: exchangeData, error: exchangeError } = 
              await supabase.auth.exchangeCodeForSession(queryParams.get('code') || '');
              
            if (exchangeError) {
              console.error("Error exchanging code for session:", exchangeError);
              return;
            }
            
            if (exchangeData?.session) {
              console.log("Successfully exchanged code for session");
              // Scrub the URL params so you don't leak tokens
              window.history.replaceState({}, document.title, window.location.pathname);
              // Navigate to home page after successful authentication
              navigate('/test', { replace: true });
              return;
            }
          }
          
          if (data?.session) {
            console.log("Successfully retrieved session after OAuth redirect");
            // Scrub the URL params so you don't leak tokens
            window.history.replaceState({}, document.title, window.location.pathname);
            // Navigate to home page after successful authentication
            navigate('/test', { replace: true });
          } else {
            console.warn("No session found after OAuth redirect");
          }
        } catch (err) {
          console.error("Failed to process OAuth redirect:", err);
        }
      }
    };
    
    handleAuthRedirect();
  }, [navigate]);
  
  return null;
};

// Component to log global XP changes
const GlobalXPLogger = () => {
  const { globalXP } = useGame();

  useEffect(() => {
    console.log('[App.tsx] Global XP state changed:', { 
      globalXP,
      timestamp: new Date().toISOString()
    });
  }, [globalXP]);

  return null; // This component doesn't render anything
};

// Component to set up console logging
const ConsoleLogger = () => {
  useConsoleLogging();
  return null;
};

const App = () => {
  const queryClient = new QueryClient();

  return (
    <React.StrictMode>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
        storageKey="gh-theme"
        enableColorScheme={false}
      >
        <QueryClientProvider client={queryClient}>
          <LogProvider>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <ConsoleLogger />
                <LogWindowModal />
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AuthRedirectHandler />
                  <GameProvider>
                    <GlobalXPLogger />
                    <AuthGate>
                      <Routes>
                      <Route path="/test" element={<TestLayout />}>
                        <Route index element={<HomePage />} />
                        <Route path="auth" element={<AuthPage />} />
                        <Route path="leaderboard" element={<LeaderboardPage />} />
                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="room" element={<GameRoomPage />} />
                        <Route path="friends" element={<FriendsPage />} />
                        <Route path="admin" element={<AdminPage />}>
                          <Route index element={<Navigate to="images" replace />} />
                          <Route path="images" element={<AdminImagesPage />} />
                          <Route path="badges" element={<AdminBadgesPage />} />
                          <Route path="users" element={<AdminUsersPage />} />
                        </Route>
                        <Route path="game/room/:roomId/round/:roundNumber" element={<GameRoundPage />} />
                        <Route path="game/room/:roomId/round/:roundNumber/results" element={<RoundResultsPage />} />
                      </Route>
                      {/* Final Results page with its own MainNavbar */}
                      <Route path="/test/game/room/:roomId/final" element={<FinalResultsPage />} />
                      <Route path="*" element={<Navigate to="/test" replace />} />
                    </Routes>
                    </AuthGate>
                  </GameProvider>
                </BrowserRouter>
              </TooltipProvider>
            </AuthProvider>
          </LogProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
};

export default App;
