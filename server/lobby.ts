import type * as Party from "partykit/server";
import { z } from "zod";
import { createHmac, timingSafeEqual, randomUUID } from "crypto";

// Types
const JoinMessage = z.object({
  type: z.literal("join"),
  name: z.string().trim().min(1).max(32),
  userId: z.string().optional(),
  token: z.string().optional(),
});

const ChatMessage = z.object({
  type: z.literal("chat"),
  message: z.string().trim().min(1).max(500),
  timestamp: z.string().datetime(),
});

const ReadyMessage = z.object({
  type: z.literal("ready"),
  ready: z.boolean(),
});

const SettingsMessage = z.object({
  type: z.literal("settings"),
  // Allow optional fields so host can tweak independently
  timerSeconds: z.number().int().min(5).max(600).optional(),
  timerEnabled: z.boolean().optional(),
  mode: z.enum(["sync", "async"]).optional(),
  yearMin: z.number().int().optional(),
  yearMax: z.number().int().optional(),
});

const KickMessage = z.object({
  type: z.literal("kick"),
  targetId: z.string().min(1),
});

const ProgressMessage = z.object({
  type: z.literal("progress"),
  roundNumber: z.number().int().min(1).max(100),
  substep: z.string().trim().max(64).optional(),
});

const RenameMessage = z.object({
  type: z.literal("rename"),
  name: z.string().trim().min(1).max(32),
});

const SubmissionMessage = z.object({
  type: z.literal("submission"),
  roundNumber: z.number().int().min(1).max(100),
});

const ResultsReadyMessage = z.object({
  type: z.literal("results-ready"),
  roundNumber: z.number().int().min(1).max(100),
  ready: z.boolean(),
});

const IncomingMessage = z.union([
  JoinMessage,
  ChatMessage,
  ReadyMessage,
  SettingsMessage,
  KickMessage,
  ProgressMessage,
  SubmissionMessage,
  ResultsReadyMessage,
  RenameMessage,
]);

type Incoming = z.infer<typeof IncomingMessage>;

// Outgoing to client
type PlayersMsg = { type: "players"; players: string[] };
type FullMsg = { type: "full" };
interface ChatMsg {
  type: "chat";
  from: string;
  message: string;
  timestamp: string; // ISO
}
type RosterEntry = { id: string; name: string; ready: boolean; host: boolean; userId?: string | null };
type RosterMsg = { type: "roster"; players: RosterEntry[] };
type StartMsg = {
  type: "start";
  startedAt: string;
  durationSec: number;
  timerEnabled: boolean;
  seed: string;
  yearMin?: number;
  yearMax?: number;
  authoritativeTimer?: boolean;
};
type SettingsMsg = { type: "settings"; timerSeconds?: number; timerEnabled?: boolean; mode?: "sync" | "async"; yearMin?: number; yearMax?: number };
type HelloMsg = { type: "hello"; you: { id: string; name: string; host: boolean } };
type ProgressMsg = { type: "progress"; from: string; roundNumber: number; substep?: string };
type SubmissionBroadcastMsg = {
  type: "submission";
  roundNumber: number;
  connectionId: string;
  from: string;
  userId?: string | null;
  submittedCount: number;
  totalPlayers: number;
  lobbySize: number;
};
type RoundCompleteMsg = {
  type: "round-complete";
  roundNumber: number;
  submittedCount: number;
  totalPlayers: number;
  lobbySize: number;
};
type ResultsReadyMsg = {
  type: "results-ready";
  roundNumber: number;
  readyCount: number;
  totalPlayers: number;
};

type Outgoing =
  | PlayersMsg
  | FullMsg
  | ChatMsg
  | RosterMsg
  | StartMsg
  | SettingsMsg
  | HelloMsg
  | ProgressMsg
  | SubmissionBroadcastMsg
  | RoundCompleteMsg
  | ResultsReadyMsg;

// Env typing for vars
type Env = {
  MAX_PLAYERS?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  // Feature flags (opt-in)
  // When '1', attempt to start authoritative server timer via Supabase RPC.
  ENABLE_AUTH_TIMER?: string;
  // When '1', persist round starts to room_rounds via REST.
  ENABLE_ROOM_ROUND_PERSIST?: string;
  // Stable server user id to attribute authoritative timers to (uuid)
  SUPABASE_SERVER_USER_ID?: string;
  INVITE_HMAC_SECRET?: string;
  ALLOW_DEV_NO_INVITE?: string;
};

function decodeBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  return Buffer.from(padded, "base64");
}

export default class Lobby implements Party.Server {
  // Track connected players: connId -> name
  private players = new Map<string, string>();
  // Readiness per connection
  private ready = new Map<string, boolean>();
  // Map connection id -> user id (when provided)
  private playerUserIds = new Map<string, string | null>();
  private devInviteBypassLogged = false;
  // First join becomes host
  private hostId: string | null = null;
  // Start flag to avoid duplicate starts
  private started = false;
  // Timer settings (host-controlled)
  private timerSeconds: number = 60;
  private timerEnabled: boolean = true;
  private mode: "sync" | "async" = "sync";
  private yearMin: number | null = null;
  private yearMax: number | null = null;
  // Track live connections for administrative actions (kick)
  private conns = new Map<string, Party.Connection>();
  private submissionsByRound = new Map<number, Set<string>>();
  private completedRounds = new Set<number>();
  private activeByRound = new Map<number, Set<string>>();
  private expectedParticipants = 0;
  private expectedParticipantsByRound = new Map<number, number>();
  private resultsReadyByRound = new Map<number, Set<string>>();

  constructor(readonly room: Party.Room) {}

  // TODO: enforceInviteToken(token: string): Promise<boolean>
  // Validate invite token using HMAC when implemented
  private async enforceInviteToken(token?: string): Promise<boolean> {
    const env = (this.room.env as unknown as Env) || {};
    const secret = env.INVITE_HMAC_SECRET;
    const secretDefined = typeof secret === 'string' && secret.trim().length > 0 && !secret.startsWith('${');
    if (env.ALLOW_DEV_NO_INVITE === '1') {
      if (!this.devInviteBypassLogged) {
        console.warn("lobby: invite enforcement bypassed because ALLOW_DEV_NO_INVITE=1", { roomId: this.room.id });
        this.devInviteBypassLogged = true;
      }
      return true;
    }
    if (!secretDefined) {
      // Treat placeholder/unset secret as disabled (common in dev)
      return true;
    }
    if (!token) {
      console.warn("lobby: join missing invite token while INVITE_HMAC_SECRET is configured", {
        roomId: this.room.id,
      });
      return false;
    }
    try {
      const parts = token.split('.');
      if (parts.length !== 2) {
        console.warn("lobby: invite token malformed", { tokenSnippet: token.slice(0, 8) });
        return false;
      }
      const [roomPart, signature] = parts;
      if (roomPart !== this.room.id) {
        console.warn("lobby: invite token room mismatch", { expected: this.room.id, provided: roomPart });
        return false;
      }
      const expected = createHmac('sha256', secret).update(roomPart).digest();
      const provided = decodeBase64Url(signature);
      if (expected.length !== provided.length) {
        return false;
      }
      if (!timingSafeEqual(expected, provided)) {
        return false;
      }
      return true;
    } catch (e) {
      console.warn("lobby: invite token verification failed", e);
      return false;
    }
  }

  // Build canonical timer ID for a given 0-based round index
  // Format: gh:{gameId}:{roundIndex}
  private buildTimerIdForRound(roundIndex: number): string {
    const ri = Math.max(0, Math.floor(Number(roundIndex) || 0));
    return `gh:${this.room.id}:${ri}`;
  }

  // Start authoritative server timer via Supabase RPC
  // Returns startedAt from server on success, otherwise null
  private async startRoundTimer(durationSec: number): Promise<{ startedAt: string; durationSec: number } | null> {
    const env = (this.room.env as unknown as Env) || {};
    // Dev-safe default: skip authoritative timer unless explicitly enabled
    if (env.ENABLE_AUTH_TIMER !== '1') {
      console.warn('lobby: startRoundTimer skipped (ENABLE_AUTH_TIMER != 1). Using non-authoritative timers.');
      return null;
    }
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("lobby: startRoundTimer skipped due to missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return null;
    }
    const serverUserId = env.SUPABASE_SERVER_USER_ID;
    const serverUserConfigured = typeof serverUserId === 'string' && serverUserId.trim().length > 0 && !serverUserId.startsWith('${');
    if (!serverUserConfigured) {
      console.warn('lobby: startRoundTimer skipped because SUPABASE_SERVER_USER_ID is not configured');
      return null;
    }

    const timerId = this.buildTimerIdForRound(0); // round 1 => index 0
    const url = `${env.SUPABASE_URL}/rest/v1/rpc/start_timer`;
    const baseHeaders = this.supabaseHeaders(env)!;
    // Override Prefer to get representation back from RPC
    const headers = { ...baseHeaders, Prefer: "return=representation" } as Record<string, string>;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          p_timer_id: timerId,
          p_duration_sec: Math.max(5, Math.min(600, durationSec)),
          p_user_id: serverUserId,
        }),
      });
      if (!res.ok) {
        let body = "";
        try {
          body = await res.text();
        } catch (err) {
          console.warn("lobby: startRoundTimer failed to read response body", err);
        }
        console.warn(`lobby: startRoundTimer failed ${res.status} ${res.statusText} for ${url}`, body || "<no response body>");
        return null;
      }
      type StartTimerRow = { started_at?: string; duration_sec?: number };
      let rows: StartTimerRow[] | null = null;
      try {
        rows = (await res.json()) as StartTimerRow[];
      } catch (err) {
        console.warn("lobby: startRoundTimer failed to parse JSON", err);
      }
      if (!Array.isArray(rows) || rows.length === 0 || !rows[0]?.started_at) {
        console.warn("lobby: startRoundTimer returned no rows or invalid payload");
        return null;
      }
      const startedAt: string = rows[0].started_at;
      const dur: number = Number(rows[0].duration_sec) || Math.max(5, Math.min(600, durationSec));
      return { startedAt, durationSec: dur };
    } catch (e) {
      console.warn("lobby: startRoundTimer exception", e);
      return null;
    }
  }

  private async fetchProfileDisplayName(userId: string): Promise<string | null> {
    try {
      const env = (this.room.env as unknown as Env) || {};
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
      const url = `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=display_name&limit=1`;
      const headers = this.supabaseHeaders(env)!;
      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      const rows = (await res.json()) as Array<{ display_name?: string | null }>;
      const dn = rows && rows[0] && typeof rows[0].display_name === 'string' ? rows[0].display_name!.trim() : '';
      return dn && dn.length > 0 ? dn.slice(0, 32) : null;
    } catch (err) {
      console.warn("lobby: fetchProfileDisplayName exception", err);
      return null;
    }
  }

  // TODO: logEvent(type, payload)
  // Forward events to Supabase Edge Function when implemented
  private async logEvent(_type: string, _payload: unknown): Promise<void> {
    // TODO: send to logging pipeline
  }

  private maxPlayers(): number {
    const env = (this.room.env as unknown as Env) || {};
    const raw = env.MAX_PLAYERS ?? "2";
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 8) : 2; // cap for safety
  }

  private participantKey(connId: string): string {
    const userId = this.playerUserIds.get(connId);
    return userId && userId.length > 0 ? `user:${userId}` : `conn:${connId}`;
  }

  private uniqueParticipantCount(): number {
    const seen = new Set<string>();
    for (const connId of this.players.keys()) {
      seen.add(this.participantKey(connId));
    }
    return seen.size;
  }

  private broadcast(msg: Outgoing) {
    this.room.broadcast(JSON.stringify(msg));
  }

  private supabaseHeaders(env: Env) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    return key
      ? {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: "return=minimal",
        }
      : undefined;
  }

  private async ensureSessionPlayerRow(userId: string, data: { display_name?: string | null; is_host?: boolean; ready?: boolean }) {
    const env = (this.room.env as unknown as Env) || {};
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;
    const headers = { ...this.supabaseHeaders(env)! };
    headers.Prefer = "return=minimal,resolution=merge-duplicates";
    const payload = [{
      room_id: this.room.id,
      user_id: userId,
      display_name: data.display_name ?? null,
      is_host: data.is_host ?? false,
      ready: data.ready ?? false,
    }];
    try {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/session_players`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let body = "";
        try {
          body = await res.text();
        } catch (err) {
          console.warn("lobby: ensureSessionPlayerRow failed to read response body", err);
        }
        console.warn("lobby: ensureSessionPlayerRow failed", res.status, res.statusText, body);
      }
    } catch (e) {
      console.warn("lobby: ensureSessionPlayerRow exception", e);
    }
  }

  private async patchSessionPlayerRow(userId: string, patch: Record<string, unknown>) {
    const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return;
    const cleaned: Record<string, unknown> = Object.fromEntries(entries);
    const env = (this.room.env as unknown as Env) || {};
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;
    const headers = { ...this.supabaseHeaders(env)! };
    headers.Prefer = "return=minimal";
    const query = `${env.SUPABASE_URL}/rest/v1/session_players?room_id=eq.${encodeURIComponent(this.room.id)}&user_id=eq.${userId}`;
    try {
      const res = await fetch(query, {
        method: "PATCH",
        headers,
        body: JSON.stringify(cleaned),
      });
      if (!res.ok) {
        let body = "";
        try {
          body = await res.text();
        } catch (err) {
          console.warn("lobby: patchSessionPlayerRow failed to read response body", err);
        }
        console.warn("lobby: patchSessionPlayerRow failed", res.status, res.statusText, body);
      }
    } catch (e) {
      console.warn("lobby: patchSessionPlayerRow exception", e);
    }
  }

  private async markHostFlags(previousHostConn: string | null, nextHostConn: string | null) {
    if (previousHostConn && previousHostConn !== nextHostConn) {
      const prevUserId = this.playerUserIds.get(previousHostConn);
      if (prevUserId) {
        await this.patchSessionPlayerRow(prevUserId, { is_host: false });
      }
    }
    if (nextHostConn) {
      const nextUserId = this.playerUserIds.get(nextHostConn);
      if (nextUserId) {
        await this.patchSessionPlayerRow(nextUserId, { is_host: true });
      }
    }
  }

  private async persistChat(message: string) {
    const env = (this.room.env as unknown as Env) || {};
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return; // best-effort only
    const url = `${env.SUPABASE_URL}/rest/v1/room_chat`;
    const headers = this.supabaseHeaders(env)!;
    try {
      await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify([{ room_id: this.room.id, user_id: null, message }]),
      });
    } catch (e) {
      // swallow errors; logging pipeline can handle later
      console.warn("lobby: persistChat failed", e);
    }
  }

  private async persistRoundStart(startedAt: string, durationSec: number) {
    const env = (this.room.env as unknown as Env) || {};
    // Dev-safe default: do not persist unless explicitly enabled
    if (env.ENABLE_ROOM_ROUND_PERSIST !== '1') {
      console.warn('lobby: persistRoundStart skipped (ENABLE_ROOM_ROUND_PERSIST != 1)');
      return;
    }
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn(
        "lobby: persistRoundStart skipped due to missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      );
      return;
    }
    const url = `${env.SUPABASE_URL}/rest/v1/room_rounds`;
    const headers = this.supabaseHeaders(env)!;
    // First round assumed at game start
    const payload = [{
      room_id: this.room.id,
      round_number: 1,
      started_at: startedAt,
      duration_sec: durationSec,
    }];
    try {
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
      if (!res.ok) {
        let body = "";
        try {
          body = await res.text();
        } catch (err) {
          console.warn("lobby: persistRoundStart failed to read response body", err);
        }
        console.warn(
          `lobby: persistRoundStart failed ${res.status} ${res.statusText} at ${url}`,
          body || "<no response body>"
        );
      }
    } catch (e) {
      console.warn("lobby: persistRoundStart failed", e);
    }
  }

  private async resetPersistedRoundState() {
    const env = (this.room.env as unknown as Env) || {};
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('lobby: resetPersistedRoundState skipped due to missing Supabase credentials');
      return;
    }
    const headers = this.supabaseHeaders(env);
    if (!headers) return;
    const baseUrl = `${env.SUPABASE_URL}/rest/v1`;
    const roomParam = encodeURIComponent(this.room.id);
    const targets: Array<{ table: string; query: string }> = [
      { table: 'round_results', query: `room_id=eq.${roomParam}` },
      { table: 'sync_round_scores', query: `room_id=eq.${roomParam}` },
    ];

    for (const { table, query } of targets) {
      const url = `${baseUrl}/${table}?${query}`;
      try {
        const res = await fetch(url, {
          method: 'DELETE',
          headers,
        });
        if (!res.ok) {
          let body = '';
          try {
            body = await res.text();
          } catch (err) {
            console.warn(`lobby: resetPersistedRoundState failed to read response for ${table}`, err);
          }
          console.warn(`lobby: resetPersistedRoundState failed ${res.status} ${res.statusText} at ${url}`, body || '<no response body>');
        }
      } catch (err) {
        console.warn(`lobby: resetPersistedRoundState exception for ${table}`, err);
      }
    }
  }

  // Broadcast an updated results-ready summary for a round, using the
  // currently active participant count for that round as the expected total.
  private async broadcastResultsReadyForRound(roundNumber: number) {
    const readySet = this.resultsReadyByRound.get(roundNumber) ?? new Set<string>();
    const activeSize = this.activeByRound.get(roundNumber)?.size ?? 0;
    const readyCount = readySet.size;
    const payload: ResultsReadyMsg = {
      type: "results-ready",
      roundNumber,
      readyCount,
      totalPlayers: Math.max(activeSize, readyCount),
    };
    this.broadcast(payload);
    await this.logEvent("results-ready", payload);
  }

  private broadcastRoster() {
    const names = Array.from(this.players.values());
    // Maintain legacy 'players' message for compatibility
    this.broadcast({ type: "players", players: names });

    // New detailed roster with readiness and host
    const roster: RosterEntry[] = Array.from(this.players.entries()).map(([id, name]) => ({
      id,
      name,
      ready: this.ready.get(id) === true,
      host: this.hostId === id,
      userId: this.playerUserIds.get(id) ?? null,
    }));
    this.broadcast({ type: "roster", players: roster });
  }

  async onConnect(conn: Party.Connection, _ctx: Party.ConnectionContext) {
    // Track connection for administrative actions
    this.conns.set(conn.id, conn);
    // Connection established, wait for a valid join message
    conn.addEventListener("message", async (evt) => {
      try {
        const parsed = IncomingMessage.safeParse(JSON.parse(String(evt.data)));
        if (!parsed.success) return; // ignore invalid
        const msg = parsed.data as Incoming;

        if (msg.type === "join") {
          const ok = await this.enforceInviteToken(msg.token);
          if (!ok) {
            conn.send(JSON.stringify({ type: "full" } satisfies FullMsg));
            conn.close(1008, "invalid token");
            return;
          }

          if (this.players.size >= this.maxPlayers()) {
            conn.send(JSON.stringify({ type: "full" } satisfies FullMsg));
            // close after a short delay to allow client to process message
            setTimeout(() => conn.close(1000, "room full"), 10);
            return;
          }

          let effectiveName = msg.name.trim().slice(0, 32);
          // Server-side enrichment: prefer profiles.display_name when userId provided
          if (msg.userId) {
            const enriched = await this.fetchProfileDisplayName(msg.userId).catch(() => null);
            if (enriched && enriched.length > 0) {
              effectiveName = enriched.trim().slice(0, 32);
            }
          }

          this.players.set(conn.id, effectiveName);
          this.playerUserIds.set(conn.id, msg.userId ?? null);
          // Assign host if none
          const previousHost = this.hostId;
          if (!this.hostId) this.hostId = conn.id;
          // New joins are not ready by default
          this.ready.set(conn.id, false);
          if (msg.userId) {
            await this.ensureSessionPlayerRow(msg.userId, {
              display_name: effectiveName,
              is_host: this.hostId === conn.id,
              ready: false,
            });
            if (previousHost !== this.hostId) {
              await this.markHostFlags(previousHost, this.hostId);
            }
          }
          this.broadcastRoster();
          // Identify this connection to the client
          conn.send(
            JSON.stringify({
              type: "hello",
              you: { id: conn.id, name: effectiveName, host: this.hostId === conn.id },
            } satisfies HelloMsg)
          );
          // Send current timer settings to the newly joined client
          conn.send(
            JSON.stringify({
              type: "settings",
              timerSeconds: this.timerSeconds,
              timerEnabled: this.timerEnabled,
              mode: this.mode,
              yearMin: this.yearMin ?? undefined,
              yearMax: this.yearMax ?? undefined,
            } satisfies SettingsMsg)
          );
          await this.logEvent("join", { id: conn.id, name: effectiveName });
          return;
        }

        if (msg.type === "rename") {
          if (!this.players.has(conn.id)) return; // must have joined
          const newName = msg.name.trim().slice(0, 32);
          if (!newName) return;
          this.players.set(conn.id, newName);
          const userId = this.playerUserIds.get(conn.id);
          if (userId) {
            await this.patchSessionPlayerRow(userId, { display_name: newName });
          }
          await this.logEvent("rename", { id: conn.id, name: newName });
          this.broadcastRoster();
          return;
        }

        if (msg.type === "settings") {
          // Only host can adjust settings
          if (conn.id !== this.hostId) return;
          if (typeof msg.timerSeconds === "number") {
            // Clamp as defense in depth; zod already validates
            const clamped = Math.max(5, Math.min(600, msg.timerSeconds));
            this.timerSeconds = clamped;
          }
          if (typeof msg.timerEnabled === "boolean") {
            this.timerEnabled = msg.timerEnabled;
          }
          if (msg.mode === "sync" || msg.mode === "async") {
            this.mode = msg.mode;
            // In sync mode, timer must be enabled; enforce here server-side
            if (this.mode === "sync") this.timerEnabled = true;
          }
          // Year range is optional; store as provided
          let nextMin = typeof msg.yearMin === 'number' ? Math.round(msg.yearMin) : this.yearMin;
          let nextMax = typeof msg.yearMax === 'number' ? Math.round(msg.yearMax) : this.yearMax;
          if (typeof nextMin === 'number' && typeof nextMax === 'number' && nextMax < nextMin) {
            const t = nextMin;
            nextMin = nextMax;
            nextMax = t;
          }
          this.yearMin = typeof nextMin === 'number' ? nextMin : this.yearMin;
          this.yearMax = typeof nextMax === 'number' ? nextMax : this.yearMax;
          await this.logEvent("settings", { timerSeconds: this.timerSeconds, timerEnabled: this.timerEnabled });
          // Broadcast updated settings to all participants for real-time sync
          this.broadcast({
            type: "settings",
            timerSeconds: this.timerSeconds,
            timerEnabled: this.timerEnabled,
            mode: this.mode,
            yearMin: this.yearMin ?? undefined,
            yearMax: this.yearMax ?? undefined,
          });
          return;
        }

        if (msg.type === "chat") {
          const from = this.players.get(conn.id);
          if (!from) return; // ignore chat from non-joined

          const payload: ChatMsg = {
            type: "chat",
            from,
            message: msg.message,
            timestamp: msg.timestamp,
          };
          this.broadcast(payload);
          await this.logEvent("chat", payload);
          // Best-effort persist to Supabase (user_id unknown in server context)
          await this.persistChat(msg.message);
          return;
        }

        if (msg.type === "ready") {
          if (!this.players.has(conn.id)) return; // must have joined
          this.ready.set(conn.id, !!msg.ready);
          const userId = this.playerUserIds.get(conn.id);
          if (userId) {
            await this.patchSessionPlayerRow(userId, { ready: !!msg.ready });
          }
          await this.logEvent("ready", { id: conn.id, ready: !!msg.ready });
          this.broadcastRoster();

          // If everyone currently in the room is ready, start the game
          const allReady = Array.from(this.players.keys()).every((id) => this.ready.get(id) === true);
          if (!this.started && this.players.size > 0 && allReady) {
            const durationSec = Math.max(5, Math.min(600, this.timerSeconds || 60));
            const timerEnabled = !!this.timerEnabled;
            this.started = true;
            await this.resetPersistedRoundState();
            this.submissionsByRound.clear();
            this.completedRounds.clear();
            this.activeByRound.clear();
            this.expectedParticipants = this.uniqueParticipantCount();
            this.expectedParticipantsByRound.clear();
            this.expectedParticipantsByRound.set(1, this.expectedParticipants);

            let startedAt: string | null = null;
            const seed = randomUUID();
            // Effective timer flag that we will advertise to clients. If we
            // fail to start the authoritative timer, we fall back to
            // non-authoritative local timers by setting this to false.
            let effectiveTimerEnabled = timerEnabled;
            let authoritativeTimerStarted = false;
            if (timerEnabled) {
              const started = await this.startRoundTimer(durationSec);
              if (!started) {
                console.warn(
                  "lobby: unable to start authoritative timer; falling back to non-authoritative start"
                );
                // Fallback: proceed with a start using client/local timers
                startedAt = new Date().toISOString();
              } else {
                startedAt = started.startedAt;
                authoritativeTimerStarted = true;
              }
            } else {
              // Timer disabled: still mark a start for synchronization
              startedAt = new Date().toISOString();
            }

            if (!startedAt) {
              startedAt = new Date().toISOString();
            }

            // Include year range if set
            this.broadcast({
              type: "start",
              startedAt,
              durationSec,
              timerEnabled: effectiveTimerEnabled,
              authoritativeTimer: authoritativeTimerStarted,
              seed,
              yearMin: this.yearMin ?? undefined,
              yearMax: this.yearMax ?? undefined,
            });
            await this.logEvent("start", { startedAt, durationSec, timerEnabled: effectiveTimerEnabled, seed, yearMin: this.yearMin ?? undefined, yearMax: this.yearMax ?? undefined });
            // Persist authoritative round 1 start for async/refresh recovery
            await this.persistRoundStart(startedAt, durationSec);
          }
          return;
        }

        if (msg.type === "kick") {
          // Only host can kick other players
          if (conn.id !== this.hostId) return;
          const targetId = msg.targetId;
          if (!this.players.has(targetId)) return;
          try {
            const target = this.conns.get(targetId);
            if (target) {
              target.close(4000, "kicked by host");
            }
          } catch (err) {
            console.warn("lobby: error closing target connection during kick", err);
          }
          // Cleanup state in case close event arrives later
          this.players.delete(targetId);
          this.ready.delete(targetId);
          const targetUserId = this.playerUserIds.get(targetId);
          if (targetUserId) {
            await this.patchSessionPlayerRow(targetUserId, { ready: false, is_host: false });
          }
          if (this.hostId === targetId) {
            const first = this.players.keys().next();
            const previousHost = this.hostId;
            this.hostId = first.done ? null : first.value;
            await this.markHostFlags(previousHost, this.hostId);
          }
          this.broadcastRoster();
          return;
        }

        if (msg.type === "progress") {
          if (!this.players.has(conn.id)) return;
          const roundNumber = msg.roundNumber;
          if (msg.substep === "round-start") {
            this.submissionsByRound.delete(roundNumber);
            this.completedRounds.delete(roundNumber);
            let active = this.activeByRound.get(roundNumber);
            if (!active) {
              active = new Set();
              this.activeByRound.set(roundNumber, active);
            }
            active.add(this.participantKey(conn.id));
            const expected = Math.max(
              this.expectedParticipantsByRound.get(roundNumber) ?? 0,
              active.size,
              this.expectedParticipants
            );
            this.expectedParticipantsByRound.set(roundNumber, expected);
            this.resultsReadyByRound.delete(roundNumber);
          }
          const out: ProgressMsg = {
            type: "progress",
            from: conn.id,
            roundNumber,
            substep: msg.substep,
          };
          this.broadcast(out);
          await this.logEvent("progress", out);
          return;
        }

        if (msg.type === "submission") {
          if (!this.players.has(conn.id)) return;
          const lobbySize = this.uniqueParticipantCount();
          if (lobbySize <= 0) return;

          const roundNumber = msg.roundNumber;
          let active = this.activeByRound.get(roundNumber);
          if (!active) {
            active = new Set();
            this.activeByRound.set(roundNumber, active);
          }
          const participantKey = this.participantKey(conn.id);
          active.add(participantKey);

          let submissions = this.submissionsByRound.get(roundNumber);
          if (!submissions) {
            submissions = new Set();
            this.submissionsByRound.set(roundNumber, submissions);
            this.completedRounds.delete(roundNumber);
          }
          if (submissions.has(participantKey)) {
            return;
          }
          submissions.add(participantKey);

          const submittedCount = submissions.size;
          const expectedFromHistory = this.expectedParticipantsByRound.get(roundNumber) ?? this.expectedParticipants;
          const totalPlayers = Math.max(
            expectedFromHistory,
            active.size,
            submittedCount,
            lobbySize,
          );
          this.expectedParticipantsByRound.set(
            roundNumber,
            Math.max(totalPlayers, this.expectedParticipantsByRound.get(roundNumber) ?? 0, this.expectedParticipants),
          );
          this.expectedParticipants = Math.max(this.expectedParticipants, totalPlayers, lobbySize);

          const submissionPayload: SubmissionBroadcastMsg = {
            type: "submission",
            roundNumber,
            connectionId: conn.id,
            from: this.players.get(conn.id) ?? "Unknown",
            userId: this.playerUserIds.get(conn.id) ?? null,
            submittedCount,
            totalPlayers,
            lobbySize,
          };
          this.broadcast(submissionPayload);
          await this.logEvent("submission", submissionPayload);

          if (submittedCount >= totalPlayers && !this.completedRounds.has(roundNumber)) {
            this.completedRounds.add(roundNumber);
            const completePayload: RoundCompleteMsg = {
              type: "round-complete",
              roundNumber,
              submittedCount,
              totalPlayers,
              lobbySize,
            };
            this.broadcast(completePayload);
            await this.logEvent("round-complete", completePayload);
            this.submissionsByRound.delete(roundNumber);
            const nextExpected = Math.max(this.expectedParticipants, submittedCount);
            this.expectedParticipants = nextExpected;
            this.expectedParticipantsByRound.set(roundNumber + 1, nextExpected);
          }
          return;
        }

        if (msg.type === "results-ready") {
          if (!this.players.has(conn.id)) return;
          const roundNumber = msg.roundNumber;
          let readySet = this.resultsReadyByRound.get(roundNumber);
          if (!readySet) {
            readySet = new Set();
            this.resultsReadyByRound.set(roundNumber, readySet);
          }
          const participantKey = this.participantKey(conn.id);
          if (msg.ready) {
            readySet.add(participantKey);
          } else {
            readySet.delete(participantKey);
          }

          const activeSize = this.activeByRound.get(roundNumber)?.size ?? 0;
          const readyCount = readySet.size;
          const broadcastPayload: ResultsReadyMsg = {
            type: "results-ready",
            roundNumber,
            readyCount,
            totalPlayers: Math.max(activeSize, readyCount),
          };
          this.broadcast(broadcastPayload);
          await this.logEvent("results-ready", broadcastPayload);
          return;
        }
      } catch (err) {
        // ignore malformed JSON
        console.warn("lobby: malformed message", err);
      }
    });
  }

  async onClose(conn: Party.Connection) {
    // Remove from connection map
    this.conns.delete(conn.id);
    const name = this.players.get(conn.id);
    if (name) {
      this.players.delete(conn.id);
      this.ready.delete(conn.id);
      const userId = this.playerUserIds.get(conn.id) || null;
      if (userId) {
        await this.patchSessionPlayerRow(userId, { ready: false, is_host: false });
      }
      this.playerUserIds.delete(conn.id);
      const participantKey = this.participantKey(conn.id);
      this.submissionsByRound.forEach((set) => {
        set.delete(participantKey);
      });
      this.activeByRound.forEach((set, roundNumber) => {
        if (set.delete(participantKey)) {
          this.expectedParticipantsByRound.set(roundNumber, Math.max(set.size, this.expectedParticipantsByRound.get(roundNumber) ?? 0));
        }
      });
      // Also remove from results-ready sets and broadcast updated counts so
      // clients no longer wait for a disconnected participant.
      for (const [roundNumber, readySet] of this.resultsReadyByRound.entries()) {
        const changed = readySet.delete(participantKey);
        // Even if ready set didn't change, totalPlayers may have decreased due to
        // active set shrinkage; broadcast to update client expectations.
        await this.broadcastResultsReadyForRound(roundNumber);
      }
      this.expectedParticipants = Math.max(this.uniqueParticipantCount(), this.expectedParticipants - 1);
      // Reassign host if needed
      if (this.hostId === conn.id) {
        const previousHost = this.hostId;
        const first = this.players.keys().next();
        this.hostId = first.done ? null : first.value;
        await this.markHostFlags(previousHost, this.hostId);
      }
      this.broadcastRoster();
      await this.logEvent("leave", { id: conn.id, name });
    }
  }
}

 
