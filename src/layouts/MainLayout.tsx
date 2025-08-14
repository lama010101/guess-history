import { Outlet } from "react-router-dom";
import { NavProfile } from "@/components/NavProfile";
import { StatsDisplay } from "@/components/StatsDisplay";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-history-light dark:bg-black">

            <nav className="sticky top-0 z-50 bg-black/0 backdrop-blur-none"> 
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
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
