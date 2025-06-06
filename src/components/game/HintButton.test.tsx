import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HintButton } from './HintButton';

// Mock useHint hook
jest.mock('@/hooks/useHint', () => ({
  useHint: jest.fn(() => ({
    hintsUsedThisRound: 0,
    maxHintsPerRound: 3,
    canSelectHint: true,
    hintsAllowed: 15,
    hintsUsed: 0
  }))
}));

// Mock image data
const mockImage = {
  id: 'test-1',
  title: 'Test Image',
  description: 'Test description',
  latitude: 51.5,
  longitude: -0.1,
  year: 1990,
  image_url: 'test.jpg',
  location_name: 'London',
  url: 'test.jpg'
};

describe('HintButton', () => {
  test('should be enabled when hints are allowed and less than 3 hints used in the round', () => {
    // Mock implementation for this test
    const useHintMock = require('@/hooks/useHint').useHint;
    useHintMock.mockImplementation(() => ({
      hintsUsedThisRound: 2,
      maxHintsPerRound: 3,
      canSelectHint: true,
      hintsAllowed: 15,
      hintsUsed: 2
    }));

    const handleClick = jest.fn();
    render(<HintButton onClick={handleClick} imageForRound={mockImage} />);
    
    const button = screen.getByRole('button', { name: /hint/i });
    expect(button).toBeEnabled();
    
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });

  test('should be disabled when 3 hints have been used in the round', () => {
    // Mock implementation for this test
    const useHintMock = require('@/hooks/useHint').useHint;
    useHintMock.mockImplementation(() => ({
      hintsUsedThisRound: 3,
      maxHintsPerRound: 3,
      canSelectHint: false,
      hintsAllowed: 15,
      hintsUsed: 3
    }));

    const handleClick = jest.fn();
    render(<HintButton onClick={handleClick} imageForRound={mockImage} />);
    
    const button = screen.getByRole('button', { name: /hint/i });
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('should be disabled when all allowed hints have been used', () => {
    // Mock implementation for this test
    const useHintMock = require('@/hooks/useHint').useHint;
    useHintMock.mockImplementation(() => ({
      hintsUsedThisRound: 2,
      maxHintsPerRound: 3,
      canSelectHint: false,
      hintsAllowed: 15,
      hintsUsed: 15
    }));

    const handleClick = jest.fn();
    render(<HintButton onClick={handleClick} imageForRound={mockImage} />);
    
    const button = screen.getByRole('button', { name: /hint/i });
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('should display remaining hints count', () => {
    // Mock implementation for this test
    const useHintMock = require('@/hooks/useHint').useHint;
    useHintMock.mockImplementation(() => ({
      hintsUsedThisRound: 1,
      maxHintsPerRound: 3,
      canSelectHint: true,
      hintsAllowed: 15,
      hintsUsed: 5
    }));

    render(<HintButton onClick={() => {}} imageForRound={mockImage} />);
    
    const hintCount = screen.getByText('Hints: 10/15');
    expect(hintCount).toBeInTheDocument();
  });
}); 