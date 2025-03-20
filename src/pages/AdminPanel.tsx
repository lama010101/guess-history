
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminGameSettings from "@/components/admin/AdminGameSettings";
import AdminEventsManager from "@/components/admin/AdminEventsManager";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("events");

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      
      <main className="container px-4 py-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
        
        <Tabs defaultValue="events" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="events">Events & Images</TabsTrigger>
            <TabsTrigger value="settings">Game Settings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="events" className="space-y-4">
            <AdminEventsManager />
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <AdminGameSettings />
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <AdminAnalytics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;
