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
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
  remainingTime,
  setRemainingTime,
  isActive,
  onTimeout,
  roundTimerSec
}) => {
  const { soundEnabled } = useSettingsStore();
  const countdownBeepRef = useRef<HTMLAudioElement | null>(null);
  
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
  
  // Play countdown sound effect when time <= 10 seconds
  useEffect(() => {
    if (isActive && remainingTime <= 10 && remainingTime > 0 && soundEnabled) {
      if (countdownBeepRef.current) {
        const beepSound = countdownBeepRef.current.cloneNode() as HTMLAudioElement;
        beepSound.volume = 0.5;
        beepSound.play().catch(e => console.error('Error playing countdown sound:', e));
      }
    }
  }, [remainingTime, isActive, soundEnabled]);
  
  // Update timer when round changes
  useEffect(() => {
    if (roundTimerSec > 0) {
      setRemainingTime(roundTimerSec);
    }
  }, [roundTimerSec, setRemainingTime]);

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

  // Timer countdown effect
  useEffect(() => {
    if (!isActive || remainingTime <= 0) {
      if (remainingTime <= 0 && onTimeout) {
        onTimeout();
      }
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => onTimeout?.(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, remainingTime, onTimeout, setRemainingTime]);

  if (roundTimerSec <= 0) {
    return null;
  }

  // Timer style based on screenshots
  const isRed = remainingTime <= 10;
  const bgColor = isRed ? 'rgba(239,68,68,0.8)' : 'rgba(0,0,0,0.6)';
  const textClass = isRed ? 'animate-pulse' : '';

  return (
    <div
      className={`relative flex items-center justify-center select-none`}
      aria-live="polite"
      style={{ width: 40, height: 24 }}
    >
      <div
        className={`absolute inset-0 rounded-full flex items-center justify-center ${textClass}`}
        style={{
          boxShadow: isRed ? '0 0 0 4px rgba(239,68,68,0.15)' : undefined
        }}
      >
        <span
          className="font-bold text-white text-sm"
          style={{
            textShadow: '0 0 2px #000, 0 0 2px #000, 0 1px 2px #000',
            letterSpacing: '0.03em',
            lineHeight: 1,
            userSelect: 'none',
          }}
          aria-atomic="true"
        >
          <span className="sr-only">Time remaining: </span>
          {formatTime(remainingTime)}
        </span>
      </div>
    </div>
  );
};

export default TimerDisplay;
