
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientId, message, title, data } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID") || "aa5b64e9-f512-4cd6-9bc7-fac06adab021";
    const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY") || "";
    
    if (!oneSignalAppId || !oneSignalApiKey) {
      throw new Error("OneSignal credentials not configured");
    }
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get recipient's OneSignal player ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onesignal_player_id")
      .eq("id", recipientId)
      .single();
      
    if (profileError || !profile?.onesignal_player_id) {
      console.log(`Error getting recipient profile or no OneSignal ID: ${profileError?.message || "No OneSignal ID found"}`);
      
      // Even if we can't send a push notification, let's still store it in the database
      const { data: notification, error: notificationError } = await supabase
        .from("notifications")
        .insert({
          receiver_id: recipientId,
          message: message,
          type: data?.type || "general",
          game_id: data?.game_id,
          sender_id: data?.sender_id,
        })
        .select()
        .single();
        
      if (notificationError) {
        console.error("Error storing notification:", notificationError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "No OneSignal player ID found for recipient",
          notification
        }),
        { 
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 200, // Still return 200 since we stored the notification
        }
      );
    }
    
    // Send notification via OneSignal
    const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${oneSignalApiKey}`,
      },
      body: JSON.stringify({
        app_id: oneSignalAppId,
        include_player_ids: [profile.onesignal_player_id],
        contents: { en: message },
        headings: { en: title || "GuessEvents" },
        data: data || {},
      }),
    });
    
    const responseData = await oneSignalResponse.json();
    console.log("OneSignal push notification result:", JSON.stringify(responseData));
    
    // Insert notification in the database
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        receiver_id: recipientId,
        message: message,
        type: data?.type || "general",
        game_id: data?.game_id,
        sender_id: data?.sender_id,
      })
      .select()
      .single();
      
    if (notificationError) {
      console.error("Error storing notification:", notificationError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: oneSignalResponse.ok,
        oneSignalResponse: responseData,
        notification
      }),
      { 
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: oneSignalResponse.ok ? 200 : 400,
      }
    );
  } catch (error) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});
