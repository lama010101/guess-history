type Row = Record<string, any>;

class FakeAuth {
  getUser = async () => {
    const id = localStorage.getItem('fakeUserId') || 'user-self';
    const display_name = localStorage.getItem('fakeDisplayName') || null;
    return { data: { user: { id, user_metadata: { display_name } } } } as any;
  };
  signInAnonymously = async () => {
    const id = localStorage.getItem('fakeUserId') || `user-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('fakeUserId', id);
    return { data: { user: { id } } } as any;
  };
}

type Listener = (payload: any) => void;

class FakeChannel {
  private listeners: Listener[] = [];
  on = (_event: string, _filter: any, cb: Listener) => {
    this.listeners.push(cb);
    return this as any;
  };
  subscribe = (_cb?: any) => ({}) as any;
  emit = (payload: any) => {
    for (const l of this.listeners) l(payload);
  };
}

class FakeDB {
  tables = new Map<string, Row[]>();
  get(name: string): Row[] {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return this.tables.get(name)!;
  }
}

const db = new FakeDB();
const channels = new Map<string, FakeChannel>();

function acquire(name: string) {
  if (!channels.has(name)) channels.set(name, new FakeChannel());
  return channels.get(name)!;
}

class QueryBuilder {
  constructor(private table: string) {}
  private filters: Array<(row: Row) => boolean> = [];
  private _order: { key: string; asc: boolean } | null = null;
  select = (_cols: string) => this as any;
  eq = (key: string, value: any) => { this.filters.push((r) => r[key] === value); return this as any; };
  in = (key: string, values: any[]) => { const set = new Set(values); this.filters.push((r) => set.has(r[key])); return this as any; };
  order = (key: string, opts?: { ascending?: boolean }) => { this._order = { key, asc: !!(opts?.ascending) }; return this as any; };
  maybeSingle = async () => {
    const res = await this.then();
    return { data: res[0] ?? null, error: null } as any;
  };
  then = async () => {
    let rows = [...db.get(this.table)];
    for (const f of this.filters) rows = rows.filter(f);
    if (this._order) {
      const { key, asc } = this._order;
      rows.sort((a, b) => {
        const va = Number(a[key] ?? 0);
        const vb = Number(b[key] ?? 0);
        return asc ? va - vb : vb - va;
      });
    }
    return { data: rows, error: null } as any;
  };
  insert = async (payload: Row | Row[]) => {
    const arr = Array.isArray(payload) ? payload : [payload];
    const target = db.get(this.table);
    target.push(...arr.map((r) => ({ ...r })));
    for (const r of arr) {
      if (this.table === 'sync_round_scores') {
        const ch = `sync_round_scores:${r.room_id}:${r.round_number}`;
        supabaseFake.__emit(ch, { table: 'sync_round_scores', new: r });
      } else if (this.table === 'round_results') {
        const ch = `round_results:${r.room_id}:${r.round_index}`;
        supabaseFake.__emit(ch, { table: 'round_results', new: r });
      } else if (this.table === 'session_players') {
        const ch = `session_players:${r.room_id}`;
        supabaseFake.__emit(ch, { table: 'session_players', new: r });
      } else if (this.table === 'sync_room_players') {
        const ch = `sync_room_players:${r.room_id}`;
        supabaseFake.__emit(ch, { table: 'sync_room_players', new: r });
      }
    }
    return { data: arr, error: null } as any;
  };
  upsert = async (payload: Row | Row[], _opts?: any) => {
    const arr = Array.isArray(payload) ? payload : [payload];
    const target = db.get(this.table);
    for (const r of arr) {
      let idx = -1;
      if (this.table === 'sync_round_scores') {
        idx = target.findIndex((t) => t.room_id === r.room_id && t.round_number === r.round_number && t.user_id === r.user_id);
      } else if (this.table === 'round_results') {
        idx = target.findIndex((t) => t.room_id === r.room_id && t.round_index === r.round_index && t.user_id === r.user_id);
      } else if (this.table === 'sync_room_players' || this.table === 'session_players') {
        idx = target.findIndex((t) => t.room_id === r.room_id && t.user_id === r.user_id);
      }
      if (idx >= 0) target[idx] = { ...target[idx], ...r };
      else target.push({ ...r });
      if (this.table === 'sync_round_scores') {
        const ch = `sync_round_scores:${r.room_id}:${r.round_number}`;
        supabaseFake.__emit(ch, { table: 'sync_round_scores', new: r });
      } else if (this.table === 'round_results') {
        const ch = `round_results:${r.room_id}:${r.round_index}`;
        supabaseFake.__emit(ch, { table: 'round_results', new: r });
      } else if (this.table === 'session_players') {
        const ch = `session_players:${r.room_id}`;
        supabaseFake.__emit(ch, { table: 'session_players', new: r });
      } else if (this.table === 'sync_room_players') {
        const ch = `sync_room_players:${r.room_id}`;
        supabaseFake.__emit(ch, { table: 'sync_room_players', new: r });
      }
    }
    return { data: arr, error: null } as any;
  };
}

function computeScoreboard(rows: Row[]): Row[] {
  return rows.map((r) => {
    const time_accuracy = Number(r.time_accuracy ?? 0);
    const location_accuracy = Number(r.location_accuracy ?? 0);
    const accuracy = Math.round((time_accuracy + location_accuracy) / 2);
    const xp_total = Number(r.xp_total ?? 0);
    return {
      user_id: r.user_id,
      display_name: r.display_name ?? null,
      score: xp_total,
      accuracy,
      xp_total,
      xp_debt: 0,
      acc_debt: 0,
      xp_where: null,
      xp_when: null,
      location_accuracy: r.location_accuracy ?? null,
      time_accuracy: r.time_accuracy ?? null,
      distance_km: r.distance_km ?? null,
      guess_year: r.guess_year ?? null,
      hints_used: 0,
    } as Row;
  });
}

export const supabaseFake: any = {
  auth: new FakeAuth(),
  channel: (name: string) => acquire(name) as any,
  removeChannel: (_ch: any) => {},
  from: (table: string) => new QueryBuilder(table) as any,
  rpc: async (fn: string, args: any) => {
    if (fn === 'get_round_scoreboard') {
      const room_id = args?.p_room_id;
      const round_number = args?.p_round_number;
      const snaps = db.get('sync_round_scores').filter((r) => r.room_id === room_id && r.round_number === round_number);
      return { data: computeScoreboard(snaps), error: null } as any;
    }
    return { data: null, error: { message: 'unknown rpc' } } as any;
  },
  __db: db,
  __emit: (channel: string, payload: any) => acquire(channel).emit(payload),
  __seed: (table: string, rows: Row[]) => { const t = db.get(table); t.splice(0, t.length, ...rows.map((r) => ({ ...r }))); },
  __clear: () => { db.tables.clear(); },
};
