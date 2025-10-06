import { serve } from "https://deno.land/std@0.205.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PARTYKIT_WEBHOOK_URL = Deno.env.get("PARTYKIT_WEBHOOK_URL") ?? "";
const PARTYKIT_WEBHOOK_SECRET = Deno.env.get("PARTYKIT_WEBHOOK_SECRET") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface StartRoundPayload {
  action: "start_round";
  roomId: string;
  roundIndex: number;
  durationSec: number;
  timerEnabled: boolean;
  seed: string;
  hostUserId: string;
}

interface RecordSubmissionPayload {
  action: "record_submission";
  roomId: string;
  roundIndex: number;
  playerId: string;
  roundResultId: string;
}

interface FinalizeRoundPayload {
  action: "finalize_round";
  roomId: string;
  roundIndex: number;
}

type OrchestratorRequest = StartRoundPayload | RecordSubmissionPayload | FinalizeRoundPayload;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function forwardToPartyKit(event: string, payload: Record<string, unknown>) {
  if (!PARTYKIT_WEBHOOK_URL || !PARTYKIT_WEBHOOK_SECRET) {
    return;
  }

  await fetch(PARTYKIT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PARTYKIT_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({ event, payload }),
  }).catch((err) => {
    console.warn("[orchestrator] PartyKit forward failed", { event, err });
  });
}

async function handleStartRound(payload: StartRoundPayload) {
  const { roomId, roundIndex, durationSec, timerEnabled, seed, hostUserId } = payload;

  // Persist round start (round_number is 1-based)
  const { error: roundErr } = await supabase.from("room_rounds").upsert({
    room_id: roomId,
    round_number: roundIndex + 1,
    started_at: new Date().toISOString(),
    duration_sec: durationSec,
    finalized_payload: null,
  });

  if (roundErr) {
    console.error("[orchestrator] Failed to persist room_rounds", roundErr);
    return jsonResponse(500, { error: "failed_persist_round" });
  }

  // Start deterministic image selection via RPC
  const { data, error: rpcErr } = await supabase.rpc("create_game_session_and_pick_images", {
    p_user_id: null,
    p_room_id: roomId,
    p_count: 5,
    p_seed: seed,
    p_min_year: null,
    p_max_year: null,
  });

  if (rpcErr) {
    console.error("[orchestrator] RPC create_game_session_and_pick_images failed", rpcErr);
    return jsonResponse(500, { error: "failed_select_images" });
  }

  // Kick off authoritative timer if enabled
  if (timerEnabled) {
    const timerId = `gh:${roomId}:${roundIndex}`;
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/start_timer`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        p_timer_id: timerId,
        p_duration_sec: durationSec,
        p_user_id: hostUserId,
      }),
    }).catch((err) => {
      console.warn("[orchestrator] start_timer RPC failed", err);
    });
  }

  await forwardToPartyKit("round_started", {
    roomId,
    roundIndex,
    durationSec,
    timerEnabled,
    seed,
    imageCount: Array.isArray(data) ? data.length : 0,
  });

  return jsonResponse(200, { ok: true, roundIndex });
}

async function handleRecordSubmission(payload: RecordSubmissionPayload) {
  const { roomId, roundIndex, playerId } = payload;

  const { error } = await supabase.from("sync_guess_events").upsert({
    room_id: roomId,
    round_index: roundIndex,
    player_id: playerId,
  });

  if (error) {
    console.error("[orchestrator] Failed to upsert sync_guess_events", error);
    return jsonResponse(500, { error: "failed_track_submission" });
  }

  await forwardToPartyKit("guess_submitted", {
    roomId,
    roundIndex,
    playerId,
  });

  return jsonResponse(200, { ok: true });
}

async function handleFinalizeRound(payload: FinalizeRoundPayload) {
  const { roomId, roundIndex } = payload;

  const { data: scoreboard, error: scoreboardErr } = await supabase.rpc("get_round_scoreboard", {
    p_room_id: roomId,
    p_round_number: roundIndex + 1,
  });

  if (scoreboardErr) {
    console.error("[orchestrator] get_round_scoreboard failed", scoreboardErr);
    return jsonResponse(500, { error: "failed_fetch_scoreboard" });
  }

  const finalizedPayload = {
    roomId,
    roundIndex,
    scoreboard,
    finalizedAt: new Date().toISOString(),
  };

  const { error: updateErr } = await supabase
    .from("room_rounds")
    .update({ finalized_payload: finalizedPayload })
    .eq("room_id", roomId)
    .eq("round_number", roundIndex + 1);

  if (updateErr) {
    console.error("[orchestrator] Failed to update room_rounds.finalized_payload", updateErr);
    return jsonResponse(500, { error: "failed_persist_finalized_payload" });
  }

  await forwardToPartyKit("round_completed", finalizedPayload);

  return jsonResponse(200, { ok: true, scoreboard });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  let payload: OrchestratorRequest;
  try {
    payload = await req.json();
  } catch (err) {
    return jsonResponse(400, { error: "invalid_json", details: String(err) });
  }

  switch (payload.action) {
    case "start_round":
      return handleStartRound(payload);
    case "record_submission":
      return handleRecordSubmission(payload);
    case "finalize_round":
      return handleFinalizeRound(payload);
    default:
      return jsonResponse(400, { error: "unknown_action" });
  }
});
