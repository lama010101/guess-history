import { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { supabaseFake } from '@/integrations/supabase/fake';
import { Button } from '@/components/ui/button';
import { useCompetePeers } from '@/hooks/results/useCompetePeers';
import { useCompeteRoundLeaderboards } from '@/hooks/useCompeteRoundLeaderboards';

function parseIntSafe(v: string | null, d: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : d;
}

export default function CompeteHooksProbe() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const roomId = params.get('room') || 'room-test';
  const round = parseIntSafe(params.get('round'), 1);
  const scenario = (params.get('scenario') || 'simul').toLowerCase();
  const selfId = params.get('selfId') || 'user-a';
  const selfName = params.get('selfName') || 'Alice';
  const peerId = params.get('peerId') || 'user-b';
  const peerName = params.get('peerName') || 'Bob';

  useEffect(() => {
    try { localStorage.setItem('useSupabaseFake', '1'); } catch {}
    try { localStorage.setItem('fakeUserId', selfId); } catch {}
    try { localStorage.setItem('fakeDisplayName', selfName); } catch {}
  }, [selfId, selfName]);

  useEffect(() => {
    supabaseFake.__clear();

    const roster = [
      { room_id: roomId, user_id: selfId, display_name: selfName },
      { room_id: roomId, user_id: peerId, display_name: peerName },
    ];
    supabaseFake.__seed('sync_room_players', roster);

    const makeSnapshot = (user_id: string, display_name: string, xp: number, whenAcc: number, whereAcc: number) => ({
      room_id: roomId,
      round_number: round,
      user_id,
      display_name,
      xp_total: xp,
      time_accuracy: whenAcc,
      location_accuracy: whereAcc,
      xp_debt: 0,
      acc_debt: 0,
      hints_used: 0,
      distance_km: 100,
      year_difference: 1,
      guess_year: 2001,
      guess_lat: 10,
      guess_lng: 10,
      submitted_at: new Date().toISOString(),
    });

    const makeRoundResult = (user_id: string, xp: number, whenAcc: number, whereAcc: number) => ({
      room_id: roomId,
      user_id,
      round_index: round - 1,
      score: xp,
      accuracy: Math.round((whenAcc + whereAcc) / 2),
      xp_total: xp,
      xp_where: whereAcc,
      xp_when: whenAcc,
      location_accuracy: whereAcc,
      time_accuracy: whenAcc,
      distance_km: 100,
      guess_year: 2001,
      guess_lat: 10,
      guess_lng: 10,
      actual_lat: 11,
      actual_lng: 11,
      hints_used: 0,
    });

    const seedSelf = () => {
      supabase.from('sync_round_scores').upsert(makeSnapshot(selfId, selfName, 800, 80, 80));
      supabase.from('round_results').upsert(makeRoundResult(selfId, 800, 80, 80));
    };
    const seedPeer = () => {
      supabase.from('sync_round_scores').upsert(makeSnapshot(peerId, peerName, 700, 70, 70));
      supabase.from('round_results').upsert(makeRoundResult(peerId, 700, 70, 70));
    };

    const seedPeerTimeout = () => {
      const snap = makeSnapshot(peerId, peerName, 0, 0, 0);
      snap.guess_year = null as any;
      snap.distance_km = 2000 as any;
      supabase.from('sync_round_scores').upsert(snap);
      const rr = makeRoundResult(peerId, 0, 0, 0);
      rr.guess_year = null as any;
      rr.distance_km = 2000 as any;
      supabase.from('round_results').upsert(rr);
    };

    if (scenario === 'staggered-self-first') {
      seedSelf();
      setTimeout(seedPeer, 1000);
    } else if (scenario === 'staggered-self-last') {
      setTimeout(seedSelf, 1000);
      seedPeer();
    } else if (scenario === 'timeout') {
      seedSelf();
      setTimeout(seedPeerTimeout, 800);
    } else {
      seedSelf();
      seedPeer();
    }
  }, [roomId, round, scenario, selfId, selfName, peerId, peerName]);

  const peersState = useCompetePeers(roomId, round);
  const lb = useCompeteRoundLeaderboards(roomId, round);

  const peerNames = useMemo(() => (peersState.peers || []).map(p => p.displayName).join(','), [peersState.peers]);
  const lbTotalNames = useMemo(() => (lb.total || []).map(r => r.displayName).join(','), [lb.total]);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Button onClick={() => navigate('/test')}>Back</Button>
      </div>
      <div id="probe-room">{roomId}</div>
      <div id="probe-round">{round}</div>
      <div id="peer-list">{peerNames}</div>
      <div id="lb-total">{lbTotalNames}</div>
      <div id="lb-count">{lb.total.length}</div>
    </div>
  );
}
