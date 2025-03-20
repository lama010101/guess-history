
import { Link } from 'react-router-dom';
import ProfileButton from './auth/ProfileButton';
import HintDisplay from './HintDisplay';

const Navbar = () => {
  // Mock data - in a real app, this would come from your state management
  const availableHints = 10;

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-background/80 border-b border-border">
      <div className="container flex h-16 items-center px-4">
        {/* Logo on the left */}
        <div className="mr-4 flex">
          <Link to="/" className="font-bold text-lg tracking-tight">
            GUESSEVENTS
          </Link>
        </div>

        {/* Hint button in center */}
        <div className="flex-1 flex items-center justify-center">
          <HintDisplay availableHints={availableHints} />
        </div>
        
        {/* Profile button on the right */}
        <div className="flex items-center justify-end">
          <ProfileButton />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
