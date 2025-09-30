import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader } from 'lucide-react';

interface RoundScoreboardProps {
  roomId: string;
  // Round number as shown in the URL (1-based). The RPC expects 1-based and converts to 0-based internally.
  roundNumber: number;
}

type RoundRow = {
  user_id: string;
  display_name: string | null;
  score: number | null;
  accuracy: number | null;
  xp_total: number | null;
  xp_debt: number | null;
  acc_debt: number | null;
  distance_km: number | null;
  guess_year: number | null;
};

const RoundScoreboard: React.FC<RoundScoreboardProps> = ({ roomId, roundNumber }) => {
  const [rows, setRows] = React.useState<RoundRow[] | null>(null);
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
        const oneBasedRound = Math.max(1, (roundNumber || 1));
        const { data, error } = await sb.rpc('get_round_scoreboard', {
          p_room_id: roomId,
          p_round_number: oneBasedRound,
        });
        if (cancelled) return;
        if (error) {
          setError(error.message || 'Failed to load round leaderboard');
        } else {
          setRows(Array.isArray(data) ? (data as RoundRow[]) : []);
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load round leaderboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roomId, roundNumber]);

  if (loading) {
    return (
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-white flex items-center gap-2">
        <Loader className="h-4 w-4 animate-spin" /> <span>Loading round leaderboard…</span>
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
      <h3 className="font-semibold mb-3">Round Leaderboard</h3>
      {(!rows || rows.length === 0) ? (
        <div className="text-sm text-neutral-300">No results yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-400">
                <th className="text-left py-2 pr-2">Player</th>
                <th className="text-right py-2 pr-2">Score</th>
                <th className="text-right py-2 pr-2">Accuracy</th>
                <th className="text-right py-2 pr-2">-XP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isMe = currentUserId && r.user_id === currentUserId;
                return (
                  <tr key={r.user_id} className={isMe ? 'bg-neutral-800/50' : ''}>
                    <td className="py-2 pr-2">
                      <span className={isMe ? 'font-semibold text-white' : ''}>{r.display_name || 'Player'}</span>
                    </td>
                    <td className="text-right py-2 pr-2">{Math.max(0, Math.round(r.score ?? 0))}</td>
                    <td className="text-right py-2 pr-2">{Math.round(r.accuracy ?? 0)}%</td>
                    <td className="text-right py-2 pr-2 text-red-400">-{Math.max(0, Math.round(r.xp_debt ?? 0))}</td>
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

export default RoundScoreboard;
