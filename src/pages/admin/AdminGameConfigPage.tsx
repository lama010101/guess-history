import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGameConfig, getGameConfig, GameConfig } from '@/config/gameConfig';
import { HINT_TYPE_NAMES } from '@/constants/hints';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { saveConfigPatch } from '@/server/configService';
import { defaultLevelUpTuneables, type LevelUpTuneables } from '@/lib/levelUpConfig';

const AdminGameConfigPage: React.FC = () => {
  const liveConfig = useGameConfig();
  const [working, setWorking] = useState<GameConfig & { levelUpConfig?: LevelUpTuneables } | null>(null);
  const [saving, setSaving] = useState(false);
  const { session, user } = useAuth();
  const { toast } = useToast();
  
  // Initialize level up config with defaults if not present
  const levelUpConfig = useMemo(() => ({
    ...defaultLevelUpTuneables,
    ...(working?.levelUpConfig || {})
  }), [working?.levelUpConfig]);

  useEffect(() => {
    if (!user) return;
    // Allow all authenticated users to access the page
    // RLS will still protect the database writes
    (async () => {
      try {
        const cfg = await getGameConfig();
        // Normalize to ensure hints and levelUpConfig exist to avoid null access
        const normalized: GameConfig & { levelUpConfig?: LevelUpTuneables } = {
          ...(cfg || ({} as any)),
          hints: (cfg as any)?.hints || {},
          levelUpConfig: (cfg as any)?.levelUpConfig || {}
        };
        setWorking(normalized);
      } catch (error) {
        console.error('Failed to load game config:', error);
        toast({
          title: 'Error',
          description: 'Failed to load game configuration',
          variant: 'destructive'
        });
      }
    })();
  }, [user, toast]);

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

  const updateLevelUpConfig = (updates: Partial<LevelUpTuneables>) => {
    if (!working) return;
    setWorking(prev => ({
      ...prev!,
      levelUpConfig: {
        ...levelUpConfig,
        ...updates
      }
    }));
  };

  const handleSave = async () => {
    if (!working) return;
    if (!session) {
      toast({ title: 'Not signed in', description: 'Please sign in to save changes.' });
      return;
    }

    // Validate level up config
    if (working.levelUpConfig) {
      const { YEAR_START_L1, YEAR_END_FIXED, YEAR_START_L100_OVERRIDE } = working.levelUpConfig;
      
      if (YEAR_START_L1 >= YEAR_END_FIXED) {
        toast({
          title: 'Validation Error',
          description: 'Start year (L1) must be before end year',
          variant: 'destructive'
        });
        return;
      }
      
      if (YEAR_START_L100_OVERRIDE !== null) {
        if (YEAR_START_L100_OVERRIDE >= YEAR_END_FIXED) {
          toast({
            title: 'Validation Error',
            description: 'L100 override year must be before end year',
            variant: 'destructive'
          });
          return;
        }
        
        if (YEAR_START_L100_OVERRIDE > YEAR_START_L1) {
          toast({
            title: 'Validation Error',
            description: 'L100 override year must be ≤ L1 start year',
            variant: 'destructive'
          });
          return;
        }
      }
      
      if (working.levelUpConfig.TIMER_MIN_SEC >= working.levelUpConfig.TIMER_MAX_SEC) {
        toast({
          title: 'Validation Error',
          description: 'Minimum timer must be less than maximum timer',
          variant: 'destructive'
        });
        return;
      }
    }

    // RLS will handle write permissions at the database level
    setSaving(true);
    try {
      const patch = { 
        hints: working?.hints ?? {},
        levelUpConfig: working?.levelUpConfig ?? {}
      };
      
      // Save directly via Supabase client (RLS enforced by user session)
      const result = await saveConfigPatch(supabase, patch);
      if (!(result as any)?.ok) throw new Error('Save failed');
      
      toast({ 
        title: 'Saved', 
        description: 'Game configuration updated successfully.' 
      });
    } catch (e: any) {
      console.error('Save failed:', e);
      toast({ 
        title: 'Save failed', 
        description: e?.message || 'Failed to save configuration', 
        variant: 'destructive' 
      });
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

      <section style={{ marginTop: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#f472b6' }}>Level Up Mode Configuration</h2>
        
        <div style={{ marginBottom: 24, backgroundColor: '#1f1f1f', borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#f9a8d4' }}>Year Range</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, marginBottom: 4, color: '#e5e7eb' }}>Level 1 Start Year</label>
              <input
                type="number"
                value={levelUpConfig.YEAR_START_L1}
                onChange={(e) => updateLevelUpConfig({ YEAR_START_L1: parseInt(e.target.value, 10) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                min={1000}
                max={levelUpConfig.YEAR_END_FIXED - 1}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 14, marginBottom: 4, color: '#e5e7eb' }}>End Year (Fixed)</label>
              <input
                type="number"
                value={levelUpConfig.YEAR_END_FIXED}
                onChange={(e) => updateLevelUpConfig({ YEAR_END_FIXED: parseInt(e.target.value, 10) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                min={levelUpConfig.YEAR_START_L1 + 1}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 14, marginBottom: 4, color: '#e5e7eb' }}>
                Level 100 Start Override
                <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>(leave blank for auto)</span>
              </label>
              <input
                type="number"
                value={levelUpConfig.YEAR_START_L100_OVERRIDE || ''}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  updateLevelUpConfig({ 
                    YEAR_START_L100_OVERRIDE: val === '' ? null : parseInt(val, 10) 
                  });
                }}
                placeholder="Auto (uses DB oldest)"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                min={1000}
                max={levelUpConfig.YEAR_END_FIXED - 1}
              />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#f9a8d4' }}>Timer (seconds)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, marginBottom: 4, color: '#e5e7eb' }}>Level 1</label>
                  <input
                    type="number"
                    value={levelUpConfig.TIMER_MAX_SEC}
                    onChange={(e) => updateLevelUpConfig({ TIMER_MAX_SEC: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                    min={1}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, marginBottom: 4, color: '#e5e7eb' }}>Level 100</label>
                  <input
                    type="number"
                    value={levelUpConfig.TIMER_MIN_SEC}
                    onChange={(e) => updateLevelUpConfig({ TIMER_MIN_SEC: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                    min={1}
                    max={levelUpConfig.TIMER_MAX_SEC - 1}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#f9a8d4' }}>Rounds</h3>
              <div>
                <label style={{ display: 'block', fontSize: 14, marginBottom: 4, color: '#e5e7eb' }}>Rounds Per Game</label>
                <input
                  type="number"
                  value={levelUpConfig.ROUNDS_PER_GAME}
                  onChange={(e) => updateLevelUpConfig({ ROUNDS_PER_GAME: parseInt(e.target.value, 10) })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                  min={1}
                  max={20}
                />
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#f9a8d4' }}>Accuracy Requirements</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, marginBottom: 4, color: '#e5e7eb' }}>Overall % (L1 → L100)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      value={levelUpConfig.OVERALL_ACC_L1}
                      onChange={(e) => updateLevelUpConfig({ OVERALL_ACC_L1: parseInt(e.target.value, 10) })}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 4, border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                      min={0}
                      max={100}
                    />
                    <span style={{ display: 'flex', alignItems: 'center' }}>→</span>
                    <input
                      type="number"
                      value={levelUpConfig.OVERALL_ACC_L100}
                      onChange={(e) => updateLevelUpConfig({ OVERALL_ACC_L100: parseInt(e.target.value, 10) })}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 4, border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                      min={levelUpConfig.OVERALL_ACC_L1}
                      max={100}
                    />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 14, marginBottom: 4, color: '#e5e7eb' }}>Round % (L1 → L100)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      value={levelUpConfig.ROUND_ACC_L1}
                      onChange={(e) => updateLevelUpConfig({ ROUND_ACC_L1: parseInt(e.target.value, 10) })}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 4, border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                      min={0}
                      max={100}
                    />
                    <span style={{ display: 'flex', alignItems: 'center' }}>→</span>
                    <input
                      type="number"
                      value={levelUpConfig.ROUND_ACC_L100}
                      onChange={(e) => updateLevelUpConfig({ ROUND_ACC_L100: parseInt(e.target.value, 10) })}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 4, border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                      min={levelUpConfig.ROUND_ACC_L1}
                      max={100}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#f9a8d4' }}>Development</h3>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!levelUpConfig.logging}
                    onChange={(e) => updateLevelUpConfig({ logging: e.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{ color: '#e5e7eb' }}>Enable debug logging</span>
                </label>
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                  When enabled, logs detailed information about level constraints and game flow to the console.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 16, marginBottom: 24 }}>
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
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
                />
                <input
                  type="number"
                  value={v.acc}
                  min={0}
                  max={100}
                  onChange={(e) => onChangeHint(k, 'acc', parseInt(e.target.value, 10))}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}
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
