import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Users } from 'lucide-react';

function randomCode(len = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const Compete: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState<string>('');

  const validJoinCode = useMemo(() => /^[A-Z0-9]{6}$/.test(joinCode), [joinCode]);

  const handleCreate = useCallback(() => {
    const code = randomCode(6);
    const params = new URLSearchParams({ host: '1' });
    navigate(`/room/${code}?${params.toString()}`);
  }, [navigate]);

  const handleJoin = useCallback(() => {
    if (!validJoinCode) return;
    navigate(`/room/${joinCode}`);
  }, [validJoinCode, joinCode, navigate]);

  return (
    <div className="min-h-screen w-full bg-history-light dark:bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-4">Play with friends</h1>
        {/* Cards: Join first (always visible on mobile), Host below on mobile; side-by-side on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Join card */}
          <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-lg p-5`}>
            <h2 className="text-lg font-semibold mb-3">Join Game</h2>
            <label htmlFor="join-code" className="block text-xs text-zinc-400 mb-2">Room Code</label>
            <div className="flex items-center gap-3">
              <Input
                id="join-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter Code"
                maxLength={6}
                className="w-40 tracking-[0.4em] uppercase bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500"
                aria-label="Room code"
              />
              <Button
                onClick={handleJoin}
                disabled={!validJoinCode}
                variant={validJoinCode ? 'default' : 'secondary'}
                className="rounded-xl"
              >
                Join
              </Button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-3">6 letters/numbers, not case sensitive.</p>

            {/* OR divider */}
            <div className="my-3 flex items-center gap-3 text-[11px] text-zinc-500">
              <div className="h-px flex-1 bg-zinc-800" />
              OR
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            {/* Paste invite link */}
            <div className="mt-4">
              <label htmlFor="paste-invite" className="block text-xs text-zinc-400 mb-2">Paste invite link</label>
              <Input
                id="paste-invite"
                placeholder="https://your-app/room/ABC123"
                className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500"
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  const match = v.match(/([A-Z0-9]{6})\b/);
                  if (match) setJoinCode(match[1]);
                }}
              />
            </div>
          </div>

          {/* Host card */}
          <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-lg p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-semibold">Host Game</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              Create a new room and share the code with friends. Up to 8 players.
            </p>
            <Button
              onClick={handleCreate}
              className="w-full rounded-xl text-black bg-gradient-to-r from-emerald-400 to-cyan-400 hover:opacity-90"
            >
              Create room
            </Button>
          </div>
        </div>

        <div className="mt-6 text-xs text-zinc-500">
          Rooms support up to 8 players. Share the 6-character code with friends.
        </div>
      </div>
    </div>
  );
};

export default Compete;
