import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gamepad2, UserPlus } from 'lucide-react';

function randomCode(len = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const Lobby: React.FC = () => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState<string>('');

  const validJoinCode = useMemo(() => /^[a-z0-9]{6}$/.test(joinCode), [joinCode]);

  const handleCreate = useCallback(() => {
    const code = randomCode(6);
    const params = new URLSearchParams({ host: '1' });
    navigate(`/room/${code}?${params.toString()}`);
  }, [navigate]);

  const handleJoin = useCallback(() => {
    if (!validJoinCode) return;
    // Navigate using a canonical uppercase room code
    navigate(`/room/${joinCode.toUpperCase()}`);
  }, [validJoinCode, joinCode, navigate]);

  return (
    <div className="min-h-screen w-full bg-[#020914] text-white">
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-6 py-8">
        <div className="relative mb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute left-0 top-1 inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-[#f1f5f9]"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-center text-2xl font-semibold text-white">Lobby</h1>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-[#3f424b] bg-[#333333] px-6 py-6">
            <div className="mb-4 flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold leading-none text-white">Join Game</h2>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Input
                id="join-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toLowerCase())}
                placeholder="enter code"
                maxLength={6}
                className="h-12 flex-1 rounded-[14px] border border-[#d2d6dd] bg-white px-4 text-base font-semibold uppercase tracking-[0.2em] text-[#111827] placeholder:tracking-[0.05em] placeholder:text-[#9ca3af]"
                aria-label="Room code"
              />
              <Button
                onClick={handleJoin}
                disabled={!validJoinCode}
                className="h-12 min-w-[96px] bg-[#22d3ee] text-base font-semibold text-black transition-transform hover:-translate-y-0.5 hover:bg-[#1cbfdb] disabled:translate-y-0 disabled:opacity-40"
              >
                Join
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-[#a7afbe]">Enter the room code shared by the host.</p>
          </div>

          <div className="rounded-2xl border border-[#3f424b] bg-[#333333] px-6 py-6">
            <div className="mb-4 flex items-center gap-3">
              <Gamepad2 className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold leading-none text-white">Host Game</h2>
            </div>
            <Button
              onClick={handleCreate}
              className="mt-5 h-12 w-full bg-[#22d3ee] text-base font-semibold text-black transition-transform hover:-translate-y-0.5 hover:bg-[#1cbfdb]"
            >
              Create room
            </Button>
            <p className="mt-3 text-[11px] text-[#a7afbe]">
              Create a new room and share the code with friends. Up to 8 players.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Lobby;
