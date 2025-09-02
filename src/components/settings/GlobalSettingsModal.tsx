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
      <DialogContent data-hide-close className="sm:max-w-[640px] max-h-[85vh] p-0 overflow-hidden bg-black/85 backdrop-blur-md border border-white/10 shadow-2xl sm:rounded-2xl">
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {/* Inline Title + Close */}
            <div className="relative mb-3 sm:mb-4">
              <h2 className="text-2xl font-bold text-center">Settings</h2>
              <button
                aria-label="Close"
                onClick={onClose}
                className="absolute right-0 top-1.5 grid place-items-center h-9 w-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
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

          <div className="sticky bottom-0 z-10 p-3 sm:p-4 border-t border-white/10 bg-black/85 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onNavigateHome && (
                <Button onClick={() => { 
                  // Close the settings modal first so the confirm dialog isn't obscured by this dialog's overlay
                  onClose();
                  // Defer navigation confirmation to the next tick to allow modal close animation/state to apply
                  setTimeout(() => { onNavigateHome(); }, 0);
                }} className="bg-white text-black hover:bg-gray-100">
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
