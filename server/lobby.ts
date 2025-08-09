import type * as Party from "partykit/server";
import { z } from "zod";

// Types
const JoinMessage = z.object({
  type: z.literal("join"),
  name: z.string().trim().min(1).max(32),
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

const IncomingMessage = z.union([JoinMessage, ChatMessage, ReadyMessage]);

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
type RosterEntry = { name: string; ready: boolean; host: boolean };
type RosterMsg = { type: "roster"; players: RosterEntry[] };
type StartMsg = { type: "start"; startedAt: string };

type Outgoing = PlayersMsg | FullMsg | ChatMsg | RosterMsg | StartMsg;

// Env typing for vars
type Env = { MAX_PLAYERS?: string };

export default class Lobby implements Party.Server {
  // Track connected players: connId -> name
  private players = new Map<string, string>();
  // Readiness per connection
  private ready = new Map<string, boolean>();
  // First join becomes host
  private hostId: string | null = null;
  // Start flag to avoid duplicate starts
  private started = false;

  constructor(readonly room: Party.Room) {}

  // TODO: enforceInviteToken(token: string): Promise<boolean>
  // Validate invite token using HMAC when implemented
  private async enforceInviteToken(_token?: string): Promise<boolean> {
    // TODO: implement HMAC verification using env vars
    return true;
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

  private broadcastRoster() {
    const names = Array.from(this.players.values());
    // Maintain legacy 'players' message for compatibility
    this.broadcast({ type: "players", players: names });

    // New detailed roster with readiness and host
    const roster: RosterEntry[] = Array.from(this.players.entries()).map(([id, name]) => ({
      name,
      ready: this.ready.get(id) === true,
      host: this.hostId === id,
    }));
    this.broadcast({ type: "roster", players: roster });
  }

  async onConnect(conn: Party.Connection, _ctx: Party.ConnectionContext) {
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

          this.players.set(conn.id, msg.name);
          // Assign host if none
          if (!this.hostId) this.hostId = conn.id;
          // New joins are not ready by default
          this.ready.set(conn.id, false);
          this.broadcastRoster();
          await this.logEvent("join", { id: conn.id, name: msg.name });
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
            this.started = true;
            const startedAt = new Date().toISOString();
            this.broadcast({ type: "start", startedAt });
            await this.logEvent("start", { startedAt });
          }
          return;
        }
      } catch (err) {
        // ignore malformed JSON
        console.warn("lobby: malformed message", err);
      }
    });
  }

  async onClose(conn: Party.Connection) {
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

 
