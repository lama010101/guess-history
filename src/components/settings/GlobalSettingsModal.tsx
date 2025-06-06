import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SettingsTab from '@/components/profile/SettingsTab';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Mock user settings for the modal
  const mockSettings = {
    theme: 'system',
    soundEffects: true,
    music: true,
    notifications: true,
    language: 'en',
  };

  // Simulate loading settings
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Simulate API call
      const timer = setTimeout(() => {
        setSettings(mockSettings);
        setIsLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSettingsUpdated = () => {
    // Refresh settings if needed
    console.log('Settings updated');
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
            <SettingsTab 
              userId={user.id}
              settings={settings || mockSettings}
              isLoading={isLoading}
              onSettingsUpdated={handleSettingsUpdated}
            />
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={isSaving}
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
