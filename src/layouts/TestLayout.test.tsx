import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TestLayout from './TestLayout';
import { GameContext } from '@/contexts/GameContext';

// Mock the components used in TestLayout
jest.mock('@/components/NavProfile', () => ({
  NavProfile: () => <div data-testid="nav-profile">NavProfile</div>
}));

jest.mock('@/components/NavMenu', () => ({
  NavMenu: () => <div data-testid="nav-menu">NavMenu</div>
}));

jest.mock('@/components/StatsDisplay', () => ({
  StatsDisplay: () => <div data-testid="stats-display">StatsDisplay</div>
}));

jest.mock('@/components/Logo', () => ({
  __esModule: true,
  default: () => <div data-testid="logo">Logo</div>
}));

describe('TestLayout', () => {
  const mockGameContextValue = {
    roomId: 'test-room',
    images: [],
    roundResults: [],
    isLoading: false,
    error: null,
    hintsAllowed: 3,
    roundTimerSec: 60,
    totalGameAccuracy: 75,
    totalGameXP: 1500,
    globalAccuracy: 80,
    globalXP: 5000,
    setHintsAllowed: jest.fn(),
    setRoundTimerSec: jest.fn(),
    startGame: jest.fn(),
    recordRoundResult: jest.fn(),
    resetGame: jest.fn(),
    fetchGlobalMetrics: jest.fn()
  };

  it('shows logo and StatsDisplay on non-game pages', () => {
    render(
      <GameContext.Provider value={mockGameContextValue}>
        <MemoryRouter initialEntries={['/test']}>
          <Routes>
            <Route path="/test" element={<TestLayout />}>
              <Route index element={<div>Home Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </GameContext.Provider>
    );

    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getByTestId('stats-display')).toBeInTheDocument();
    expect(screen.queryByText(/Score for this game/i)).not.toBeInTheDocument();
  });

  it('shows game score and hides StatsDisplay on game pages', () => {
    render(
      <GameContext.Provider value={mockGameContextValue}>
        <MemoryRouter initialEntries={['/test/game/room/test-room/round/1']}>
          <Routes>
            <Route path="/test/game/room/:roomId/round/:roundNumber" element={<TestLayout />}>
              <Route index element={<div>Game Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </GameContext.Provider>
    );

    expect(screen.queryByTestId('logo')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stats-display')).not.toBeInTheDocument();
    expect(screen.getByText(/Score for this game/i)).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('1500 XP')).toBeInTheDocument();
  });

  it('shows game score and hides StatsDisplay on round-results pages', () => {
    render(
      <GameContext.Provider value={mockGameContextValue}>
        <MemoryRouter initialEntries={['/test/game/room/test-room/round-results/1']}>
          <Routes>
            <Route path="/test/game/room/:roomId/round-results/:roundNumber" element={<TestLayout />}>
              <Route index element={<div>Round Results Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </GameContext.Provider>
    );

    expect(screen.queryByTestId('logo')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stats-display')).not.toBeInTheDocument();
    expect(screen.getByText(/This game:/i)).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
  });

  it('shows logo and StatsDisplay on final-results page', () => {
    render(
      <GameContext.Provider value={mockGameContextValue}>
        <MemoryRouter initialEntries={['/test/final-results']}>
          <Routes>
            <Route path="/test/final-results" element={<TestLayout />}>
              <Route index element={<div>Final Results Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </GameContext.Provider>
    );

    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0); // Global accuracy
    expect(screen.getAllByText('5000').length).toBeGreaterThan(0); // Global XP
    expect(screen.queryByText(/This game:/i)).not.toBeInTheDocument();
  });

  it('rounds all numeric values in the navbar', () => {
    // Update mock values to include decimals
    const mockWithDecimals = {
      ...mockGameContextValue,
      totalGameAccuracy: 75.6,
      totalGameXP: 1500.3,
      globalAccuracy: 80.8,
      globalXP: 5000.7
    };

    render(
      <GameContext.Provider value={mockWithDecimals}>
        <MemoryRouter initialEntries={['/test/game/room/test-room/round/1']}>
          <Routes>
            <Route path="/test/game/room/:roomId/round/:roundNumber" element={<TestLayout />}>
              <Route index element={<div>Game Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </GameContext.Provider>
    );

    // Should display rounded values 
    expect(screen.getByText('76%')).toBeInTheDocument(); // Rounded from 75.6
    expect(screen.getByText('1500')).toBeInTheDocument(); // Rounded from 1500.3
  });
}); 