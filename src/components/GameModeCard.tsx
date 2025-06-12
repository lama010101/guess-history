import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface GameModeCardProps {
  title: string;
  description: string;
  mode: "classic" | "time-attack" | "challenge";
  icon: LucideIcon;
  onStartGame: (mode: string) => void;
  isLoading: boolean;
  children?: React.ReactNode;
}

export function GameModeCard({ 
  title, 
  description, 
  mode, 
  icon: Icon, 
  onStartGame,
  isLoading,
  children
}: GameModeCardProps) {
  const handleButtonClick = () => {
    if (!isLoading) {
      onStartGame(mode);
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-900 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="text-center">
        <div className="h-40 flex items-center justify-center mb-4">
          <Icon className="h-20 w-20 text-history-primary dark:text-history-light opacity-80" />
        </div>
        <CardTitle className="text-2xl font-bold text-history-primary dark:text-history-light">
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      {children && (
        <div className="px-6 pb-4">
          {children}
        </div>
      )}
      <CardContent>
        <Button
          className="w-full bg-history-secondary hover:bg-history-secondary/90 text-white"
          onClick={handleButtonClick}
          disabled={isLoading}
        >
          {isLoading ? "Starting..." : `Play ${title}`}
        </Button>
      </CardContent>
    </Card>
  );
}
