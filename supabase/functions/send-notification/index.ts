
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ONESIGNAL_APP_ID = 'aa5b64e9-f512-4cd6-9bc7-fac06adab021';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientId, message, title, data } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // First, create the notification in the database
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        receiver_id: recipientId,
        message: message,
        type: data?.type || "general",
        game_id: data?.game_id || null,
        sender_id: data?.sender_id || null,
      })
      .select()
      .single();
      
    if (notificationError) {
      console.error("Error storing notification:", notificationError);
      throw new Error(`Failed to create notification: ${notificationError.message}`);
    }
    
    // Get recipient's details
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", recipientId)
      .single();
      
    if (profileError) {
      console.error(`Error getting recipient profile: ${profileError.message}`);
    }
    
    // Send push notification via OneSignal REST API
    try {
      const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Deno.env.get("ONESIGNAL_REST_API_KEY") || ""}`
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          include_external_user_ids: [recipientId],
          headings: { en: title || "GuessEvents" },
          contents: { en: message },
          data: data || {},
          channel_for_external_user_ids: "push"
        })
      });
      
      const pushResult = await oneSignalResponse.json();
      console.log("OneSignal push notification result:", pushResult);
      
      // Even if push fails, we'll return success because the in-app notification was created
      return new Response(
        JSON.stringify({ 
          success: true, 
          notification,
          pushNotification: pushResult
        }),
        { 
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 200
        }
      );
    } catch (pushError) {
      console.error("Error sending push notification:", pushError);
      
      // Return success anyway because the in-app notification was created
      return new Response(
        JSON.stringify({ 
          success: true, 
          notification,
          pushNotification: { error: "Failed to send push notification" }
        }),
        { 
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 200
        }
      );
    }
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
