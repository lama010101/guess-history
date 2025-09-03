import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { TooltipProvider } from "./src/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { GameProvider } from "./src/contexts/GameContext";
import { supabase } from "./src/integrations/supabase/client";
import { Toaster } from "./src/components/ui/toaster";
import DevToastProbe from "./src/components/DevToastProbe";
import RequireAuthSession from "./src/components/RequireAuthSession";
import AdminGameConfigPage from "./src/pages/admin/AdminGameConfigPage";

import TestLayout from "./src/layouts/TestLayout";
import TestHomePage from "./pages/test/TestHomePage";
import TestGamePage from "./pages/test/TestGamePage";
import TestResultsPage from "./pages/test/TestResultsPage";
import TestLeaderboardPage from "./pages/test/TestLeaderboardPage";
import TestProfilePage from "./pages/test/TestProfilePage";
import TestSettingsPage from "./pages/test/TestSettingsPage";
import TestFinalPage from "./pages/test/final";
import TestRoomPage from "./pages/test/TestRoomPage";
import TestFriendsPage from "./pages/test/TestFriendsPage";
import TestAuthPage from "./pages/test/TestAuthPage";
import LandingPage from './src/pages/LandingPage';
import HomePage from './src/pages/HomePage';
import RoundResultsPage from './src/pages/RoundResultsPage';
import GameRoundPage from './src/pages/GameRoundPage';
import InviteListener from "./src/components/InviteListener";
import Room from "./src/pages/Room";
import SoloGameRoundPage from './src/pages/solo/SoloGameRoundPage';
import SoloRoundResultsPage from './src/pages/solo/SoloRoundResultsPage';
import CompeteGameRoundPage from './src/pages/compete/CompeteGameRoundPage';
import CompeteRoundResultsPage from './src/pages/compete/CompeteRoundResultsPage';
import FinalResultsPage from './src/pages/FinalResultsPage';
import FriendsPage from "./src/pages/FriendsPage";
import LeaderboardPage from "./src/pages/LeaderboardPage";
import ProfilePage from "./src/pages/ProfilePage";
import SettingsPage from "./src/pages/SettingsPage";
import PlayWithFriends from "./src/pages/PlayWithFriends";
import TimerMainPage from "./src/timer/pages/MainPage";
import TimerRunPage from "./src/timer/pages/RunPage";
import TimerNextPage from "./src/timer/pages/NextPage";
import TimerDonePage from "./src/timer/pages/DonePage";

// Handler for auth redirects
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check for hash fragment which indicates a redirect from OAuth
    const handleAuthRedirect = async () => {
      if (window.location.hash && window.location.hash.includes('access_token')) {
        // We have a hash from OAuth redirect - navigate to home after processing
        const { data, error } = await supabase.auth.getSession();
        if (data?.session && !error) {
          navigate('/home');
        }
      }
    };
    
    handleAuthRedirect();
  }, [navigate]);
  
  return null;
};

// Apply mode-specific class on <body> for scoped theming (solo vs compete)
const ModeClassWatcher = () => {
  const location = useLocation();
  useEffect(() => {
    try {
      const path = location.pathname || "";
      const isCompete = path.includes("/compete/");
      const isSolo = path.includes("/solo/");
      const isCollaborate = path.includes("/collaborate/") || path.includes("/collab/");
      const isLevelUp = path.includes("/level/");
      const body = document.body;
      body.classList.toggle("mode-compete", !!isCompete);
      body.classList.toggle("mode-solo", !!isSolo);
      body.classList.toggle("mode-collaborate", !!isCollaborate);
      body.classList.toggle("mode-levelup", !!isLevelUp);
      if (!isCompete && !isSolo && !isCollaborate && !isLevelUp) {
        body.classList.remove("mode-compete", "mode-solo", "mode-collaborate", "mode-levelup");
      }
    } catch {}
  }, [location]);
  return null;
};

const App = () => {
  const queryClient = new QueryClient();

  return (
    <React.StrictMode>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <BrowserRouter>
                <AuthRedirectHandler />
                <ModeClassWatcher />
                <GameProvider>
                  <InviteListener />
                  {(import.meta as any)?.env?.DEV && <DevToastProbe />}
                  <Routes>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/" element={<LandingPage />} />
                  {/* Admin */}
                  <Route path="/admin" element={<RequireAuthSession />}>
                    <Route index element={<AdminGameConfigPage />} />
                  </Route>
                  {/* Timer (public) */}
                  <Route path="/timer" element={<TimerMainPage />} />
                  <Route path="/timer/run" element={<TimerRunPage />} />
                  <Route path="/timer/next" element={<TimerNextPage />} />
                  <Route path="/timer/done" element={<TimerDonePage />} />
                  {/* Top-level game routes (no '/test' prefix) */}
                  <Route path="/solo/game/room/:roomId/round/:roundNumber" element={<SoloGameRoundPage />} />
                  <Route path="/solo/game/room/:roomId/round/:roundNumber/results" element={<SoloRoundResultsPage />} />
                  <Route path="/solo/game/room/:roomId/final" element={<FinalResultsPage />} />
                  {/* Level Up routes (reuse Solo pages for now, distinct '/level' prefix) */}
                  <Route path="/level/game/room/:roomId/round/:roundNumber" element={<SoloGameRoundPage />} />
                  <Route path="/level/game/room/:roomId/round/:roundNumber/results" element={<SoloRoundResultsPage />} />
                  {/* Compete and Collaborate routes */}
                  {/* Compete (Sync) */}
                  <Route path="/compete/sync/game/room/:roomId/round/:roundNumber" element={<CompeteGameRoundPage />} />
                  <Route path="/compete/sync/game/room/:roomId/round/:roundNumber/results" element={<CompeteRoundResultsPage />} />
                  {/* Compete (Async) */}
                  <Route path="/compete/async/game/room/:roomId/round/:roundNumber" element={<CompeteGameRoundPage />} />
                  <Route path="/compete/async/game/room/:roomId/round/:roundNumber/results" element={<CompeteRoundResultsPage />} />
                  {/* Legacy/alias Compete path */}
                  <Route path="/compete/game/room/:roomId/round/:roundNumber" element={<CompeteGameRoundPage />} />
                  <Route path="/compete/game/room/:roomId/round/:roundNumber/results" element={<CompeteRoundResultsPage />} />
                  <Route path="/collaborate/game/room/:roomId/round/:roundNumber" element={<CompeteGameRoundPage />} />
                  <Route path="/collaborate/game/room/:roomId/round/:roundNumber/results" element={<CompeteRoundResultsPage />} />

                  {/* Main application pages */}
                  <Route path="/friends" element={<FriendsPage />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/play" element={<PlayWithFriends />} />

                  {/* Legacy test routes (keep for dev pages) */}
                  <Route path="/test" element={<TestLayout />}>
                    <Route index element={<TestHomePage />} />
                    <Route path="auth" element={<TestAuthPage />} />
                    <Route path="game" element={<TestGamePage />} />
                    <Route path="game/room/:roomId/round/:roundNumber" element={<GameRoundPage />} />
                    <Route path="results" element={<TestResultsPage />} />
                    <Route path="game/room/:roomId/round/:roundNumber/results" element={<RoundResultsPage />} />
                    <Route path="final" element={<TestFinalPage />} />
                    <Route path="game/room/:roomId/final" element={<TestFinalPage />} />
                    <Route path="leaderboard" element={<TestLeaderboardPage />} />
                    <Route path="profile" element={<TestProfilePage />} />
                    <Route path="settings" element={<TestSettingsPage />} />
                    <Route path="room" element={<TestRoomPage />} />
                    <Route path="friends" element={<TestFriendsPage />} />
                  </Route>
                  <Route path="/room/:roomCode" element={<Room />} />
                  <Route path="*" element={<Navigate to="/home" replace />} />
                  </Routes>
                  <Toaster />
                </GameProvider>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
};

export default App;
