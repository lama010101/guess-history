
import React, { createContext, useContext, useState, useCallback } from 'react';

interface NavigationHandlerContextType {
  registerNavigationHandler: (handler: (path: string) => boolean) => void;
  unregisterNavigationHandler: () => void;
  navigateTo: (path: string) => boolean;
}

const NavigationHandlerContext = createContext<NavigationHandlerContextType>({
  registerNavigationHandler: () => {},
  unregisterNavigationHandler: () => {},
  navigateTo: () => false,
});

export const NavigationConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [navigationHandler, setNavigationHandler] = useState<((path: string) => boolean) | null>(null);

  const registerNavigationHandler = useCallback((handler: (path: string) => boolean) => {
    setNavigationHandler(() => handler);
  }, []);

  const unregisterNavigationHandler = useCallback(() => {
    setNavigationHandler(null);
  }, []);

  const navigateTo = useCallback((path: string) => {
    if (navigationHandler) {
      return navigationHandler(path);
    }
    return false;
  }, [navigationHandler]);

  // Make the navigation handler available globally for components like Navbar
  if (typeof window !== 'undefined') {
    window.appNavigation = { navigateTo };
  }

  return (
    <NavigationHandlerContext.Provider value={{ registerNavigationHandler, unregisterNavigationHandler, navigateTo }}>
      {children}
    </NavigationHandlerContext.Provider>
  );
};

export const useNavigationConfirmation = () => useContext(NavigationHandlerContext);

// Add the navigation handler to the window object globally
declare global {
  interface Window {
    appNavigation?: {
      navigateTo: (path: string) => boolean;
    };
  }
}
