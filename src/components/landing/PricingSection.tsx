
import { Button } from "@/components/ui/button";
import { Check, X, Target, Users, Trophy, Lightbulb, Clock, BarChart, Calendar, Filter, Tv, DollarSign } from "lucide-react";

interface PricingSectionProps {
  onAuthModalOpen?: () => void;
}

const PricingSection = ({ onAuthModalOpen }: PricingSectionProps) => {
  const handleUpgrade = () => {
    if (onAuthModalOpen) {
      onAuthModalOpen();
    } else {
      window.location.href = "https://home.guess-history.com/";
    }
  };

  const plans = [
    {
      name: "Explorer",
      subtitle: "Free forever",
      features: [
        { icon: <Target className="w-5 h-5" />, name: "Practice", value: "3 games/day", status: "limited" },
        { icon: <Users className="w-5 h-5" />, name: "Friends", value: "Accept invites only", status: "limited" },
        { icon: <Trophy className="w-5 h-5" />, name: "Quest", value: "Not available", status: "unavailable" },
        { icon: <Lightbulb className="w-5 h-5" />, name: "Hints", value: "Yes", status: "available" },
        { icon: <Clock className="w-5 h-5" />, name: "Timer", value: "Yes", status: "available" },
        { icon: <BarChart className="w-5 h-5" />, name: "Stats", value: "Limited", status: "limited" },
        { icon: <Calendar className="w-5 h-5" />, name: "Time Range", value: "1850–2025", status: "limited" },
        { icon: <Filter className="w-5 h-5" />, name: "Filters", value: "None", status: "unavailable" },
        { icon: <Tv className="w-5 h-5" />, name: "No Ads", value: "No opt-out", status: "unavailable" },
        { icon: <DollarSign className="w-5 h-5" />, name: "Price", value: "Free forever", status: "available" }
      ],
      buttonText: "Start Free",
      buttonStyle: "bg-slate-600 hover:bg-slate-700 text-white",
      popular: false,
      iconBg: "bg-gradient-to-br from-slate-600 to-slate-700",
      borderColor: "border-slate-600/30",
      tagText: "Limited Experience",
      tagColor: "bg-gradient-to-r from-slate-500 to-slate-600"
    },
    {
      name: "Challenger",
      subtitle: "$2/month",
      features: [
        { icon: <Target className="w-5 h-5" />, name: "Practice", value: "Unlimited games – train without limits", status: "available" },
        { icon: <Users className="w-5 h-5" />, name: "Friends", value: "Send and receive invites – host your own matches", status: "available" },
        { icon: <Trophy className="w-5 h-5" />, name: "Quest", value: "Unlock quests, level up, and earn badges", status: "available" },
        { icon: <Lightbulb className="w-5 h-5" />, name: "Hints", value: "Yes", status: "available" },
        { icon: <Clock className="w-5 h-5" />, name: "Timer", value: "Yes", status: "available" },
        { icon: <BarChart className="w-5 h-5" />, name: "Stats", value: "Yes", status: "available" },
        { icon: <Calendar className="w-5 h-5" />, name: "Time Range", value: "-2500 to 2025", status: "available" },
        { icon: <Filter className="w-5 h-5" />, name: "Filters", value: "Choose theme, location and time period", status: "available" },
        { icon: <Tv className="w-5 h-5" />, name: "No Ads", value: "Ad-free experience", status: "available" },
        { icon: <DollarSign className="w-5 h-5" />, name: "Price", value: "$2/month", status: "available" }
      ],
      buttonText: "Upgrade to Challenger",
      buttonStyle: "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white",
      popular: true,
      iconBg: "bg-gradient-to-br from-orange-500 to-red-600",
      borderColor: "border-orange-500/30",
      tagText: "Full Experience",
      tagColor: "bg-gradient-to-r from-orange-500 to-red-600"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "text-green-400";
      case "limited":
        return "text-orange-400";
      case "unavailable":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <Check className="w-5 h-5 text-green-400" />;
      case "limited":
        return <Check className="w-5 h-5 text-orange-400" />;
      case "unavailable":
        return <X className="w-5 h-5 text-red-400" />;
      default:
        return <Check className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            Choose Your Plan
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative bg-slate-800/80 backdrop-blur-sm rounded-xl p-8 text-center transition-all duration-300 animate-slide-up hover:scale-105 hover:shadow-2xl ${
                plan.popular 
                  ? `border-2 ${plan.borderColor} shadow-lg shadow-orange-500/20` 
                  : `border ${plan.borderColor}`
              }`}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className={`${plan.tagColor} text-white px-4 py-1 rounded-full text-sm font-semibold`}>
                  {plan.tagText}
                </div>
              </div>

              <div className="flex justify-center mb-6 mt-4">
                <div className={`w-20 h-20 ${plan.iconBg} rounded-full flex items-center justify-center shadow-lg animate-bounce-in`} style={{ animationDelay: `${index * 0.3}s` }}>
                  <div className="text-white text-2xl font-bold">
                    {plan.name === "Explorer" ? "🧭" : "⚡"}
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                {plan.name}
              </h3>
              
              <p className="text-slate-300 mb-8 text-sm" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                {plan.subtitle}
              </p>

              <div className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <div 
                    key={featureIndex} 
                    className={`flex items-center gap-3 text-left animate-fade-in hover:bg-slate-700/30 p-2 rounded-lg transition-all duration-200`}
                    style={{ animationDelay: `${(index * 0.1) + (featureIndex * 0.1)}s` }}
                  >
                    <div className={`flex-shrink-0 ${getStatusColor(feature.status)}`}>
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-white text-sm">{feature.name}</span>
                      <span className="text-slate-400 text-sm"> → {feature.value}</span>
                    </div>
                    <div className="ml-auto flex-shrink-0">
                      {getStatusIcon(feature.status)}
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                className={`w-full ${plan.buttonStyle} font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105`}
                onClick={handleUpgrade}
              >
                {plan.buttonText}
              </Button>
            </div>
          ))}
        </div>

        {/* XP and Accuracy Explanation Section */}
        <div className="mt-16 animate-scale-in" style={{ animationDelay: '0.6s' }}>
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-8 text-center" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              Understanding XP & Accuracy
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-800/80 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">⚡</span>
                  </div>
                  <h4 className="text-xl font-bold text-white">XP System</h4>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Earn XP points based on your guess accuracy. The closer your guess to the actual date and location, 
                  the more XP you earn. Level up to unlock new achievements and climb the global leaderboard.
                </p>
              </div>

              <div className="bg-slate-800/80 backdrop-blur-sm border border-green-500/30 rounded-xl p-6 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl">📊</span>
                  </div>
                  <h4 className="text-xl font-bold text-white">Accuracy Scoring</h4>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Your accuracy percentage combines both time and location precision. Perfect guesses (within 1 year and 50km) 
                  earn 100% accuracy. The further off you are, the lower your percentage drops.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12 animate-scale-in" style={{ animationDelay: '0.8s' }}>
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-r from-orange-500/10 to-red-600/10 backdrop-blur-sm border border-orange-500/30 rounded-xl p-6 hover:scale-105 transition-transform duration-300 hover:shadow-xl">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-orange-400 text-lg animate-bounce">💡</span>
                <span className="text-orange-300 text-lg font-semibold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                  Want to become a Time Master?
                </span>
              </div>
              <p className="text-orange-200 text-sm leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                Upgrade to Challenger and unlock your full potential. No limits. No ads. Just history.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
