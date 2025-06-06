
import React from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Award,
  User,
  Settings,
  ChevronLeft,
  CheckCircle,
  LockIcon,
  BarChart
} from "lucide-react";

const ProfileLayout1 = () => {
  return (
    <div className="min-h-screen bg-history-light dark:bg-history-dark">
      <div className="max-w-4xl mx-auto p-4 pt-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" size="icon" className="mr-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-history-primary dark:text-history-light">Your Profile</h1>
        </div>
        
        {/* Profile Header */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-history-secondary">
                <img 
                  src="https://source.unsplash.com/random/200x200/?historical,portrait" 
                  alt="Profile avatar" 
                  className="h-full w-full object-cover"
                />
              </div>
              <Button size="icon" className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white dark:bg-gray-800 shadow">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-grow text-center sm:text-left">
              <h2 className="text-xl font-bold mb-1 text-history-primary dark:text-history-light">History Explorer</h2>
              <div className="text-muted-foreground mb-3">Joined April 2023</div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Level 12</span>
                    <span className="text-xs text-muted-foreground">4,230 XP</span>
                  </div>
                  <span className="text-xs text-muted-foreground">5,000 XP needed</span>
                </div>
                <Progress value={84} className="h-2" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs for Profile Sections - Reordered to show Stats first */}
        <Tabs defaultValue="stats">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="stats" className="data-[state=active]:bg-history-primary data-[state=active]:text-white">
              <BarChart className="mr-2 h-4 w-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="badges" className="data-[state=active]:bg-history-primary data-[state=active]:text-white">
              <Award className="mr-2 h-4 w-4" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="avatars" className="data-[state=active]:bg-history-primary data-[state=active]:text-white">
              <User className="mr-2 h-4 w-4" />
              Avatars
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats" className="mt-0">
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-6 text-history-primary dark:text-history-light">Your Statistics</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-history-primary dark:text-history-light">248</div>
                  <div className="text-sm text-muted-foreground">Games Played</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-history-primary dark:text-history-light">79%</div>
                  <div className="text-sm text-muted-foreground">Avg. Accuracy</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-history-primary dark:text-history-light">95%</div>
                  <div className="text-sm text-muted-foreground">Best Accuracy</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-history-primary dark:text-history-light">21</div>
                  <div className="text-sm text-muted-foreground">Perfect Scores</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-history-primary dark:text-history-light">4,230</div>
                  <div className="text-sm text-muted-foreground">Total XP</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-history-primary dark:text-history-light">#156</div>
                  <div className="text-sm text-muted-foreground">Global Rank</div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <h4 className="font-medium mb-3 text-history-primary dark:text-history-light">Accuracy Breakdown</h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Time Accuracy</span>
                      <span className="font-medium">84%</span>
                    </div>
                    <Progress value={84} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Location Accuracy</span>
                      <span className="font-medium">71%</span>
                    </div>
                    <Progress value={71} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Daily Challenges</span>
                      <span className="font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="badges" className="mt-0">
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-history-primary dark:text-history-light">Your Badges</h3>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {/* Unlocked badges */}
                {[1, 2, 3, 4, 5].map((badge) => (
                  <div key={badge} className="aspect-square rounded-lg bg-history-secondary/10 p-2 flex flex-col items-center justify-center text-center">
                    <div className="h-12 w-12 rounded-full bg-history-secondary flex items-center justify-center mb-2">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-medium">Time Master</span>
                  </div>
                ))}
                
                {/* Locked badges */}
                {[1, 2, 3, 4, 5, 6, 7].map((badge) => (
                  <div key={badge + 10} className="aspect-square rounded-lg bg-gray-200 dark:bg-gray-800 p-2 flex flex-col items-center justify-center text-center opacity-60">
                    <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center mb-2">
                      <LockIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Locked</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="avatars" className="mt-0">
            <div className="glass-card rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-history-primary dark:text-history-light">Select Avatar</h3>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">All</Button>
                  <Button size="sm" variant="outline">Male</Button>
                  <Button size="sm" variant="outline">Female</Button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-6">
                {[...Array(15)].map((_, i) => (
                  <button key={i} className={`aspect-square rounded-lg overflow-hidden border-2 ${i === 0 ? 'border-history-secondary' : 'border-transparent'}`}>
                    <img 
                      src={`https://source.unsplash.com/random/100x100/?historical,portrait,${i}`}
                      alt={`Avatar option ${i+1}`} 
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
              
              <div className="flex justify-center">
                <Button variant="outline" className="text-muted-foreground">
                  Restore Original
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfileLayout1;
