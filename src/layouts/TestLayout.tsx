import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NavProfile } from "@/components/NavProfile";
import Logo from "@/components/Logo";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Target, Zap } from "lucide-react";

const TestLayout = () => {
  const location = useLocation();
  const { totalGameAccuracy, totalGameXP, globalAccuracy, globalXP } = useGame();
  
  // Determine if we're in game context (active game or round results, but NOT final-results)
  const isGameContext = location.pathname.includes('/game') || 
                       (location.pathname.includes('/round-results') && !location.pathname.includes('/final-results'));
  
  return (
    <div className="min-h-screen flex flex-col bg-history-light dark:bg-history-dark">
      {/* Navbar only shown for non-game pages */}
      {!isGameContext && (
        <nav className="sticky top-0 z-50 bg-history-primary text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Logo />
              </div>
              
              {/* Show global stats outside of games */}
              <div className="flex items-center gap-2">
                <Badge variant="accuracy" className="flex items-center gap-1 text-sm" aria-label={`Global Accuracy: ${Math.round(globalAccuracy)}%`}>
                  <Target className="h-4 w-4" />
                  <span>{Math.round(globalAccuracy)}%</span>
                </Badge>
                <Badge variant="xp" className="flex items-center gap-1 text-sm" aria-label={`Global XP: ${Math.round(globalXP)}`}>
                  <Zap className="h-4 w-4" />
                  <span>{Math.round(globalXP)}</span>
                </Badge>
              </div>
              
              <NavProfile />
            </div>
          </div>
        </nav>
      )}
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
};

export default TestLayout;
