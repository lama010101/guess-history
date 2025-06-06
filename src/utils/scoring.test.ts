import { calculateRoundScore } from './scoring';

describe('calculateRoundScore', () => {
  test('should return the full score when no hints are used', () => {
    expect(calculateRoundScore(1000, 0)).toBe(1000);
    expect(calculateRoundScore(5000, 0)).toBe(5000);
  });

  test('should reduce the score by 10% when 1 hint is used', () => {
    expect(calculateRoundScore(1000, 1)).toBe(900);
    expect(calculateRoundScore(5000, 1)).toBe(4500);
  });

  test('should reduce the score by 20% when 2 hints are used', () => {
    expect(calculateRoundScore(1000, 2)).toBe(800);
    expect(calculateRoundScore(5000, 2)).toBe(4000);
  });

  test('should reduce the score by 30% when 3 hints are used', () => {
    expect(calculateRoundScore(1000, 3)).toBe(700);
    expect(calculateRoundScore(5000, 3)).toBe(3500);
  });

  test('should cap the penalty at 30% even if more than 3 hints are used', () => {
    expect(calculateRoundScore(1000, 4)).toBe(700);
    expect(calculateRoundScore(1000, 5)).toBe(700);
    expect(calculateRoundScore(5000, 10)).toBe(3500);
  });

  test('should handle non-integer values by rounding the final score', () => {
    // 333 - 10% = 299.7, rounded to 300
    expect(calculateRoundScore(333, 1)).toBe(300);
    
    // 333 - 20% = 266.4, rounded to 266
    expect(calculateRoundScore(333, 2)).toBe(266);
  });
}); 