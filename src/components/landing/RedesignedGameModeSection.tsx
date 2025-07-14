
import { Button } from "@/components/ui/button";
import { Target, Users, Trophy } from "lucide-react";

interface RedesignedGameModeSectionProps {
  onAuthModalOpen?: () => void;
}

const RedesignedGameModeSection = ({ onAuthModalOpen }: RedesignedGameModeSectionProps) => {
  const gameModes = [
    {
      icon: <Target className="w-12 h-12 text-white" />,
      title: "Practice",
      description: "Train your historical eye — unlimited retries and detailed explanations for every guess.",
      buttonText: "Start Training",
      iconBg: "bg-gradient-to-br from-[#6C2BD9] to-[#9E28B5]",
      buttonBg: "bg-gradient-to-br from-[#6C2BD9] to-[#9E28B5] hover:from-[#5A23B5] hover:to-[#8A2397]",
      borderColor: "border-[#6C2BD9]/30",
      features: [
        "• Unlimited attempts",
        "• Detailed explanations", 
        "• Personal progress tracking"
      ],
      image: "/lovable-uploads/ae2cb2ad-79d5-4fa8-a623-12f5aaaf90ab.png",
      indicator: "No time limit"
    },
    {
      icon: <Users className="w-12 h-12 text-white" />,
      title: "Friends",
      description: "Challenge a friend to a time-travel duel! Real-time competition with shared results.",
      buttonText: "Challenge Friends",
      iconBg: "bg-gradient-to-br from-[#B31217] to-[#FF5F6D]",
      buttonBg: "bg-gradient-to-br from-[#B31217] to-[#FF5F6D] hover:from-[#9A0F13] hover:to-[#E55460]",
      borderColor: "border-[#B31217]/30",
      features: [
        "• Invite friends",
        "• Real-time challenges",
        "• Share achievements"
      ],
      image: "/lovable-uploads/1af8968c-584c-437a-8b69-0e0994b6e7b0.png",
      indicator: "2 players"
    },
    {
      icon: <Trophy className="w-12 h-12 text-white" />,
      title: "Quest",
      description: "Go global. Beat the leaderboard with increasingly difficult historical puzzles.",
      buttonText: "Join Global Quest",
      iconBg: "bg-gradient-to-r from-[#FFC70F] to-[#fff95b]",
      buttonBg: "bg-gradient-to-r from-[#FFC70F] to-[#fff95b] hover:from-[#E6B300] hover:to-[#E6E052] text-black hover:text-black",
      borderColor: "border-[#FFC70F]/30",
      features: [
        "• Global leaderboards",
        "• Progressive difficulty",
        "• Exclusive achievements"
      ],
      image: "/lovable-uploads/495ee7a1-65bb-437c-8d85-dd8a00b77df6.png",
      indicator: ""
    }
  ];

  const handleModeSelect = () => {
    if (onAuthModalOpen) {
      onAuthModalOpen();
    } else {
      window.location.href = "https://home.guess-history.com/";
    }
  };

  return (
    <section id="game-modes-section" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            Choose Your Historical Adventure
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
            Three ways to explore history and test your knowledge
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {gameModes.map((mode, index) => (
            <div 
              key={index}
              className={`bg-slate-800/80 backdrop-blur-sm border ${mode.borderColor} rounded-xl overflow-hidden text-center hover:border-opacity-60 transition-all duration-300 animate-fade-in hover:scale-105 flex flex-col h-full`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="p-8 flex flex-col flex-grow">
                <div className="flex justify-center mb-4">
                  <div className={`w-20 h-20 ${mode.iconBg} rounded-full flex items-center justify-center shadow-lg`}>
                    {mode.icon}
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-6" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                  {mode.title}
                </h3>

                {/* Image placed after icon and title */}
                <div className="w-full h-48 overflow-hidden rounded-lg mb-6">
                  <img 
                    src={mode.image} 
                    alt={mode.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <p className="text-slate-300 mb-6 leading-relaxed flex-grow" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                  {mode.description}
                </p>

                <ul className="text-sm text-slate-400 space-y-2 mb-8 text-left">
                  {mode.features.map((feature, featureIndex) => (
                    <li key={featureIndex}>{feature}</li>
                  ))}
                </ul>
                
                <div className="mt-auto">
                  <Button 
                    className={`w-full ${mode.buttonBg} font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl`}
                    onClick={handleModeSelect}
                  >
                    {mode.buttonText}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RedesignedGameModeSection;
