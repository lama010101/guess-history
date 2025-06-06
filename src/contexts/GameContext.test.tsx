import React from 'react';
import { render, act } from '@testing-library/react';
import { GameProvider, useGame } from './GameContext';
import { MemoryRouter } from 'react-router-dom';

// Mock component to access context values
const GameAccuracyTester = ({ testRounds }) => {
  const { totalGameAccuracy, recordRoundResult } = useGame();
  
  React.useEffect(() => {
    // Record the test rounds when component mounts
    testRounds.forEach((round, index) => {
      recordRoundResult(round, index);
    });
  }, [testRounds, recordRoundResult]);
  
  return <div data-testid="accuracy">{totalGameAccuracy}</div>;
};

// Setup mock for supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    }),
    storage: {
      from: jest.fn().mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'test.jpg' } }),
      }),
    },
  },
}));

describe('GameContext - Accuracy Calculation', () => {
  // Basic setup for test environment
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('calculates totalGameAccuracy as the average of per-round percentages', async () => {
    const mockImages = Array(5).fill(null).map((_, i) => ({
      id: `img-${i}`,
      title: `Test Image ${i}`,
      description: 'Test',
      latitude: 0,
      longitude: 0,
      year: 2000,
      image_url: 'test.jpg',
      location_name: 'Test Location',
      url: 'test.jpg'
    }));
    
    // Mock rounds with 50% and 70% accuracy (based on scores of 500 and 700)
    const testRounds = [
      {
        guessCoordinates: { lat: 0, lng: 0 },
        distanceKm: 100,
        score: 500, // Should result in 50% accuracy
        guessYear: 2000
      },
      {
        guessCoordinates: { lat: 0, lng: 0 },
        distanceKm: 50,
        score: 700, // Should result in 70% accuracy
        guessYear: 2000
      }
    ];
    
    let renderedComponent;
    
    await act(async () => {
      renderedComponent = render(
        <MemoryRouter>
          <GameProvider>
            <GameAccuracyTester testRounds={testRounds} />
          </GameProvider>
        </MemoryRouter>
      );
    });
    
    // With rounds of 50% and 70%, the average should be 60%
    const accuracyElement = renderedComponent.getByTestId('accuracy');
    expect(accuracyElement.textContent).toBe('60');
  });
  
  it('caps totalGameAccuracy at 100% even with higher scores', async () => {
    const testRounds = [
      {
        guessCoordinates: { lat: 0, lng: 0 },
        distanceKm: 0,
        score: 1100, // Would be 110% without capping
        guessYear: 2000
      },
      {
        guessCoordinates: { lat: 0, lng: 0 },
        distanceKm: 0,
        score: 1200, // Would be 120% without capping
        guessYear: 2000
      }
    ];
    
    let renderedComponent;
    
    await act(async () => {
      renderedComponent = render(
        <MemoryRouter>
          <GameProvider>
            <GameAccuracyTester testRounds={testRounds} />
          </GameProvider>
        </MemoryRouter>
      );
    });
    
    // Even with scores above 100%, the accuracy should be capped at 100%
    const accuracyElement = renderedComponent.getByTestId('accuracy');
    expect(accuracyElement.textContent).toBe('100');
  });
  
  it('calculates totalGameAccuracy correctly using xpWhere and xpWhen values', async () => {
    // Mock rounds with xpWhere and xpWhen values
    const testRounds = [
      {
        guessCoordinates: { lat: 0, lng: 0 },
        distanceKm: 100,
        score: 500,
        guessYear: 2000,
        xpWhere: 80, // 80/100 location accuracy
        xpWhen: 60 // 60/100 time accuracy
      },
      {
        guessCoordinates: { lat: 0, lng: 0 },
        distanceKm: 50,
        score: 700,
        guessYear: 2000,
        xpWhere: 90, // 90/100 location accuracy
        xpWhen: 40 // 40/100 time accuracy
      }
    ];
    
    let renderedComponent;
    
    await act(async () => {
      renderedComponent = render(
        <MemoryRouter>
          <GameProvider>
            <GameAccuracyTester testRounds={testRounds} />
          </GameProvider>
        </MemoryRouter>
      );
    });
    
    // Calculate expected result:
    // Round 1: (80 + 60)/200 * 100 = 70%
    // Round 2: (90 + 40)/200 * 100 = 65%
    // Average: (70 + 65)/2 = 67.5%, rounded to 68%
    const accuracyElement = renderedComponent.getByTestId('accuracy');
    expect(accuracyElement.textContent).toBe('68');
  });
}); 