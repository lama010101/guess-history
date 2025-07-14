import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { redirectToHome, isMainDomain } from "@/lib/auth/crossDomain";
import RedesignedAuthModal from "@/components/redesigned/RedesignedAuthModal";
import RedesignedHeroSection from "@/components/redesigned/RedesignedHeroSection";
import StatsSection from "@/components/redesigned/StatsSection";
import RedesignedHowItWorksSection from "@/components/redesigned/RedesignedHowItWorksSection";
import RedesignedGameModeSection from "@/components/redesigned/RedesignedGameModeSection";
import RedesignedBenefitsSection from "@/components/redesigned/RedesignedBenefitsSection";
import PricingSection from "@/components/redesigned/PricingSection";
import RedesignedFAQSection from "@/components/redesigned/RedesignedFAQSection";
import RedesignedNavbar from "@/components/redesigned/RedesignedNavbar";
import StickyCTAButton from "@/components/redesigned/StickyCTAButton";

const Main = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  // Disabled auto-redirect for development
  // useEffect(() => {
  //   if (!loading && session) {
  //     // If authenticated and on main domain, redirect to home subdomain
  //     if (isMainDomain()) {
  //       console.log('Authenticated on main domain, redirecting to home subdomain');
  //       redirectToHome();
  //     } else {
  //       // Fallback for other environments
  //       window.location.href = "https://home.guess-history.com/";
  //     }
  //   }
  // }, [session, loading, navigate]);

  const scrollToGameModes = () => {
    const gameModeSection = document.getElementById('game-modes-section');
    if (gameModeSection) {
      gameModeSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStickyButtonClick = () => {
    setIsAuthModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center animate-fade-in">
          <div className="mb-4 animate-bounce-in">
            <h1 className="text-2xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              <span className="text-white">GUESS-</span>
              <span className="text-orange-500">HISTORY</span>
            </h1>
          </div>
          <p className="animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative bg-black"
      style={{
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.03) 2px,
            rgba(255,255,255,0.03) 4px
          )
        `
      }}
    >
      <div className="animate-fade-in">
        <RedesignedNavbar onAuthModalOpen={() => setIsAuthModalOpen(true)} />
      </div>
      <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <RedesignedHeroSection onAuthModalOpen={() => setIsAuthModalOpen(true)} />
      </div>
      <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <RedesignedHowItWorksSection />
      </div>
      <div className="animate-scale-in" style={{ animationDelay: '0.6s' }}>
        <StatsSection />
      </div>
      <div className="animate-slide-up" style={{ animationDelay: '0.8s' }}>
        <RedesignedGameModeSection onAuthModalOpen={() => setIsAuthModalOpen(true)} />
      </div>
      <div className="animate-fade-in" style={{ animationDelay: '1.0s' }}>
        <RedesignedBenefitsSection />
      </div>
      <div className="animate-scale-in" style={{ animationDelay: '1.2s' }}>
        <PricingSection onAuthModalOpen={() => setIsAuthModalOpen(true)} />
      </div>
      <div className="animate-fade-in" style={{ animationDelay: '1.4s' }}>
        <RedesignedFAQSection />
      </div>
      <StickyCTAButton onClick={handleStickyButtonClick} />
      <RedesignedAuthModal 
        open={isAuthModalOpen} 
        onOpenChange={setIsAuthModalOpen}
      />
    </div>
  );
};

export default Main;
