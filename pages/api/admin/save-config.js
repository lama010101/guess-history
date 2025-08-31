import { createClient } from '@supabase/supabase-js';
import { GameConfigSchema } from '../../../src/config/gameConfig';
import { saveConfigPatch } from '../../../src/server/configService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnon) {
      return res.status(500).json({ error: 'Missing Supabase env config' });
    }

    // Client with user's access token so RLS applies on behalf of the user
    const client = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const patch = req.body;

    // Validate that the final result after merge will still conform to full schema happens in saveConfigPatch
    const result = await saveConfigPatch(client, patch);

    return res.status(200).json({ ok: true, updated_at: result.updated_at });
  } catch (err) {
    console.error('save-config failed', err);
    const message = err?.message || 'Unknown error';
    return res.status(400).json({ error: message });
  }
}
