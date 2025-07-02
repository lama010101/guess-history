import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameModeCardProps {
  title: string;
  mode: "classic" | "time-attack" | "challenge";
  icon: LucideIcon;
  onStartGame: (mode: string) => void;
  isLoading: boolean;
  showTimer?: boolean;
  timerSeconds?: number;
  onTimerChange?: (seconds: number) => void;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function GameModeCard({ 
  title, 
  mode, 
  icon: Icon, 
  onStartGame,
  isLoading,
  showTimer = false,
  timerSeconds = 300,
  onTimerChange,
  children,
  disabled = false
}: GameModeCardProps) {
  const isFriendsMode = mode === 'time-attack';
  const buttonText = mode === 'classic' 
    ? 'Practice' 
    : mode === 'time-attack' 
      ? 'Play with Friends' 
      : 'Play Challenge';

  const iconColor = {
    'classic': 'text-green-500',
    'time-attack': 'text-blue-500',
    'challenge': 'text-orange-500'
  }[mode];

  const handleButtonClick = () => {
    if (!isLoading && !disabled) {
      onStartGame(mode);
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-900 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
      <CardContent className="p-6 flex flex-col items-center">
        {/* Icon */}
        <div className={cn("h-24 w-24 rounded-full bg-opacity-20 flex items-center justify-center mb-6", {
          'bg-green-500/20': mode === 'classic',
          'bg-blue-500/20': mode === 'time-attack',
          'bg-orange-500/20': mode === 'challenge'
        })}>
          <Icon className={cn("h-12 w-12", iconColor)} />
        </div>

        {/* Timer (for Practice and Friends) */}
        {showTimer && (
          <div className="flex items-center gap-2 mb-6 text-sm font-medium text-gray-600 dark:text-gray-300">
            <Clock className="h-4 w-4" />
            <span>Round: {Math.floor(timerSeconds / 60)}m {timerSeconds % 60}s</span>
          </div>
        )}

        {/* Button */}
        <Button 
          className={`mt-6 w-full ${isFriendsMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'} text-white`}
          onClick={handleButtonClick}
          disabled={isLoading || disabled}
        >
          {isLoading ? 'Loading...' : buttonText}
        </Button>
      </CardContent>
      {children && (
        <div className="px-6 pb-4">
          {children}
        </div>
      )}
    </Card>
  );
}
