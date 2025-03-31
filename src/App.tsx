
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import GameSection from './components/GameSection';
import AdminPanel from './pages/AdminPanel';
import Friends from './pages/Friends';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import { initializeAuth } from './services/initAuth';
import { initializeOneSignal } from './utils/oneSignalInit';

function App() {
  // Initialize auth with Supabase on app start
  useEffect(() => {
    const init = async () => {
      await initializeAuth();
      
      // Initialize OneSignal - Replace with your actual OneSignal App ID
      initializeOneSignal("YOUR_ONESIGNAL_APP_ID");
    };
    
    init();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<GameSection />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
