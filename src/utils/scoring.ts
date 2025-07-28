/**
 * @deprecated This function is deprecated and will be removed in a future version. 
 * Please use the centralized scoring functions in `src/utils/gameCalculations.ts` instead.
 *
 * Calculates the final round score after applying penalties for hint usage
 * 
 * @param baseScore The initial calculated score before penalties
 * @param hintsUsed The number of hints used in the round (defaults to 0 if not provided or invalid)
 * @returns The final score after applying hint penalties, always returns a valid number (minimum 0)
 */
export function calculateRoundScore(baseScore: number, hintsUsed: number = 0): number {
  // Ensure baseScore is a valid number, default to 0 if not
  const safeBaseScore = Number.isFinite(baseScore) ? baseScore : 0;
  
  // Ensure hintsUsed is a valid number and cap it at 3
  const safeHintsUsed = Math.min(Math.max(0, Number.isFinite(hintsUsed) ? hintsUsed : 0), 3);
  
  // Each hint reduces score by 10%, up to 30% for 3 hints
  const penaltyMultiplier = 1 - 0.1 * safeHintsUsed;
  
  // Apply the penalty, round to nearest integer, and ensure it's not negative
  const finalScore = Math.max(0, Math.round(safeBaseScore * penaltyMultiplier));
  
  return Number.isFinite(finalScore) ? finalScore : 0;
}

/**
 * @deprecated This function is deprecated and will be removed in a future version. 
 * Please use the centralized scoring functions in `src/utils/gameCalculations.ts` instead.
 *
 * Applies hint penalties to a score
 * @param baseScore The base score before applying hint penalties
 * @param hintsUsed The number of hints used (defaults to 0 if not provided or invalid)
 * @returns The final score after applying hint penalties, always returns a valid number (minimum 0)
 */
export function calculateHintPenalty(baseScore: number, hintsUsed: number = 0): number {
  // Ensure baseScore is a valid number, default to 0 if not
  const safeBaseScore = Number.isFinite(baseScore) ? baseScore : 0;
  
  // Ensure hintsUsed is a valid number and cap it at 3
  const safeHintsUsed = Math.min(Math.max(0, Number.isFinite(hintsUsed) ? hintsUsed : 0), 3);
  
  // Each hint reduces score by 10%, up to 30% for 3 hints
  const penaltyMultiplier = 1 - 0.1 * safeHintsUsed;
  
  // Apply the penalty, round to nearest integer, and ensure it's not negative
  const finalScore = Math.max(0, Math.round(safeBaseScore * penaltyMultiplier));
  
  return Number.isFinite(finalScore) ? finalScore : 0;
}