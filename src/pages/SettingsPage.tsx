import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SunIcon, MoonIcon } from "lucide-react";

// Rename component
const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  
  // This ensures we always have a valid theme
  const currentTheme = theme === 'system' ? 'light' : theme || 'light';

  return (
    // ... (rest of JSX)
    <div className="max-w-4xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-8 text-history-primary">Settings</h1>
      <div className="glass-card rounded-xl p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4 text-history-primary">Theme</h2>
            <RadioGroup 
              value={currentTheme} 
              onValueChange={setTheme} 
              className="grid grid-cols-2 gap-4"
            >
              {/* Light Theme Option */}
              <div>
                <RadioGroupItem value="light" id="theme-light" className="peer sr-only" />
                <Label htmlFor="theme-light" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-background p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                  <SunIcon className="h-8 w-8 mb-2 text-history-primary" />
                  Light
                </Label>
              </div>
              {/* Dark Theme Option */}
              <div>
                <RadioGroupItem value="dark" id="theme-dark" className="peer sr-only" />
                <Label htmlFor="theme-dark" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-background p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                  <MoonIcon className="h-8 w-8 mb-2 text-history-primary" />
                  Dark
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; // Export with new name 