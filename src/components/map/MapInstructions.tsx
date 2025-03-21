
import { MousePointer } from 'lucide-react';

export interface MapInstructionsProps {
  showInstructions: boolean;
}

const MapInstructions = ({ showInstructions }: MapInstructionsProps) => {
  if (!showInstructions) return null;
  
  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-lg p-3 shadow-lg z-20 pointer-events-none animate-fade-in">
      <div className="flex items-center gap-2 text-sm">
        <MousePointer className="h-4 w-4 text-primary" />
        <span>Click anywhere on the map to place a pin</span>
      </div>
    </div>
  );
};

export default MapInstructions;
