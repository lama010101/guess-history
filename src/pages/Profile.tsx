
import { useState } from 'react';
import { useAuth } from '@/services/auth';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  User, 
  Settings, 
  Trophy, 
  Calendar, 
  Clock, 
  Users as UsersIcon,
  Edit3,
  Camera
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const stats = {
    gamesPlayed: 87,
    bestScore: 9780,
    averageScore: 6540,
    totalScore: 523540,
    dailyStreak: 12,
    friendsCount: 23,
  };
  
  const achievements = [
    { name: "Perfect Score", description: "Score 10,000 points in a round", date: "2023-10-15", icon: <Trophy className="w-4 h-4" /> },
    { name: "History Buff", description: "Complete 50 games", date: "2023-09-22", icon: <Calendar className="w-4 h-4" /> },
    { name: "Speed Demon", description: "Complete a game in under 3 minutes", date: "2023-11-03", icon: <Clock className="w-4 h-4" /> },
    { name: "Social Butterfly", description: "Add 10 friends", date: "2023-08-12", icon: <UsersIcon className="w-4 h-4" /> },
  ];
  
  // Mock game history data
  const gameHistory = [
    { date: "2023-12-01", type: "Daily", score: 8450, position: 3 },
    { date: "2023-11-30", type: "Daily", score: 7950, position: 5 },
    { date: "2023-11-29", type: "Daily", score: 9100, position: 1 },
    { date: "2023-11-28", type: "Daily", score: 8750, position: 2 },
    { date: "2023-11-27", type: "Daily", score: 7800, position: 6 },
    { date: "2023-11-25", type: "Play", score: 8200, position: null },
    { date: "2023-11-24", type: "Daily", score: 8100, position: 4 },
    { date: "2023-11-23", type: "Daily", score: 7600, position: 8 },
    { date: "2023-11-22", type: "Play", score: 9500, position: null },
  ];
  
  // Mock friends list
  const friends = [
    { name: "Jane Smith", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane", status: "online" },
    { name: "John Doe", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John", status: "offline" },
    { name: "Sarah Wilson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", status: "online" },
    { name: "Mike Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike", status: "offline" },
    { name: "Emily Davis", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily", status: "online" },
  ];
  
  if (!user) {
    return (
      <div className="h-[100dvh] w-full overflow-hidden flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Please Login</h2>
            <p className="text-muted-foreground mb-4">
              You need to be logged in to view your profile.
            </p>
            <Button asChild>
              <a href="/">Go to Home</a>
            </Button>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col">
      <Navbar />
      <main className="flex-1 container py-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Summary */}
          <Card className="col-span-1 p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold flex items-center">
                <User className="mr-2 h-5 w-5" />
                Profile
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditing(!isEditing)}
                className="h-8 w-8 p-0"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || 'User'}`} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
                {isEditing && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {isEditing ? (
                <div className="w-full space-y-4">
                  <div>
                    <label className="text-sm font-medium">Username</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-md mt-1"
                      defaultValue={user.username || 'User'}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <input 
                      type="email" 
                      className="w-full p-2 border rounded-md mt-1"
                      defaultValue={user.email || 'user@example.com'}
                      disabled
                    />
                  </div>
                  <div className="pt-2 flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => setIsEditing(false)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold">{user.username || 'User'}</h3>
                  <p className="text-muted-foreground">{user.email || 'user@example.com'}</p>
                  <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                    <div className="bg-secondary rounded-lg p-3 text-center">
                      <p className="text-sm text-muted-foreground">Games</p>
                      <p className="text-xl font-bold">{stats.gamesPlayed}</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-3 text-center">
                      <p className="text-sm text-muted-foreground">Friends</p>
                      <p className="text-xl font-bold">{stats.friendsCount}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Game Stats</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Best Score</span>
                    <span className="font-semibold">{stats.bestScore.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Average Score</span>
                    <span className="font-semibold">{stats.averageScore.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Score</span>
                    <span className="font-semibold">{stats.totalScore.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Daily Streak</span>
                    <span className="font-semibold">{stats.dailyStreak} days</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Achievements</h4>
                <div className="space-y-2">
                  {achievements.slice(0, 3).map((achievement, i) => (
                    <div key={i} className="flex items-center text-sm">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 text-primary">
                        {achievement.icon}
                      </div>
                      <div>
                        <p className="font-medium">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          
          {/* Activity Section */}
          <Card className="col-span-1 lg:col-span-2 p-6">
            <Tabs defaultValue="history">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="history">Game History</TabsTrigger>
                <TabsTrigger value="friends">Friends</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
              </TabsList>
              
              <TabsContent value="history" className="pt-4">
                <h3 className="text-lg font-bold mb-4">Recent Games</h3>
                <div className="space-y-2">
                  {gameHistory.map((game, i) => (
                    <div key={i} className="p-3 border rounded-lg flex justify-between items-center">
                      <div>
                        <div className="flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            game.type === 'Daily' ? 'bg-blue-500' : 'bg-green-500'
                          }`}></span>
                          <span className="font-medium">{game.type}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{game.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{game.score.toLocaleString()} pts</p>
                        {game.position && (
                          <p className="text-xs text-muted-foreground">
                            Position: {game.position}{getOrdinalSuffix(game.position)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="friends" className="pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Friends</h3>
                  <Button>
                    <UsersIcon className="h-4 w-4 mr-1.5" />
                    Invite Friends
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {friends.map((friend, i) => (
                    <div key={i} className="p-3 border rounded-lg flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full overflow-hidden mr-3">
                          <img 
                            src={friend.avatar} 
                            alt={friend.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium">{friend.name}</p>
                          <div className="flex items-center text-xs">
                            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                              friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                            }`}></span>
                            <span className="text-muted-foreground capitalize">{friend.status}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Challenge</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="achievements" className="pt-4">
                <h3 className="text-lg font-bold mb-4">Your Achievements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {achievements.map((achievement, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
                          {achievement.icon}
                        </div>
                        <div>
                          <p className="font-semibold">{achievement.name}</p>
                          <p className="text-xs text-muted-foreground">Earned on {achievement.date}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
};

// Helper function for ordinal suffixes
function getOrdinalSuffix(n: number): string {
  if (n > 3 && n < 21) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export default Profile;
