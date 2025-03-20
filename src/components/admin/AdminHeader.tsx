
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const AdminHeader = () => {
  return (
    <header className="w-full border-b bg-background p-4">
      <div className="container max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Site
            </Link>
          </Button>
        </div>
        
        <h2 className="text-lg font-semibold">EventGuesser Admin</h2>
        
        <div>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <Home className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
