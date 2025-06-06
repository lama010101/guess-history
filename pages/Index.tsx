
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeLayout1 from "@/components/layouts/HomeLayout1";
import GameLayout1 from "@/components/layouts/GameLayout1";
import ResultsLayout2 from "@/components/layouts/ResultsLayout2";
import ProfileLayout1 from "@/components/layouts/ProfileLayout1";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="min-h-screen bg-history-light dark:bg-history-dark">
      <div className="bg-history-primary text-white py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Guess History</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="mb-6">
          <TabsList className="grid grid-cols-4 mb-8 max-w-3xl mx-auto">
            <TabsTrigger value="home">
              Home
            </TabsTrigger>
            <TabsTrigger value="game">
              Game
            </TabsTrigger>
            <TabsTrigger value="results">
              Results
            </TabsTrigger>
            <TabsTrigger value="profile">
              Profile
            </TabsTrigger>
          </TabsList>
          
          <div className="border rounded-xl overflow-hidden shadow-xl">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 text-sm text-center text-muted-foreground">
              Layout Preview
            </div>
            
            <TabsContent value="home" className="mt-0">
              <div className="h-[600px] overflow-auto">
                <HomeLayout1 />
              </div>
            </TabsContent>
            
            <TabsContent value="game" className="mt-0">
              <div className="h-[600px] overflow-auto">
                <GameLayout1 />
              </div>
            </TabsContent>
            
            <TabsContent value="results" className="mt-0">
              <div className="h-[600px] overflow-auto">
                <ResultsLayout2 />
              </div>
            </TabsContent>
            
            <TabsContent value="profile" className="mt-0">
              <div className="h-[600px] overflow-auto">
                <ProfileLayout1 />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
