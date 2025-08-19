
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface StickyCTAButtonProps {
  onClick: () => void;
}

const StickyCTAButton = ({ onClick }: StickyCTAButtonProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button after scrolling down 100px
      if (window.pageYOffset > 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* Desktop Floating Button */}
      <div className="hidden lg:block fixed bottom-8 right-8 z-50">
        <Button
          onClick={onClick}
          className="bg-orange-500 hover:bg-orange-600 text-white w-16 h-16 rounded-full shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 hover:scale-110"
          size="lg"
        >
          <span className="text-2xl">🎯</span>
        </Button>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black to-transparent">
        <Button
          onClick={onClick}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 text-lg font-bold rounded-full shadow-2xl hover:shadow-orange-500/25 transition-all duration-200"
        >
          🎮 Start Playing
        </Button>
      </div>
    </>
  );
};

export default StickyCTAButton;
