
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out',
        isScrolled ? 'py-3 bg-white/80 backdrop-blur-lg shadow-sm' : 'py-5 bg-transparent'
      )}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-primary">EventGuesser</span>
          </a>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#how-to-play" className="text-sm font-medium underline-animation">
              How to Play
            </a>
            <a href="#game" className="text-sm font-medium underline-animation">
              Play Now
            </a>
            <a href="#leaderboard" className="text-sm font-medium underline-animation">
              Leaderboard
            </a>
            <button
              className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium btn-transition hover:shadow-md hover:brightness-110"
            >
              Sign In
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden flex items-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 animate-fade-in">
            <div className="flex flex-col space-y-4">
              <a
                href="#how-to-play"
                className="text-sm font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                How to Play
              </a>
              <a
                href="#game"
                className="text-sm font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Play Now
              </a>
              <a
                href="#leaderboard"
                className="text-sm font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Leaderboard
              </a>
              <button
                className="px-5 py-2 w-full rounded-full bg-primary text-primary-foreground text-sm font-medium"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
