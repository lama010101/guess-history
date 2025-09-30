import React from 'react';
import { Loader } from 'lucide-react';
import { useCompeteRoundLeaderboards, LeaderRow } from '@/hooks/useCompeteRoundLeaderboards';

export interface CompeteRoundLeaderboardsProps {
  roomId: string;
  roundNumber: number; // 1-based
}

interface LeaderboardCardProps {
  title: string;
  rows: LeaderRow[];
  currentUserId: string | null;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ title, rows, currentUserId }) => {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-white shadow-md">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {(!rows || rows.length === 0) ? (
        <div className="text-sm text-neutral-300">No results yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-400">
                <th className="text-left py-2 pr-2">Player</th>
                <th className="text-right py-2 pr-2">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isCurrent = currentUserId != null && row.userId === currentUserId;
                return (
                  <tr key={`${title}:${row.userId}`} className={isCurrent ? 'bg-neutral-800/60' : ''}>
                    <td className="py-2 pr-2">
                      <span className={isCurrent ? 'font-semibold text-white' : ''}>{row.displayName || 'Player'}</span>
                    </td>
                    <td className="py-2 pr-0 text-right font-medium">{Math.round(row.value)}</td>
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

const StatusCard: React.FC<{ children: React.ReactNode; tone?: 'default' | 'error' }> = ({ children, tone = 'default' }) => {
  const base = 'rounded-2xl border p-4 text-sm flex items-center gap-3 shadow-md';
  const toneClasses = tone === 'error'
    ? 'border-red-500/60 bg-red-500/10 text-red-300'
    : 'border-neutral-800 bg-neutral-900/60 text-neutral-200';
  return <div className={`${base} ${toneClasses}`}>{children}</div>;
};

const CompeteRoundLeaderboards: React.FC<CompeteRoundLeaderboardsProps> = ({ roomId, roundNumber }) => {
  const {
    total,
    when,
    where,
    isLoading,
    error,
    currentUserId,
    actualYear,
    source,
  } = useCompeteRoundLeaderboards(roomId ?? null, roundNumber ?? null);

  if (isLoading) {
    return (
      <div className="px-4 pt-4">
        <StatusCard>
          <Loader className="h-4 w-4 animate-spin" />
          <span>Loading leaderboards…</span>
        </StatusCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pt-4">
        <StatusCard tone="error">{error}</StatusCard>
      </div>
    );
  }

  if (actualYear == null) {
    return (
      <div className="px-4 pt-4">
        <StatusCard>Waiting for image metadata to compute When/Where leaderboards…</StatusCard>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <div className="grid gap-4 md:grid-cols-3">
        <LeaderboardCard title="Total" rows={total} currentUserId={currentUserId} />
        <LeaderboardCard title="When" rows={when} currentUserId={currentUserId} />
        <LeaderboardCard title="Where" rows={where} currentUserId={currentUserId} />
      </div>
    </div>
  );
};

export default CompeteRoundLeaderboards;
