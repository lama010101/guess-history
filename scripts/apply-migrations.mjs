import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import postgres from 'postgres';

// Load env from .env.local if present, else default .env
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

const LOG_PATH = path.join(process.cwd(), 'migration.log');
function log(line) {
  console.log(line);
  try { fs.appendFileSync(LOG_PATH, line + '\n'); } catch {}
}
function resetLog() {
  try { fs.writeFileSync(LOG_PATH, ''); } catch {}
}

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');
const SKIP_FILES = new Set([
  '20250820_create_session_players.sql',
  '20250810144129_add_room_rounds_and_current_round.sql',
]);

async function main() {
  resetLog();
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    log('🔴 ERROR: SUPABASE_DB_URL is not set. Add it to .env.local');
    process.exit(1);
  }
  log('Connecting to the database...');
  const sql = postgres(dbUrl, { ssl: 'require', max: 1 });
  try {
    log(`🔍 Reading migrations from: ${MIGRATIONS_DIR}`);
    const all = await fsp.readdir(MIGRATIONS_DIR);
    let files = all.filter(f => f.endsWith('.sql') && !SKIP_FILES.has(f)).sort();
    if (process.env.MIGRATION_ONLY) {
      files = files.filter(f => f === process.env.MIGRATION_ONLY);
      if (files.length === 0) {
        log(`⚠️ MIGRATION_ONLY=${process.env.MIGRATION_ONLY} not found or skipped.`);
        return;
      }
    }
    if (files.length === 0) {
      log('✅ No new migrations to apply.');
      return;
    }
    log(`Found ${files.length} migrations to apply.`);
    for (const file of files) {
      log(`\n▶️ Applying migration: ${file}...`);
      const script = await fsp.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');
      try {
        await sql.unsafe(script);
        log(`✅ SUCCESS: Applied ${file}`);
      } catch (err) {
        log(`❌ FAILED to apply ${file}: ${err?.message ?? String(err)}`);
        throw err;
      }
    }
    log('\n🎉 All migrations applied successfully!');
  } catch (err) {
    log('\n🔴 An error occurred during the migration process. Halting.');
    log(err?.stack ?? String(err));
    process.exit(1);
  } finally {
    await sql.end();
    log('\n🔌 Database connection closed.');
  }
}

main().catch((e) => { log('Unexpected error: ' + (e?.message ?? String(e))); process.exit(1); });
