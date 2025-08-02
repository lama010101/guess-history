
import React from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight,
  Award,
  Share2,
  MapPin,
  Calendar,
  Star
} from "lucide-react";

// Define proper props interface
interface ResultsLayout2Props {
  onNext?: () => void;
  round?: number;
}

const ResultsLayout2: React.FC<ResultsLayout2Props> = ({ onNext, round }) => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black">
      {/* Sticky header with progress visualization */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-history-secondary" />
            <span className="font-bold">
              {round ? `Challenge ${round}/5` : "Challenge 3/5"}
            </span>
          </div>
          
          <div className="hidden sm:block w-1/2">
            <Progress value={60} className="h-2 bg-gray-200 dark:bg-gray-700" />
          </div>
          
          {onNext && (
            <Button 
              size="sm" 
              className="bg-history-primary hover:bg-history-primary/90 text-white"
              onClick={onNext}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto p-4 pt-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left column - Score & Map */}
          <div className="w-full md:w-1/2 space-y-6">
            {/* Score card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
              <h2 className="text-2xl font-bold mb-8 text-history-primary dark:text-history-light">Your Score</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-history-primary/10 dark:bg-history-primary/20">
                  <div className="text-3xl font-bold text-history-primary dark:text-history-light">87%</div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
                <div className="p-4 rounded-xl bg-history-secondary/10 dark:bg-history-secondary/20">
                  <div className="text-3xl font-bold text-history-secondary">+230</div>
                  <div className="text-sm text-muted-foreground">XP Gained</div>
                </div>
              </div>
              
              {/* Badge animation would appear here for perfect score */}
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full flex items-center justify-center bg-gradient-to-br from-gold-light to-gold-dark text-white">
                  <Award className="h-6 w-6" />
                </div>
              </div>
              
              <div className="flex justify-center">
                <Button variant="outline" size="sm" className="text-muted-foreground border-muted">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Result
                </Button>
              </div>
            </div>
            
            {/* Map card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="font-bold text-lg text-history-primary dark:text-history-light flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Location Accuracy
                </h2>
                <div className="px-3 py-1 rounded-full bg-history-primary/10 text-history-primary dark:bg-history-primary/20 dark:text-history-light text-sm">
                  280 km off
                </div>
              </div>
              
              <div className="h-64 w-full map-placeholder relative">
                {/* Map visualization showing user guess vs actual */}
                <div className="absolute top-1/3 left-1/3">
                  <div className="h-6 w-6 rounded-full bg-history-accent border-2 border-white flex items-center justify-center text-white text-xs">
                    You
                  </div>
                  <div className="absolute left-0 top-0 h-6 w-6 animate-ping rounded-full bg-history-accent opacity-75"></div>
                </div>
                <div className="absolute top-1/2 left-1/2">
                  <div className="h-6 w-6 rounded-full bg-history-primary border-2 border-white flex items-center justify-center text-white text-xs">
                    <MapPin className="h-3 w-3" />
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-2 border-history-primary opacity-40"></div>
                </div>
                
                {/* Line connecting points */}
                <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                  <line 
                    x1="33%" y1="33%" 
                    x2="50%" y2="50%" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeDasharray="5,5" 
                    className="text-history-primary"
                  />
                </svg>
              </div>
            </div>
            
            {/* Time accuracy card for smaller screens */}
            <div className="md:hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <div className="border-b border-border pb-3 mb-3 flex justify-between items-center">
                <h2 className="font-bold text-lg text-history-primary dark:text-history-light flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Time Accuracy
                </h2>
                <div className="px-3 py-1 rounded-full bg-history-primary/10 text-history-primary dark:bg-history-primary/20 dark:text-history-light text-sm">
                  3 years off
                </div>
              </div>
              
              <div className="flex justify-between text-sm mb-4">
                <div>Your guess: <span className="font-medium">1932</span></div>
                <div>Actual: <span className="font-medium">1935</span></div>
              </div>
              
              <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-history-primary" style={{ width: '93%' }}></div>
              </div>
            </div>
          </div>
          
          {/* Right column - Image & Description */}
          <div className="w-full md:w-1/2 space-y-6">
            {/* Time accuracy card for larger screens */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <div className="border-b border-border pb-3 mb-3 flex justify-between items-center">
                <h2 className="font-bold text-lg text-history-primary dark:text-history-light flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  Time Accuracy
                </h2>
                <div className="px-3 py-1 rounded-full bg-history-primary/10 text-history-primary dark:bg-history-primary/20 dark:text-history-light text-sm">
                  3 years off
                </div>
              </div>
              
              <div className="flex justify-between text-sm mb-4">
                <div>Your guess: <span className="font-medium">1932</span></div>
                <div>Actual: <span className="font-medium">1935</span></div>
              </div>
              
              <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-history-primary" style={{ width: '93%' }}></div>
              </div>
            </div>
            
            {/* Historical image and description */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <img 
                src="https://source.unsplash.com/random/1600x900/?historical,vintage" 
                alt="Historical scene" 
                className="w-full h-48 object-cover"
              />
              
              <div className="p-6">
                <h2 className="text-xl font-bold mb-2 text-history-primary dark:text-history-light">Charles Bridge, Prague (1935)</h2>
                <div className="max-h-48 overflow-y-auto pr-2 text-muted-foreground">
                  <p className="mb-4">This iconic bridge crosses the Vltava river in Prague, Czech Republic. Construction started in 1357 under King Charles IV and finished in the early 15th century.</p>
                  <p>This photograph from 1935 shows the bridge shortly before WWII, which fortunately survived the conflict mostly undamaged despite heavy bombing of surrounding areas. The Gothic towers at each end were used for defense and toll collection historically, and the baroque statues were added in the 17th century.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sticky footer with next button for mobile only */}
        <div className="md:hidden sticky bottom-4 mt-6">
          <Button className="w-full py-6 font-semibold text-lg bg-history-primary hover:bg-history-primary/90 text-white shadow-lg rounded-xl">
            Next Challenge
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsLayout2;
