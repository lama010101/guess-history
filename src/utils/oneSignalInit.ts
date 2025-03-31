
// Function to initialize OneSignal SDK
export const initializeOneSignal = (appId: string) => {
  // Add OneSignal Script to the page if it doesn't exist
  if (!document.getElementById('onesignal-sdk')) {
    const script = document.createElement('script');
    script.id = 'onesignal-sdk';
    script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
    script.async = true;
    document.head.appendChild(script);
    
    script.onload = () => {
      setupOneSignal(appId);
    };
  } else {
    setupOneSignal(appId);
  }
};

// Function to set up OneSignal with the provided app ID
const setupOneSignal = (appId: string) => {
  if (!window.OneSignal) return;
  
  window.OneSignal = window.OneSignal || [];
  window.OneSignal.push(function() {
    window.OneSignal.init({
      appId: appId,
      notifyButton: {
        enable: false,
      },
      allowLocalhostAsSecureOrigin: true,
    });
  });
};

// Function to save OneSignal Player ID to user profile
export const saveOneSignalPlayerId = async (supabase: any, userId: string) => {
  if (!window.OneSignal || !userId) return;
  
  try {
    window.OneSignal.getUserId(async function(playerId: string) {
      if (playerId) {
        const { error } = await supabase
          .from('profiles')
          .update({ onesignal_player_id: playerId })
          .eq('id', userId);
          
        if (error) {
          console.error('Error saving OneSignal player ID:', error);
        } else {
          console.log('OneSignal player ID saved:', playerId);
        }
      }
    });
  } catch (error) {
    console.error('Error getting or saving OneSignal player ID:', error);
  }
};

// Add OneSignal types
declare global {
  interface Window {
    OneSignal: any;
  }
}
