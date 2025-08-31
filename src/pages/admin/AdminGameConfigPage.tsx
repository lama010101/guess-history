import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGameConfig, getGameConfig, GameConfig } from '@/config/gameConfig';
import { HINT_TYPE_NAMES } from '@/constants/hints';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { saveConfigPatch } from '@/server/configService';

const AdminGameConfigPage: React.FC = () => {
  const liveConfig = useGameConfig();
  const [working, setWorking] = useState<GameConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const { session, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    // Allow all authenticated users to access the page
    // RLS will still protect the database writes
    (async () => {
      const cfg = await getGameConfig();
      // Normalize to ensure hints exists to avoid null access
      const normalized: GameConfig = {
        ...(cfg || ({} as any)),
        hints: (cfg as any)?.hints || ({} as any),
      } as any;
      setWorking(normalized);
    })();
  }, [user]);

  const sortedHintKeys = useMemo(() => {
    const keys = Object.keys(liveConfig?.hints || {});
    // sort by numeric level prefix if present
    return keys.sort((a, b) => {
      const pa = parseInt(a.split('_')[0], 10);
      const pb = parseInt(b.split('_')[0], 10);
      if (!isNaN(pa) && !isNaN(pb)) return pa - pb || a.localeCompare(b);
      return a.localeCompare(b);
    });
  }, [liveConfig]);

  const onChangeHint = (key: string, field: 'xp' | 'acc', value: number) => {
    setWorking((prev) => {
      if (!prev) return prev;
      const next: GameConfig = JSON.parse(JSON.stringify(prev));
      if (!next.hints) next.hints = {} as any;
      if (!next.hints[key]) next.hints[key] = { xp: 0, acc: 0 } as any;
      (next.hints[key] as any)[field] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      return next;
    });
  };

  const handleSave = async () => {
    if (!working) return;
    if (!session) {
      toast({ title: 'Not signed in', description: 'Please sign in to save changes.' });
      return;
    }
    // RLS will handle write permissions at the database level
    setSaving(true);
    try {
      const patch = { hints: working?.hints ?? {} };
      // Save directly via Supabase client (RLS enforced by user session)
      const result = await saveConfigPatch(supabase, patch);
      if (!(result as any)?.ok) throw new Error('Save failed');
      toast({ title: 'Saved', description: 'Game config updated.' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || String(e), variant: 'destructive' as any });
    } finally {
      setSaving(false);
    }
  };

  if (!session) return null;
  // Prevent rendering until config is loaded
  if (!working) {
    return <div style={{ padding: 16 }}>Loading config…</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Admin — Game Configuration</h1>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Hints — Costs and Accuracy Penalties</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: 8, alignItems: 'center' }}>
          <div style={{ fontWeight: 600 }}>Hint</div>
          <div style={{ fontWeight: 600 }}>XP</div>
          <div style={{ fontWeight: 600 }}>% Accuracy</div>
          {sortedHintKeys.map((k) => {
            const label = HINT_TYPE_NAMES[k] || k;
            const v = (working.hints as any)?.[k] || { xp: 0, acc: 0 };
            return (
              <React.Fragment key={k}>
                <div>{label} <span style={{ opacity: 0.6, marginLeft: 8 }}>({k})</span></div>
                <input
                  type="number"
                  value={v.xp}
                  min={0}
                  onChange={(e) => onChangeHint(k, 'xp', parseInt(e.target.value, 10))}
                  style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6 }}
                />
                <input
                  type="number"
                  value={v.acc}
                  min={0}
                  onChange={(e) => onChangeHint(k, 'acc', parseInt(e.target.value, 10))}
                  style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6 }}
                />
              </React.Fragment>
            );
          })}
        </div>
      </section>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={async () => setWorking(await getGameConfig())}
          disabled={saving}
          style={{ padding: '8px 14px', borderRadius: 6, background: '#eee' }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default AdminGameConfigPage;
