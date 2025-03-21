
import { Loader2 } from 'lucide-react';

export interface LoadingIndicatorProps {
  isLoading: boolean;
}

const LoadingIndicator = ({ isLoading }: LoadingIndicatorProps) => {
  if (!isLoading) return null;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20">
      <div className="bg-background rounded-lg p-4 shadow-lg flex items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="font-medium">Loading map...</span>
      </div>
    </div>
  );
};

export default LoadingIndicator;
