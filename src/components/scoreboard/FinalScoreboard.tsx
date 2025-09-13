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
          setRows(Array.isArray(data) ? (data as FinalRow[]) : []);
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
            <thead>
              <tr className="text-neutral-400">
                <th className="text-left py-2 pr-2">Player</th>
                <th className="text-right py-2 pr-2">Net XP</th>
                <th className="text-right py-2 pr-2">Total XP</th>
                <th className="text-right py-2 pr-2">-XP</th>
                <th className="text-right py-2 pr-2">Net Acc</th>
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
                    <td className="text-right py-2 pr-2">{Math.max(0, Math.round(r.net_xp ?? 0))}</td>
                    <td className="text-right py-2 pr-2 text-neutral-200">{Math.max(0, Math.round(r.total_xp ?? 0))}</td>
                    <td className="text-right py-2 pr-2 text-red-400">-{Math.max(0, Math.round(r.total_xp_debt ?? 0))}</td>
                    <td className="text-right py-2 pr-2">{Math.round(r.net_avg_accuracy ?? r.avg_accuracy ?? 0)}%</td>
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
