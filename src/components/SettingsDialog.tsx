
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [useMiles, setUseMiles] = useState(false);
  const { toast } = useToast();

  // Load distance format preference
  useEffect(() => {
    const distancePref = localStorage.getItem('distanceFormat');
    if (distancePref) {
      setUseMiles(distancePref === 'miles');
    }
  }, []);

  // Toggle distance format
  const toggleDistanceFormat = (value: boolean) => {
    setUseMiles(value);
    localStorage.setItem('distanceFormat', value ? 'miles' : 'km');
    
    toast({
      title: `Distance format changed to ${value ? 'Miles' : 'Kilometers'}`,
      description: `Distances will now be displayed in ${value ? 'miles' : 'kilometers'}.`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your game experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
