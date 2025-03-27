import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import GameSection from './components/GameSection';
import AdminPanel from './pages/AdminPanel';
import Friends from './pages/Friends';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<GameSection />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;
