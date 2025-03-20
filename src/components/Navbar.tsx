
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProfileButton from './auth/ProfileButton';
import HintDisplay from './HintDisplay';

const Navbar = () => {
  // Mock data - in a real app, this would come from your state management
  const availableHints = 10;

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-background/80 border-b border-border">
      <div className="container flex h-16 items-center px-4">
        <div className="flex-1 hidden md:flex items-center justify-center">
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link to="/" className="transition-colors hover:text-foreground/80">
              Home
            </Link>
            <a href="#game" className="transition-colors hover:text-foreground/80">
              Play
            </a>
            <a href="#how-to-play" className="transition-colors hover:text-foreground/80">
              How to Play
            </a>
            <Link to="/leaderboard" className="transition-colors hover:text-foreground/80">
              Leaderboard
            </Link>
          </nav>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          <HintDisplay availableHints={availableHints} />
          <ProfileButton />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
