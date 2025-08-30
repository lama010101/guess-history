import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Home as HomeIcon, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SettingsTab, { SettingsTabHandle } from '@/components/profile/SettingsTab';
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

  const tabRef = useRef<SettingsTabHandle | null>(null);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] h-screen p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-4 border-b border-border">
            <div className="relative flex items-center justify-center w-full">
              <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
              <button
                onClick={onClose}
                className="absolute right-2 top-1 inline-flex items-center justify-center rounded-full w-9 h-9 text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Close settings"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="py-2">
                {error && (
                  <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                {settings && (
                  <SettingsTab 
                    ref={tabRef}
                    userId={user.id}
                    settings={settings}
                    isLoading={isLoading}
                    onSettingsUpdated={handleSettingsUpdated}
                  />
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onNavigateHome && (
                <Button onClick={onNavigateHome} className="bg-white text-black hover:bg-gray-100">
                  <HomeIcon className="h-4 w-4 mr-2" />
                  Exit Game
                </Button>
              )}
              {error && (
                <Button onClick={reload}>
                  Retry
                </Button>
              )}
            </div>
            <div>
              <Button className="bg-orange-600 text-white hover:bg-orange-700 rounded-md" onClick={async () => { await tabRef.current?.save(); onClose(); }}>
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSettingsModal;
