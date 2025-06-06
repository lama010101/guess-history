import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LogContextType {
  logs: string;
  addLog: (message: string) => void;
  clearLogs: () => void;
  isLogWindowOpen: boolean;
  toggleLogWindow: () => void;
  openLogWindow: () => void;
  closeLogWindow: () => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export const LogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<string>('');
  const [isLogWindowOpen, setIsLogWindowOpen] = useState<boolean>(false);

  const addLog = useCallback((message: string) => {
    setLogs(prev => prev + message + '\n');
  }, []);

  const clearLogs = useCallback(() => {
    setLogs('');
  }, []);

  const toggleLogWindow = useCallback(() => {
    setIsLogWindowOpen(prev => !prev);
  }, []); 

  const openLogWindow = useCallback(() => {
    setIsLogWindowOpen(true);
  }, []);

  const closeLogWindow = useCallback(() => {
    setIsLogWindowOpen(false);
  }, []);

  return (
    <LogContext.Provider 
      value={{ 
        logs, 
        addLog, 
        clearLogs, 
        isLogWindowOpen, 
        toggleLogWindow,
        openLogWindow,
        closeLogWindow
      }}
    >
      {children}
    </LogContext.Provider>
  );
};

export const useLogs = (): LogContextType => {
  const context = useContext(LogContext);
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogProvider');
  }
  return context;
};

// Create a custom console logger that uses our context
const createConsoleLogger = (addLog: (message: string) => void) => {
  return {
    log: (...args: unknown[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      addLog(`[LOG] ${message}`);
      // Use the original console methods to avoid infinite loops
      const originalConsole = window.console as Console & { __original?: Console };
      if (originalConsole.__original?.log) {
        originalConsole.__original.log(...args);
      } else {
        originalConsole.log(...args);
      }
    },
    warn: (...args: unknown[]) => {
      const message = args.map(String).join(' ');
      addLog(`[WARN] ${message}`);
      const originalConsole = window.console as Console & { __original?: Console };
      if (originalConsole.__original?.warn) {
        originalConsole.__original.warn(...args);
      } else {
        originalConsole.warn(...args);
      }
    },
    error: (...args: unknown[]) => {
      const message = args.map(String).join(' ');
      addLog(`[ERROR] ${message}`);
      const originalConsole = window.console as Console & { __original?: Console };
      if (originalConsole.__original?.error) {
        originalConsole.__original.error(...args);
      } else {
        originalConsole.error(...args);
      }
    },
  };
};

// Hook to set up console logging
export const useConsoleLogging = () => {
  const { addLog } = useLogs();
  
  React.useEffect(() => {
    // Store original console methods if not already stored
    if (!('__original' in console)) {
      (window.console as any).__original = {
        log: console.log,
        warn: console.warn,
        error: console.error,
      };
    }
    
    const logger = createConsoleLogger(addLog);
    
    // Override console methods
    const originalConsole = window.console as Console & { __original?: Console };
    
    // Only override if not already overridden by another instance
    if (originalConsole.__original) {
      console.log = logger.log;
      console.warn = logger.warn;
      console.error = logger.error;
    }
    
    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      const message = `Uncaught error: ${event.message}${event.filename ? ` at ${event.filename}:${event.lineno}:${event.colno}` : ''}`;
      logger.error(message);
    };
    
    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error 
        ? event.reason.message 
        : String(event.reason);
      logger.error('Unhandled promise rejection:', reason);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection as EventListener);
    
    return () => {
      // Restore original console methods if they haven't been changed
      if (originalConsole.__original) {
        console.log = originalConsole.__original.log;
        console.warn = originalConsole.__original.warn;
        console.error = originalConsole.__original.error;
        // @ts-ignore - We know this exists because we set it
        delete window.console.__original;
      }
      
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection as EventListener);
    };
  }, [addLog]);
};


