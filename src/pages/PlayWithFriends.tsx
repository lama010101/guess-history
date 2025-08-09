import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

function randomCode(len = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const PlayWithFriends: React.FC = () => {
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
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Play with friends</h1>

        <div className="space-y-8">
          <div className="text-sm text-neutral-300">
            Your account display name will be used automatically:
            <span className="ml-2 font-medium text-white">
              {(user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : 'Anonymous')) as string}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleCreate} className="bg-history-primary hover:bg-history-primary/90">Create room</Button>
            <span className="text-sm text-neutral-400">or join existing</span>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOMCODE"
              maxLength={6}
              className="w-36 tracking-widest uppercase bg-neutral-900 border-neutral-700 text-white"
            />
            <Button onClick={handleJoin} disabled={!validJoinCode} variant={validJoinCode ? 'default' : 'secondary'}>
              Join
            </Button>
          </div>

          <p className="text-xs text-neutral-400">Rooms support up to 8 players. Share the 6-character code with friends.</p>
        </div>
      </div>
    </div>
  );
};

export default PlayWithFriends;
