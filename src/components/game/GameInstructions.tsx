
import { Globe } from 'lucide-react';
import { Clock, Map } from 'lucide-react';

const GameInstructions = () => {
  return (
    <div className="glass-card p-6 h-full">
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          
          <h3 className="text-xl font-bold mb-2">How to Play</h3>
          
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center rounded-full bg-primary/10 w-6 h-6 text-primary shrink-0 mt-0.5">1</div>
              <p>Look at the historical image and try to recognize the location and time period.</p>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center rounded-full bg-primary/10 w-6 h-6 text-primary shrink-0 mt-0.5">2</div>
              <p>Switch to the map and drop a pin where you think the photo was taken.</p>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center rounded-full bg-primary/10 w-6 h-6 text-primary shrink-0 mt-0.5">3</div>
              <p>Use the slider to select the year when you think the photo was taken.</p>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center rounded-full bg-primary/10 w-6 h-6 text-primary shrink-0 mt-0.5">4</div>
              <p>Submit your guess and see how accurate you were!</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          <h4 className="text-sm font-medium">Scoring System</h4>
          <div className="flex gap-3 items-center text-xs text-muted-foreground">
            <div className="flex-1 flex items-center">
              <Map className="h-4 w-4 mr-1 text-primary" />
              <p>5,000 pts for perfect location</p>
            </div>
            <div className="flex-1 flex items-center">
              <Clock className="h-4 w-4 mr-1 text-primary" />
              <p>5,000 pts for exact year</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameInstructions;
