import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import TestLayout from "./layouts/TestLayout";
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
import AdminImagesPage from './pages/AdminImagesPage';
import AdminBadgesPage from './pages/AdminBadgesPage';

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
          navigate('/test');
        }
      }
    };
    
    handleAuthRedirect();
  }, [navigate]);
  
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
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AuthRedirectHandler />
                <Routes>
                  <Route path="/test" element={<TestLayout />}>
                    <Route index element={<TestHomePage />} />
                    <Route path="auth" element={<TestAuthPage />} />
                    <Route path="game" element={<TestGamePage />} />
                    <Route path="results" element={<TestResultsPage />} />
                    <Route path="final" element={<TestFinalPage />} />
                    <Route path="leaderboard" element={<TestLeaderboardPage />} />
                    <Route path="profile" element={<TestProfilePage />} />
                    <Route path="settings" element={<TestSettingsPage />} />
                    <Route path="room" element={<TestRoomPage />} />
                    <Route path="friends" element={<TestFriendsPage />} />
                  </Route>
                  <Route path="/test/admin/images" element={<AdminImagesPage />} />
                  <Route path="/test/admin/badges" element={<AdminBadgesPage />} />
                  <Route path="*" element={<Navigate to="/test" replace />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
};

export default App;
