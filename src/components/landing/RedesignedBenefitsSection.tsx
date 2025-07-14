
import { Brain, Globe, Trophy, Clock } from "lucide-react";

const RedesignedBenefitsSection = () => {
  const benefits = [
    {
      icon: <Brain className="w-8 h-8 text-orange-400" />,
      title: "Challenge Yourself",
      description: "Test your historical knowledge and geographic intuition with every guess"
    },
    {
      icon: <Globe className="w-8 h-8 text-orange-400" />,
      title: "Learn Something New",
      description: "Discover fascinating stories and moments from across human history"
    },
    {
      icon: <Clock className="w-8 h-8 text-orange-400" />,
      title: "Explore Rare Images",
      description: "See carefully curated historical photographs and AI-generated scenes"
    },
    {
      icon: <Trophy className="w-8 h-8 text-orange-400" />,
      title: "Compete and Connect",
      description: "Challenge friends and join a global community of history enthusiasts"
    }
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            Why Play Guess History?
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="bg-slate-800/80 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center group hover:border-orange-500/30 transition-all duration-300"
            >
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-black/50 border border-orange-500/20">
                  {benefit.icon}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-3" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                {benefit.title}
              </h3>
              
              <p className="text-slate-300 text-sm leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RedesignedBenefitsSection;
