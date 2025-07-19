import { Outlet } from "react-router-dom";
import { NavProfile } from "@/components/NavProfile";
import { StatsDisplay } from "@/components/StatsDisplay";
import Logo from "@/components/Logo";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-history-light dark:bg-history-dark">
  {/* Navbar is now always black with 50% opacity */}
      <nav className="sticky top-0 z-50" style={{background: 'rgba(0,0,0,0.5)'}}> 
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Logo />
          <StatsDisplay />
          <NavProfile />
        </div>
      </div>
    </nav>
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
