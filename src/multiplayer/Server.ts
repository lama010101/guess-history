// PartyKit server for Guess History Async Multiplayer
// Phase 1 MVP – supports async link-based games only.
// This is an initial scaffold providing:
// • Connection validation placeholder
// • Basic message broadcast with authoritative validation TODOs
// • Snapshot persistence to Supabase `room_state`
// • Authoritative event logging to Supabase `partykit_logs`
// • Room hibernation snapshot just before sleep

import type {
  PartyKitServer,
  ConnectionContext,
  Connection,
  Room,
} from "partykit/server";
import { createClient } from "@supabase/supabase-js";

// Supabase client for PartyKit runtime
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/**
 * Helper: insert authoritative log entry into `partykit_logs`.
 */
async function logEvent(
  roomId: string,
  playerId: string | null,
  eventType: string,
  payload: any
) {
  await supabase.from("partykit_logs").insert({
    room_id: roomId,
    player_id: playerId,
    event_type: eventType,
    payload,
  });
}

/**
 * Persist room state to Supabase with optimistic locking.
 */
/**
 * Persist room state to Supabase with optimistic locking.
 */
async function persistState(
  roomId: string,
  state: ServerState,
  revision: number
): Promise<void> {
  const { error } = await supabase
    .from("room_state")
    .upsert(
      {
        room_id: roomId,
        data: state,
        revision,
      },
      {
        onConflict: "room_id",
        ignoreDuplicates: false,
      }
    )
    .eq("revision", revision - 1); // Optimistic locking check

  if (error) {
    console.error("Failed to persist state:", error);
    throw error;
  }
}

export default class Server implements PartyKitServer {
  revision = 0;
  // Internal in-memory state. For MVP it is the same object we persist.
  state: ServerState = {
    mode: "async",
    hostId: null,
    players: {},
    game: { moves: {} },
  };

  constructor(readonly room: Room) {}

  /** Helper: broadcast full state to every connection */
  private broadcastState(room: Room) {
    const payload = JSON.stringify({ type: "STATE", data: this.state });
    for (const conn of Array.from(room.getConnections())) {
      try {
        conn.send(payload);
      } catch {}
    }
  }

  // Validate Supabase JWT and send SERVER_STATE.
  async onConnect(connection: Connection, room: Room, ctx: ConnectionContext) {
    const url = new URL(ctx.request.url);
    const jwt = url.searchParams.get("jwt") ?? "";

    // Verify token with Supabase Auth
    const { data: authData, error } = await supabase.auth.getUser(jwt);
    if (error || !authData.user) {
      connection.send(
        JSON.stringify({ type: "ERROR", message: "AUTH_INVALID_TOKEN" })
      );
      connection.close();
      return;
    }

    const playerId = authData.user.id;

    // Check if this is a reconnection
    const existingPlayer = this.state.players[playerId];
    if (existingPlayer) {
      console.log("player reconnected", playerId);
      await logEvent(room.id, playerId, "RECONNECT", {});
    } else {
      console.log("player joined", playerId);
      // Add new player to state
      this.state.players[playerId] = {
        id: playerId,
        displayName: authData.user.user_metadata?.display_name || "Anonymous",
        avatar: authData.user.user_metadata?.avatar_url || "",
        isReady: false,
        isConnected: true,
      };
            // Set first player as host
      if (!this.state.hostId) {
        this.state.hostId = playerId;
        this.state.players[playerId].isHost = true;
      }
      await logEvent(room.id, playerId, "CONNECT", {});
    }

    // Send full state to all players
    this.broadcastState(room);
  }

  async onMessage(
    message: string | ArrayBuffer | ArrayBufferView,
    connection: Connection,
    room: Room
  ) {
    if (typeof message !== "string") return;
    let evt: any;
    try {
      evt = JSON.parse(message);
    } catch (e) {
      return;
    }

    const playerId = Array.from(room.getConnections()).find(
      (conn) => conn === connection
    )?.id as string | undefined;

    if (!playerId) return;

    switch (evt.type) {
      case "PLAYER_MOVE": {
        // For async mode we accept moves any time before scoring
        if (!this.state.game) this.state.game = {} as any;
        const roundIdx = evt.roundIndex as number;
        const move = evt.move;
        if (!this.state.game.moves) this.state.game.moves = {} as any;
        (this.state.game.moves as any)[playerId] = {
          ...((this.state.game.moves as any)[playerId] ?? {}),
          [roundIdx]: move,
        };

        await logEvent(room.id, playerId, "PLAYER_MOVE", { roundIdx });
        await this.persistAndBroadcast({
          type: "PLAYER_SUBMITTED",
          playerId,
          roundIdx,
        }, room);
        break;
      }
      case "PLAYER_READY_TOGGLE": {
        const { isReady } = evt;
        if (this.state.players[playerId]) {
          this.state.players[playerId].isReady = !!isReady;
          await logEvent(room.id, playerId, "PLAYER_READY_TOGGLE", { isReady });
          // Broadcast updated state
          await persistState(room.id, this.state, ++this.revision);
          this.broadcastState(room);
        }
        break;
      }
      default:
        break;
    }
  }

  async onClose(connection: Connection, room: Room) {
    const playerId = Array.from(room.getConnections()).find(
      (conn) => conn === connection
    )?.id as string | undefined;

    if (playerId) {
      console.log("connection closed", playerId);
      await logEvent(room.id, playerId, "DISCONNECT", {});

      // Keep player in state for reconnection, just mark as disconnected
      if (this.state.players[playerId]) {
        this.state.players[playerId].isConnected = false;
      }
    }

    if (Array.from(room.getConnections()).length === 0) {
      // Everyone left → snapshot + allow hibernation
      await persistState(room.id, this.state, ++this.revision);
    }
  }

  async onBeforeClose(ctx: ConnectionContext, room: Room) {
    // Final state snapshot before hibernation
    await persistState(room.id, this.state, ++this.revision);
    console.log("Room hibernating", room.id);
  }

  /** Persist state with optimistic locking then broadcast event. */
  private async persistAndBroadcast(event: any, room: Room) {
    try {
      await persistState(room.id, this.state, ++this.revision);
      
      // broadcast to all
      for (const conn of Array.from(room.getConnections())) {
        try {
          conn.send(JSON.stringify(event));
        } catch {}
      }
    } catch (error) {
      console.error('Failed to persist state:', error);
      // broadcast error to all
      for (const conn of Array.from(room.getConnections())) {
        try {
          conn.send(JSON.stringify({ type: "ERROR", message: "STATE_PERSIST_FAILED" }));
        } catch {}
      }
    }
  }
}

interface Player {
  id: string;
  displayName: string;
  avatar: string;
  isReady: boolean;
  isHost?: boolean;
  isConnected?: boolean;
}

interface ServerState {
  mode: "sync" | "async";
  hostId: string | null;
  players: Record<string, Player>;
  game: {
    moves: Record<string, Record<number, any>>;
  };
}
