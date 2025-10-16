import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader } from 'lucide-react';

interface FinalScoreboardProps {
  roomId: string;
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
};

const FinalScoreboard: React.FC<FinalScoreboardProps> = ({ roomId }) => {
  const [rows, setRows] = React.useState<FinalRow[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: auth } = await supabase.auth.getUser();
        setCurrentUserId(auth?.user?.id ?? null);
        const sb: any = supabase;
        const { data, error } = await sb.rpc('get_final_scoreboard', {
          p_room_id: roomId,
        });
        if (cancelled) return;
        if (error) {
          setError(error.message || 'Failed to load final leaderboard');
        } else {
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
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load final leaderboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roomId]);

  if (loading) {
    return (
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-white flex items-center gap-2">
        <Loader className="h-4 w-4 animate-spin" /> <span>Loading final leaderboard…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-red-300">
        {error}
      </div>
    );
  }
  return (
    <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-white">
      <h3 className="font-semibold mb-3">Final Leaderboard</h3>
      {(!rows || rows.length === 0) ? (
        <div className="text-sm text-neutral-300">No results yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r, index) => {
                const isMe = currentUserId && r.user_id === currentUserId;
                const rank = index + 1;
                const name = r.display_name || 'Player';
                const nameWithYou = isMe ? `(You) ${name}` : name;
                const hintsUsed = Math.max(0, Math.round(r.total_hints_used ?? 0));
                const netAccuracy = Math.max(0, Math.round(r.net_avg_accuracy ?? r.avg_accuracy ?? 0));
                const hintsLabel = `${hintsUsed} ${hintsUsed === 1 ? 'hint' : 'hints'}`;
                return (
                  <tr key={r.user_id} className={isMe ? 'bg-neutral-800/60' : 'bg-neutral-800/40'}>
                    <td className="py-2 pl-3 pr-2 text-neutral-400 font-medium">#{rank}</td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-col">
                        <span className={isMe ? 'font-semibold text-white' : 'text-neutral-200'}>{nameWithYou}</span>
                        <span className="text-xs text-red-400 font-semibold">{hintsLabel}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold text-white">{netAccuracy}%</td>
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
