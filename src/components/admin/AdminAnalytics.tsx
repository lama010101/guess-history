
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Trophy, User, Calendar, CreditCard, Clock } from "lucide-react";

// Mock data for analytics
const analyticsData = {
  totalUsers: 4256,
  activeUsers: 1823,
  gamesPlayed: 18542,
  avgScore: 6453,
  totalImages: 156,
  revenue: 3245.78
};

const AdminAnalytics = () => {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Daily active users
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Games Played</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.gamesPlayed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total completed games
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Popular Events */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Popular Events</CardTitle>
            <CardDescription>Most frequently played events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Historical Event #{i}</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.floor(Math.random() * 1000) + 500} plays
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    Avg Score: {Math.floor(Math.random() * 8000) + 2000}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Activity */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest user interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted"></div>
                  <div className="flex-1">
                    <p className="font-medium">User{Math.floor(Math.random() * 1000)}</p>
                    <p className="text-sm text-muted-foreground">
                      {i % 2 === 0 ? "Completed a game" : "Earned achievement"}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <Clock className="inline-block h-3 w-3 mr-1" />
                    {i * 4}m ago
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Revenue Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Premium membership and in-app purchases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold">
                ${analyticsData.revenue.toLocaleString()}
              </p>
              <div className="text-xs text-muted-foreground">
                +8% from last month
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Premium Subscriptions</p>
              <p className="text-3xl font-bold">
                243
              </p>
              <div className="text-xs text-muted-foreground">
                18 new this week
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Hint Coin Purchases</p>
              <p className="text-3xl font-bold">
                1,542
              </p>
              <div className="text-xs text-muted-foreground">
                +12% conversion rate
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
