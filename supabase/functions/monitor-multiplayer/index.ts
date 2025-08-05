import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get metrics from the last hour
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Error rate check
    const { data: errorLogs, error: errorLogsError } = await supabaseClient
      .from('partykit_logs')
      .select('*')
      .eq('event_type', 'ERROR')
      .gte('created_at', oneHourAgo.toISOString());

    // Latency check
    const { data: latencyLogs, error: latencyError } = await supabaseClient
      .from('partykit_logs')
      .select('metadata')
      .eq('event_type', 'PLAYER_MOVE')
      .gte('created_at', oneHourAgo.toISOString());

    // Rate limit triggers
    const { data: rateLimitLogs, error: rateLimitError } = await supabaseClient
      .from('partykit_logs')
      .select('*')
      .eq('event_type', 'RATE_LIMIT')
      .gte('created_at', oneHourAgo.toISOString());

    const totalEvents = (errorLogs?.length || 0) + (latencyLogs?.length || 0);
    const errorRate = totalEvents > 0 ? (errorLogs?.length || 0) / totalEvents : 0;
    
    const latencies = latencyLogs?.map(log => log.metadata?.latency || 0) || [];
    const sortedLatencies = latencies.sort((a, b) => b - a);
    const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;

    // Alert thresholds
    const alerts = [];

    if (errorRate > 0.01) {
      alerts.push({
        type: 'ERROR_RATE_HIGH',
        value: errorRate,
        threshold: 0.01,
        message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds 1%`
      });
    }

    if (p95Latency > 350) {
      alerts.push({
        type: 'LATENCY_HIGH',
        value: p95Latency,
        threshold: 350,
        message: `P95 latency ${p95Latency}ms exceeds 350ms`
      });
    }

    if ((rateLimitLogs?.length || 0) > 0) {
      alerts.push({
        type: 'RATE_LIMIT_TRIGGERED',
        value: rateLimitLogs?.length || 0,
        message: `${rateLimitLogs?.length || 0} rate limit triggers detected`
      });
    }

    // Send alerts if any thresholds exceeded
    if (alerts.length > 0) {
      // Here you would integrate with Slack, email, or other alerting
      console.warn('Multiplayer alerts:', alerts);
    }

    return new Response(
      JSON.stringify({
        metrics: {
          errorRate,
          p95Latency,
          rateLimitTriggers: rateLimitLogs?.length || 0,
          totalEvents
        },
        alerts
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
