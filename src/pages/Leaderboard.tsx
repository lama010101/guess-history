
import Navbar from '@/components/Navbar';
import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Sample leaderboard data
const leaderboardData = [
  { id: 1, username: 'HistoryBuff42', score: 47520, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HistoryBuff42' },
  { id: 2, username: 'GeoWhiz', score: 46750, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GeoWhiz' },
  { id: 3, username: 'TimeTraveler', score: 45890, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TimeTraveler' },
  { id: 4, username: 'MapMaster', score: 44200, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MapMaster' },
  { id: 5, username: 'ChronoExplorer', score: 43150, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChronoExplorer' },
  { id: 6, username: 'LandmarkLegend', score: 42300, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LandmarkLegend' },
  { id: 7, username: 'HistoryDetective', score: 41700, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HistoryDetective' },
  { id: 8, username: 'TimeKeeper', score: 40950, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TimeKeeper' },
  { id: 9, username: 'GlobeSpotter', score: 39800, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GlobeSpotter' },
  { id: 10, username: 'EraNavigator', score: 38600, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=EraNavigator' },
];

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState('global');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container px-4 py-12 mx-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
              <p className="text-muted-foreground">See who's topping the charts in EventGuesser</p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <Tabs defaultValue="global" className="w-full">
                <TabsList>
                  <TabsTrigger value="global">Global</TabsTrigger>
                  <TabsTrigger value="friends">Friends</TabsTrigger>
                  <TabsTrigger value="daily">Daily Challenge</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b border-border">
              <div className="grid grid-cols-12 text-sm font-medium">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-6 md:col-span-7">Player</div>
                <div className="col-span-5 md:col-span-4 text-right">Score</div>
              </div>
            </div>
            
            <div className="divide-y divide-border">
              {leaderboardData.map((player, index) => (
                <div
                  key={player.id}
                  className={`grid grid-cols-12 items-center p-4 ${
                    index < 3 ? 'bg-secondary/20' : ''
                  }`}
                >
                  <div className="col-span-1 text-center font-medium">
                    {index === 0 ? (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-600">
                        <Trophy size={16} />
                      </div>
                    ) : index === 1 ? (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/20 text-slate-600">
                        <Trophy size={16} />
                      </div>
                    ) : index === 2 ? (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-600/20 text-amber-700">
                        <Trophy size={16} />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  
                  <div className="col-span-6 md:col-span-7 flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0">
                      <img
                        src={player.avatar}
                        alt={player.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-medium truncate">{player.username}</span>
                  </div>
                  
                  <div className="col-span-5 md:col-span-4 text-right">
                    <span className="font-mono font-semibold">{player.score.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center mt-8">
            <Button variant="outline">View More Players</Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
