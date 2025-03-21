
interface LoadingIndicatorProps {
  isLoading: boolean;
}

const LoadingIndicator = ({ isLoading }: LoadingIndicatorProps) => {
  if (!isLoading) return null;
  
  return (
    <div className="w-full h-full min-h-[300px] bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mb-3"></div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  );
};

export default LoadingIndicator;
