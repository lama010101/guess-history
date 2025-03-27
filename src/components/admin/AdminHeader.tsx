
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import HintDisplay from "../HintDisplay";
import { useState } from "react";

const AdminHeader = () => {
  // Mock data - in a real app, this would come from your state management
  const availableHints = 15;
  const [isHintOpen, setIsHintOpen] = useState(false);

  // Mock hint handlers
  const handleUseLocationHint = () => {
    console.log('Location hint used from admin header');
    return true;
  };

  const handleUseYearHint = () => {
    console.log('Year hint used from admin header');
    return true;
  };

  // Mock currentImage data for HintDisplay
  const mockCurrentImage = {
    year: 2000,
    location: { lat: 40.7128, lng: -74.0060 },
    description: "Sample image description",
    locationName: "New York, USA",
    country: "USA"
  };

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
        
        <div className="flex items-center gap-2">
          {isHintOpen && (
            <HintDisplay 
              availableHints={availableHints} 
              onClose={() => setIsHintOpen(false)} 
              onUseLocationHint={handleUseLocationHint}
              onUseYearHint={handleUseYearHint}
              locationHintUsed={false}
              yearHintUsed={false}
              currentImage={mockCurrentImage}
            />
          )}
        </div>
        
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
