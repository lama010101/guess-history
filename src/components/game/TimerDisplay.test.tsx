import { render, screen } from '@testing-library/react';
import TimerDisplay from './TimerDisplay';
import { useGame } from '@/contexts/GameContext';
import { useSettingsStore } from '@/lib/useSettingsStore';

// Mock the game context
jest.mock('@/contexts/GameContext', () => ({
  useGame: jest.fn()
}));

// Mock the settings store
jest.mock('@/lib/useSettingsStore', () => ({
  useSettingsStore: jest.fn()
}));

describe('TimerDisplay Component', () => {
  const mockSetRemainingTime = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the context default values
    (useGame as jest.Mock).mockReturnValue({
      roundTimerSec: 60
    });
    
    // Mock settings default values
    (useSettingsStore as jest.Mock).mockReturnValue({
      soundEnabled: true
    });
    
    // Mock Audio
    global.Audio = jest.fn().mockImplementation(() => ({
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      preload: '',
      cloneNode: jest.fn().mockImplementation(() => ({
        play: jest.fn().mockResolvedValue(undefined),
        volume: 0
      }))
    }));
  });
  
  it('displays the time in correct format', () => {
    render(
      <TimerDisplay 
        remainingTime={65} 
        setRemainingTime={mockSetRemainingTime} 
        isActive={true}
      />
    );
    
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });
  
  it('applies red text when 10 seconds or less remain', () => {
    render(
      <TimerDisplay 
        remainingTime={9} 
        setRemainingTime={mockSetRemainingTime} 
        isActive={true}
      />
    );
    
    const timerElement = screen.getByText('0:09');
    expect(timerElement).toHaveClass('text-red-600');
  });
  
  it('does not apply red text when more than 10 seconds remain', () => {
    render(
      <TimerDisplay 
        remainingTime={11} 
        setRemainingTime={mockSetRemainingTime} 
        isActive={true}
      />
    );
    
    const timerElement = screen.getByText('0:11');
    expect(timerElement).not.toHaveClass('text-red-600');
  });
}); 