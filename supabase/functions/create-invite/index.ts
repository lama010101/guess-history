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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

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

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmacSignBase64Url(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(HMAC_SECRET);
  const msgUint8 = encoder.encode(message);
  const algo = { name: "HMAC", hash: "SHA-256" } as const;
  const key = await crypto.subtle.importKey("raw", keyData, algo, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, msgUint8);
  return toBase64Url(new Uint8Array(sig));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ code: "RATE_LIMIT" }), { status: 429, headers: corsHeaders });
  }

  const body = await req.json();
  const { roomId: maybeRoomId, mode } = body as { roomId?: string; mode: "sync" | "async" };
  if (!mode) return new Response("mode required", { status: 400, headers: corsHeaders });

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
      return new Response("db error", { status: 500, headers: corsHeaders });
    }
  }

  const expiresAt = Date.now() + 15 * 60 * 1000;
  const payloadObj = { roomId, expiresAt, mode };
  const payload = btoa(JSON.stringify(payloadObj));
  const signature = await hmacSignBase64Url(roomId);
  return new Response(JSON.stringify({ payload, signature }), { status: 200, headers: corsHeaders });
});
