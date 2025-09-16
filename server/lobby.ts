import type * as Party from "partykit/server";
import { z } from "zod";

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

const IncomingMessage = z.union([JoinMessage, ChatMessage, ReadyMessage, SettingsMessage, KickMessage, ProgressMessage, RenameMessage]);

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
type RosterEntry = { id: string; name: string; ready: boolean; host: boolean };
type RosterMsg = { type: "roster"; players: RosterEntry[] };
type StartMsg = { type: "start"; startedAt: string; durationSec: number; timerEnabled: boolean };
type SettingsMsg = { type: "settings"; timerSeconds?: number; timerEnabled?: boolean; mode?: "sync" | "async" };
type HelloMsg = { type: "hello"; you: { id: string; name: string; host: boolean } };
type ProgressMsg = { type: "progress"; from: string; roundNumber: number; substep?: string };

type Outgoing = PlayersMsg | FullMsg | ChatMsg | RosterMsg | StartMsg | SettingsMsg | HelloMsg | ProgressMsg;

// Env typing for vars
type Env = { MAX_PLAYERS?: string; SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string };

export default class Lobby implements Party.Server {
  // Track connected players: connId -> name
  private players = new Map<string, string>();
  // Readiness per connection
  private ready = new Map<string, boolean>();
  // First join becomes host
  private hostId: string | null = null;
  // Start flag to avoid duplicate starts
  private started = false;
  // Timer settings (host-controlled)
  private timerSeconds: number = 60;
  private timerEnabled: boolean = true;
  private mode: "sync" | "async" = "sync";
  // Track live connections for administrative actions (kick)
  private conns = new Map<string, Party.Connection>();

  constructor(readonly room: Party.Room) {}

  // TODO: enforceInviteToken(token: string): Promise<boolean>
  // Validate invite token using HMAC when implemented
  private async enforceInviteToken(_token?: string): Promise<boolean> {
    // TODO: implement HMAC verification using env vars
    return true;
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
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("lobby: startRoundTimer skipped due to missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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
        body: JSON.stringify({ p_timer_id: timerId, p_duration_sec: Math.max(5, Math.min(600, durationSec)) }),
      });
      if (!res.ok) {
        let body = "";
        try { body = await res.text(); } catch {}
        console.warn(`lobby: startRoundTimer failed ${res.status} ${res.statusText} for ${url}`, body || "<no response body>");
        return null;
      }
      let rows: any = null;
      try {
        rows = await res.json();
      } catch {
        rows = null;
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
    } catch {
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
        } catch {}
        console.warn(
          `lobby: persistRoundStart failed ${res.status} ${res.statusText} at ${url}`,
          body || "<no response body>"
        );
      }
    } catch (e) {
      console.warn("lobby: persistRoundStart failed", e);
    }
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
          // Assign host if none
          if (!this.hostId) this.hostId = conn.id;
          // New joins are not ready by default
          this.ready.set(conn.id, false);
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
          await this.logEvent("settings", { timerSeconds: this.timerSeconds, timerEnabled: this.timerEnabled });
          // Broadcast updated settings to all participants for real-time sync
          this.broadcast({
            type: "settings",
            timerSeconds: this.timerSeconds,
            timerEnabled: this.timerEnabled,
            mode: this.mode,
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
          await this.logEvent("ready", { id: conn.id, ready: !!msg.ready });
          this.broadcastRoster();

          // If everyone currently in the room is ready, start the game
          const allReady = Array.from(this.players.keys()).every((id) => this.ready.get(id) === true);
          if (!this.started && this.players.size > 0 && allReady) {
            const durationSec = Math.max(5, Math.min(600, this.timerSeconds || 60));
            const timerEnabled = !!this.timerEnabled;
            this.started = true;

            let startedAt: string | null = null;
            if (timerEnabled) {
              const started = await this.startRoundTimer(durationSec);
              if (!started) {
                // Could not start authoritative timer; reset and wait for retry
                this.started = false;
                console.warn("lobby: unable to start authoritative timer; not broadcasting start");
                return;
              }
              startedAt = started.startedAt;
            } else {
              // Timer disabled: still mark a start for synchronization
              startedAt = new Date().toISOString();
            }

            this.broadcast({ type: "start", startedAt, durationSec, timerEnabled });
            await this.logEvent("start", { startedAt, durationSec, timerEnabled });
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
          } catch {}
          // Cleanup state in case close event arrives later
          this.players.delete(targetId);
          this.ready.delete(targetId);
          if (this.hostId === targetId) {
            const first = this.players.keys().next();
            this.hostId = first.done ? null : first.value;
          }
          this.broadcastRoster();
          return;
        }

        if (msg.type === "progress") {
          if (!this.players.has(conn.id)) return;
          const out: ProgressMsg = {
            type: "progress",
            from: conn.id,
            roundNumber: msg.roundNumber,
            substep: msg.substep,
          };
          this.broadcast(out);
          await this.logEvent("progress", out);
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
      // Reassign host if needed
      if (this.hostId === conn.id) {
        const first = this.players.keys().next();
        this.hostId = first.done ? null : first.value;
      }
      this.broadcastRoster();
      await this.logEvent("leave", { id: conn.id, name });
    }
  }
}

 
