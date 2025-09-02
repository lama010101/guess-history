import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GameProvider, useGame } from "@/contexts/GameContext"; // Added useGame
import { LogProvider, useConsoleLogging } from "@/contexts/LogContext";
import { LogWindowModal } from "@/components/LogWindowModal";
import { AuthRedirectWrapper } from "@/components/AuthRedirectWrapper";
import PreparationOverlay from "@/components/game/PreparationOverlay";
import InviteListener from "@/components/InviteListener";

import TestLayout from "./layouts/TestLayout";
import HomePage from "./pages/HomePage";
import GameRoundPage from "./pages/GameRoundPage";
import FinalResultsPage from "./pages/FinalResultsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import UserProfilePage from './pages/UserProfile';
import ProtectedRoute from './components/ProtectedRoute';
import RequireAuthSession from './components/RequireAuthSession';
import GameRoomPage from "./pages/GameRoomPage";
import FriendsPage from '@/pages/FriendsPage';
import LobbyPage from '@/pages/LobbyPage';
import AdminGameConfigPage from '@/pages/admin/AdminGameConfigPage';
import AuthPage from "./pages/AuthPage";


import LandingPage from "./pages/LandingPage";
import RoundResultsPage from "./pages/RoundResultsPage";
import Compete from "./pages/PlayWithFriends";
import Room from "./pages/Room";
import InstallPrompt from "@/components/pwa/InstallPrompt";

// Enhanced AuthRedirectHandler with better session handling
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check for hash fragment which indicates a redirect from OAuth
    const handleAuthRedirect = async () => {
      // Get current URL hash
      const hashParams = window.location.hash;
      
      if (hashParams && hashParams.includes('access_token')) {
        console.log("Detected OAuth redirect with access token");
        
        try {
          // First set the access token from URL into storage
          const accessToken = new URLSearchParams(hashParams.substring(1)).get('access_token');
          if (accessToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: '',
            });
          }
          
          // Then get the session which will now include the token we just set
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("Error getting session after OAuth redirect:", error);
            return;
          }
          
          if (data?.session) {
            console.log("Successfully retrieved session after OAuth redirect");
            // Scrub the hash so you don't leak tokens in your URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Navigate to home page after successful authentication
            navigate('/home', { replace: true });
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
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
        storageKey="gh-theme"
        enableColorScheme={false}
      >
        <QueryClientProvider client={queryClient}>
          <LogProvider>
            <AuthProvider>
              <TooltipProvider>
                <ConsoleLogger />
                <LogWindowModal />
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AuthRedirectHandler />
                  <AuthRedirectWrapper>
                    <GameProvider>
                    <GlobalXPLogger />
                    {/* Global fullscreen overlay for game preparation progress */}
                    <PreparationOverlay />
                    {/* Auto PWA install prompt (non-blocking) */}
                    <InstallPrompt auto />
                    {/* Headless listener: ensures realtime invite subscription is always active */}
                    <InviteListener />
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      {/* Require an active session (registered or anonymous) for all routes except landing */}
                      <Route element={<RequireAuthSession />}>
                        {/* Hub (Home) layout and index */}
                        <Route path="/home" element={<TestLayout />}>
                          <Route index element={<HomePage />} />
                        </Route>
                        <Route path="/compete" element={<Compete />} />
                        <Route path="/room/:roomCode" element={<Room />} />
                        <Route path="/leaderboard" element={<TestLayout />}>
                          <Route index element={<LeaderboardPage />} />
                        </Route>
                        <Route path="/profile" element={<TestLayout />}>
                          <Route index element={<ProfilePage />} />
                        </Route>
                        <Route path="/friends" element={<TestLayout />}>
                          <Route index element={<FriendsPage />} />
                        </Route>
                        <Route path="/solo" element={<TestLayout />}>
                          <Route path="auth" element={<AuthPage />} />
                          <Route path="settings" element={<SettingsPage />} />
                          <Route element={<ProtectedRoute />}>
                            <Route path="account" element={<UserProfilePage />} />
                          </Route>
                          <Route path="room" element={<GameRoomPage />} />
                          <Route path="game/room/:roomId/round/:roundNumber" element={<GameRoundPage />} />
                          <Route path="game/room/:roomId/round/:roundNumber/results" element={<RoundResultsPage />} />
                          <Route path="lobby/:roomId" element={<LobbyPage />} />
                        </Route>
                        {/* Final Results page with its own MainNavbar */}
                        <Route path="/solo/game/room/:roomId/final" element={<FinalResultsPage />} />

                        {/* Level Up game routes */}
                        {/* New pattern including the explicit level segment */}
                        <Route path="/level/:level/game/room/:roomId/round/:roundNumber" element={<GameRoundPage />} />
                        <Route path="/level/:level/game/room/:roomId/round/:roundNumber/results" element={<RoundResultsPage />} />
                        <Route path="/level/:level/game/room/:roomId/final" element={<FinalResultsPage />} />
                        {/* Legacy pattern (without level) kept for backward compatibility */}
                        <Route path="/level/game/room/:roomId/round/:roundNumber" element={<GameRoundPage />} />
                        <Route path="/level/game/room/:roomId/round/:roundNumber/results" element={<RoundResultsPage />} />
                        <Route path="/level/game/room/:roomId/final" element={<FinalResultsPage />} />

                        {/* Compete (multiplayer) routes - sync and async variants */}
                        <Route path="/compete/sync/game/room/:roomId/round/:roundNumber" element={<GameRoundPage />} />
                        <Route path="/compete/sync/game/room/:roomId/round/:roundNumber/results" element={<RoundResultsPage />} />
                        <Route path="/compete/sync/game/room/:roomId/final" element={<FinalResultsPage />} />
                        <Route path="/compete/async/game/room/:roomId/round/:roundNumber" element={<GameRoundPage />} />
                        <Route path="/compete/async/game/room/:roomId/round/:roundNumber/results" element={<RoundResultsPage />} />
                        <Route path="/compete/async/game/room/:roomId/final" element={<FinalResultsPage />} />
                        {/* Collaborate (co-op) routes */}
                        <Route path="/collaborate/game/room/:roomId/round/:roundNumber" element={<GameRoundPage />} />
                        <Route path="/collaborate/game/room/:roomId/round/:roundNumber/results" element={<RoundResultsPage />} />
                        <Route path="/collaborate/game/room/:roomId/final" element={<FinalResultsPage />} />
                        
                        {/* Admin routes */}
                        <Route path="/admin" element={<AdminGameConfigPage />} />
                      </Route>
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    </GameProvider>
                  </AuthRedirectWrapper>
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
