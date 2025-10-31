import { Outlet, useLocation } from "react-router-dom";
import { NavProfile } from "@/components/NavProfile";
import { StatsDisplay } from "@/components/StatsDisplay";
import InvitesBell from "@/components/navigation/InvitesBell";

const MainLayout = () => {
  const location = useLocation();
  const showHomeLink = location.pathname !== "/home";
  const isCompeteRoute = location.pathname.startsWith("/compete");

  return (
    <div className="min-h-screen flex flex-col bg-history-light dark:bg-black">
      <nav className={`sticky top-0 z-50 ${isCompeteRoute ? "bg-black/90" : "bg-black/0"} backdrop-blur-none`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <StatsDisplay />
            <div className="flex-1 flex justify-center">
              {showHomeLink && (
                <a
                  href="/home"
                  className="inline-flex items-center text-sm font-semibold text-white transition-colors hover:text-white/80"
                >
                  <span className="text-white">G-</span>
                  <span className="bg-[linear-gradient(135deg,_#c4b5fd_0%,_#f9a8d4_20%,_#fdba74_45%,_#fde68a_70%,_#86efac_100%)] bg-clip-text text-transparent">
                    HISTORY
                  </span>
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <InvitesBell />
              <NavProfile />
            </div>
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
