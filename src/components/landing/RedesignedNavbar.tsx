
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface RedesignedNavbarProps {
  onAuthModalOpen?: () => void;
}

const RedesignedNavbar = ({ onAuthModalOpen }: RedesignedNavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    if (onAuthModalOpen) {
      onAuthModalOpen();
    } else {
      window.location.href = "https://home.guess-history.com/";
    }
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className={`hidden lg:flex fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ${
        isScrolled ? 'bg-black/95 backdrop-blur-sm shadow-lg' : 'bg-transparent'
      }`}>
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/lovable-uploads/93fae02c-3982-4fa1-afd3-78d4cb9d39ae.png" alt="Target Globe" className="w-8 h-8" />
            <h1 className="text-2xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              <span className="text-white">GUESS-</span>
              <span className="text-orange-500">HISTORY</span>
            </h1>
          </div>
          <Button 
            size="lg" 
            className="bg-orange-500 hover:bg-orange-600 text-black px-8 py-3 font-semibold rounded-full hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200"
            onClick={handleGetStarted}
          >
            🚀 Jump In Now
          </Button>
        </div>
      </nav>

      {/* Mobile Logo - Non-sticky */}
      <div className="lg:hidden pt-4 pb-2 text-center bg-black/95">
        <div className="flex items-center justify-center gap-2">
          <img src="/lovable-uploads/93fae02c-3982-4fa1-afd3-78d4cb9d39ae.png" alt="Target Globe" className="w-6 h-6" />
          <h1 className="text-xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            <span className="text-white">GUESS-</span>
            <span className="text-orange-500">HISTORY</span>
          </h1>
        </div>
      </div>
    </>
  );
};

export default RedesignedNavbar;
