import postgres from 'postgres';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { setTimeout as sleep } from 'node:timers/promises';
import dns from 'node:dns/promises';

// Load environment variables from .env.local if available, otherwise fallback to .env
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fsSync.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

// Simple logger that writes to both console and a log file
const LOG_PATH = path.join(process.cwd(), 'migration.log');
function log(msg: string) {
  const line = typeof msg === 'string' ? msg : String(msg);
  console.log(line);
  try {
    fsSync.appendFileSync(LOG_PATH, line + '\n');
  } catch {}
}
function errorLog(msg: unknown) {
  const line = typeof msg === 'string' ? msg : (msg as any)?.message ?? String(msg);
  console.error(line);
  try {
    fsSync.appendFileSync(LOG_PATH, line + '\n');
  } catch {}
}

// Establish __dirname in ESM (not strictly needed after switching to process.cwd())
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION ---
// IMPORTANT: The script will auto-read from .env.local/.env.
// URL selection priority:
//  1) SUPABASE_DB_CONNECTION (e.g. postgresql://postgres:pass@db.ref.supabase.co:5432/postgres)
//  2) SUPABASE_DB_URL (must be postgres:// or postgresql://; http(s) is ignored)

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

// Start a fresh log for this run
try { fsSync.writeFileSync(LOG_PATH, ''); } catch {}

// Migrations to explicitly skip (e.g., duplicates)
const SKIP_FILES = new Set([
  '20250820_create_session_players.sql',
  '20250810144129_add_room_rounds_and_current_round.sql',
]);

function pickDbUrl(): string | null {
  const conn = process.env.SUPABASE_DB_CONNECTION?.trim();
  if (conn && /^(postgres|postgresql):\/\//i.test(conn)) return conn;
  const url = process.env.SUPABASE_DB_URL?.trim();
  if (url && /^(postgres|postgresql):\/\//i.test(url)) return url;
  // Ignore http(s) URLs which point to REST/website, not Postgres
  return null;
}

function maskUrl(u: string): string {
  try {
    const parsed = new URL(u.replace(/^postgres(ql)?:\/\//, 'postgresql://'));
    if (parsed.password) parsed.password = '***';
    return `${parsed.protocol}//${parsed.username ? parsed.username + ':' : ''}***@${parsed.host}${parsed.pathname}`;
  } catch {
    return u;
  }
}

async function preflightDns(u: string): Promise<{ host: string; ip?: string }> {
  const parsed = new URL(u.replace(/^postgres(ql)?:\/\//, 'postgresql://'));
  const host = parsed.hostname;
  const attempts = 5;
  for (let i = 1; i <= attempts; i++) {
    try {
      await dns.lookup(host);
      log(`🔎 DNS resolved: ${host}`);
      return { host };
    } catch (e) {
      errorLog(`DNS resolve failed (${i}/${attempts}) for ${host}: ${(e as any)?.code ?? e}`);
      await sleep(500 * i);
    }
  }

  // Fallback: DNS-over-HTTPS (Cloudflare then Google)
  const providers = [
    { name: 'Cloudflare', url: (h: string) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(h)}&type=A`, parse: (j: any) => j?.Answer?.find((a: any) => a.type === 1 && a.data)?.data },
    { name: 'Google', url: (h: string) => `https://dns.google/resolve?name=${encodeURIComponent(h)}&type=A`, parse: (j: any) => j?.Answer?.find((a: any) => a.type === 1 && a.data)?.data },
  ];
  for (const p of providers) {
    try {
      const res = await fetch(p.url(host), { headers: { Accept: 'application/dns-json' } });
      if (res.ok) {
        const data: any = await res.json();
        const ip = p.parse(data);
        if (ip) {
          log(`🌐 DoH(${p.name}) resolved ${host} → ${ip}`);
          return { host, ip };
        }
        errorLog(`DoH(${p.name}) returned no A record for ${host}`);
      } else {
        errorLog(`DoH(${p.name}) HTTP ${res.status} for ${host}`);
      }
    } catch (e) {
      errorLog(`DoH(${p.name}) error for ${host}: ${(e as any)?.message ?? e}`);
    }
  }
  throw new Error(`DNS could not resolve host (normal + DoH providers): ${host}`);
}

async function applyMigrations() {
  const dbUrl = pickDbUrl();

  if (!dbUrl) {
    errorLog('🔴 ERROR: No valid Postgres URL found.');
    errorLog('Set SUPABASE_DB_CONNECTION or SUPABASE_DB_URL to a postgresql:// URL in .env.local');
    process.exit(1);
  }

  log(`Connecting to the database... (${maskUrl(dbUrl)})`);
  let sql: ReturnType<typeof postgres> | null = null;
  let httpFallback: null | { url: string; key: string } = null;
  try {
    const { host, ip } = await preflightDns(dbUrl);
    // retry connecting a few times in case of transient DNS/TLS hiccups
    const maxConnectAttempts = 3;
    for (let attempt = 1; attempt <= maxConnectAttempts; attempt++) {
      try {
        if (!ip) {
          // Normal path: let driver resolve DNS
          sql = postgres(dbUrl, { ssl: 'require', max: 1 });
        } else {
          // Fallback path: connect via resolved IP with TLS SNI
          const parsed = new URL(dbUrl.replace(/^postgres(ql)?:\/\//, 'postgresql://'));
          const port = Number(parsed.port || '5432');
          const database = decodeURIComponent(parsed.pathname.replace(/^\//, '') || 'postgres');
          const user = decodeURIComponent(parsed.username || 'postgres');
          const password = decodeURIComponent(parsed.password || '');
          sql = postgres({
            host: ip,
            port,
            database,
            username: user,
            password,
            max: 1,
            ssl: { rejectUnauthorized: true, servername: host },
          } as any);
        }
        // Test a simple round-trip
        await sql`select 1 as ok`;
        break;
      } catch (e: any) {
        errorLog(`Connection attempt ${attempt}/${maxConnectAttempts} failed: ${e?.code ?? e?.message ?? e}`);
        if (attempt === maxConnectAttempts) {
          throw e;
        }
        await sleep(800 * attempt);
      }
    }
  } catch (e) {
    // Hard failure: prepare HTTP fallback via Supabase Postgres API
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!supabaseUrl || !serviceKey) {
      errorLog('❌ Direct DB connect failed and HTTP fallback not possible (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
      throw e;
    }
    httpFallback = { url: `${supabaseUrl.replace(/\/$/, '')}/postgres/v1/query`, key: serviceKey };
    log(`🛜 Using HTTP fallback: ${httpFallback.url}`);
  }

  try {
    // 1. Get and sort migration files
    log(`🔍 Reading migrations from: ${MIGRATIONS_DIR}`);
    const allFiles = await fs.readdir(MIGRATIONS_DIR);
    let migrationFiles = allFiles
      .filter(file => file.endsWith('.sql') && !SKIP_FILES.has(file))
      .sort();

    // Optional: run only a specific migration by filename
    const only = process.env.MIGRATION_ONLY?.trim();
    if (only) {
      const filtered = migrationFiles.filter(f => f === only);
      if (filtered.length === 0) {
        log(`⚠️ MIGRATION_ONLY=${only} not found or skipped.`);
        return;
      }
      migrationFiles = filtered;
      log(`MIGRATION_ONLY active. Will apply: ${migrationFiles[0]}`);
    }

    if (migrationFiles.length === 0) {
      log('✅ No new migrations to apply.');
      return;
    }

    log(`Found ${migrationFiles.length} migrations to apply.`);

    // 2. Execute each migration
    for (const file of migrationFiles) {
      log(`\n▶️ Applying migration: ${file}...`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const script = await fs.readFile(filePath, 'utf-8');

      try {
        if (!httpFallback && sql) {
          await sql.unsafe(script);
        } else if (httpFallback) {
          const res = await fetch(httpFallback.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': httpFallback.key,
              'Authorization': `Bearer ${httpFallback.key}`,
            },
            body: JSON.stringify({ query: script }),
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`HTTP ${res.status}: ${txt}`);
          }
        } else {
          throw new Error('No execution method available');
        }
        log(`✅ SUCCESS: Applied ${file}`);
      } catch (error) {
        errorLog(`❌ FAILED to apply ${file}:`);
        errorLog(error);
        // Stop on first error
        throw new Error(`Migration ${file} failed.`);
      }
    }

    log('\n🎉 All migrations applied successfully!');

  } catch (error) {
    errorLog('\n🔴 An error occurred during the migration process. Halting.');
    errorLog(error);
    process.exit(1);
  } finally {
    if (sql) {
      await (sql as any).end();
      log('\n🔌 Database connection closed.');
    }
  }
}

applyMigrations();
