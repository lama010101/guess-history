
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
            <img src="/images/hero/placeholder.png" alt="Target Globe" className="w-4 h-4" />
            <h1 className="text-2xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              <span className="text-white">GUESS-</span>
              <span className="text-transparent bg-clip-text bg-[linear-gradient(45deg,_#c4b5fd_0%,_#f9a8d4_20%,_#fdba74_45%,_#fde68a_70%,_#86efac_100%)]">HISTORY</span>
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
          <img src="/images/hero/placeholder.png" alt="Target Globe" className="w-3 h-3" />
          <h1 className="text-xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            <span className="text-white">GUESS-</span>
            <span className="text-transparent bg-clip-text bg-[linear-gradient(45deg,_#c4b5fd_0%,_#f9a8d4_20%,_#fdba74_45%,_#fde68a_70%,_#86efac_100%)]">HISTORY</span>
          </h1>
        </div>
      </div>
    </>
  );
};

export default RedesignedNavbar;
