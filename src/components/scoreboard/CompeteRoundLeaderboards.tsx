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

const formatPenalty = (accDebt?: number) => {
  if (accDebt == null || accDebt <= 0) return null;
  return `-${Math.round(accDebt)}%`;
};

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ title, rows, currentUserId }) => {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-white shadow-md">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {(!rows || rows.length === 0) ? (
        <div className="text-sm text-neutral-300">No results yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row, index) => {
                const isCurrent = currentUserId != null && row.userId === currentUserId;
                const displayName = row.displayName || 'Player';
                const nameWithYou = isCurrent ? `(You) ${displayName}` : displayName;
                const baseRowClasses = 'bg-neutral-800/70';
                const roundedClasses = index === 0
                  ? 'rounded-t-lg'
                  : index === rows.length - 1
                    ? 'rounded-b-lg'
                    : '';
                const netAccuracy = Math.max(0, Math.round(row.value ?? 0));
                const rank = index + 1;
                const hintsUsed = Math.max(0, Number(row.hintsUsed ?? 0));
                const hintsLabel = hintsUsed > 0
                  ? `${hintsUsed} ${hintsUsed === 1 ? 'hint' : 'hints'}`
                  : null;

                return (
                  <tr
                    key={`${title}:${row.userId}`}
                    className={`${baseRowClasses} ${roundedClasses}`.trim()}
                  >
                    <td className="py-2 pl-3 pr-2 text-neutral-400 font-medium">#{rank}</td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-white/20 bg-neutral-700/70">
                          {row.avatarUrl ? (
                            <img
                              src={row.avatarUrl}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/80">
                              {displayName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className={isCurrent ? 'font-semibold text-white' : 'text-neutral-200'}>
                            {nameWithYou}
                          </span>
                          {hintsLabel ? (
                            <span className="text-xs text-red-400 font-semibold">{hintsLabel}</span>
                          ) : (
                            <span className="text-xs text-transparent">•</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`py-2 pr-3 text-right ${isCurrent ? 'font-semibold text-white' : 'font-medium text-neutral-200'}`}>
                      {netAccuracy}%
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
