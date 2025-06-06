import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HintModal from './HintModal';
import { HintType } from '@/hooks/useHint';

describe('HintModal', () => {
  const mockProps = {
    isOpen: true,
    onOpenChange: jest.fn(),
    selectedHintType: null as HintType,
    selectedHintTypes: [] as HintType[],
    hintContent: null,
    hintContents: {},
    onSelectHint: jest.fn(),
    onViewHint: jest.fn(),
    canSelectHint: true,
    canSelectHintType: () => true
  };

  test('should display penalty message when choosing a hint', () => {
    render(<HintModal {...mockProps} />);
    
    const penaltyMessage = screen.getByText(
      'Using a hint reduces your round score by 10% per hint (max 30% per round)'
    );
    expect(penaltyMessage).toBeInTheDocument();
  });

  test('should not display penalty message when viewing a selected hint', () => {
    const props = {
      ...mockProps,
      selectedHintType: 'where' as HintType,
      hintContent: 'Europe'
    };

    render(<HintModal {...props} />);
    
    const penaltyMessage = screen.queryByText(
      'Using a hint reduces your round score by 10% per hint (max 30% per round)'
    );
    expect(penaltyMessage).not.toBeInTheDocument();
  });
}); 