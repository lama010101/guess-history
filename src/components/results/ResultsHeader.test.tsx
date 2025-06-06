import React from 'react';
import { render, screen } from '@testing-library/react';
import ResultsHeader from './ResultsHeader';

// Mock the SegmentedProgressBar component
jest.mock('@/components/ui', () => ({
  SegmentedProgressBar: () => <div data-testid="progress-bar">ProgressBar</div>
}));

describe('ResultsHeader', () => {
  it('renders the round number without the word "Results"', () => {
    render(
      <ResultsHeader 
        round={2} 
        totalRounds={5} 
      />
    );
    
    expect(screen.getByText('Round 2 / 5')).toBeInTheDocument();
    expect(screen.queryByText('Results')).not.toBeInTheDocument();
    expect(screen.queryByText('Round 2 / 5 Results')).not.toBeInTheDocument();
  });
  
  it('renders the Next Round button when onNext is provided and not the last round', () => {
    const mockOnNext = jest.fn();
    
    render(
      <ResultsHeader 
        round={2} 
        totalRounds={5} 
        onNext={mockOnNext}
      />
    );
    
    expect(screen.getByText('Next Round')).toBeInTheDocument();
  });
  
  it('renders the Finish Game button on the last round', () => {
    const mockOnNext = jest.fn();
    
    render(
      <ResultsHeader 
        round={5} 
        totalRounds={5} 
        onNext={mockOnNext}
      />
    );
    
    expect(screen.getByText('Finish Game')).toBeInTheDocument();
  });
}); 