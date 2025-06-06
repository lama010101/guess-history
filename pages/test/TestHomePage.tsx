
import { Clock, Award, User } from "lucide-react";
import { GameModeCard } from "@/components/GameModeCard";

const TestHomePage = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <GameModeCard
          title="Classic"
          description="Test your historical knowledge at your own pace. Perfect for learning and exploring."
          mode="classic"
          icon={User}
        />
        <GameModeCard
          title="Time Attack"
          description="Race against the clock! Make quick decisions about historical events."
          mode="time-attack"
          icon={Clock}
        />
        <GameModeCard
          title="Challenge"
          description="Compete with others in daily challenges and earn achievements."
          mode="challenge"
          icon={Award}
        />
      </div>
    </div>
  );
};

export default TestHomePage;
