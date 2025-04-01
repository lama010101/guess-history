
import { ArrowRight, Clock, MapPin, Calendar } from 'lucide-react';

const Hero = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full filter blur-3xl animate-pulse-subtle"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full filter blur-3xl animate-pulse-subtle" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container px-4 py-24 mx-auto text-center relative z-10">
        <div className="inline-flex items-center justify-center px-3 py-1 mb-8 text-xs font-medium rounded-full bg-primary/10 text-primary animate-fade-in">
          <span>Test your historical knowledge</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <span className="relative">
            Time Travel Through History
            <span className="absolute -bottom-2 left-0 w-full h-1 bg-primary/30 rounded-full"></span>
          </span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-12 text-balance animate-fade-in" style={{ animationDelay: '0.2s' }}>
          View historical images and guess when and where they were taken. 
          Compete with friends or challenge yourself with daily puzzles.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <a 
            href="#game"
            className="px-8 py-3 rounded-full bg-primary text-primary-foreground text-base font-medium inline-flex items-center justify-center group interactive"
          >
            Play Now
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          
          <a 
            href="#how-to-play"
            className="px-8 py-3 rounded-full bg-secondary text-secondary-foreground text-base font-medium hover:bg-secondary/80 interactive"
          >
            How It Works
          </a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Feature cards */}
          <div className="glass-card p-6 flex flex-col items-center text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Location Guessing</h3>
            <p className="text-muted-foreground text-sm">Drop a pin on the map to guess where the photo was taken.</p>
          </div>
          
          <div className="glass-card p-6 flex flex-col items-center text-center animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Year Guessing</h3>
            <p className="text-muted-foreground text-sm">Slide to select the year when you think the photo was taken.</p>
          </div>
          
          <div className="glass-card p-6 flex flex-col items-center text-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Daily Challenges</h3>
            <p className="text-muted-foreground text-sm">Compete in daily challenges and see how you rank globally.</p>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-bounce">
        <a href="#how-to-play" className="text-muted-foreground">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default Hero;
