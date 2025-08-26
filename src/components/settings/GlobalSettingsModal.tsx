import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Home as HomeIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SettingsTab from '@/components/profile/SettingsTab';
import { fetchUserSettings, UserSettings } from '@/utils/profile/profileService';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Manual reload for retry button
  const reload = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const s = await fetchUserSettings(user.id);
      setSettings(s);
      setFromUserSettings({
        sound_enabled: s?.sound_enabled,
        vibrate_enabled: s?.vibrate_enabled,
        gyroscope_enabled: s?.gyroscope_enabled,
      });
    } catch (e) {
      console.error('Failed to load settings', e);
      setError('Failed to load settings. Please try again.');
      toast({
        title: 'Failed to load settings',
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load real user settings when modal opens
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isOpen || !user?.id) return;
      setIsLoading(true);
      setError(null);
      try {
        const s = await fetchUserSettings(user.id);
        if (cancelled) return;
        setSettings(s);
        // Hydrate Zustand store for quick access in UI and in-game
        setFromUserSettings({
          sound_enabled: s?.sound_enabled,
          vibrate_enabled: s?.vibrate_enabled,
          gyroscope_enabled: s?.gyroscope_enabled,
        });
      } catch (e) {
        if (cancelled) return;
        console.error('Failed to load settings', e);
        setError('Failed to load settings. Please try again.');
        toast({
          title: 'Failed to load settings',
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isOpen, user?.id, setFromUserSettings]);

  const handleSettingsUpdated = async () => {
    if (!user?.id) return;
    try {
      const s = await fetchUserSettings(user.id);
      if (s) {
        setSettings(s);
        setFromUserSettings({
          sound_enabled: s.sound_enabled,
          vibrate_enabled: s.vibrate_enabled,
          gyroscope_enabled: s.gyroscope_enabled,
        });
        toast({ title: 'Settings updated' });
      }
    } catch (e) {
      console.error('Failed to refresh settings', e);
      toast({
        title: 'Failed to refresh settings',
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <Button
              onClick={() => {
                if (onNavigateHome) {
                  onNavigateHome();
                } else if (typeof window !== 'undefined') {
                  window.location.assign('/test');
                }
              }}
              className="bg-white text-black hover:bg-gray-100 border border-gray-300"
            >
              <HomeIcon className="h-4 w-4 mr-2" />
              Home
            </Button>
            <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
            <div className="w-[86px]" aria-hidden="true" />
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="py-4">
            {error && (
              <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {settings && (
              <SettingsTab 
                userId={user.id}
                settings={settings}
                isLoading={isLoading}
                onSettingsUpdated={handleSettingsUpdated}
              />
            )}
            
            <div className="mt-6 flex items-center justify-end gap-3">
              {error && (
                <Button onClick={reload}>
                  Retry
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSettingsModal;
