
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [useMiles, setUseMiles] = useState(false);
  const [useGlassTheme, setUseGlassTheme] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const distancePref = localStorage.getItem('distanceFormat');
    if (distancePref) {
      setUseMiles(distancePref === 'miles');
    }
    
    const themePref = localStorage.getItem('themeStyle');
    if (themePref) {
      setUseGlassTheme(themePref === 'glass');
    }
  }, []);

  const toggleDistanceFormat = (value: boolean) => {
    setUseMiles(value);
    localStorage.setItem('distanceFormat', value ? 'miles' : 'km');
    
    toast({
      title: `Distance format changed to ${value ? 'Miles' : 'Kilometers'}`,
      description: `Distances will now be displayed in ${value ? 'miles' : 'kilometers'}.`
    });
  };
  
  const toggleThemeStyle = (value: boolean) => {
    setUseGlassTheme(value);
    localStorage.setItem('themeStyle', value ? 'glass' : 'default');
    
    // Apply the glass class to the document body
    if (value) {
      document.documentElement.classList.add('glass-theme');
    } else {
      document.documentElement.classList.remove('glass-theme');
    }
    
    toast({
      title: `Theme style changed to ${value ? 'Glass' : 'Default'}`,
      description: `The app will now use the ${value ? 'glass morphism' : 'default'} style.`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="display" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="units">Units</TabsTrigger>
          </TabsList>
          
          <TabsContent value="display" className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme-style">Theme Style</Label>
                <p className="text-sm text-muted-foreground">
                  Choose between default or glass morphism
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={!useGlassTheme ? "font-medium" : "text-muted-foreground"}>Default</span>
                <Switch 
                  id="theme-style" 
                  checked={useGlassTheme} 
                  onCheckedChange={toggleThemeStyle}
                />
                <span className={useGlassTheme ? "font-medium" : "text-muted-foreground"}>Glass</span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="units" className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="distance-format">Distance Format</Label>
                <p className="text-sm text-muted-foreground">
                  Choose how distances are displayed
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={!useMiles ? "font-medium" : "text-muted-foreground"}>Km</span>
                <Switch 
                  id="distance-format" 
                  checked={useMiles} 
                  onCheckedChange={toggleDistanceFormat} 
                />
                <span className={useMiles ? "font-medium" : "text-muted-foreground"}>Miles</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
