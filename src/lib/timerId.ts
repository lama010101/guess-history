export function buildTimerId(gameId: string, roundIndex: number): string {
  const gid = (gameId || '').trim();
  if (!gid) throw new Error('gameId is required');
  const ri = Number(roundIndex);
  if (!Number.isInteger(ri) || ri < 0) throw new Error('roundIndex must be a non-negative integer');
  return `gh:${gid}:${ri}`;
}
