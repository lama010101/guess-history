
export const initializeOneSignal = (appId: string) => {
  if (typeof window === 'undefined') return;
  
  // Load the OneSignal script
  const loadScript = () => {
    return new Promise<void>((resolve) => {
      if (window.OneSignal) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
      script.async = true;
      
      script.onload = () => {
        resolve();
      };
      
      document.body.appendChild(script);
    });
  };
  
  const initOneSignal = async () => {
    await loadScript();
    
    if (!window.OneSignal) {
      console.error('OneSignal failed to load');
      return;
    }
    
    window.OneSignal = window.OneSignal || [];
    
    window.OneSignal.push(function() {
      window.OneSignal.init({
        appId: appId || 'aa5b64e9-f512-4cd6-9bc7-fac06adab021', // Use provided App ID as default
        notifyButton: {
          enable: false,
        },
        allowLocalhostAsSecureOrigin: true,
      });
    });
    
    // Handle OneSignal ID for profile sync
    if (window.OneSignal.getUserId) {
      window.OneSignal.getUserId((playerId) => {
        if (playerId) {
          // Save to localStorage temporarily
          localStorage.setItem('onesignal_player_id', playerId);
          
          // We'll sync this with the user profile in the Profile component
          console.log('OneSignal Player ID:', playerId);
        }
      });
    }
  };
  
  initOneSignal();
};

// Declare global OneSignal type
declare global {
  interface Window {
    OneSignal: any;
  }
}
