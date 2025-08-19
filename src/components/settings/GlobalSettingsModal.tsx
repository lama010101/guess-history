import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Home as HomeIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SettingsTab from '@/components/profile/SettingsTab';
import { fetchUserSettings, UserSettings } from '@/utils/profile/profileService';
import { useSettingsStore } from '@/lib/useSettingsStore';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateHome?: () => void;
}

const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose, onNavigateHome }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const setFromUserSettings = useSettingsStore(s => s.setFromUserSettings);

  // Load real user settings when modal opens
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isOpen || !user?.id) return;
      setIsLoading(true);
      const s = await fetchUserSettings(user.id);
      if (cancelled) return;
      setSettings(s);
      // Hydrate Zustand store for quick access in UI and in-game
      setFromUserSettings({
        sound_enabled: s?.sound_enabled,
        vibrate_enabled: s?.vibrate_enabled,
        gyroscope_enabled: s?.gyroscope_enabled,
      });
      setIsLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [isOpen, user?.id, setFromUserSettings]);

  const handleSettingsUpdated = async () => {
    if (!user?.id) return;
    const s = await fetchUserSettings(user.id);
    if (s) {
      setSettings(s);
      setFromUserSettings({
        sound_enabled: s.sound_enabled,
        vibrate_enabled: s.vibrate_enabled,
        gyroscope_enabled: s.gyroscope_enabled,
      });
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="py-4">
            {settings && (
              <SettingsTab 
                userId={user.id}
                settings={settings}
                isLoading={isLoading}
                onSettingsUpdated={handleSettingsUpdated}
              />
            )}
            
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                onClick={() => {
                  if (onNavigateHome) {
                    onNavigateHome();
                  } else if (typeof window !== 'undefined') {
                    window.location.assign('/');
                  }
                }}
                className="bg-white text-black hover:bg-gray-100 border border-gray-300"
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                Home
              </Button>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSettingsModal;
