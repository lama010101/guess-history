import { createClient } from "@supabase/supabase-js";

// In PartyKit workers we access environment bindings via globalThis.env
// The Guess History deployment will supply these secrets in wrangler.toml.
// Type definitions are provided for clarity; tweak path if using a custom
// env typing approach.
interface EnvBindings {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

declare const env: EnvBindings;

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: fetch.bind(globalThis),
    },
  }
);
