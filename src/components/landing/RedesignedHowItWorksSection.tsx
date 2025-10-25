import React from 'react';
import LazyImage from '@/components/ui/LazyImage';
import { Eye, MapPin, Trophy } from "lucide-react";

const RedesignedHowItWorksSection = () => {
  const steps = [
    {
      icon: <Eye className="w-8 h-8 text-orange-400" />,
      title: "Observe",
      description: "Study the historical image carefully. Look for clues about time period, location, clothing, architecture, and technology.",
      image: "/images/hero/placeholder.png"
    },
    {
      icon: <MapPin className="w-8 h-8 text-orange-400" />,
      title: "Guess",
      description: "Place your pin on the world map and select your year. The closer your guess, the higher your score.",
      image: "/images/hero/placeholder.png"
    },
    {
      icon: <Trophy className="w-8 h-8 text-orange-400" />,
      title: "Learn",
      description: "Discover the real story behind the image. Learn fascinating historical facts and improve your knowledge.",
      image: "/images/hero/placeholder.png"
    }
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            How It Works
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
            Master the art of historical detective work in three simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="relative bg-slate-800/80 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden text-center group hover:border-orange-500/30 transition-all duration-300 animate-fade-in hover:scale-105"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {/* Full-width image */}
              <div className="w-full h-48 overflow-hidden">
                <LazyImage 
                  src={step.image} 
                  alt={step.title}
                  className="w-full h-full object-cover"
                  skeletonClassName="w-full h-full"
                />
              </div>
              
              <div className="p-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-black/50 border border-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                  {step.title}
                </h3>
                
                <p className="text-slate-300 text-sm leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <div className="inline-flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm border border-orange-500/30 rounded-full px-6 py-3 hover:scale-105 transition-transform duration-300">
            <Trophy className="w-5 h-5 text-orange-400" />
            <span className="text-slate-200 text-sm font-medium">
              Pro tip: Pay attention to architectural styles, fashion, and technology for better accuracy
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RedesignedHowItWorksSection;
