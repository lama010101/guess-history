
import { MapPin } from 'lucide-react';

interface MapInstructionsProps {
  showInstructions: boolean;
}

const MapInstructions = ({ showInstructions }: MapInstructionsProps) => {
  if (!showInstructions) return null;
  
  return (
    <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow text-xs text-center flex flex-col gap-2">
      <div className="flex items-center justify-center mb-1">
        <MapPin className="h-4 w-4 mr-1 text-primary" />
        <span className="font-medium">Click on the map to place your guess</span>
      </div>
      <p className="text-muted-foreground">Drag to move around and zoom in/out with the controls</p>
    </div>
  );
};

export default MapInstructions;
