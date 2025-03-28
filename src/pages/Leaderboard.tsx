
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Trophy, Search, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/services/auth';

// Sample leaderboard data - would be replaced with API calls
const getLeaderboardData = (type = 'global') => {
  // In a real app, this would come from an API
  if (type === 'global') {
    return [
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
  } else if (type === 'friends') {
    return [
      { id: 3, username: 'TimeTraveler', score: 45890, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TimeTraveler' },
      { id: 5, username: 'ChronoExplorer', score: 43150, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChronoExplorer' },
      { id: 8, username: 'TimeKeeper', score: 40950, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TimeKeeper' },
    ];
  } else if (type === 'daily') {
    return [
      { id: 2, username: 'GeoWhiz', score: 46750, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GeoWhiz' },
      { id: 4, username: 'MapMaster', score: 44200, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MapMaster' },
      { id: 6, username: 'LandmarkLegend', score: 42300, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LandmarkLegend' },
      { id: 9, username: 'GlobeSpotter', score: 39800, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=GlobeSpotter' },
    ];
  }
  return [];
};

const Leaderboard = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('global');
  const [searchTerm, setSearchTerm] = useState('');
  const [leaderboardData, setLeaderboardData] = useState([]);

  useEffect(() => {
    // Fetch leaderboard data based on selected tab
    const data = getLeaderboardData(activeTab);
    setLeaderboardData(data);
  }, [activeTab]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredData = leaderboardData.filter(
    player => player.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          
          <div className="mt-4 md:mt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="global">Global</TabsTrigger>
                <TabsTrigger value="friends" disabled={!isAuthenticated}>Friends</TabsTrigger>
                <TabsTrigger value="daily">Daily Challenge</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search by username..." 
            className="pl-10"
            value={searchTerm}
            onChange={handleSearch}
            autoFocus={false}
          />
        </div>
        
        <div className="space-y-4">
          {filteredData.length > 0 ? (
            filteredData.map((player, index) => (
              <Card key={player.id} className={index < 3 ? "border-primary/30 bg-primary/5" : ""}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8">
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
                        <span className="text-muted-foreground font-medium">{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                      <img
                        src={player.avatar}
                        alt={player.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-medium">{player.username}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="font-mono font-semibold">{player.score.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">pts</span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "No players match your search." : "No data available for this leaderboard."}
              </p>
            </div>
          )}
        </div>
        
        {filteredData.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline">View More Players</Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
