
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ProfileButton from './auth/ProfileButton';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-background/80 border-b border-border">
      <div className="container flex h-16 items-center px-4">
        <div className="mr-4 flex">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">EventGuesser</span>
          </Link>
        </div>
        
        <div className="hidden md:flex flex-1 items-center justify-center">
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
          <ProfileButton />
          
          <button
            className="flex items-center space-x-2 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="text-sm font-medium">Menu</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      
      {isMenuOpen && (
        <div className="md:hidden border-t border-border">
          <nav className="flex flex-col space-y-3 p-4">
            <Link 
              to="/" 
              className="transition-colors hover:text-foreground/80"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <a 
              href="#game" 
              className="transition-colors hover:text-foreground/80"
              onClick={() => setIsMenuOpen(false)}
            >
              Play
            </a>
            <a 
              href="#how-to-play" 
              className="transition-colors hover:text-foreground/80"
              onClick={() => setIsMenuOpen(false)}
            >
              How to Play
            </a>
            <Link 
              to="/leaderboard" 
              className="transition-colors hover:text-foreground/80"
              onClick={() => setIsMenuOpen(false)}
            >
              Leaderboard
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
