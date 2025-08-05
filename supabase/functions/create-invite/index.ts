// Supabase Edge Function: create-invite
// POST /api/invites → creates or returns invite link with HMAC signature.
// Requirements:
// • Validate Supabase JWT (ensured by supabase auth middleware)
// • Rate-limit per-IP (max 20/min) using Supabase KV (Vector or Redis-like). For MVP, we can
//   leverage Deno KV via globalThis.
// • Accept body { roomId?: string, mode: "sync" | "async" }
//   – If roomId omitted, create dormant room record in `room_state` with waiting status.
// • Returns { inviteLink }
//
// NOTE: This is a minimal scaffold; adjust import paths and edge runtime APIs as needed.

import { createClient } from "@supabase/supabase-js";
import { serve } from "https://deno.land/std@0.205.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HMAC_SECRET = Deno.env.get("INVITE_HMAC_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Simple in-memory rate-limit (edge runtime process). For production, use KV.
const ipCounters = new Map<string, { count: number; ts: number }>();

function rateLimited(ip: string): boolean {
  const windowMs = 60 * 1000;
  const record = ipCounters.get(ip);
  const now = Date.now();
  if (!record || now - record.ts > windowMs) {
    ipCounters.set(ip, { count: 1, ts: now });
    return false;
  }
  if (record.count >= 20) return true;
  record.count += 1;
  return false;
}

function hmacSign(payload: string): string {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(HMAC_SECRET);
  const msgUint8 = encoder.encode(payload);
  const algo = { name: "HMAC", hash: "SHA-256" } as const;
  return crypto.subtle.importKey("raw", keyData, algo, false, ["sign"]).then((key) =>
    crypto.subtle.sign("HMAC", key, msgUint8)
  ).then((sig) => {
    const bytes = new Uint8Array(sig);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  });
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ code: "RATE_LIMIT" }), { status: 429 });
  }

  const body = await req.json();
  const { roomId: maybeRoomId, mode } = body as { roomId?: string; mode: "sync" | "async" };
  if (!mode) return new Response("mode required", { status: 400 });

  let roomId = maybeRoomId;
  if (!roomId) {
    // Create dormant room record
    roomId = crypto.randomUUID();
    const { error } = await supabase.from("room_state").insert({
      room_id: roomId,
      data: { mode, status: "waiting" },
    });
    if (error) {
      console.error(error);
      return new Response("db error", { status: 500 });
    }
  }

  const expiresAt = Date.now() + 15 * 60 * 1000;
  const payload = JSON.stringify({ roomId, expiresAt, mode });
  const signature = await hmacSign(payload);

  const inviteLink = `https://guess-history.com/join/${roomId}?payload=${btoa(payload)}&sig=${signature}`;

  return new Response(JSON.stringify({ inviteLink }), { headers: { "Content-Type": "application/json" } });
});
