import React, { useEffect, useRef, useMemo } from 'react';
import { useSettingsStore } from '@/lib/useSettingsStore';

// Helper function to format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Helper to generate a smooth color transition from green to red
const getTimerColor = (percentage: number): string => {
  // Start with green (120 hue), transition to yellow (60 hue), then red (0 hue)
  const hue = Math.max(0, Math.min(120, percentage * 1.2));
  return `hsl(${hue}, 100%, ${percentage < 20 ? 50 : 45}%)`;
};

interface TimerDisplayProps {
  remainingTime: number;
  setRemainingTime: React.Dispatch<React.SetStateAction<number>>;
  isActive: boolean;
  onTimeout?: () => void;
  roundTimerSec: number;
  externalTimer?: boolean;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
  remainingTime,
  setRemainingTime,
  isActive,
  onTimeout,
  roundTimerSec,
  externalTimer = false
}) => {
  const { soundEnabled, vibrateEnabled } = useSettingsStore();
  const countdownBeepRef = useRef<HTMLAudioElement | null>(null);
  const lastVibrateSecondRef = useRef<number | null>(null);
  
  // Debug incoming props (dev only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      try { console.debug('[TimerDisplay] props', { externalTimer, isActive, remainingTime, roundTimerSec }); } catch {}
    }
  }, [externalTimer, isActive, remainingTime, roundTimerSec]);
  
  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      countdownBeepRef.current = new Audio('/sounds/countdown-beep.mp3');
      countdownBeepRef.current.preload = 'auto';
    }
    
    return () => {
      if (countdownBeepRef.current) {
        countdownBeepRef.current.pause();
        countdownBeepRef.current = null;
      }
    };
  }, []);
  
  // Play countdown sound effect when time <= 10 seconds and stop when round is over
  useEffect(() => {
    // Stop any playing sounds if timer is not active or time is up
    if (!isActive || remainingTime <= 0) {
      if (countdownBeepRef.current) {
        countdownBeepRef.current.pause();
      }
      return;
    }
    
    // Play beep sound for countdown when under 10 seconds
    if (remainingTime <= 10 && remainingTime > 0 && soundEnabled) {
      if (countdownBeepRef.current) {
        const beepSound = countdownBeepRef.current.cloneNode() as HTMLAudioElement;
        beepSound.volume = 1.0;
        beepSound.play().catch(e => console.error('Error playing countdown sound:', e));
      }
    }
    // Vibrate once per second when under 10 seconds if enabled
    if (
      vibrateEnabled &&
      typeof navigator !== 'undefined' && typeof (navigator as any).vibrate === 'function' &&
      remainingTime <= 10 && remainingTime > 0 &&
      lastVibrateSecondRef.current !== remainingTime
    ) {
      try { (navigator as any).vibrate(60); } catch {}
      lastVibrateSecondRef.current = remainingTime;
    }
  }, [remainingTime, isActive, soundEnabled, vibrateEnabled]);
  
  // Update timer when round changes (disabled if using external timer control)
  useEffect(() => {
    if (externalTimer) {
      return;
    }
    if (roundTimerSec > 0) {
      setRemainingTime(roundTimerSec);
    }
  }, [roundTimerSec, setRemainingTime, externalTimer]);

  // Calculate progress for circular timer
  const { progress, isCritical, size, strokeWidth, radius, circumference, strokeDashoffset, color } = useMemo(() => {
    if (roundTimerSec <= 0) return {
      progress: 0,
      isCritical: false,
      size: 40, // Slightly larger size
      strokeWidth: 4,
      radius: 0,
      circumference: 0,
      strokeDashoffset: 0,
      color: '#22c55e' // Default green
    };

    const progress = Math.max(0, Math.min(100, (remainingTime / roundTimerSec) * 100));
    const isCritical = remainingTime <= 10;
    const size = 42; // Slightly larger for better visibility
    const strokeWidth = 4; // Thicker stroke
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    const color = getTimerColor(progress);

    return { progress, isCritical, size, strokeWidth, radius, circumference, strokeDashoffset, color };
  }, [remainingTime, roundTimerSec]);

  // Timer countdown effect (disabled if using external timer control)
  useEffect(() => {
    if (externalTimer) {
      return;
    }
    // If timer is not active, do nothing
    if (!isActive) {
      return;
    }

    // If time is already up, call onTimeout and exit
    if (remainingTime <= 0) {
      if (onTimeout) {
        onTimeout();
      }
      return;
    }

    // Timer is active and time > 0, start the interval
    const timerInterval = setInterval(() => {
      setRemainingTime(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerInterval);
          if (onTimeout) {
            // Ensure onTimeout is called after state update
            setTimeout(() => onTimeout(), 0);
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Clean up interval on unmount or when dependencies change
    return () => clearInterval(timerInterval);
  }, [isActive, remainingTime, onTimeout, setRemainingTime, externalTimer]);

  // Final strong vibration pattern on timeout
  useEffect(() => {
    if (!vibrateEnabled) return;
    if (remainingTime !== 0) return;
    if (typeof navigator !== 'undefined' && typeof (navigator as any).vibrate === 'function') {
      try { (navigator as any).vibrate([160, 80, 160]); } catch {}
    }
  }, [remainingTime, vibrateEnabled]);

  if (roundTimerSec <= 0) {
    return null;
  }

  // Timer style based on screenshots
  const isRed = remainingTime <= 10;
  const bgColor = isRed ? 'rgba(239,68,68,0.8)' : 'rgba(0,0,0,0.6)';
  const textClass = isRed ? 'animate-pulse' : '';

  return (
    <div
      className={`inline-flex items-center rounded-lg border px-2.5 py-1 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${isRed ? 'bg-red-500 text-white animate-pulse' : 'bg-black/30 backdrop-blur-sm text-white'}`}
      aria-live="polite"
      style={{
        boxShadow: isRed ? '0 0 0 4px rgba(239,68,68,0.15)' : undefined,
        borderColor: 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <span className="sr-only">Time remaining: </span>
      <div className="flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>{formatTime(remainingTime)}</span>
      </div>
    </div>
  );
};

export default TimerDisplay;
