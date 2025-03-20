
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import GameSection from '@/components/GameSection';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <GameSection />
      
      <section id="how-to-play" className="py-20">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">How EventGuesser Works</h2>
          <p className="max-w-2xl mx-auto text-muted-foreground mb-12">
            EventGuesser challenges your knowledge of history and geography through a fun, 
            interactive guessing game with historical images.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="glass-card p-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-lg font-medium mb-3">View Historical Images</h3>
              <p className="text-sm text-muted-foreground">
                Look at fascinating historical photographs from different eras and locations around the world.
              </p>
            </div>
            
            <div className="glass-card p-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-lg font-medium mb-3">Make Your Guesses</h3>
              <p className="text-sm text-muted-foreground">
                Drop a pin on the map for location and use the slider to select the year you think the photo was taken.
              </p>
            </div>
            
            <div className="glass-card p-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-lg font-medium mb-3">Earn Points & Compete</h3>
              <p className="text-sm text-muted-foreground">
                Score points based on accuracy and compete with friends or in daily challenges to see who knows history best.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="py-12 bg-secondary">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <a href="/" className="text-xl font-bold text-primary">EventGuesser</a>
              <p className="text-sm text-muted-foreground mt-2">Test your knowledge of history and geography</p>
            </div>
            
            <div className="flex space-x-8">
              <a href="#how-to-play" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How to Play</a>
              <a href="#game" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Play Now</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} EventGuesser. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
