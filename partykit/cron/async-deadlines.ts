/*
 * PartyKit cron route: wakes rooms whose deadlineAt is imminent.
 * Runs every minute (configured in wrangler.toml crons).
 */

import { createClient } from "@supabase/supabase-js";

export default {
  // `scheduled` is the entry point for scheduled workers in Cloudflare Workers.
  async scheduled(controller: any, env: any, ctx: any) {
    const now = Date.now();
    const deadlineWindow = now + 15000; // 15 seconds in future

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Query rooms with deadline within next 15 seconds
    const { data: rooms, error } = await supabase
      .from("room_state")
      .select("room_id")
      .gte("data->>deadlineAt", now.toString())
      .lte("data->>deadlineAt", deadlineWindow.toString());

    if (error) {
      console.error("Error querying rooms for deadline processing:", error);
      return;
    }

    if (!rooms?.length) return;

    // Wake each room via PartyKit REST API
    for (const room of rooms) {
      try {
        const wakeUrl = `${env.PARTYKIT_URL}/parties/main/${room.room_id}`;
        const response = await fetch(wakeUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.PARTYKIT_DASH_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type: "PROCESS_DEADLINE" }),
        });
        
        if (!response.ok) {
          console.error(`Failed to wake room ${room.room_id}:`, response.status);
        }
      } catch (error) {
        console.error(`Error waking room ${room.room_id}:`, error);
      }
    }

    return new Response("ok");
  },
};
