import postgres from 'postgres';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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
// IMPORTANT: Set your database connection string in a .env file in the project root
// SUPABASE_DB_URL="postgres://postgres:[YOUR-PASSWORD]@[YOUR-HOST]/postgres"

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

// Start a fresh log for this run
try { fsSync.writeFileSync(LOG_PATH, ''); } catch {}

// Migrations to explicitly skip (e.g., duplicates)
const SKIP_FILES = new Set([
  '20250820_create_session_players.sql',
  '20250810144129_add_room_rounds_and_current_round.sql',
]);

async function applyMigrations() {
  const dbUrl = process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    errorLog('🔴 ERROR: SUPABASE_DB_URL environment variable is not set.');
    errorLog('Please create a .env file in the root of the project with your database connection string.');
    process.exit(1);
  }

  log('Connecting to the database...');
  const sql = postgres(dbUrl, { ssl: 'require', max: 1 });

  try {
    // 1. Get and sort migration files
    log(`🔍 Reading migrations from: ${MIGRATIONS_DIR}`);
    const allFiles = await fs.readdir(MIGRATIONS_DIR);
    const migrationFiles = allFiles
      .filter(file => file.endsWith('.sql') && !SKIP_FILES.has(file))
      .sort();

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
        await sql.unsafe(script);
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
    await sql.end();
    log('\n🔌 Database connection closed.');
  }
}

applyMigrations();
