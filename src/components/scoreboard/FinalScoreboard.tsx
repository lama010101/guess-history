import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchFinalScoreboard } from '@/integrations/supabase/scoreboards';
import { Loader } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchAvatarUrlsForUserIds } from '@/utils/profile/avatarLoader';
import { getAvatarFrameGradient } from '@/utils/avatarGradient';
import { cn } from '@/lib/utils';

interface FinalScoreboardProps {
  roomId: string;
  className?: string;
}

type FinalRow = {
  user_id: string;
  display_name: string | null;
  total_score: number | null;
  total_xp: number | null;
  total_xp_debt: number | null;
  net_xp: number | null;
  rounds_played: number | null;
  avg_accuracy: number | null;
  net_avg_accuracy: number | null;
  total_hints_used?: number | null;
  total_acc_debt?: number | null;
};

const FinalScoreboard: React.FC<FinalScoreboardProps> = ({ roomId, className }) => {
  const [rows, setRows] = React.useState<FinalRow[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = React.useState<Record<string, string | null>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: auth } = await supabase.auth.getUser();
        setCurrentUserId(auth?.user?.id ?? null);
        const data = await fetchFinalScoreboard(roomId);
        if (cancelled) return;

        const normalizeAccuracy = (row: FinalRow) => {
          const candidates = [row.net_avg_accuracy, row.avg_accuracy];
          for (const candidate of candidates) {
            const numeric = Number(candidate);
            if (Number.isFinite(numeric)) {
              return numeric;
            }
          }
          return 0;
        };

        const normalizeXP = (row: FinalRow) => {
          const candidates = [row.net_xp, row.total_xp, row.total_score];
          for (const candidate of candidates) {
            const numeric = Number(candidate);
            if (Number.isFinite(numeric)) {
              return numeric;
            }
          }
          return 0;
        };

        const rawRows = Array.isArray(data) ? (data as FinalRow[]) : [];
        const sortedRows = [...rawRows].sort((a, b) => {
          const accDiff = normalizeAccuracy(b) - normalizeAccuracy(a);
          if (accDiff !== 0) return accDiff;
          const xpDiff = normalizeXP(b) - normalizeXP(a);
          if (xpDiff !== 0) return xpDiff;
          const nameA = (a.display_name || '').toString();
          const nameB = (b.display_name || '').toString();
          return nameA.localeCompare(nameB);
        });

        setRows(sortedRows);
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load final leaderboard';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roomId]);

  React.useEffect(() => {
    let cancelled = false;
    const loadAvatars = async () => {
      if (!rows || rows.length === 0) return;
      const userIds = rows
        .map((row) => row.user_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      if (userIds.length === 0) return;
      try {
        const urls = await fetchAvatarUrlsForUserIds(userIds);
        if (!cancelled) {
          setAvatarUrls(urls);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[FinalScoreboard] Failed to load avatar URLs', err);
          setAvatarUrls({});
        }
      }
    };

    loadAvatars();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const getInitial = React.useCallback((name: string) => {
    const trimmed = name?.trim?.() ?? '';
    return trimmed.length > 0 ? trimmed[0]!.toUpperCase() : '?';
  }, []);

  if (loading) {
    return (
      <div className={cn('w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-white flex items-center gap-2', className)}>
        <Loader className="h-4 w-4 animate-spin" /> <span>Loading final leaderboard…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className={cn('w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-red-300', className)}>
        {error}
      </div>
    );
  }
  return (
    <div className={cn('w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-white', className)}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-center text-lg font-semibold lg:text-left">Final Leaderboard</h3>
        {rows && rows.length > 0 ? (
          <span className="text-xs text-neutral-400 text-center lg:text-right">Sorted by net accuracy, then XP.</span>
        ) : null}
      </div>
      {(!rows || rows.length === 0) ? (
        <div className="text-sm text-neutral-300">No results yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm lg:text-base">
            <thead className="hidden text-xs uppercase tracking-wide text-neutral-400 lg:table-header-group">
              <tr className="border-b border-neutral-800">
                <th scope="col" className="py-3 pl-3 pr-2 text-left font-semibold">Rank</th>
                <th scope="col" className="py-3 pr-3 text-left font-semibold">Player</th>
                <th scope="col" className="py-3 pr-3 text-right font-semibold">Net Accuracy</th>
                <th scope="col" className="hidden py-3 pr-3 text-right font-semibold lg:table-cell">Avg Accuracy</th>
                <th scope="col" className="hidden py-3 pr-3 text-right font-semibold lg:table-cell">Hints</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, index) => {
                const isMe = currentUserId && r.user_id === currentUserId;
                const rank = index + 1;
                const name = r.display_name?.trim() || 'Player';
                const nameWithYou = isMe ? `(You) ${name}` : name;
                const hintsUsed = Math.max(0, Math.round(r.total_hints_used ?? 0));
                const avgAccuracy = Math.max(0, Math.round(Number(r.avg_accuracy ?? 0)));
                const netAccuracy = Math.max(0, Math.round(Number(r.net_avg_accuracy ?? r.avg_accuracy ?? 0)));
                const penaltyPercent = Math.max(0, Math.round(Number(r.total_acc_debt ?? 0)));
                const avatarUrl = (r.user_id && avatarUrls?.[r.user_id]) || null;
                const gradientSeed = r.user_id || name;
                return (
                  <tr
                    key={r.user_id}
                    className={cn(
                      'align-middle transition-colors odd:bg-neutral-800/40 even:bg-neutral-800/60 lg:rounded-lg',
                      isMe ? 'ring-1 ring-history-secondary/60 bg-neutral-800/80' : undefined,
                    )}
                  >
                    <td className="py-3 pl-3 pr-2 text-neutral-400 font-medium">#{rank}</td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="rounded-full p-[2px]"
                          style={{ background: getAvatarFrameGradient(gradientSeed) }}
                        >
                          <Avatar className="h-9 w-9 border border-neutral-900 bg-neutral-800">
                            <AvatarImage src={avatarUrl ?? undefined} alt={`${name} avatar`} />
                            <AvatarFallback className="bg-transparent text-sm font-semibold text-white">
                              {getInitial(name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className={isMe ? 'font-semibold text-white truncate' : 'text-neutral-200 truncate'}>{nameWithYou}</span>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 lg:hidden">
                            <span>{avgAccuracy}% avg</span>
                            {hintsUsed > 0 ? (
                              <span className="text-red-400 font-semibold">
                                {`${hintsUsed} ${hintsUsed === 1 ? 'hint' : 'hints'} = -${penaltyPercent}%`}
                              </span>
                            ) : (
                              <span>No hints</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right font-semibold text-white">{netAccuracy}%</td>
                    <td className="hidden py-3 pr-3 text-right text-neutral-200 lg:table-cell">{avgAccuracy}%</td>
                    <td className="hidden py-3 pr-3 text-right text-neutral-200 lg:table-cell">
                      {hintsUsed > 0 ? (
                        <span className="text-red-400 font-semibold">-{penaltyPercent}%</span>
                      ) : (
                        <span className="text-neutral-400">None</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FinalScoreboard;
